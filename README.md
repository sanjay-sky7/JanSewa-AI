# 🏛️ Jansewa AI — AI-Powered Governance Intelligence Platform

> **Sankalp hackathon 2025–2026** | Problem Statement: AI-Powered Real-Time Governance Intelligence for Indian Local Bodies

An end-to-end AI platform that empowers **elected local body leaders** with real-time intelligence for transparent, data-driven governance — from multilingual complaint intake to 4-layer verification and AI-generated communications.

**Offline-First**: The built-in Knowledge Base (8 modules, 3,000+ lines) handles ALL AI features locally. External APIs (Gemini, Whisper, Twitter) are optional enhancements — **zero API keys needed** to run the full platform.

---

## ✨ Key Features

| Feature | Technology | Description |
|---------|-----------|-------------|
| **Multilingual Voice Complaints** | OpenAI Whisper (optional) | Accept complaints in Hindi, English, and regional languages via speech-to-text |
| **AI Complaint Analysis** | Internal KB + Gemini (optional) | Auto-categorize, prioritize, detect duplicates, and summarize — works fully offline |
| **5-Factor Priority Scoring** | KB Priority Engine | Urgency × Impact × Recurrence × Sentiment × Vulnerability + seasonal/time boosts + 7 escalation rules |
| **4-Layer Verification** | GPS + Timestamp + Pixel-diff + Tamper | Multi-layer evidence verification — Vision API optional, pixel-diff built-in |
| **Social Media Intelligence** | KB Analysis + VADER + Twitter (opt.) | Offline sentiment, misinformation detection, crisis alerts, virality scoring |
| **AI Communications** | KB Bilingual Templates + Gemini (opt.) | Auto-draft press releases, citizen notices, and social updates in English & Hindi |
| **Internal Knowledge Base** | 8-Module Self-Contained Intelligence | 35+ complaint categories, 15 ward profiles, FAQ/SOPs, governance policies — zero API dependency |
| **Ward Heat Map** | Leaflet.js + OpenStreetMap | Geographic visualization of complaint density across 15+ wards |
| **Trust Score Dashboard** | Composite Algorithm | 5-component trust scoring for every ward across 7 time periods |
| **Public Transparency Portal** | React | Citizens can view ward scorecards, recent actions, and submit grievances |
| **Role-Based Access** | JWT + FastAPI | Leader, Department Head, Worker, and Admin roles with fine-grained permissions |

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────────────────────────────────────┐
│  React Frontend │◄──►│  FastAPI Backend                                  │
│  (Vite + TW)    │    │                                                  │
│                 │    │  ┌─────────┐  ┌────────────────────────────────┐  │
│  • Dashboard    │    │  │ Routers │  │ Knowledge Base (OFFLINE)       │  │
│  • Complaints   │    │  │ 7 routes│  │ • Complaint Categories (35+)  │  │
│  • Verification │    │  └────┬────┘  │ • Ward Database (15 wards)    │  │
│  • Social       │    │       │       │ • Keyword Classifier (NLP)    │  │
│  • Comms        │    │  ┌────▼────┐  │ • Priority Rules Engine       │  │
│  • Public       │    │  │ Models  │  │ • Response Templates (30)     │  │
│  • Login        │    │  │ 10 ORM  │  │ • Governance Policies & SLAs  │  │
└─────────────────┘    │  └────┬────┘  │ • FAQ / Resolution SOPs       │  │
                       │       │       │ • Social Media Analysis       │  │
                       │  ┌────▼─────┐ └──────────────┬───────────────┘  │
                       │  │ Postgres │       ┌────────▼─────────┐        │
                       │  │ + Redis  │       │ AI Services      │        │
                       │  └──────────┘       │ KB = PRIMARY     │        │
                       │                     │ Gemini = OPTIONAL │        │
                       │                     │ VADER = LOCAL     │        │
                       │                     └──────────────────┘        │
                       └──────────────────────────────────────────────────┘
