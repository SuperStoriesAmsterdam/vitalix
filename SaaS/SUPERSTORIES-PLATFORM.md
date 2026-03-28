# SuperStories Product Platform

**Version:** 1.0
**Date:** 18 March 2026
**Author:** SuperStories BV
**Applies to:** All SuperStories software products

---

## What This Is

This document defines the shared technical foundation that every SuperStories product is built on. It is not a per-product specification — it is the platform that sits underneath all products.

The principle is simple: build the stack once, understand it deeply, and apply it consistently. Every new product is a variation on the same foundation — not a fresh architectural decision. This reduces build time, reduces operational complexity, and means Claude Code works from a known, proven pattern every time.

When starting a new product, this document is the starting point. Product-specific decisions (data model, features, AI prompts, billing tiers) live in the product's own PRD. Everything in this document is already decided.

---

## 1. The Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend** | Python 3.11, FastAPI | Async-native, automatic OpenAPI docs, Pydantic type safety, fast to build with Claude Code |
| **ORM** | SQLAlchemy | Mature, full-featured, works with all PostgreSQL features |
| **Database** | PostgreSQL | Reliable, relational, handles JSON fields well, GDPR-friendly |
| **Migrations** | Alembic | Standard SQLAlchemy migration tool, auto-generates migration files |
| **Task queue** | ARQ + Redis | Background jobs for anything that should not block a user request |
| **File storage** | Cloudflare R2 | S3-compatible, no egress fees, European data residency available |
| **Frontend** | React 18, Vite, TailwindCSS | Fast builds, component-based, works well with Claude Code generation |
| **Containers** | Docker | Consistent environments from development to production |
| **Deployment** | Coolify | Makes Docker invisible — browser-based deployment interface on any VPS |
| **Recommended server** | Hetzner VPS | Excellent value, European data centres (GDPR), any VPS works |
| **Email** | Resend API | Simple API, good deliverability, generous free tier |
| **Billing** | Stripe | Checkout, Webhooks, Customer Portal — full billing infrastructure |
| **Auth** | Magic link (email) | No password friction, works for prosumer and B2B contexts |
| **CI/CD** | GitHub Actions | Build, test, push Docker image to GHCR on tag |
| **Container registry** | GitHub Container Registry (GHCR) | Free for private images, integrated with GitHub Actions |

---

## 2. Why Each Choice Was Made

### FastAPI over Flask
Flask is synchronous by default. Every product in the SuperStories portfolio makes external API calls — to LLMs, to transcription services, to email providers. Synchronous handling of these calls creates concurrency bottlenecks. FastAPI is async-native, which means it handles many concurrent requests efficiently without threading complexity. It also generates OpenAPI documentation automatically and enforces type safety via Pydantic, which means fewer bugs and better Claude Code output.

### ARQ + Redis over synchronous processing
Any operation that calls an external API (OpenAI, Deepgram, Resend) takes time — anywhere from 1 to 30 seconds. Doing this synchronously means the user waits. ARQ + Redis moves these operations to a background queue: the user gets an immediate response, and the heavy work happens behind the scenes. Every SuperStories product has operations that belong in the background:

- AI summary generation after a voice reflection (VoiceReflect)
- Survey response analysis after submission (Talk to the Hand)
- Coaching session synthesis (Inner Guru)
- Recipe generation (The Natural)
- Email delivery (all products)
- Scheduled jobs: weekly summaries, reminders, digests (all products)

### Cloudflare R2 over S3
R2 is S3-compatible — any code written for S3 works with R2 without changes. The critical difference: R2 charges no egress fees. For products that serve files (audio, images, exports, documents), egress costs on S3 can become significant at scale. R2 eliminates that variable entirely.

### Coolify over raw Docker
Docker is the right packaging and deployment technology. But telling a non-technical client to run `docker-compose up -d` is a dealbreaker. Coolify is an open source deployment platform that installs on any VPS and provides a browser interface for managing Docker deployments. SuperStories installs Coolify once on a server; from that point, deploying or updating a product instance is a UI operation. Clients never touch Docker, never SSH into a server, never see a terminal.

### Magic link auth over passwords
Passwords create friction and support burden (forgotten passwords, reset flows, security requirements). Magic links — a one-click login sent to email — eliminate all of this. For prosumer products where the user base ranges from individuals to organisations, magic link is the right default. It works for personal journalers, coaches, and enterprise teams equally.

### PostgreSQL over alternatives
PostgreSQL handles relational data, JSON columns, full-text search, and complex queries in a single database. It is well-supported by every hosting provider, has excellent tooling, and is the right default for products that need data integrity and the ability to query flexibly as requirements evolve.

---

## 3. Development Environment

Local development does not require Docker. The stack runs directly via Homebrew on macOS (tested on M-series Macs):

```
PostgreSQL    — via Homebrew, runs as a local service
Redis         — via Homebrew, runs as a local service
FastAPI app   — via uvicorn, hot-reload enabled
ARQ worker    — separate process, watches the Redis queue
Frontend      — via Vite dev server
```

