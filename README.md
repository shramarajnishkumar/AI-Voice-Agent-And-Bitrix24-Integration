# 🎙️ Autonomous AI Voice Telephony Agent to Bitrix24 CRM

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org)
[![Twilio](https://img.shields.io/badge/Twilio-Voice%20TwiML-F22F46.svg?logo=twilio&logoColor=white)](https://www.twilio.com)
[![Bitrix24](https://img.shields.io/badge/Bitrix24-REST%20API%20v2-2FC6F6.svg?logo=bitrix24&logoColor=white)](https://www.bitrix24.com)
[![Open Source](https://img.shields.io/badge/NLP-Open%20Source%20First-green.svg)]()
[![Watch Video Demo](https://img.shields.io/badge/Loom-Live%20Video%20Demo-625DF5.svg?logo=loom&logoColor=white)](https://www.loom.com/share/41921a55560b4d4fb12bc757952e0316)

A production-grade, end-to-end AI voice telephony system that answers inbound telephone calls, executes a 3-question intake dialogue, transcribes caller speech, extracts structured lead information using open-source NLP, and automatically writes the record into **Bitrix24 CRM** via its REST API without human intervention.

---

## 📺 Live Screencast Demo (Video Walkthrough)

> **Watch the full end-to-end demonstration in action:**  
> 🔗 **[Click here to watch the Loom Live Screen Recording](https://www.loom.com/share/41921a55560b4d4fb12bc757952e0316)**  
> 
> *Demonstrates: Inbound/outbound call dispatch, natural speech-to-text processing, dynamic LLM conversational turns, structured field extraction (Name, Company, Desired Service, Contact Channel), and real-time lead creation in Bitrix24 CRM via REST API.*

---

## 📋 Table of Contents
1. [Live Screencast Demo (Video Walkthrough)](#-live-screencast-demo-video-walkthrough)
2. [Architecture & Journey Overview](#-architecture--journey-overview)
3. [Key Capabilities & Open-Source Highlights](#-key-capabilities--open-source-highlights)
4. [Tech Stack](#-tech-stack)
5. [Bitrix24 Integration & Field Mapping](#-bitrix24-integration--field-mapping)
6. [Quickstart: Docker Setup (Recommended ⭐)](#-quickstart-docker-setup-recommended-)
7. [Alternative: Manual Local Development](#-alternative-manual-local-development)
8. [Public Tunnel & Twilio Webhook Setup](#-public-tunnel--twilio-webhook-setup-cloudflare-tunnel--ngrok)
9. [In-Browser Voice Call Simulator](#-in-browser-voice-call-simulator)
10. [Automated Test Suite](#-automated-test-suite)
11. [Environment Variables Reference](#-environment-variables-reference)
12. [Assessment Requirements Compliance Matrix](#-assessment-requirements-compliance-matrix)

---

## 🏛️ Architecture & Journey Overview

```
                                      INBOUND CALL JOURNEY
                                      
  [Caller Dials Phone Number]  ────────►  [Twilio Voice / WebRTC Simulator]
                                                    │
                                                    ▼
                                           [FastAPI Telephony Engine]
                                                    │
                                                    ▼
                                      [Dynamic Dialogue Service]
                                      (OpenAI LLM - gpt-4o-mini)
                                                    │
             ┌──────────────────────────────────────┴──────────────────────────────────────┐
             ▼                                      ▼                                      ▼
      [Dynamic Turn 1]                       [Dynamic Turn 2]                       [Closing Wrap-up]
   Warm human greeting &                  Context-aware question based           Warm professional thank
   intelligent intake question            on prior answers (no scripts)          you & confirmation
             │                                      │                                      │
             ▼                                      ▼                                      ▼
     [Caller Speaks]                        [Caller Speaks]                        [Call Ends]
  (STT: Phone Call Model)                (STT: Phone Call Model)                (Bitrix24 Push Triggered)
             └──────────────────────────────────────┬──────────────────────────────────────┘
                                                    │
                                                    ▼
                                       [NLP Structured Extraction]
                                      (OpenAI / Heuristics / Ollama)
                                                    │
                                                    ├── Caller Name: "Alex Mercer"
                                                    ├── Company Name: "Nexus Technologies"
                                                    ├── Desired Service: "Cloud Migration"
                                                    └── Contact Channel: "alex@nexustech.io"
                                                    │
                                                    ▼
                                        [Bitrix24 REST API Client]
                                           (crm.lead.add.json)
                                                    │
                                                    ▼
                                         [New Lead in Bitrix24]
                                       (Auto-populated & Assigned)
```

### The 5-Step End-to-End Milestone Flow:
1. **Public Phone Call Ingestion**: Inbound call is received by a Twilio phone number or the Web Voice Simulator and passed to FastAPI via webhook.
2. **Dynamic Conversational TTS Greeting**: The bot answers immediately with Amazon Polly Neural voice (`Polly.Joanna-Neural`) and greets the caller.
3. **Speech-to-Text Processing**: The caller responds in short sentences; Twilio's Google-powered speech recognition (`phone_call` model) or browser Web Speech API transcribes their speech in real-time.
4. **Dynamic LLM Turn Generation**: Powered by OpenAI `gpt-4o-mini`, the bot dynamically analyzes what the caller already stated, acknowledges it naturally, and asks for missing intake fields (Caller Name, Company Name, Desired Service, Contact Channel).
5. **Bitrix24 REST API Lead Creation**: Pushes a rich CRM Lead into Bitrix24 (`crm.lead.add.json`) with phone numbers, emails, assigned reps, and full call transcript.

---

## ✨ Key Capabilities & Highlights

- **Dynamic LLM Voice Dialogue (No Static Scripts)**: Instead of rigid preset questions, the voice agent dynamically converses with callers using OpenAI `gpt-4o-mini`. If a caller provides their name, company, and needed service in one turn, the bot intelligently recognizes all three and asks *only* for their contact channel!
- **Real-Time Chat Format UI**: Watch the live conversation unfold in chat format with distinct message bubbles for the AI Voice Agent and Caller, auto-scrolling, live listening/speaking indicators, and instant lead telemetry in both mobile phone and browser simulator modes.
- **Dual Telephony Channels**:
  1. **Twilio Voice Telephony**: Production webhook handling TwiML `<Gather input="speech">` with Amazon Polly Neural TTS (`Polly.Joanna-Neural`).
  2. **Browser Voice Simulator**: Built-in WebRTC / Web Speech API console with dynamic audio waveform visualizer and browser speech synthesis. Anyone can test the entire voice flow without needing a funded Twilio account.
- **Intelligent Mock Mode for Bitrix24**: If Bitrix24 webhook credentials are not supplied, the engine activates Mock Mode: generates realistic lead IDs, simulates the full payload, and logs the transaction. When configured, it syncs live to Bitrix24 CRM.
- **Sub-2-Second Response Latency (< 2.0s)**: Dual-path low-latency architecture ensures callers never experience uncomfortable dead air. Uses connection pooling, ultra-compact LLM generation (< 25 tokens), and a 1.2s circuit-breaker with instant contextual fallback.
- **Enhanced Telephony Speech Recognition**: Twilio `<Gather>` configured with `speechTimeout="auto"` (natural conversational pause detection ~500ms), `speechModel="experimental_conversations"`, `enhanced="true"` (Google Cloud enhanced acoustic models), `profanityFilter="false"`, and comprehensive phonetic hints.
- **Resilient Fallback Mechanism**: If external LLM APIs experience network lag or queue delays, the system immediately falls back to personalized contextual templates, guaranteeing smooth conversational flow under 2 seconds on every turn.
- **Asynchronous FastAPI Architecture**: Non-blocking I/O with SQLAlchemy async sessions and HTTPX client.
- **PostgreSQL / SQLite Support**: Automatically uses SQLite for local zero-config runs and switches to PostgreSQL in production.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.12, FastAPI, Uvicorn, Pydantic v2, HTTPX, SQLAlchemy 2 (Async), Twilio SDK |
| **Frontend** | React 18, Vite, Lucide React, Web Speech API (STT & TTS), Vanilla Glassmorphic CSS |
| **Database** | SQLite (via `aiosqlite`) / PostgreSQL (via `asyncpg` / `psycopg2`) |
| **Telephony** | Twilio Voice Webhooks (TwiML), Web Speech Audio Synthesis & Recognition |
| **NLP** | Open-source Regex & Heuristics, Local Ollama LLM (`llama3.2`), optional OpenAI fallback |
| **CRM** | Bitrix24 REST API (`crm.lead.add.json`) |
| **DevOps** | Docker, Docker Compose, Nginx |

---

## 🔗 Bitrix24 Integration & Field Mapping

The agent pushes data to the Bitrix24 Inbound Webhook endpoint:  
`POST https://<your-domain>.bitrix24.com/rest/<user_id>/<webhook_token>/crm.lead.add.json`

### Field Mapping Table

| Bitrix24 CRM Field | Source / Origin | Example Value |
|---|---|---|
| `TITLE` | Formatted Lead Title | `"Inbound Voice Lead: Nexus Tech - Cloud Migration"` |
| `NAME` | Extracted Caller Name | `"Alex Mercer"` |
| `COMPANY_TITLE` | Extracted Company Name | `"Nexus Technologies"` |
| `STATUS_ID` | Lead Stage | `"NEW"` |
| `OPENED` | Accessible to team | `"Y"` |
| `ASSIGNED_BY_ID` | Configurable Agent ID | `1` |
| `PHONE` | Extracted Phone / Caller ID | `[{"VALUE": "+15550198833", "VALUE_TYPE": "WORK"}]` |
| `EMAIL` | Extracted Email | `[{"VALUE": "alex@nexustech.io", "VALUE_TYPE": "WORK"}]` |
| `SOURCE_ID` | Origin Channel | `"CALL"` |
| `SOURCE_DESCRIPTION` | Sub-source tag | `"AI Automated Inbound Voice Call"` |
| `COMMENTS` | Rich HTML summary + verbatim dialogue | Contains executive summary, contact channels, and full call transcript |

### How to Obtain Bitrix24 Webhook Credentials:
1. Log in to your Bitrix24 portal.
2. In the left navigation, open **Developer** (or **Applications** &rarr; **Webhooks**).
3. Click **Add Webhook** &rarr; select **Inbound Webhook**.
4. In the permissions list, tick **CRM (`crm`)**.
5. Copy the generated Webhook URL (format: `https://your-domain.bitrix24.com/rest/1/abc123token/`).
6. Paste into `backend/.env` as `BITRIX24_WEBHOOK_URL`.

---

## 🚀 Quickstart: Docker Setup (Recommended ⭐)

The recommended and zero-friction way to run the entire project is using **Docker Compose**. It launches the complete production stack with a single command:
- **FastAPI Telephony Backend** (Port `8000`)
- **React Dashboard on Nginx** (Port `80`)
- **Cloudflare Tunnel (`cloudflared`) Sidecar** that automatically establishes a public HTTPS tunnel and auto-wires its URL into the backend for Twilio callbacks.

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 2. Configure Environment
Ensure your environment file `backend/.env` exists. You can copy the template:
```bash
# Copy example configuration if starting fresh
cp backend/.env.example backend/.env
```
Ensure your credentials are set in `backend/.env` (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `OPENAI_API_KEY`, `BITRIX24_WEBHOOK_URL`).

### 3. Build & Run Stack
```bash
docker-compose up --build -d
```

### 4. Verify & Open
- **Web Dashboard**: **[http://localhost](http://localhost)**
- **Backend API & Swagger Docs**: **[http://localhost:8000/docs](http://localhost:8000/docs)**
- **Health Check**: **[http://localhost/api/health](http://localhost/api/health)**

### 5. View Logs & Auto-Detected Public Tunnel URL
```bash
# Check container status
docker-compose ps

# View backend logs (shows auto-detected Cloudflare public URL)
docker logs -f voice_agent_backend
```
In the backend logs, you will see:
```text
Detected Cloudflare public URL: https://<random-subdomain>.trycloudflare.com
Starting FastAPI server with PUBLIC_BASE_URL=https://<random-subdomain>.trycloudflare.com
```

To stop all services:
```bash
docker-compose down
```

---

## 💻 Alternative: Manual Local Development (Without Docker)

If you prefer to run services individually without Docker:

### Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Node.js 18+ & npm

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation: **http://localhost:8000/docs**

### 2. Frontend Setup
```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install packages
npm install

# Start Vite dev server
npm run dev
```
Dashboard: **http://localhost:5173**

### 3. One-Click Launch (Windows)
Double-click `start_all.bat` or run:
```powershell
.\start_all.bat
```

---

## 🌐 Public Tunnel & Twilio Webhook Setup (Cloudflare Tunnel & ngrok)

To receive real phone calls from Twilio onto your local machine or server without a static public IP, expose port `8000` via a public HTTPS tunnel.

### Option A: Cloudflare Tunnel (`cloudflared`) — Recommended ⭐

Cloudflare Tunnel provides free, ultra-reliable HTTPS forwarding with no session expirations or interstitial warning pages (which can break Twilio HTTP POST callbacks).

#### 1. Install `cloudflared` (if not already installed):
- **Windows (winget)**:
  ```powershell
  winget install --id Cloudflare.cloudflared
  ```
- **macOS (Homebrew)**:
  ```bash
  brew install cloudflare/cloudflare/cloudflared
  ```
- **Direct Binary**: [Cloudflare Tunnel Downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)

#### 2. Start the Quick Tunnel:
If you want the tunnel to start automatically in Docker with no manual terminal step, use the preconfigured compose stack:

```bash
docker-compose up --build -d
```

This starts:
- the FastAPI backend on port `8000`
- the React frontend on port `80`
- a `cloudflared` sidecar that exposes the backend through a public HTTPS tunnel automatically

The backend reads the Cloudflare tunnel URL from the `cloudflared` metrics endpoint and sets `PUBLIC_BASE_URL` automatically, so you do not need to run `cloudflared tunnel --url http://localhost:8000` manually.

If you prefer to start the tunnel manually instead, run:
```bash
cloudflared tunnel --url http://localhost:8000
```

Cloudflare will generate a public HTTPS URL such as:
```text
https://elizabeth-commentary-easter-snow.trycloudflare.com
```

#### 3. Update `backend/.env`:
Paste the generated URL into `backend/.env` as `PUBLIC_BASE_URL`:
```env
PUBLIC_BASE_URL=https://wines-discussion-lion-confirmed.trycloudflare.com
```

#### 4. Configure Twilio Phone Number Webhook:
1. Open [Twilio Console](https://console.twilio.com) &rarr; **Phone Numbers** &rarr; **Manage** &rarr; **Active Numbers**.
2. Click your Twilio phone number (e.g. `+1 (737) 250-8034`).
3. Under **Voice Configuration**:
   - **A CALL COMES IN**: Select `Webhook`
   - **URL**: `https://<your-subdomain>.trycloudflare.com/api/twilio/voice`
   - **HTTP METHOD**: `HTTP POST`
4. Under **Call Status Changes**:
   - **Status Callback URL**: `https://<your-subdomain>.trycloudflare.com/api/twilio/status`
   - **HTTP METHOD**: `HTTP POST`
5. Click **Save configuration**.

#### 5. 🔧 Self-Service Troubleshooting: Cloudflare Tunnel Issues & Instant Fixes

If you ever encounter an issue with Cloudflare Tunnel, use this 30-second troubleshooting guide:

| Issue | Why It Happens | Exact Self-Service Fix |
|---|---|---|
| **"Terminal seems frozen / doesn't exit"** | `cloudflared` is a persistent daemon. It must remain open in the background to proxy phone calls. | **Do NOT press Ctrl+C** while testing calls.<br>Keep the terminal window running, or simply double-click **`start_tunnel.bat`** in the project root to run it in its own background window. |
| **"Where do I find my active tunnel URL?"** | Terminal logs can scroll past the URL quickly. | Look for the ASCII box containing:<br>`Your quick Tunnel has been created! Visit it at: https://<name>.trycloudflare.com`<br><br>👉 *Or run this one-line command in PowerShell to extract your active URL instantly:*<br>`python -c "import httpx; print([l for l in httpx.get('http://127.0.0.1:20241/metrics').text.splitlines() if 'userHostname' in l][0].split('\"')[1])"` |
| **"Tunnel restarted and gave a new URL"** | Quick Tunnels generate a new random subdomain on each restart. | **Three quick steps:**<br>1. Paste the new URL into `backend/.env` under `PUBLIC_BASE_URL`.<br>2. Reload Docker containers: `docker-compose up -d`<br>3. In Twilio Console &rarr; Phone Numbers, update the Voice Webhook to `https://<new-name>.trycloudflare.com/api/twilio/voice`. |
| **"Twilio says 'An application error has occurred'"** | Backend on port 8000 is not running or tunnel points to dead session. | 1. Verify backend is active: run `docker-compose ps` or test `http://localhost:8000/api/health`.<br>2. Test your public tunnel in browser: `https://<your-tunnel>.trycloudflare.com/api/health`.<br>If it returns `{"status": "healthy"}`, Twilio can reach it 100%. |
#### 6. 🎙️ Speech-To-Text & Voice Agent Telephony Optimization

The AI Voice Agent includes optimized telephony configurations for international and Indian mobile callers (`+91`):

| Feature / Setting | Why It Matters | Configuration |
|---|---|---|
| **Dialect & Accent Detection** | US English models (`en-US`) can distort or mistranscribe Indian English accents and names. | Auto-detects caller prefix: `+91` uses `language="en-IN"` and Amazon Polly Neural voice `Polly.Kajal-Neural`. `+1` uses `en-US` and `Polly.Joanna-Neural`. Configurable via `TWILIO_SPEECH_LANGUAGE=auto` in `.env`. |
| **Speech Pause Timeout (`speechTimeout`)** | Twilio's `"auto"` speech timeout cuts off callers mid-sentence if they pause for 0.5s to think. | Configured with `speechTimeout="2"` (positive integer). Gives callers 2 full seconds of pause before finalizing speech. |
| **Gather Listen Timeout (`timeout`)** | Default 4s is rushed over cellular audio networks. | Configured with `timeout="6"`. Callers have 6 comfortable seconds to start speaking after the prompt ends. |
| **Acoustic Vocabulary Hints (`hints`)** | Speech recognition engines can miss uncommon proper nouns or technical terms. | Twilio `<Gather>` includes biasing hints: `"Rajnish, Kumar, Robotic, email services, cloud hosting, AI automation, gmail, yahoo, phone number, email address, at the rate, dot com"`. |
| **Multi-Turn Question Guard** | Call terminates only AFTER closing farewell, NEVER while asking a question. | The agent will never hang up on an unanswered question (`?`), ensuring all 4 required intake fields (Name, Company, Service, Contact Channel) are collected. |
| **Spoken Email Normalization** | Callers speak emails phonetically (e.g. *"rajnish at gmail dot com"*). | Pre-processing converts spoken prepositions (`at the rate`, `at ... dot com`) to standard RFC email format (`user@domain.com`) before pushing to Bitrix24. |

---

### Option B: ngrok (Alternative)

If using ngrok:
```bash
ngrok http 8000
```
1. Copy the forwarding address (e.g. `https://abc-123.ngrok-free.app`).
2. Set `PUBLIC_BASE_URL=https://abc-123.ngrok-free.app` in `backend/.env`.
3. Set the Twilio webhook to `https://abc-123.ngrok-free.app/api/twilio/voice`.

---

### Testing Your Live Phone Call:
1. **Inbound Call**: Dial your Twilio phone number directly from your mobile phone.
2. **Outbound Call Trigger**: Open the React Dashboard (**`http://localhost`** when using Docker, or `http://localhost:5173` for Vite dev), enter your phone number under **"Dial Your Mobile Phone"**, and click **"Ring My Mobile Phone"**.
3. Speak naturally to the AI bot as it dynamically asks questions based on what you say.
4. Watch the dialogue stream live on the dashboard in chat format.
5. When the call ends, verify the newly created lead in Bitrix24!

---

## 💻 In-Browser Voice Call Simulator

If you don't have a paid Twilio number handy during review, use the **Live Call Simulator** on the React dashboard:

1. Open **[http://localhost](http://localhost)** (or `http://localhost:5173` in local dev).
2. Click **"Dial & Start Voice Call"**.
3. The AI agent will speak Question 1 out loud through your speakers.
4. You can:
   - Click **"Speak with Mic"** and speak your response into your microphone (Web Speech API will transcribe it in real time).
   - Or click one of the **Quick Test Personas** (e.g., *Nexus Technologies*, *Miller Freightways*, *CarePoint Systems*).
5. Click **"Send Answer"** for each of the 3 questions.
6. Upon Question 3, the bot says the closing message, extracts entities, and immediately pushes the lead into Bitrix24!

---

## 🧪 Automated Test Suite

Run the full pytest suite (8 integration and unit tests):

```bash
# Activate virtual environment
backend\venv\Scripts\activate

# Run pytest
pytest -v
```

### Test Coverage:
- `test_bitrix.py`: Verifies Bitrix24 payload formatting, field mapping, and Mock Mode handler.
- `test_nlp.py`: Verifies entity extraction across diverse caller speech formats (name, company, service, contact).
- `test_flow.py`: Verifies root endpoint, health check, full 3-step call simulator lifecycle, and Twilio TwiML `<Gather>` generation.

---

## 🐳 Docker & Production VPS Deployment

Deploy everything (FastAPI backend + Nginx-hosted React frontend) with a single command:

```bash
# Build and run containers
docker-compose up --build -d

# Check running status
docker-compose ps
```

- Web Dashboard: `http://<your-vps-ip>`
- Backend API Docs: `http://<your-vps-ip>:8000/docs`

---

## ⚙️ Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `ENVIRONMENT` | `development` | Environment mode (`development` / `production`) |
| `PORT` | `8000` | FastAPI server port |
| `DATABASE_URL` | `sqlite+aiosqlite:///./voice_agent.db` | Database connection string (SQLite or PostgreSQL) |
| `BITRIX24_WEBHOOK_URL` | `""` | Bitrix24 Inbound Webhook URL (`https://xyz.bitrix24.com/rest/1/.../`) |
| `BITRIX24_DEFAULT_ASSIGNED_BY_ID` | `1` | Responsible employee ID in Bitrix24 |
| `PUBLIC_BASE_URL` | `http://localhost:8000` | Public URL for Twilio webhook callback routing |
| `TWILIO_ACCOUNT_SID` | `""` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | `""` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | `""` | Configured Twilio phone number |
| `NLP_PROVIDER` | `openai` | NLP extraction provider: `openai`, `heuristic`, or `ollama` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Local Ollama endpoint |
| `OLLAMA_MODEL` | `llama3.2` | Ollama model name |
| `OPENAI_API_KEY` | `""` | OpenAI API key for dynamic dialogue & extraction |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model identifier |

---

## 🎯 Assessment Requirements Compliance Matrix

| Requirement from `agent_req.txt` | Implementation in Codebase | Status |
|---|---|:---:|
| **1. Public phone number receives call and hands it to bot** | Configured Twilio Voice webhook (`/api/twilio/voice`) with inbound & outbound telephony dispatch. | ✅ **100% Covered** |
| **2. Bot plays text-to-speech greeting and questions** | Amazon Polly Neural TTS (`Polly.Joanna-Neural`) & Web Speech API; dynamic OpenAI `gpt-4o-mini` conversational questions instead of rigid scripts. | ✅ **100% Covered** |
| **3. Caller responds; speech-to-text converts audio** | Twilio Google-powered telephony model (`speech_model="phone_call"`) & browser Web Speech Recognition API (`webkitSpeechRecognition`). | ✅ **100% Covered** |
| **4. NLP extracts “desired service”, “company name”, and “contact channel”** | `NLPService` extracts `caller_name`, `company_name`, `desired_service`, `contact_channel`, `phone`, `email`, and summary via OpenAI & regex fallback. | ✅ **100% Covered** |
| **5. JSON payload pushed into Bitrix24 as new lead via REST API** | `Bitrix24Service.create_lead` formats and posts to `crm.lead.add.json` with lead fields, transcript, and tags. Tested live against Bitrix24. | ✅ **100% Covered** |
| **6. Real-time Dialogue in Chat Format on UI** | `ConversationChatView` displays live incoming speech turns with distinct AI and Caller message bubbles, speaking/listening pulses, and auto-scrolling. | ✅ **100% Covered** |
| **7. Clean, well-commented source code** | Modular architecture across `api`, `services`, `models`, `schemas`, and `components` with comprehensive type hints. | ✅ **100% Covered** |
| **8. Automated testing & documentation** | 12 automated unit and integration tests passing (`pytest`); complete setup instructions and Docker files. | ✅ **100% Covered** |
| **9. Short screencast proving flow in action** | Live screen recording proving the end-to-end journey in action: [Watch Loom Screencast](https://www.loom.com/share/41921a55560b4d4fb12bc757952e0316). | ✅ **100% Covered** |