```

### Intelligence Flow

```
Request → KB Analysis (always works, 0ms API latency)
            │
        Good enough? → YES → Return KB result
            │ NO
        Gemini available? → YES → Enhance with Gemini → Merge results
            │ NO
        Return KB result (still fully functional)
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Redis (optional, for caching)

### Option A: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/sanjay-sky7/JanSewa-AI
cd jansewa-ai
# Configure backend env
cp backend/.env.example backend/.env
# On Windows PowerShell, use:
# Copy-Item backend/.env.example backend/.env

# Edit required values (at least DATABASE_URL, DATABASE_SYNC_URL, JWT_SECRET)
# backend/.env
# Start all services
docker compose up -d --build
# Edit backend/.env — only DATABASE_URL and JWT_SECRET are required
# All API keys are OPTIONAL
```

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8000 |
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **PostgreSQL** | localhost:5432 |
| **Redis** | localhost:6379 |

Note:
- Open the app UI at http://localhost:3000.
- http://localhost:8000 is the backend API server (JSON responses).
- API root is available at http://localhost:8000/ and health check at http://localhost:8000/api/health.
- Citizens now receive SMS/WhatsApp confirmation when a complaint is registered if MSG91 variables are configured.

### Demo Citizen Credentials (Ward-Wise)

Use these pre-seeded citizen accounts to verify ward-specific behavior (complaint visibility, assignment flow, and dashboards). All demo citizens use the same password: `password123`.

| Ward | Name | Email (Login) | Mobile / Phone |
|------|------|----------------|----------------|
| 1 | Aarav Mehta | citizen.w01@jansewa.gov | +919800000001 |
| 2 | Isha Verma | citizen.w02@jansewa.gov | +919800000002 |
| 3 | Rohan Singh | citizen.w03@jansewa.gov | +919800000003 |
| 4 | Kriti Sharma | citizen.w04@jansewa.gov | +919800000004 |
| 5 | Aditya Yadav | citizen.w05@jansewa.gov | +919800000005 |
| 6 | Sneha Gupta | citizen.w06@jansewa.gov | +919800000006 |
| 7 | Nikhil Tiwari | citizen.w07@jansewa.gov | +919800000007 |
| 8 | Pallavi Patel | citizen.w08@jansewa.gov | +919800000008 |
| 9 | Yash Chauhan | citizen.w09@jansewa.gov | +919800000009 |
| 10 | Ritika Joshi | citizen.w10@jansewa.gov | +919800000010 |
| 11 | Harsh Agarwal | citizen.w11@jansewa.gov | +919800000011 |
| 12 | Neha Dubey | citizen.w12@jansewa.gov | +919800000012 |
| 13 | Karan Srivastava | citizen.w13@jansewa.gov | +919800000013 |
| 14 | Ananya Mishra | citizen.w14@jansewa.gov | +919800000014 |
| 15 | Devansh Kumar | citizen.w15@jansewa.gov | +919800000015 |

If your database was already seeded earlier, run this once to upsert these users:

```bash
cd backend
python -m seed_data
```

Data persistence across different machines:
- By default, Docker uses the local `postgres_data` volume on each machine, so users/complaints created on Machine A do not automatically appear on Machine B.
- To share the same accounts and complaints across systems, point both machines to the same PostgreSQL instance via `DATABASE_URL` / `DATABASE_SYNC_URL`.
- For citizen accounts, keep a phone number in the profile. Complaint ownership now uses authenticated identity and phone linkage for stronger matching.

### Option B: Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# Initialize database
psql -U postgres -c "CREATE DATABASE jansewa_db;"
psql -U postgres -d jansewa_db -f schema.sql

# Seed demo data
python -m seed_data

# Start server
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL async connection string | ✅ |
| `DATABASE_SYNC_URL` | PostgreSQL sync connection string | ✅ |
| `JWT_SECRET` | JWT signing secret | ✅ |
| `JWT_ALGORITHM` | Algorithm (default: `HS256`) | No |
| `JWT_EXPIRE_MINUTES` | Token expiry (default: `1440`) | No |
| `GEMINI_API_KEY` | Google Gemini API key | ❌ Optional — KB works without it |
| `OPENAI_API_KEY` | OpenAI Whisper API key | ❌ Optional — for speech-to-text |
| `TWITTER_BEARER_TOKEN` | Twitter/X API token | ❌ Optional — mock data fallback |
| `GOOGLE_MAPS_API_KEY` | Google Maps geocoding | ❌ Optional — KB has ward GPS |
| `REDIS_URL` | Redis connection string | ❌ Optional |
| `CLOUDINARY_URL` | Cloudinary image uploads | ❌ Optional |
| `MSG91_AUTH_KEY` | MSG91 auth key for SMS/WhatsApp APIs | ❌ Optional |
| `MSG91_SMS_FLOW_ID` | MSG91 flow id for complaint SMS updates | ❌ Optional |
| `MSG91_SMS_SENDER` | MSG91 sender id for SMS flows | ❌ Optional |
| `MSG91_WHATSAPP_FLOW_ID` | MSG91 flow id for WhatsApp updates | ❌ Optional |
| `MSG91_WHATSAPP_NUMBER` | MSG91 integrated WhatsApp number | ❌ Optional |
| `SMTP_HOST` | SMTP host for email notifications | ❌ Optional |
| `SMTP_PORT` | SMTP port (default `587`) | ❌ Optional |
| `SMTP_USERNAME` | SMTP username | ❌ Optional |
| `SMTP_PASSWORD` | SMTP password | ❌ Optional |
| `SMTP_FROM_EMAIL` | Sender email for complaint updates | ❌ Optional |

> **Zero API keys needed** to run the full platform. The Knowledge Base provides complaint classification, priority scoring, communications, and social analysis offline.

For complaint confirmations over SMS/WhatsApp, set MSG91 variables (`MSG91_AUTH_KEY`, `MSG91_SMS_FLOW_ID`, `MSG91_WHATSAPP_FLOW_ID`, and optionally `MSG91_SMS_SENDER` / `MSG91_WHATSAPP_NUMBER`). If these are placeholders or missing, complaint registration still works but external message delivery is skipped.

WhatsApp complaint bot (MSG91 webhook):
- Endpoint: `POST /api/whatsapp/webhook`
- Configure this URL in MSG91 incoming webhook settings.
- Supported citizen commands:
    - `REGISTER <complaint text>`
    - `REGISTER Ward 12 no water supply for 2 days`
    - `STATUS` (shows last complaints)
    - `STATUS <complaint_id>`
    - `HELP`

---

## 📁 Project Structure

```
jansewa-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                          # FastAPI entry point
│   │   ├── config.py                        # Settings & environment
│   │   ├── database.py                      # Async SQLAlchemy setup
│   │   ├── models/                          # 10 SQLAlchemy ORM models
│   │   │   ├── ward.py                      #   Ward with GPS & vulnerability
│   │   │   ├── category.py                  #   Complaint categories
│   │   │   ├── user.py                      #   Users with role-based access
│   │   │   ├── citizen.py                   #   Citizen profiles
│   │   │   ├── complaint.py                 #   Complaints with AI fields
│   │   │   ├── verification.py              #   4-layer verification records
│   │   │   ├── social_post.py               #   Social media posts & analysis
│   │   │   ├── communication.py             #   AI-generated communications
│   │   │   ├── trust_score.py               #   Ward trust score history
│   │   │   └── audit_log.py                 #   Action audit trail
│   │   ├── schemas/                         # Pydantic request/response schemas
│   │   │   ├── complaint.py                 #   Complaint create/response/stats
│   │   │   ├── dashboard.py                 #   Dashboard overview/heatmap
│   │   │   └── verification.py              #   Verification submit/response
│   │   ├── routers/                         # 7 API route modules
│   │   │   ├── auth.py                      #   Login, register, me
│   │   │   ├── complaints.py                #   CRUD + AI pipeline + priority queue
│   │   │   ├── verification.py              #   4-layer verification submit/approve
│   │   │   ├── social.py                    #   Feed, sentiment, alerts, scan
│   │   │   ├── communications.py            #   Generate, approve, publish
│   │   │   ├── dashboard.py                 #   Overview, heatmap, trends, trust
│   │   │   └── public.py                    #   Ward scorecards, citizen complaints
│   │   ├── services/                        # 9 AI/ML service modules (KB-first)
│   │   │   ├── ai_service.py                #   NLP extraction (KB + Gemini)
│   │   │   ├── priority_service.py          #   5-factor priority scoring (KB rules)
│   │   │   ├── sentiment_service.py         #   VADER + KB word lists
│   │   │   ├── social_service.py            #   Social analysis (KB + Twitter)
│   │   │   ├── comms_service.py             #   Communication gen (KB templates)
│   │   │   ├── verification_service.py      #   4-layer verification (pixel-diff)
│   │   │   ├── vision_service.py            #   Image analysis
│   │   │   ├── stt_service.py               #   Speech-to-text (Whisper)
│   │   │   └── trust_service.py             #   Trust score calculation
│   │   ├── knowledge_base/                  # 🧠 8-module internal intelligence
│   │   │   ├── complaint_categories.py      #   35+ subcategories, 500+ keywords
│   │   │   ├── ward_database.py             #   15 ward profiles, demographics, GPS
│   │   │   ├── keyword_classifier.py        #   Offline NLP (classify, dedup, summarize)
│   │   │   ├── priority_rules.py            #   7 escalation rules, seasonal boosts
│   │   │   ├── response_templates.py        #   30 bilingual templates (5×3×2)
│   │   │   ├── governance_policies.py       #   SLAs, dept routing, shifts, holidays
│   │   │   ├── faq_resolutions.py           #   SOPs for 20+ complaint types
│   │   │   └── social_analysis.py           #   Sentiment, misinfo, crisis detection
│   │   └── utils/                           # Auth, geocoding, EXIF helpers
│   ├── tests/                               # Pytest test suite
│   ├── schema.sql                           # PostgreSQL DDL (9 tables + indexes)
│   ├── seed_data.py                         # Demo data seeder
│   ├── requirements.txt                     # Python dependencies
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx                          # React Router setup
│   │   ├── components/
│   │   │   ├── Common/                      # Navbar, Sidebar, Footer, Spinner
│   │   │   └── Dashboard/                   # StatsCards, PriorityQueue, HeatMap, Charts
│   │   ├── pages/                           # 7 page components
│   │   │   ├── LeaderDashboard.jsx          #   Main dashboard with stats & heatmap
│   │   │   ├── ComplaintDetail.jsx          #   Single complaint view + actions
│   │   │   ├── VerificationPage.jsx         #   4-layer verification interface
│   │   │   ├── SocialMediaInsights.jsx      #   Social feed, sentiment, alerts
│   │   │   ├── Communications.jsx           #   AI communication generator
│   │   │   ├── PublicPortal.jsx             #   Citizen-facing transparency portal
│   │   │   └── Login.jsx                    #   Authentication page
│   │   ├── services/api.js                  # Axios API client
│   │   └── context/AuthContext.jsx          # Auth context & provider
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml                       # 4 services (backend, frontend, postgres, redis)
├── .github/workflows/deploy.yml             # CI/CD: lint, test, deploy
└── README.md
```

---

## 📡 API Endpoints

### Auth (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login → returns JWT + user info | No |
| POST | `/api/auth/register` | Register new user | No |
| GET | `/api/auth/me` | Get current authenticated user | Yes |

### Complaints (`/api/complaints`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/complaints` | Create complaint (runs AI pipeline: NLP + priority scoring) | No |
| GET | `/api/complaints` | List complaints (paginated, filter by status/ward/category/priority/search) | No |
| GET | `/api/complaints/mine` | List complaints owned by current citizen account | Yes |
| GET | `/api/complaints/assigned/me` | Worker/Ops queue: complaints assigned to current user | Yes |
| GET | `/api/complaints/citizen/notifications` | Citizen notification feed for status/assignment updates | Yes |
| POST | `/api/complaints/citizen/notifications/mark-seen` | Mark citizen notifications as seen | Yes |
| GET | `/api/complaints/priority-queue` | Priority-sorted active complaints | No |
| GET | `/api/complaints/stats` | Complaint statistics (open, critical, resolved) | No |
| GET | `/api/complaints/ward/{ward_id}` | Complaints by ward | No |
| GET | `/api/complaints/{complaint_id}` | Single complaint detail | No |
| GET | `/api/complaints/{complaint_id}/assignment-recommendations` | Same-ward + category-specialized worker suggestions | Yes |
| GET | `/api/complaints/{complaint_id}/feedback` | Latest leader feedback for complaint | Yes |
| PUT | `/api/complaints/{complaint_id}/assign` | Assign complaint to worker | Yes |
| PUT | `/api/complaints/{complaint_id}/status` | Update complaint status | Yes |

