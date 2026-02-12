# Sivera

**AI-Powered Interview Platform — Let Sia Handle the First Round**

Sivera automates technical and non-technical screening interviews through **Sia**, an AI voice interviewer. Recruiters design interview flows, invite candidates via email, and Sia conducts real-time voice interviews — evaluating responses and delivering structured analytics.

---

## Architecture

Sivera is split into four independently deployed services:

```
 RECRUITER SIDE                                            CANDIDATE SIDE
 ~~~~~~~~~~~~~~                                            ~~~~~~~~~~~~~~

 ┌──────────────────────┐                                  ┌──────────────────────┐
 │  Recruiter Dashboard │                                  │    Candidate App     │
 │  (Next.js + React)   │                                  │  (Next.js + React)   │
 │                      │                                  │                      │
 │  - Interview builder │                                  │  - Token login       │
 │  - Candidate mgmt    │         invitation email         │  - Voice interview   │
 │  - Analytics         │  ──────────────────────────────► │  - Code editor       │
 │  - Bulk invites      │         (token-based link)       │  - Screen recording  │
 └──────────┬───────────┘                                  └──────────┬───────────┘
            │                                                         │
            │ REST API                                                │ WebSocket
            │                                                         │ (Daily.co)
            ▼                                                         ▼
 ┌──────────────────────┐                                  ┌──────────────────────┐
 │   Recruiter Backend  │                                  │  Interview Backend   │
 │      (FastAPI)       │                                  │  (FastAPI + Pipecat) │
 │                      │                                  │                      │
 │  - CRUD & auth       │          ┌──────────┐           │  - Voice agent (Sia) │
 │  - Email (Loops.so)  │ ────────►│ Supabase │◄───────── │  - STT (Deepgram)    │
 │  - Scheduling        │          │ Postgres │           │  - TTS (ElevenLabs)  │
 │  - S3 recordings     │          └──────────┘           │  - LLM (Gemini/GPT)  │
 └──────────────────────┘                                  └──────────────────────┘

 recruiter.sivera.io        api.sivera.io       core.sivera.io        app.sivera.io
```

### How an interview flows

```
  Recruiter creates            Candidate receives           Sia conducts the
  interview + invites          email with token link         voice interview
  ─────────────────            ──────────────────            ─────────────────

  ┌─────────────┐    email     ┌─────────────┐   websocket  ┌─────────────┐
  │  Recruiter  │ ──────────►  │  Candidate   │ ──────────► │   Pipecat   │
  │  Dashboard  │              │     App      │              │  Voice Bot  │
  └──────┬──────┘              └──────┬───────┘              └──────┬──────┘
         │                            │                             │
         │ POST /interviews           │ Token verify                │ Real-time loop:
         │ POST /invites              │ Register + mic              │
         ▼                            ▼                             │  ┌─────────────┐
  ┌─────────────┐              ┌─────────────┐                     │  │  Candidate   │
  │  Recruiter  │              │  Interview   │                     │  │   speaks     │
  │   Backend   │              │   Backend    │ ◄──────────────────┘  └──────┬──────┘
  └──────┬──────┘              └──────┬───────┘                              │
         │                            │                              Deepgram (STT)
         │ Store interview            │ Spawn bot subprocess                 │
         │ Send invite email          │ Create Daily.co room                 ▼
         ▼                            ▼                              ┌─────────────┐
  ┌─────────────┐              ┌─────────────┐                      │ Gemini/GPT-4 │
  │  Supabase   │              │  Daily.co   │                      │  evaluates   │
  │  Postgres   │              │  WebRTC     │                      └──────┬──────┘
  └─────────────┘              └─────────────┘                             │
                                                                  ElevenLabs (TTS)
                                                                           │
                                                                    ┌──────▼──────┐
                                                                    │  Sia speaks  │
                                                                    │   back       │
                                                                    └─────────────┘
```

---

## Services

| Service | Directory | Stack | Port | URL |
|---------|-----------|-------|------|-----|
| Candidate App | `frontend/` | Next.js 15, React 19, TypeScript | 3000 | `app.sivera.io` |
| Recruiter Dashboard | `flowterview-app/` | Next.js 15, React 19, TypeScript | 3001 | `recruiter.sivera.io` |
| Interview Backend | `backend/` | FastAPI, Pipecat AI, Python 3.12 | 8000 | `core.sivera.io` |
| Recruiter Backend | `flowterview-backend/` | FastAPI, Supabase, Python 3.12 | 8010 | `api.sivera.io` |

---

## Tech Stack

### Frontend

| Technology | Purpose |
|-----------|---------|
| Next.js 15 + React 19 | App Router, server components |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Shadcn/UI + Radix | Component library |
| Zustand | Client state |
| TanStack React Query | Server state & caching |
| Framer Motion | Animations |
| Recharts | Analytics charts |
| Monaco Editor | In-browser code editor |
| React Flow | Visual interview flow builder |
| Pipecat Client + Daily.co | Real-time voice transport |

### Backend

| Technology | Purpose |
|-----------|---------|
| FastAPI | Async Python web framework |
| Supabase (PostgreSQL) | Database, auth, real-time |
| Pipecat AI | Voice agent orchestration |
| Daily.co | WebRTC rooms |

### AI & Voice