Docker is only used in production (via Coolify on a VPS). This separation keeps local development fast and simple — no Docker Desktop required, no container startup overhead.

### Local setup (new product)

```bash
# Install dependencies
brew install postgresql redis
pip install fastapi uvicorn sqlalchemy alembic arq redis

# Start services
brew services start postgresql
brew services start redis

# Run migrations
alembic upgrade head

# Start backend
uvicorn app.main:app --reload

# Start ARQ worker (separate terminal)
arq app.worker.WorkerSettings

# Start frontend (separate terminal)
cd frontend && npm run dev
```

---

## 4. LLM Architecture

Every SuperStories product that uses AI is built on a **provider abstraction layer** — a single internal interface that routes to whichever LLM backend is configured via environment variable.

### Supported backends

| Provider | Type | Use case |
|----------|------|----------|
| OpenAI (GPT-4o) | Cloud | Default for SaaS deployments |
| Anthropic (Claude Sonnet) | Cloud | Alternative cloud; preferred for nuanced conversational AI |
| Ollama | Local | Self-hosted open source models (Llama 3, Mistral, Phi, Gemma) |
| Any OpenAI-compatible endpoint | Local or cloud | Covers most self-hosted inference servers |

### Configuration

```bash
# .env
LLM_PROVIDER=openai          # openai | anthropic | ollama | compatible
LLM_MODEL=gpt-4o             # model name for the chosen provider
LLM_BASE_URL=                # only needed for ollama or compatible endpoints
ANTHROPIC_API_KEY=           # if provider = anthropic
OPENAI_API_KEY=              # if provider = openai
```

### Why this matters

- **No vendor lock-in** — swap providers without changing application code
- **Cost optimisation** — use a cheaper model for simple summaries, a more capable model for deep conversational AI
- **Data sovereignty** — for private VPS deployments, `LLM_PROVIDER=ollama` routes all inference to a local model; no reflection or user data ever leaves the client's infrastructure
- **Future-proofing** — as open source models improve, switching costs are zero

### Provider abstraction pattern (Python)

```python
# app/ai.py — identical across all products, copy as-is

import os
from openai import AsyncOpenAI
import anthropic

async def chat_completion(messages: list, system: str = None, temperature: float = 0.7) -> str:
    provider = os.getenv("LLM_PROVIDER", "openai")
    model = os.getenv("LLM_MODEL", "gpt-4o")

    if provider == "anthropic":
        client = anthropic.AsyncAnthropic()
        response = await client.messages.create(
            model=model,
            max_tokens=1000,
            system=system or "",
            messages=messages,
            temperature=temperature
        )
        return response.content[0].text

    else:  # openai, ollama, or any compatible endpoint
        base_url = os.getenv("LLM_BASE_URL") or None
        client = AsyncOpenAI(base_url=base_url)
        full_messages = ([{"role": "system", "content": system}] if system else []) + messages
        response = await client.chat.completions.create(
            model=model,
            messages=full_messages,
            temperature=temperature
        )
        return response.choices[0].message.content
```

---

## 5. Background Jobs (ARQ Pattern)

Every product has a worker file that defines background jobs. The pattern is identical across products — only the job functions differ.

```python
# app/worker.py

import arq
from app.jobs import generate_summary, send_email, process_transcription

class WorkerSettings:
    functions = [generate_summary, send_email, process_transcription]
    redis_settings = arq.connections.RedisSettings(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379))
    )
    max_jobs = 10
    job_timeout = 300  # 5 minutes max per job
```

### Enqueueing a job from a FastAPI endpoint

```python
# In a FastAPI route — fire and forget
from arq import create_pool

@router.post("/reflections")
async def submit_reflection(data: ReflectionIn, redis=Depends(get_redis)):
    reflection = await save_reflection(data)
    # Don't wait — queue it and return immediately
    await redis.enqueue_job("generate_summary", reflection.id)
    return {"status": "submitted"}
```

---

## 6. File Storage (Cloudflare R2 Pattern)

R2 is S3-compatible. The boto3 client works without changes.

```python
# app/storage.py — identical across all products

import boto3
import os

def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("R2_ENDPOINT_URL"),
        aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
        region_name="auto"
    )

async def upload_file(key: str, data: bytes, content_type: str) -> str:
    client = get_r2_client()
    bucket = os.getenv("R2_BUCKET_NAME")
    client.put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
    return f"{os.getenv('R2_PUBLIC_URL')}/{key}"
```

### Required .env variables

```bash
R2_ENDPOINT_URL=https://[account-id].r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=https://[your-public-domain]
```

---

## 7. Standard Project Structure

Every product follows the same directory layout. Claude Code should always use this structure.