### Verification (`/api/verification`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/verification/{complaint_id}` | Submit after-photo for 4-layer AI verification | Yes |
| GET | `/api/verification/{complaint_id}` | Get verification result | No |
| POST | `/api/verification/{id}/approve` | Leader approves/rejects verification | Yes |

### Social Media (`/api/social`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/social/feed` | Latest social media posts | No |
| GET | `/api/social/sentiment` | Aggregate sentiment breakdown | No |
| GET | `/api/social/alerts` | Viral posts & misinformation alerts | No |
| POST | `/api/social/scan` | Trigger manual social media scan | No |

### Communications (`/api/communications`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/communications/generate` | AI-generate bilingual communication draft | No |
| GET | `/api/communications` | List communications | No |
| PUT | `/api/communications/{id}/approve` | Approve a communication | Yes |
| POST | `/api/communications/{id}/publish` | Publish a communication | Yes |

### WhatsApp Bot (`/api/whatsapp`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/whatsapp/webhook` | Citizen WhatsApp commands: REGISTER / STATUS / HELP | No |

### Dashboard (`/api/dashboard`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/dashboard/overview` | Key stats: open, critical, resolved, trust score, trends | No |
| GET | `/api/dashboard/ward-heatmap` | Per-ward complaint count + GPS for heatmap | No |
| GET | `/api/dashboard/sentiment-trend` | Daily sentiment over 7–90 days | No |
| GET | `/api/dashboard/trust-scores` | Latest trust score per ward | No |

