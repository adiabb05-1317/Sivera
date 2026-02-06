# Sivera

**AI-Powered Interview Platform — Let Sia Handle the First Round**

Sivera is an intelligent interview automation platform that streamlines technical and non-technical hiring through AI-driven voice interviews. The platform connects recruiters with candidates via **Sia**, an AI interviewer that conducts real-time voice-based screening interviews, evaluates responses, and delivers structured analytics.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Sivera consists of four core services:

| Service | Description | URL |
|---------|-------------|-----|
| **Candidate App** | Next.js app where candidates complete AI voice interviews | `app.sivera.io` |
| **Recruiter Dashboard** | Next.js app for managing interviews, candidates, and analytics | `recruiter.sivera.io` |
| **Interview Backend** | FastAPI service powering the AI voice agent (Pipecat) | `core.sivera.io` |
| **Recruiter Backend** | FastAPI service handling CRUD, auth, scheduling, and analytics | `api.sivera.io` |

---

## Architecture

```
                    ┌─────────────────────┐
                    │   Recruiter creates  │
                    │   interview workflow │
                    └──────────┬──────────┘
                               │
              ┌────────────────▼────────────────┐
              │      Recruiter Dashboard         │
              │      (Next.js 15 + React 19)     │
              └────────────────┬────────────────┘
                               │ REST API
              ┌────────────────▼────────────────┐
              │      Recruiter Backend           │
              │      (FastAPI + Supabase)        │
              │  - Interview CRUD                │
              │  - Candidate management          │
              │  - Email invitations (Loops)     │
              │  - Analytics & scoring           │
              │  - Phone screen scheduling       │
              └────────────────┬────────────────┘
                               │
            Invitation email   │   Token-based link
                               ▼
              ┌────────────────────────────────┐
              │        Candidate App            │
              │      (Next.js 15 + React 19)    │
              │  - Token verification           │
              │  - Registration & permissions    │
              │  - Voice interview UI            │
              │  - Code editor (Monaco)          │
              │  - Screen recording              │
              └────────────────┬───────────────┘
                               │ WebSocket / Daily.co
              ┌────────────────▼────────────────┐
              │      Interview Backend           │
              │      (FastAPI + Pipecat AI)      │
              │  - Real-time voice agent (Sia)   │
              │  - STT (Deepgram / Google)       │
              │  - TTS (ElevenLabs / Cartesia)   │
              │  - LLM (Gemini / GPT-4 / Groq)  │
              │  - Transcript & evaluation       │
              └────────────────────────────────┘
```

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| Next.js 15 | React framework with App Router |
| React 19 | UI library |
| TypeScript | Type safety |
| Tailwind CSS 4 | Utility-first styling |
| Shadcn/UI + Radix | Component library |
| Zustand | Client state management |
| TanStack React Query | Server state & caching |
| Framer Motion | Animations |
| Recharts | Data visualization |
| Monaco Editor | In-browser code editor |
| React Flow | Visual interview flow builder |
| Daily.co + Pipecat Client | Real-time voice/video |

### Backend
| Technology | Purpose |
|-----------|---------|
| FastAPI | Python async web framework |
| Supabase | Auth, PostgreSQL database, real-time |
| Drizzle ORM | TypeScript database queries |
| Pipecat AI | Voice agent orchestration |
| LlamaIndex | RAG for context-aware responses |

### AI & Voice
| Technology | Purpose |
|-----------|---------|
| Google Gemini 2.0 Flash | Primary LLM |
| OpenAI GPT-4 | Alternative LLM |
| Groq | Low-latency LLM inference |
| Anthropic Claude | Alternative LLM |
| Deepgram | Speech-to-text |
| ElevenLabs | Text-to-speech |
| Cartesia | Text-to-speech |
| Google STT/TTS | Speech services |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| Docker | Containerization |
| GitHub Actions | CI/CD pipelines |
| AWS EC2 | Compute hosting |
| AWS S3 + CloudFront | Recording storage & CDN |
| Vercel | Frontend hosting |
| Loops.so | Transactional email |

---

## Project Structure

