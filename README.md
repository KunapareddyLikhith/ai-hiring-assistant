# HunarHire AI Recruitment & Attendance Platform

HunarHire is a state-of-the-art web application that integrates semantic candidate search, automated AI voice outreach calling, and a conceptual offline employee attendance management system.

## 🚀 Technology Stack

- **Frontend**: Next.js 16 (TypeScript, Tailwind CSS, Lucide Icons)
- **Backend**: FastAPI (Python 3.14, Uvicorn)
- **Database**: SQLite (SQLAlchemy ORM)
- **Voice Agent Service**: Hunar.AI External API (`https://api.voice.hunar.ai/`)

---

## 🛠️ Architecture & Features

The platform consists of four unified workspaces:

### 1. Semantic Candidate Search & Matching
- Input a Job Description or criteria.
- Support for multiple candidate search providers: **Apollo.io**, **Proxycurl**, **People Data Labs (PDL)**, and **Coresignal**.
- **High-Fidelity Local Fallback**: If developer API keys are not configured in `.env`, the system automatically runs a text-matching ranking search over a pre-populated database in `candidates.json` so the entire product flow works out-of-the-box.
- **Editable Profiles**: Recruiters can click **Edit Number** on any candidate record directly in the search table to change the mobile number to their own phone for live testing.

### 2. Automated Voice Agent Outreach & Dashboard
- Select candidates, select a Voice Agent (fetched dynamically from your Hunar account), and view inputs for that agent's `custom_variables` automatically.
- Fill in variables (e.g., `job_title`, `required_skills`, `questions`), and click **Trigger Outreach**.
- The backend places calls via Hunar's outbound voice API.
- **Live Call Dashboard**: Displays active statuses (e.g., `NOT_STARTED`, `RINGING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`).
- **Background Polling & Webhooks**: Supports direct webhooks for real-time status callbacks. For local development, a background asyncio thread queries the Hunar API every 5 seconds to keep the database and frontend in sync instantly without needing tunneling (like ngrok).
- **Structured Results & Recording**: Played back directly in-app once completed (duration, caller speech, voice recording MP3 player, and structured answers like notice period and salary expectations).

### 3. Voice Agent Registry
- List all active voice agents on the organization's Hunar account, showing summaries, voice personas, required input variables, and result schema configurations.
- Create and register new Voice Agents directly from the web interface using the `POST /agents/` API.

### 4. Smart Attendance System (1000 Employees, 100 Sites)
- Addresses the conceptual challenge of tracking 1000 employee check-ins across 100 locations daily **without smartphones**.
- **The Design**:
  1. Each of the 100 physical sites is equipped with a registered analog landline or GSM desk-phone gateway.
  2. Employees call a toll-free check-in number. The telecom-level **Caller Line Identification (CLI)** geofences the employee's location to that specific site.
  3. An LLM-powered IVR voice agent answers, verifies identity using **Voice Biometric print models**, and prompts for a site-specific daily security code (displayed on a simple physical ledger or dynamic LED signboard on-site).
  4. The LLM processes the conversation, validates the daily passcode, and logs the attendance.
- **Interactive Simulator**: Users can select simulated employees, choose a communication channel (Voice IVR / SMS Gateway), type/select checking-in messages, and view real-time voice verification, CLI matching, and database logging.

---

## ⚙️ Local Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### 1. Environment Configuration
Copy the `.env.example` file to `.env` in the root folder:
```bash
cp .env.example .env
```
Fill in the environment variables:
```env
HUNAR_API_KEY=your_api_key_here

# Optional: Search API Keys
APOLLO_API_KEY=
PROXYCURL_API_KEY=
PDL_API_KEY=
CORESIGNAL_API_KEY=
```

### 2. Run the FastAPI Backend
Navigate to the root folder, install dependencies, and start the Uvicorn server:
```bash
# Install Python packages
pip install -r backend/requirements.txt

# Start backend server
uvicorn backend.main:app --reload --port 8000
```
The backend API documentation will be available at `http://localhost:8000/docs`.

### 3. Run the Next.js Frontend
Navigate to the `frontend` folder, install dependencies, and start the development server:
```bash
cd frontend

# Install Node modules
npm install

# Start Next.js server
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 🔬 System Verification & Tests

To test the system configuration, database tables, and API authentication before starting, run the verification script in the root directory:
```bash
python verify_apis.py
```
This confirms:
- Hunar.AI API connectivity and active agent counts.
- JSON candidate database loading.
- SQLite SQLAlchemy database and table initializations.

---

## ☁️ Deployment Guide

### Backend Deployment (Render or Railway)
1. Commit code to a Git repository.
2. Link repository to Render / Railway.
3. Set the Environment Variables (`HUNAR_API_KEY`, etc.) in the dashboard settings.
4. Set Build Command: `pip install -r backend/requirements.txt`
5. Set Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

### Frontend Deployment (Vercel)
1. Add `NEXT_PUBLIC_API_URL` environment variable pointing to your deployed backend URL.
2. Configure build settings for Next.js App Router (default configurations).
3. Click deploy.