### Public Portal (`/api/public`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/public/ward/{ward_id}/scorecard` | Ward scorecard (total, resolved, rate, trust) | No |
| GET | `/api/public/ward/{ward_id}/actions` | Recently resolved complaints | No |
| GET | `/api/public/ward/{ward_id}/trust` | Latest trust score | No |
| POST | `/api/public/complaint` | Citizen submits complaint (no auth needed) | No |

Full interactive docs at **`/docs`** (Swagger UI).

---

## 🧠 Knowledge Base Architecture

The platform includes a **complete self-contained intelligence layer** (8 modules, 3,000+ lines) that replaces/supplements all external AI APIs:

| KB Module | What It Does | Key Data |
|-----------|-------------|----------|
| `complaint_categories` | Taxonomy of civic complaints | 8 categories, 35+ subcategories, 500+ keywords (EN/HI/transliterated) |
| `ward_database` | Ward profiles & demographics | 15 Delhi wards with GPS, population, infrastructure metrics, vulnerability scores |
| `keyword_classifier` | Offline NLP engine | Classification, emergency detection, duration extraction, duplicate detection, summarization |
| `priority_rules` | Deterministic priority scoring | 7 escalation rules, seasonal adjustments (monsoon/summer), time-of-day boosts |
| `response_templates` | Bilingual communication drafts | 5 comm types × 3 formats × 2 languages = 30 templates |
| `governance_policies` | SLAs & operational rules | 8 departments with escalation chains, shift schedules, 20 gazetted holidays, trust scoring |
| `faq_resolutions` | SOPs & citizen FAQ | 20+ complaint types with step-by-step resolution, required resources, prevention tips |
| `social_analysis` | Social media intelligence | Sentiment analysis, misinformation detection, crisis alerts, virality estimation |