```
core/
├── frontend/                       # Candidate Interview App
│   ├── app/
│   │   ├── page.tsx               # Entry point
│   │   ├── interview/page.tsx     # Interview flow (token, registration, permissions)
│   │   ├── round/page.tsx         # Multi-round selection
│   │   └── components/
│   │       └── flowterview/       # Interview components
│   │           ├── main-component.tsx        # Core interview orchestrator
│   │           ├── audio-client.tsx          # Voice interaction handler
│   │           ├── CodingEditor.tsx          # Monaco code editor
│   │           ├── JupyterNotebook.tsx       # Jupyter integration
│   │           ├── screen-recorder-optimized.tsx  # Screen recording
│   │           └── conclusion-section.tsx    # Interview wrap-up
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.ts
│
├── flowterview-app/                # Recruiter Dashboard App
│   └── src/app/
│       ├── auth/                  # Login, signup, OAuth callbacks
│       └── dashboard/
│           ├── page.tsx           # Overview with stats
│           ├── interviews/        # Interview CRUD & flow builder
│           ├── candidates/        # Candidate management & bulk invite
│           ├── analytics/         # Charts, completion rates, scores
│           └── settings/          # Organization configuration
│
├── backend/                        # Interview Voice Backend
│   ├── main.py                    # FastAPI entry point
│   └── src/
│       ├── router/path_router.py  # WebSocket voice endpoint
│       ├── services/              # Bot configuration & orchestration
│       ├── llm_handler/           # Multi-LLM integration
│       └── lib/manager.py         # Daily.co room management
│
├── flowterview-backend/            # Recruiter API Backend
│   ├── main.py                    # FastAPI entry point
│   └── src/
│       ├── router/                # REST API endpoints
│       │   ├── interview_router.py
│       │   ├── candidate_router.py
│       │   ├── invites_router.py
│       │   ├── analytics_router.py
│       │   ├── recording_router.py
│       │   ├── phone_screen_router.py
│       │   └── organization_router.py
│       ├── services/              # Business logic
│       └── utils/
│           ├── auth_middleware.py
│           └── llm_factory.py     # LLM provider abstraction
│
├── docker-compose.candidate.yml    # Docker: candidate services
├── docker-compose.recruiter.yml    # Docker: recruiter services
└── .github/workflows/
    ├── main-app-deploy.yml        # CI/CD: candidate app
    └── recruiter-app-deploy.yml   # CI/CD: recruiter app
```

---

## Features

### For Candidates

- **AI Voice Interviews** — Real-time conversation with Sia, the AI interviewer, using natural voice interaction
- **Coding Challenges** — Integrated Monaco code editor with syntax highlighting and multi-language support
- **Jupyter Notebooks** — Interactive Python notebook environment for data-focused roles
- **Screen Recording** — Automatic session recording with secure upload to cloud storage
- **Multi-Round Support** — Complete multiple interview rounds with distinct focus areas
- **Token-Based Access** — Secure, one-time invitation links with verification

### For Recruiters

- **Visual Interview Builder** — Drag-and-drop interview flow editor powered by React Flow
- **Auto-Generate from Job Description** — Paste a JD and let AI create a complete interview workflow
- **Candidate Management** — Track candidate status, search, filter, and perform bulk operations
- **Bulk Invitations** — Send interview invitations to multiple candidates via email
- **Analytics Dashboard** — Completion rates, performance scores, satisfaction ratings, and trend analysis
- **Phone Screen Scheduling** — Automated scheduling with timezone support
- **Multi-Tenant Organizations** — Isolated workspaces with role-based access (Admin, Interviewer)
- **LinkedIn Integration** — OAuth login and candidate profile import
- **Recording Playback** — Review candidate interview recordings and transcripts

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.12+
- Docker & Docker Compose (for containerized setup)
- PostgreSQL (via Supabase)

### Candidate App (frontend)

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3000`

### Recruiter Dashboard (flowterview-app)

```bash
cd flowterview-app
npm install
npm run dev
```

Runs on `http://localhost:3001`

### Interview Backend (backend)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Recruiter Backend (flowterview-backend)

```bash
cd flowterview-backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### Docker Setup

```bash
# Candidate services
docker-compose -f docker-compose.candidate.yml up --build

# Recruiter services
docker-compose -f docker-compose.recruiter.yml up --build
```

---

## Environment Variables

Each service requires its own `.env` file. Key variables include:

### Frontend Apps
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_DAILY_API_KEY=
```

### Backend Services
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
DAILY_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=
CARTESIA_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
LOOPS_API_KEY=
```

> Refer to each service's config file for the complete list of required variables.

---

## Deployment

### CI/CD

GitHub Actions workflows handle automated deployment:

- **`main-app-deploy.yml`** — Builds and deploys the candidate app and interview backend to AWS EC2
- **`recruiter-app-deploy.yml`** — Builds and deploys the recruiter dashboard and API backend

### Production URLs

| Service | URL |
|---------|-----|
| Candidate App | `https://app.sivera.io` |
| Recruiter Dashboard | `https://recruiter.sivera.io` |
| Interview Backend | `https://core.sivera.io` |
| Recruiter API | `https://api.sivera.io` |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "Add your feature"`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

This project is proprietary software. All rights reserved.

---

Built with purpose by the **Sivera** team.