```
[product]/
├── app/
│   ├── main.py              ← FastAPI app initialisation
│   ├── ai.py                ← LLM provider abstraction (copy as-is)
│   ├── storage.py           ← R2 file storage (copy as-is)
│   ├── worker.py            ← ARQ worker settings
│   ├── database.py          ← SQLAlchemy engine + session
│   ├── models.py            ← SQLAlchemy models
│   ├── schemas.py           ← Pydantic schemas (request/response)
│   ├── auth.py              ← Magic link auth
│   ├── email.py             ← Resend email sending
│   ├── billing.py           ← Stripe integration
│   ├── jobs/                ← Background job functions
│   │   ├── __init__.py
│   │   └── [product-specific jobs].py
│   └── routers/             ← FastAPI routers
│       ├── __init__.py
│       └── [feature].py     ← one file per feature area
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── alembic/                 ← Database migrations
├── .env.example
├── docker-compose.yml       ← Production (via Coolify)
├── Dockerfile
└── README.md
```

---

## 8. Standard Environment Variables

These variables are common across all products. Product-specific variables are defined in the product's own `.env.example`.

```bash
# ── Database ─────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/[product]

# ── Redis ────────────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379

# ── LLM ─────────────────────────────────────────────────────
LLM_PROVIDER=openai           # openai | anthropic | ollama | compatible
LLM_MODEL=gpt-4o
LLM_BASE_URL=                 # only for ollama / compatible
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# ── File storage (Cloudflare R2) ─────────────────────────────
R2_ENDPOINT_URL=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# ── Email ────────────────────────────────────────────────────
RESEND_API_KEY=
EMAIL_FROM=noreply@superstories.nl

# ── Billing ──────────────────────────────────────────────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=

# ── App ──────────────────────────────────────────────────────
APP_SECRET_KEY=               # for signing magic link tokens
APP_BASE_URL=https://[product].superstories.nl
NODE_ENV=production
```

---

## 9. Docker & Coolify Setup

### Dockerfile (standard, Python + React)

```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Runtime
FROM python:3.11-slim AS runtime
WORKDIR /app

# Embed public key at build time (for licence validation)
ARG SUPERSTORIES_PUBLIC_KEY
ENV SUPERSTORIES_PUBLIC_KEY=$SUPERSTORIES_PUBLIC_KEY

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./
COPY --from=frontend-builder /app/frontend/dist ./static

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

### docker-compose.yml (production via Coolify)

```yaml
services:
  app:
    image: ghcr.io/superstories/[PRODUCT]:latest
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  worker:
    image: ghcr.io/superstories/[PRODUCT]:latest
    command: ["arq", "app.worker.WorkerSettings"]
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: [PRODUCT]
      POSTGRES_USER: [PRODUCT]
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U [PRODUCT]"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
```

### Coolify deployment notes

- Install Coolify on any VPS with one script: `curl -fsSL https://get.coolify.io | bash`
- Add the VPS as a server in Coolify
- Create a new application, point it at the GitHub repo and Docker Compose file
- Set environment variables in the Coolify UI (never commit `.env` to git)
- Coolify handles SSL certificates automatically via Let's Encrypt
- Deployments trigger automatically on git tag push via GitHub Actions webhook

---

## 10. GitHub Actions (CI/CD)

```yaml
# .github/workflows/release.yml
name: Build & Push Docker Image

on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: |
            ghcr.io/superstories/[PRODUCT]:${{ github.ref_name }}
            ghcr.io/superstories/[PRODUCT]:latest
          build-args: |
            SUPERSTORIES_PUBLIC_KEY=${{ secrets.SUPERSTORIES_PUBLIC_KEY }}
```

---

## 11. Starting a New Product

Checklist when starting a new SuperStories product:

```
[ ] Create GitHub repo: github.com/superstories/[product]
[ ] Copy app/ structure from an existing product
[ ] Copy ai.py, storage.py, worker.py, auth.py, email.py as-is
[ ] Copy Dockerfile, docker-compose.yml, .env.example — replace [PRODUCT]
[ ] Copy GitHub Actions release workflow — replace [PRODUCT]
[ ] Define product-specific SQLAlchemy models in models.py
[ ] Define product-specific Pydantic schemas in schemas.py
[ ] Define product-specific background jobs in jobs/
[ ] Define product-specific FastAPI routers in routers/
[ ] Add product-specific .env variables to .env.example
[ ] Run alembic init + first migration
[ ] Set up ghcr.io/superstories/[PRODUCT] in GHCR
[ ] Create Coolify app on SuperStories shared server
[ ] Test full local development flow
[ ] Test full Docker build + Coolify deployment before first client
```

---

## 12. Products on This Platform

| Product | ID | Description | Status |
|---------|-----|-------------|--------|
| VoiceReflect | `voicereflect` | Voice-first journaling and training reflection | Production |
| SuperAds | `superads` | Self-hosted ad management for agencies | Phase 1 complete |
| Talk to the Hand | `tth` | Voice survey tool | Functional, needs Phase 2 |
| Inner Guru | `innerguru` | AI digital coach | Planned |
| The Natural | `natural` | AI chef / recipe tool | Planned |

---

*SuperStories BV — internal platform document — v1.0 — 2026-03-18*