### Service Integration

| Service | Before KB | After KB |
|---------|-----------|----------|
| `ai_service.py` | 100% Gemini | **KB classifier PRIMARY** → Gemini optional enhancement |
| `comms_service.py` | 100% Gemini | **KB templates PRIMARY** → Gemini polish optional |
| `social_service.py` | Twitter + Gemini | **KB analysis PRIMARY** → VADER + Gemini optional |
| `priority_service.py` | DB queries only | **DB + KB escalation rules**, SLA, department routing |
| `sentiment_service.py` | VADER only | **VADER + KB Hindi/transliterated word lists** |
| `verification_service.py` | Gemini Vision for Layer 3 | **Pixel-diff PRIMARY** → Gemini Vision optional |

---

## 🗄️ Database Schema

9 tables with 6 performance indexes:

| Table | Records (Seed) | Description |
|-------|---------------|-------------|
| `wards` | 15 | Ward profiles with GPS, population, vulnerability flag |
| `categories` | 8 | Complaint categories with urgency scores & department |
| `users` | 10 | Staff with role-based access (Leader, Dept Head, Worker, Admin) |
| `citizens` | 20 | Citizen profiles (supports anonymous complaints) |
| `complaints` | 50 | Full AI pipeline fields: summary, priority scores, status, assignment |
| `verifications` | 10 | 4-layer verification results & before/after evidence |
| `social_posts` | 30 | Social media posts with sentiment, misinformation flags |
| `communications` | 10 | AI-generated bilingual communications with approval workflow |
| `trust_scores` | 105 | Daily trust scores per ward (15 wards × 7 days) |
| `audit_logs` | — | Action audit trail for accountability |

