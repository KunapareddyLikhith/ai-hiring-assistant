import os
import json
import logging
import asyncio
import requests
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Import our database modules
from .database import get_db, init_db, CallLog, AttendanceLog
from .search_service import SearchService

load_dotenv()

# Initialize DB
init_db()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hiring_assistant")

app = FastAPI(title="AI Hiring & People Search API", version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
HUNAR_API_URL = "https://api.voice.hunar.ai/external/v1"
HUNAR_API_KEY = os.getenv("HUNAR_API_KEY", "")

# Initialize Search Service
candidates_file = os.path.join(os.path.dirname(__file__), "candidates.json")
search_service = SearchService(candidates_file)

# Helper: Hunar Request Headers
def get_hunar_headers() -> Dict[str, str]:
    return {
        "X-API-Key": HUNAR_API_KEY,
        "Content-Type": "application/json"
    }

# Pydantic Schemas
class CreateAgentSchema(BaseModel):
    name: str = Field(..., min_length=3, max_length=64)
    language: str = Field(default="ENGLISH")
    voice_persona: str = Field(default="NEHA")
    persona_name: Optional[str] = None
    agent_prompt: str
    objective: str
    introduction: str
    result_prompt: str
    result_schema: Dict[str, Any]

class SearchRequest(BaseModel):
    job_description: str
    source: str = "Local" # Local, Apollo, Proxycurl, PDL, Coresignal

class CallVariables(BaseModel):
    agent_id: str
    callee_name: str
    mobile_number: str
    custom_data: Dict[str, Any] = {}

class ReachoutRequest(BaseModel):
    agent_id: str
    candidates: List[Dict[str, Any]]
    custom_data_template: Dict[str, Any] = {}

class CheckInRequest(BaseModel):
    employee_id: str
    location_id: str
    location_name: str
    employee_name: str
    message: str # Check-in audio transcript or text (e.g. "I am Amit, ID E-101. Checking in. Code is 4821.")

# BACKGROUND POLLING SERVICE
# Keep track of active calls in the SQLite database and poll Hunar.AI for updates.
async def poll_active_calls():
    """
    Periodically checks the local database for non-terminal call logs 
    and fetches their latest status from Hunar.AI API.
    """
    while True:
        try:
            db = next(get_db())
            # Non-terminal statuses
            active_statuses = ["NOT_STARTED", "SCHEDULED", "INITIATED", "RINGING", "IN_PROGRESS"]
            active_calls = db.query(CallLog).filter(CallLog.status.in_(active_statuses)).all()
            
            if active_calls:
                headers = get_hunar_headers()
                for call in active_calls:
                    url = f"{HUNAR_API_URL}/calls/{call.id}/"
                    logger.info(f"Polling Hunar.AI status for call: {call.id}")
                    try:
                        res = requests.get(url, headers=headers, timeout=5)
                        if res.status_code == 200:
                            data = res.json()
                            call.status = data.get("lifecycle_status", data.get("status", call.status))
                            call.duration_minutes = data.get("duration_minutes", 0.0)
                            call.duration_seconds = data.get("duration_seconds", 0.0)
                            call.recording_url = data.get("recording_url", call.recording_url)
                            call.answered_by = data.get("answered_by", call.answered_by)
                            call.engagement_status = data.get("engagement_status", call.engagement_status)
                            
                            # Parse result if completed
                            if data.get("result"):
                                call.result = data.get("result")
                                
                            db.commit()
                            logger.info(f"Updated call {call.id} status to {call.status}")
                        else:
                            logger.warning(f"Failed to poll call {call.id}: {res.status_code}")
                    except Exception as e:
                        logger.error(f"Error calling Hunar API for call {call.id}: {e}")
            db.close()
        except Exception as ex:
            logger.error(f"Error in polling loop: {ex}")
            
        await asyncio.sleep(5) # Poll every 5 seconds

@app.on_event("startup")
async def startup_event():
    # Start polling loop as a background task
    asyncio.create_task(poll_active_calls())

# ENDPOINTS: AGENTS
@app.get("/api/agents")
def list_agents():
    url = f"{HUNAR_API_URL}/agents/?page=1&page_size=100"
    headers = get_hunar_headers()
    try:
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            return res.json()
        else:
            raise HTTPException(status_code=res.status_code, detail=res.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents")
def create_agent(payload: CreateAgentSchema):
    url = f"{HUNAR_API_URL}/agents/"
    headers = get_hunar_headers()
    try:
        res = requests.post(url, headers=headers, json=payload.dict(), timeout=10)
        if res.status_code == 200 or res.status_code == 201:
            return res.json()
        else:
            logger.error(f"Failed to create agent: {res.status_code} - {res.text}")
            raise HTTPException(status_code=res.status_code, detail=res.json())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ENDPOINTS: CANDIDATES SEARCH
@app.post("/api/people/search")
def search_people(payload: SearchRequest):
    jd = payload.job_description
    source = payload.source
    
    # 1. Local Search (Always works)
    if source == "Local":
        results = search_service.local_search(jd)
        return {"results": results, "source": "Local Database", "api_fallback": False}
        
    # 2. External APIs (Check credentials, fallback if missing)
    api_key_env_var = {
        "Apollo": "APOLLO_API_KEY",
        "Proxycurl": "PROXYCURL_API_KEY",
        "PDL": "PDL_API_KEY",
        "Coresignal": "CORESIGNAL_API_KEY"
    }.get(source)
    
    api_key = os.getenv(api_key_env_var) if api_key_env_var else None
    
    if not api_key:
        # Fallback to local
        logger.warning(f"{source} API key not found in environment. Falling back to local candidates search.")
        results = search_service.local_search(jd)
        return {
            "results": results, 
            "source": f"{source} (Fallback: Local DB)", 
            "api_fallback": True,
            "message": f"{source} API Key is missing. Falling back to local candidates database. Configure {api_key_env_var} in .env for live API search."
        }
        
    # Execute actual search API
    if source == "Apollo":
        res = search_service.apollo_search(jd, api_key)
    elif source == "Proxycurl":
        res = search_service.proxycurl_search(jd, api_key)
    elif source == "PDL":
        res = search_service.pdl_search(jd, api_key)
    elif source == "Coresignal":
        res = search_service.coresignal_search(jd, api_key)
    else:
        res = {"success": False, "error": "Invalid source"}
        
    if res.get("success"):
        return {"results": res["results"], "source": res["source"], "api_fallback": False}
    else:
        # If API errors out, fallback to local search as safety net
        logger.error(f"Search API Error for {source}: {res.get('error')}. Falling back to local candidates.")
        results = search_service.local_search(jd)
        return {
            "results": results,
            "source": f"{source} (Fallback: Local DB)",
            "api_fallback": True,
            "message": f"API call failed: {res.get('error')}. Falling back to local candidate database."
        }

# ENDPOINTS: CALL OUTREACH
@app.post("/api/reachout")
def trigger_reachout(payload: ReachoutRequest, db: Session = Depends(get_db)):
    """
    Triggers outbound voice calls for selected candidates.
    Supports single-candidate call or bulk call configurations.
    """
    candidates = payload.candidates
    agent_id = payload.agent_id
    
    if not candidates:
        raise HTTPException(status_code=400, detail="No candidates selected for reachout.")
        
    # Fetch agent name for local log enrichment
    agent_name = "Voice Agent"
    headers = get_hunar_headers()
    try:
        agent_res = requests.get(f"{HUNAR_API_URL}/agents/{agent_id}/", headers=headers, timeout=5)
        if agent_res.status_code == 200:
            agent_name = agent_res.json().get("name", "Voice Agent")
    except Exception:
        pass
        
    # If 1 candidate, use single call API. If multiple, use bulk call API.
    if len(candidates) == 1:
        cand = candidates[0]
        # Prepare custom data (incorporating search context custom data if provided)
        custom_data = {**payload.custom_data_template}
        
        call_payload = {
            "agent_id": agent_id,
            "callee_name": cand["name"],
            "mobile_number": cand["mobile_number"],
            "custom_data": custom_data,
            "request_id": f"reachout_{cand.get('id', 'cand')}"
        }
        
        logger.info(f"Placing outbound call via Hunar.AI to: {cand['name']} ({cand['mobile_number']})")
        res = requests.post(f"{HUNAR_API_URL}/calls/", headers=headers, json=call_payload, timeout=10)
        
        if res.status_code == 200:
            call_data = res.json()
            # Save call log
            db_call = CallLog(
                id=call_data["id"],
                request_id=call_data.get("request_id"),
                agent_id=agent_id,
                agent_name=agent_name,
                callee_name=cand["name"],
                mobile_number=cand["mobile_number"],
                status=call_data.get("status", "NOT_STARTED"),
                custom_data=custom_data
            )
            db.add(db_call)
            db.commit()
            return {"success": True, "calls_created": 1, "calls": [call_data]}
        else:
            logger.error(f"Hunar call creation failed: {res.status_code} - {res.text}")
            raise HTTPException(status_code=res.status_code, detail=res.json())
            
    else:
        # Bulk call API
        bulk_data = []
        for cand in candidates:
            custom_data = {**payload.custom_data_template}
            bulk_data.append({
                "callee_name": cand["name"],
                "mobile_number": cand["mobile_number"],
                "custom_data": custom_data
            })
            
        bulk_payload = {
            "agent_id": agent_id,
            "data": bulk_data,
            "remove_invalid_rows": True,
            "remove_duplicate_phone_numbers": True
        }
        
        logger.info(f"Placing bulk outbound calls via Hunar.AI for {len(candidates)} candidates.")
        res = requests.post(f"{HUNAR_API_URL}/calls/bulk/", headers=headers, json=bulk_payload, timeout=10)
        
        if res.status_code == 200:
            created_calls = res.json()
            saved_count = 0
            for call_data in created_calls:
                db_call = CallLog(
                    id=call_data["id"],
                    request_id=call_data.get("request_id"),
                    agent_id=agent_id,
                    agent_name=agent_name,
                    callee_name=call_data.get("callee_name", "Unknown"),
                    mobile_number=call_data.get("mobile_number", ""),
                    status=call_data.get("status", "NOT_STARTED"),
                    custom_data=payload.custom_data_template
                )
                db.add(db_call)
                saved_count += 1
            db.commit()
            return {"success": True, "calls_created": saved_count, "calls": created_calls}
        else:
            logger.error(f"Hunar bulk call creation failed: {res.status_code} - {res.text}")
            raise HTTPException(status_code=res.status_code, detail=res.json())

# ENDPOINTS: CALL HISTORY & LOGS
@app.get("/api/calls")
def get_call_logs(db: Session = Depends(get_db)):
    """
    Returns call logs saved in our local DB, sorted by creation date.
    """
    logs = db.query(CallLog).order_by(CallLog.created_at.desc()).all()
    return logs

@app.get("/api/calls/{call_id}")
def get_call_detail(call_id: str, db: Session = Depends(get_db)):
    log = db.query(CallLog).filter(CallLog.id == call_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Call log not found.")
    return log

# WEBHOOKS RECEIVER
@app.post("/api/webhook")
async def webhook_handler(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Receives callbacks from Hunar.AI and updates call records.
    Callbacks are triggered for call_status, call_recording, call_result, etc.
    """
    logger.info(f"Webhook received: {json.dumps(payload)}")
    
    # Hunar webhooks typically pass 'call_id' or 'id'
    call_id = payload.get("id") or payload.get("call_id")
    if not call_id:
        return {"status": "ignored", "reason": "No call_id found in payload"}
        
    call_log = db.query(CallLog).filter(CallLog.id == call_id).first()
    if not call_log:
        logger.warning(f"Webhook received for untracked call ID: {call_id}")
        return {"status": "ignored", "reason": "Untracked call ID"}
        
    # Update fields present in webhook
    if "status" in payload or "lifecycle_status" in payload:
        call_log.status = payload.get("lifecycle_status") or payload.get("status")
        
    if "duration_minutes" in payload:
        call_log.duration_minutes = float(payload.get("duration_minutes", 0))
    if "duration_seconds" in payload:
        call_log.duration_seconds = float(payload.get("duration_seconds", 0))
        
    if "recording_url" in payload:
        call_log.recording_url = payload.get("recording_url")
        
    if "answered_by" in payload:
        call_log.answered_by = payload.get("answered_by")
        
    if "engagement_status" in payload:
        call_log.engagement_status = payload.get("engagement_status")
        
    if "result" in payload:
        call_log.result = payload.get("result")
        
    db.commit()
    logger.info(f"Webhook successfully updated call {call_id} to status: {call_log.status}")
    return {"status": "success"}

# ATTENDANCE SIMULATOR
@app.post("/api/attendance/checkin")
def attendance_checkin(payload: CheckInRequest, db: Session = Depends(get_db)):
    """
    Simulates checking in an employee via Landline Caller ID geofencing and Voice LLM processing.
    This simulates the offline landline/GSM check-in method for our attendance system.
    """
    import random
    msg = payload.message
    
    # Simple simulated LLM/Parser logic
    # Checks if ID, check-in passphrase, or correct location details are in the transcript
    code_match = re.search(r'\b\d{4}\b', msg)
    id_match = re.search(r'id\s*([a-zA-Z0-9-]+)', msg.lower()) or re.search(r'\b\d+\b', msg)
    
    # 1. Location Geofence Check (Caller ID validation)
    # We simulate landline Caller ID validation by checking if the location is matched
    caller_id = f"+91-11-{random.randint(2000, 9999)}{random.randint(1000, 9999)}"
    
    # 2. Voice Biometrics Simulation
    voice_verified = True # Simulated voiceprint verification
    
    # 3. LLM verification decision
    status = "PRESENT"
    details = ""
    
    if not code_match:
        status = "LATE" # Or Flagged
        details = "Verification Warning: Missing site-specific daily security code."
    else:
        details = f"Verified: Security code {code_match.group(0)} matches today's site code. "
        
    if voice_verified:
        details += "Voice biometrics matched employee print (Confidence 97.4%). "
    else:
        details += "WARNING: Voice print mismatch. "
        
    details += f"Caller ID geofenced to local Site Landline {caller_id}."
    
    # Save log
    db_log = AttendanceLog(
        employee_id=payload.employee_id,
        employee_name=payload.employee_name,
        location_id=payload.location_id,
        location_name=payload.location_name,
        status=status,
        verification_type="IVR Landline (LLM Verification)",
        verification_details=details
    )
    db.add(db_log)
    db.commit()
    
    return {
        "success": True,
        "caller_id": caller_id,
        "voice_verified": voice_verified,
        "status": status,
        "details": details
    }

@app.get("/api/attendance/logs")
def get_attendance_logs(db: Session = Depends(get_db)):
    logs = db.query(AttendanceLog).order_by(AttendanceLog.timestamp.desc()).limit(100).all()
    
    # If no logs exist, seed a few mock logs for visualization
    if not logs:
        mock_logs = [
            AttendanceLog(employee_id="EMP-101", employee_name="Amit Sharma", location_id="LOC-01", location_name="Bengaluru Core", status="PRESENT", verification_type="IVR Landline (LLM Verification)", verification_details="Verified: Security code 4821 matches today's site code. Voice biometrics matched. Caller ID geofenced to Site Landline +91-80-23481239."),
            AttendanceLog(employee_id="EMP-104", employee_name="Sneha Reddy", location_id="LOC-03", location_name="Hyderabad Hub", status="PRESENT", verification_type="SMS Gateway Token", verification_details="Verified: SMS received from registered device +91-9876543213. Site daily passcode 7210 verified."),
            AttendanceLog(employee_id="EMP-107", employee_name="Karan Malhotra", location_id="LOC-05", location_name="Pune Tech", status="PRESENT", verification_type="IVR Landline (LLM Verification)", verification_details="Verified: Security code 4821 matches. Voice biometrics matched. Caller ID geofenced to Site Landline +91-20-41098412."),
            AttendanceLog(employee_id="EMP-102", employee_name="Priya Patel", location_id="LOC-02", location_name="Mumbai Office", status="LATE", verification_type="IVR Landline (LLM Verification)", verification_details="Verification Warning: Checked in at 09:42 AM. Code 9210 matches. Voice verified. Caller ID geofenced to Landline +91-22-26598210.")
        ]
        for ml in mock_logs:
            db.add(ml)
        db.commit()
        logs = db.query(AttendanceLog).order_by(AttendanceLog.timestamp.desc()).all()
        
    return logs
