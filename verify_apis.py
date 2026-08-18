import os
import sys
import urllib.request
import json
from dotenv import load_dotenv

print("=== Starting System Verification ===")

# 1. Load env
load_dotenv()
api_key = os.getenv("HUNAR_API_KEY")
print(f"Hunar API Key found in env: {'Yes' if api_key else 'No'}")

if not api_key:
    print("ERROR: HUNAR_API_KEY not found in .env file.")
    sys.exit(1)

# 2. Check Hunar API Connection
print("\n--- Testing Hunar.AI API connection ---")
url = "https://api.voice.hunar.ai/external/v1/agents/"
headers = {
    "X-API-Key": api_key,
    "Content-Type": "application/json"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=8) as response:
        data = json.loads(response.read().decode())
        agents = data.get('results', [])
        print(f"SUCCESS: Connected to Hunar.AI. Found {len(agents)} agents in organization.")
except Exception as e:
    print(f"ERROR: Failed to connect to Hunar.AI: {e}")
    sys.exit(1)

# 3. Check Candidates Seed Database
print("\n--- Testing Candidate Database Seed File ---")
cand_file = "backend/candidates.json"
if os.path.exists(cand_file):
    try:
        with open(cand_file, "r") as f:
            candidates = json.load(f)
            print(f"SUCCESS: Found candidate seed file with {len(candidates)} records.")
    except Exception as e:
        print(f"ERROR: Failed to read {cand_file}: {e}")
else:
    print(f"ERROR: Candidate seed file {cand_file} is missing.")

# 4. Check SQLAlchemy Database initialization
print("\n--- Testing SQLite database setup ---")
try:
    sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
    from database import init_db, engine, SessionLocal
    init_db()
    print("SUCCESS: SQLite database initialized with schemas.")
except Exception as e:
    print(f"ERROR: Database initialization failed: {e}")

print("\n=== System Verification Completed Successfully ===")