---

## 🧪 Demo Credentials

All demo accounts use password: **`password123`**

### Ward Leaders (15 wards, Indian names)

| Ward | Leader Name | Leader Email | Role |
|------|-------------|--------------|------|
| 1 | Sunita Sharma | `leader.w01@jansewa.gov` | LEADER |
| 2 | Rakesh Verma | `leader.w02@jansewa.gov` | LEADER |
| 3 | Anita Yadav | `leader.w03@jansewa.gov` | LEADER |
| 4 | Vikram Singh | `leader.w04@jansewa.gov` | LEADER |
| 5 | Pooja Gupta | `leader.w05@jansewa.gov` | LEADER |
| 6 | Rajesh Kumar | `leader.w06@jansewa.gov` | LEADER |
| 7 | Meena Joshi | `leader.w07@jansewa.gov` | LEADER |
| 8 | Amit Tiwari | `leader.w08@jansewa.gov` | LEADER |
| 9 | Kavita Mishra | `leader.w09@jansewa.gov` | LEADER |
| 10 | Sanjay Chauhan | `leader.w10@jansewa.gov` | LEADER |
| 11 | Neha Patel | `leader.w11@jansewa.gov` | LEADER |
| 12 | Deepak Sharma | `leader.w12@jansewa.gov` | LEADER |
| 13 | Lata Srivastava | `leader.w13@jansewa.gov` | LEADER |
| 14 | Rohit Agarwal | `leader.w14@jansewa.gov` | LEADER |
| 15 | Priyanka Dubey | `leader.w15@jansewa.gov` | LEADER |

### Ward Worker Specialists (7 per ward, 105 total)

Every ward gets category-specific workers using this pattern:

| Category specialization | Department | Email pattern (for ward `NN`) |
|-------------------------|------------|-------------------------------|
| Water specialist | Water Department | `wNN.water@jansewa.gov` |
| Road specialist | Roads Department | `wNN.road@jansewa.gov` |
| Electricity specialist | Electricity Department | `wNN.electricity@jansewa.gov` |
| Drainage specialist | Drainage Department | `wNN.drainage@jansewa.gov` |
| Sanitation specialist | Sanitation Department | `wNN.garbage@jansewa.gov` |
| Health specialist | Health Department | `wNN.health@jansewa.gov` |
| Public safety specialist | Safety Department | `wNN.safety@jansewa.gov` |