| Provider | Role |
|----------|------|
| Google Gemini 2.0 Flash | Primary LLM |
| OpenAI GPT-4 | Alternative LLM |
| Groq | Low-latency LLM inference |
| Anthropic Claude | Alternative LLM |
| Deepgram | Speech-to-text |
| ElevenLabs / Cartesia | Text-to-speech |
| Google STT/TTS | Speech services |

### Infrastructure

| Technology | Purpose |
|-----------|---------|
| Docker + Docker Compose | Containerization |
| GitHub Actions | CI/CD pipelines |
| AWS EC2 | Compute |
| AWS S3 + CloudFront | Recording storage & CDN |
| Vercel | Frontend hosting |
| Loops.so | Transactional email |

---

## Project Structure

```
sivera/
├── frontend/                          # Candidate App
│   ├── app/
│   │   ├── interview/page.tsx         # Token verification & registration
│   │   ├── round/page.tsx             # Multi-round selection
│   │   └── components/flowterview/
│   │       ├── main-component.tsx     # Interview orchestrator
│   │       ├── audio-client.tsx       # Voice interaction handler
│   │       ├── CodingEditor.tsx       # Monaco code editor
│   │       └── screen-recorder-optimized.tsx
│   └── package.json
│
├── flowterview-app/                   # Recruiter Dashboard
│   └── src/app/
│       ├── auth/                      # Login, signup, OAuth
│       └── dashboard/
│           ├── interviews/            # Interview CRUD & flow builder
│           ├── candidates/            # Candidate management
│           ├── analytics/             # Charts & scores
│           └── settings/              # Org configuration
│
├── backend/                           # Interview Voice Backend
│   ├── main.py                        # FastAPI entrypoint
│   └── src/
│       ├── router/path_router.py      # WebSocket endpoint
│       ├── services/
│       │   ├── bot_defaults.py        # Pipecat bot config
│       │   ├── interview_flow.py      # Flow execution
│       │   ├── handler_functions.py   # Response evaluation
│       │   ├── llm_factory.py         # Multi-LLM abstraction
│       │   └── tts_factory.py         # TTS provider selection
│       └── lib/manager.py             # Daily.co room management
│
├── flowterview-backend/               # Recruiter API Backend
│   ├── main.py                        # FastAPI entrypoint
│   └── src/router/
│       ├── interview_router.py        # Interview CRUD
│       ├── candidate_router.py        # Candidate management
│       ├── invites_router.py          # Bulk invitations
│       ├── analytics_router.py        # Performance metrics
│       ├── recording_router.py        # S3 video retrieval
│       ├── phone_screen_router.py     # Call scheduling
│       └── organization_router.py     # Multi-tenant orgs
│
├── docker-compose.candidate.yml
├── docker-compose.recruiter.yml
└── .github/workflows/
    ├── main-app-deploy.yml            # CI/CD: candidate services
    └── recruiter-app-deploy.yml       # CI/CD: recruiter services
```

---

## Features

### For Candidates

- **AI Voice Interviews** — Real-time conversation with Sia using natural voice
- **Coding Challenges** — Monaco editor with syntax highlighting and multi-language support
- **Jupyter Notebooks** — Interactive Python environment for data-focused roles
- **Screen Recording** — Automatic session capture uploaded to cloud storage
- **Multi-Round Support** — Complete distinct interview rounds (technical, behavioral, etc.)
- **Token-Based Access** — Secure one-time invitation links

### For Recruiters

- **Visual Interview Builder** — Drag-and-drop flow editor powered by React Flow
- **Auto-Generate from JD** — Paste a job description, get a complete interview workflow
- **Candidate Management** — Search, filter, bulk operations, status tracking
- **Bulk Invitations** — Send interview links to multiple candidates at once
- **Analytics Dashboard** — Completion rates, scores, satisfaction, and trends
- **Phone Screen Scheduling** — Automated scheduling with timezone support
- **Multi-Tenant Orgs** — Isolated workspaces with role-based access
- **Recording Playback** — Review interview recordings and transcripts

---

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- Docker & Docker Compose (for containerized setup)

### Run locally

```bash
# Candidate App
cd frontend && pnpm install && pnpm dev          # http://localhost:3000

# Recruiter Dashboard
cd flowterview-app && pnpm install && pnpm dev    # http://localhost:3001

# Interview Backend
cd backend && uv sync && uv run main.py           # http://localhost:8000

# Recruiter Backend
cd flowterview-backend && uv sync && uv run main.py  # http://localhost:8010
```

### Run with Docker

```bash
# Candidate services (frontend + interview backend)
docker-compose -f docker-compose.candidate.yml up --build

# Recruiter services (dashboard + recruiter backend)
docker-compose -f docker-compose.recruiter.yml up --build
```

---

## Environment Variables

Each service requires its own `.env` file. Key variables:

### Frontend Apps
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SIVERA_BACKEND_URL=
NEXT_PUBLIC_CORE_BACKEND_URL=
```

### Backend Services
```
SUPABASE_URL=
SUPABASE_KEY=
DAILY_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=
CARTESIA_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

> See each service's config for the complete list.

---

## Deployment

GitHub Actions handle CI/CD. On push to `main`:

- **`main-app-deploy.yml`** — Builds Docker images for candidate app + interview backend, deploys to AWS EC2
- **`recruiter-app-deploy.yml`** — Builds Docker images for recruiter dashboard + API backend, deploys to AWS EC2

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

Proprietary software. All rights reserved.

---

Built by the **Sivera** team.
