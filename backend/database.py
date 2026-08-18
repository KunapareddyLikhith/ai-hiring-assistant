import os
import json
import datetime
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./hiring_assistant.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class CallLog(Base):
    __tablename__ = "call_logs"

    id = Column(String, primary_key=True, index=True) # Hunar Call ID
    request_id = Column(String, index=True, nullable=True)
    agent_id = Column(String, index=True)
    agent_name = Column(String, nullable=True)
    callee_name = Column(String)
    mobile_number = Column(String)
    status = Column(String, default="NOT_STARTED") # NOT_STARTED, RINGING, IN_PROGRESS, COMPLETED, FAILED, etc.
    duration_minutes = Column(Float, default=0.0)
    duration_seconds = Column(Float, default=0.0)
    recording_url = Column(String, nullable=True)
    result = Column(JSON, nullable=True) # Structured JSON output from Hunar
    answered_by = Column(String, nullable=True) # HUMAN, MACHINE
    engagement_status = Column(String, nullable=True) # ENGAGED, NOT_ENGAGED
    custom_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(String, index=True)
    employee_name = Column(String)
    location_id = Column(String, index=True)
    location_name = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="PRESENT") # PRESENT, LATE, ABSENT
    verification_type = Column(String) # Voice IVR, SMS Check-in, Edge Camera, local code
    verification_details = Column(String) # Verification notes like "Voice biometrics verified, landline geofenced."

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Create ~1000 simulated employees and ~100 locations if database is empty?
    # Actually, we can pre-generate location/employee logs on the fly when querying or seed them.
    db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