Examples with names (Indian names are seeded):
- Ward 1 workers: Arjun/Yadav style names with emails `w01.water@jansewa.gov`, `w01.road@jansewa.gov`, `w01.electricity@jansewa.gov`, `w01.drainage@jansewa.gov`, `w01.garbage@jansewa.gov`, `w01.health@jansewa.gov`, `w01.safety@jansewa.gov`
- Ward 12 workers: similarly named Indian workers with emails `w12.water@jansewa.gov`, `w12.road@jansewa.gov`, `w12.electricity@jansewa.gov`, `w12.drainage@jansewa.gov`, `w12.garbage@jansewa.gov`, `w12.health@jansewa.gov`, `w12.safety@jansewa.gov`

### Cross-Ward Operations Accounts

| Role | Email |
|------|-------|
| Worker (Sunny Kumar) | `sunny.worker@jansewa.gov` |
| Department Head (Water) | `dh.water@jansewa.gov` |
| Department Head (Roads) | `dh.roads@jansewa.gov` |
| Department Head (Health) | `dh.health@jansewa.gov` |
| Officer | `officer.publicworks@jansewa.gov` |
| Engineer | `engineer.roads@jansewa.gov` |
| Admin | `admin@jansewa.gov` |

> Run `python -m seed_data` to populate the database with demo data.

---

## 🌐 Deployment

### Docker Compose (Full Stack)

```bash
docker compose up --build -d
```

Services: `backend` (8000), `frontend` (3000/nginx), `postgres` (5432), `redis` (6379).

### Railway (Backend)

```bash
npm install -g @railway/cli
railway login
cd backend && railway up
```

### Vercel (Frontend)

```bash
cd frontend
npm install -g vercel
vercel --prod
```

### Supabase (Database)

1. Create a new Supabase project
2. Run `schema.sql` in the SQL editor
3. Run `python -m seed_data` with the Supabase connection string

---

## 🔧 CI/CD Pipeline

Defined in `.github/workflows/deploy.yml` — triggers on push/PR to `main`:

**Backend Job** (Python 3.11, Postgres 15 service):
1. Install dependencies → Lint with `ruff` → Run `pytest`
2. Deploy to Railway (on `main` push)

**Frontend Job** (Node 20):
1. Install dependencies → Lint with `eslint` → Build
2. Deploy to Vercel (on `main` push)

---

## ✅ Quick API Smoke Test

Use this script to validate key citizen flows after local changes:
- Auth register/login + profile update
- Voice complaint upload without typed text
- Image complaint upload path

```powershell
cd backend
./scripts/smoke-test-voice-image.ps1
```

Optional custom base URL:

```powershell
./scripts/smoke-test-voice-image.ps1 -BaseUrl "http://localhost:8000/api"
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.11, FastAPI 0.115, SQLAlchemy 2.0 (async), Pydantic v2 |
| **Database** | PostgreSQL 15 + asyncpg, Redis 7 |
| **Knowledge Base** | 8-module self-contained intelligence (3,000+ lines, zero external deps) |
| **AI/NLP** | Internal KB classifier (primary) + Google Gemini 1.5 Flash (optional) |
| **Speech-to-Text** | OpenAI Whisper (optional) |
| **Sentiment** | VADER + KB Hindi/English/transliterated word lists |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3.4 |
| **Maps** | Leaflet.js + react-leaflet + OpenStreetMap |
| **Charts** | Chart.js + react-chartjs-2 |
| **Auth** | JWT (python-jose) + bcrypt |
| **HTTP** | Axios (frontend), httpx (backend) |
| **Deploy** | Docker, Railway, Vercel, Supabase |
| **CI/CD** | GitHub Actions (ruff + pytest + deploy) |
| **Testing** | pytest + pytest-asyncio (backend), vitest (frontend) |

---

## 📄 License

MIT License — built for Smart India Hackathon 2025–2026.

---

## 👥 Team

Built with ❤️ for transparent governance in India.
