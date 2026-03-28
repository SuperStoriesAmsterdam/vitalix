# CLAUDE.md — SuperStories Product Repository

This file is read by Claude Code at the start of every session. It defines how Claude Code should build, review, and maintain code in this repository. Follow all instructions in this file unless explicitly overridden in the current session.

Reference documents (read these before making architectural decisions):
- `SUPERSTORIES-PLATFORM.md` — the canonical stack and patterns
- `SUPERSTORIES-DISTRIBUTION.md` — the hosting and licence model
- `PRD.md` — the product requirements (what to build and for whom)

---

## 1. Who You Are Working With

You are working with a non-developer founder. He directs, reviews, and deploys. He does not write code himself. This has two implications:

**When building:** Write code that is as readable as possible. Prefer explicit over clever. A future developer (or a future Claude Code session) needs to understand what every function does without context. Name things clearly. No abbreviations in variable names. No magic numbers without a comment.

**When something is wrong:** Do not just fix it silently. Explain what was wrong, why it was wrong, and what you changed — in plain language, not programming jargon. The founder needs enough vocabulary to describe problems to you in future sessions.

---

## 2. The Stack

Every decision defaults to the SuperStories platform stack defined in `SUPERSTORIES-PLATFORM.md`. Do not introduce new technologies without flagging it explicitly and explaining why the standard stack is insufficient.

### Core stack (all SaaS products)

| Layer | Technology | Do not substitute with |
|-------|-----------|----------------------|
| Backend | Python 3.11, FastAPI | Flask, Django, Node, anything else |
| ORM | SQLAlchemy 2.0+ | Tortoise, Peewee, raw SQL (except for complex reporting queries) |
| Database | PostgreSQL 15+ | SQLite in production, MySQL, MongoDB |
| Migrations | Alembic | Manual SQL, other migration tools |
| Containers | Docker | Any other container runtime |
| Deployment | Coolify | Manual deployment scripts |

### Conditional stack (use when the product needs it)

Not every product needs every layer. Only include what the PRD requires. If a layer is not needed, do not add it — dead infrastructure is worse than missing infrastructure.

| Layer | Technology | Include when |
|-------|-----------|-------------|
| Task queue | ARQ + Redis | Product has background jobs (AI generation, transcription, email sending, scheduled tasks) |
| File storage | Cloudflare R2 | Product handles file uploads (audio, images, documents) |
| Frontend | React 18, Vite, TailwindCSS | Product has a rich interactive UI. For simple admin panels, Jinja2 templates are acceptable. |
| Email | Resend API | Product sends transactional email (magic links, summaries, notifications) |
| Billing | Stripe | Product has paid tiers with self-service checkout |
| Auth | Magic link (email) | Product has user accounts. For internal tools, basic API key auth is acceptable. |
| LLM | Provider abstraction via `app/ai.py` | Product uses AI features |
| Real-time | Server-Sent Events (SSE) | Product needs live progress updates (e.g. generation progress) |

If a library is needed that is not listed here, choose the most widely adopted, best-maintained option. State your choice and why before adding it.

---

## 3. Project Structure

```
app/
├── main.py              ← FastAPI app init, router registration, lifespan
├── config.py            ← Settings via pydantic-settings (reads .env)
├── database.py          ← SQLAlchemy engine, session, Base
├── models.py            ← SQLAlchemy models
├── schemas.py           ← Pydantic schemas (request/response only — not models)
├── errors.py            ← Error response model and exception handlers
├── routers/             ← FastAPI routers, one file per feature area
│   ├── __init__.py
│   └── [feature].py
├── jobs/                ← ARQ background job functions (if needed)
│   ├── __init__.py
│   └── [feature].py
├── prompts/             ← LLM system prompts as module-level constants (if needed)
│   ├── __init__.py
│   └── [feature].py
├── ai.py                ← LLM provider abstraction (if needed — copy from platform doc)
├── storage.py           ← Cloudflare R2 (if needed — copy from platform doc)
├── worker.py            ← ARQ worker settings (if needed)
├── auth.py              ← Magic link generation and verification (if needed)
├── email.py             ← Resend email sending (if needed)
├── billing.py           ← Stripe integration (if needed)
└── licence.py           ← Licence key validation (copy from distribution doc)
frontend/                ← React app (if needed)
alembic/                 ← Database migrations
tests/                   ← Test files (mirrors app/ structure)
├── conftest.py          ← Shared fixtures (test db, test client, auth helpers)
├── test_[feature].py
scripts/
├── seed.py              ← Demo/development data seeder
├── upload_media.py      ← R2 media upload script (if needed)
.env.example
docker-compose.yml
Dockerfile
CLAUDE.md                ← this file
SUPERSTORIES-PLATFORM.md
SUPERSTORIES-DISTRIBUTION.md
PRD.md
README.md
```

Do not create files outside this structure without explaining why.

---

## 4. Code Quality — Standing Rules

These rules apply to every file touched in every session, not just new code.

### General
- No commented-out code blocks. If code is removed, it is gone. Git is the history.
- No TODO or FIXME comments without a specific description of what needs to be done. Never leave vague TODOs.
- No unused imports. Remove them when you see them.
- No unused variables, functions, or routes. If something is not called anywhere, remove it.
- No magic numbers. `MAX_COHORT_PARTICIPANTS = 200` not `if count > 200`.
- No deeply nested logic. If a function has more than 3 levels of indentation, refactor it.
- Functions do one thing. If a function is doing two things, split it.
- Every function has a docstring that describes what it does, its parameters, and what it returns — in plain English.

### Naming
- Variables, functions, and files use `snake_case`.
- Classes use `PascalCase`.
- Constants use `UPPER_SNAKE_CASE`.
- Names must describe what something is or does. `get_user_reflections_by_cohort` not `get_data`. `participant_email` not `pe`.

### FastAPI specifics
- Every router has a prefix and tags set.
- Every endpoint has a `response_model` set.
- Every endpoint has a one-line docstring.
- HTTP status codes are explicit — do not rely on FastAPI defaults for error responses.
- Use `Depends()` for all shared logic (auth, database sessions, licence checks).

### SQLAlchemy specifics
- Every model has `__tablename__` explicitly set.
- Every column has an explicit type — no implicit typing.
- Relationships are explicitly defined with `back_populates`.
- Never use `Session.execute(raw_sql)` for standard CRUD — use the ORM.
- Raw SQL is only acceptable for complex reporting queries that are genuinely difficult to express in ORM. Add a comment explaining why.

---

## 5. Error Handling — Consistent Patterns

Every product returns errors in the same shape. This makes frontend error handling predictable and debugging straightforward.

### Error response format

All API errors return this JSON structure:

```python
# app/errors.py

from pydantic import BaseModel
from fastapi import Request
from fastapi.responses import JSONResponse

class ErrorResponse(BaseModel):
    """Standard error response returned by all endpoints."""
    code: str          # machine-readable error code, e.g. "USER_NOT_FOUND"
    message: str       # human-readable explanation
    detail: str = None # optional technical detail (only in non-production)

# Register this as the global exception handler in main.py
async def api_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch unhandled exceptions and return a consistent error shape."""
    import logging
    logger = logging.getLogger(__name__)
    logger.exception(f"Unhandled exception on {request.method} {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"code": "INTERNAL_ERROR", "message": "Something went wrong."}
    )
```

### Raising errors in routers

```python
# WRONG — inconsistent error shapes
raise HTTPException(status_code=404, detail="Not found")
raise HTTPException(status_code=403, detail={"error": "No access"})

# CORRECT — consistent shape
raise HTTPException(
    status_code=404,
    detail={"code": "REFLECTION_NOT_FOUND", "message": "This reflection does not exist."}
)
raise HTTPException(
    status_code=403,
    detail={"code": "FEATURE_NOT_LICENSED", "message": "Deep reflection requires a Pro licence."}
)
```

### Logging

Use Python's built-in `logging` module with structured output. Do not use `print()` in production code.

```python
import logging
logger = logging.getLogger(__name__)

# In main.py — configure once at startup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s"
)
```

Log levels:
- `logger.info()` — normal operations worth recording (user created, job completed, licence validated)
- `logger.warning()` — something unexpected that is not an error yet (rate limit approaching, retry triggered)
- `logger.error()` — something failed that should be investigated (external API error, job failure)
- `logger.exception()` — same as error, but includes the full traceback. Use inside `except` blocks.

Never log: magic link tokens, licence keys, passwords, full request bodies containing user content, or API keys — even at DEBUG level.

### External API error handling

Every call to an external API (LLM providers, Deepgram, Resend, Stripe, Meta) must:
1. Have a try/except that catches connection errors and timeouts separately
2. Log the error with enough context to debug (which API, which operation, what input ID)
3. Return a clear error to the caller — never let a raw provider exception bubble to the user

```python
# WRONG
response = await client.chat.completions.create(...)  # unhandled

# CORRECT
try:
    response = await client.chat.completions.create(...)
except httpx.TimeoutException:
    logger.error(f"LLM timeout generating summary for reflection {reflection_id}")
    raise HTTPException(status_code=502, detail={
        "code": "LLM_TIMEOUT",
        "message": "The AI service took too long. Please try again."
    })
except Exception as e:
    logger.exception(f"LLM error generating summary for reflection {reflection_id}")
    raise HTTPException(status_code=502, detail={
        "code": "LLM_ERROR",
        "message": "The AI service encountered an error. Please try again."
    })
```

---

## 6. Security — Non-negotiable Checks

These are the failure modes that have caused real problems in production. Check for all of these proactively, not just when asked.

### Multi-tenant data isolation
This is the most critical category. A bug here means one client's data is visible to another client. Check every query and every cache key.

**Database queries — always scope to the correct owner:**
```python
# WRONG — returns all reflections for all users
reflections = db.query(Reflection).all()

# CORRECT — scoped to the requesting user
reflections = db.query(Reflection).filter(
    Reflection.user_id == current_user.id
).all()
```

**Cache keys — always include user_id or tenant identifier:**
```python
# WRONG — same cache key for all users
cache_key = f"reflections:latest"

# CORRECT — scoped to the user
cache_key = f"reflections:user:{user_id}:latest"
```

**Before finishing any endpoint that returns data:** ask yourself — could this endpoint return data belonging to a different user if the user_id in the query was different? If yes, the query is wrong.

### Authentication
- Every endpoint that returns or modifies user data must require authentication via `Depends(get_current_user)`.
- Magic link tokens must have an expiry — maximum 15 minutes for login links.
- Magic link tokens must be single-use — mark as used on first consumption.
- Never log magic link tokens or licence keys, even at DEBUG level.

### Licence validation
- Licence validation runs at application startup via FastAPI lifespan.
- Feature-gated endpoints check `has_feature()` before processing the request.
- The licence endpoint `GET /api/licence` returns only `tier` and `features` — never the raw JWT.

### Environment variables
- No secrets hardcoded anywhere. No API keys, no passwords, no tokens.
- Every secret comes from `os.getenv()` or `pydantic-settings`.
- Every required environment variable is listed in `.env.example` with a comment explaining what it is.
- If a required variable is missing at startup, fail loudly with a clear error message — do not silently fall back to a default.

### Input validation
- All user input is validated via Pydantic schemas before it touches the database.
- File uploads: validate file type, validate file size, never trust the client-provided filename.
- Never pass user input directly to a database query string.

---

## 7. Performance — Patterns to Follow

### Database — avoid N+1 queries
```python
# WRONG — N+1: one query per cohort to get participants
cohorts = db.query(Cohort).filter(Cohort.user_id == user_id).all()
for cohort in cohorts:
    cohort.participants  # triggers a new query each iteration

# CORRECT — eager load relationships in one query
from sqlalchemy.orm import joinedload
cohorts = db.query(Cohort).options(
    joinedload(Cohort.participants)
).filter(Cohort.user_id == user_id).all()
```

When writing any query that involves a relationship, ask: will this trigger additional queries in a loop? If yes, use `joinedload` or `selectinload`.

### Background jobs — nothing slow in a request handler
Any operation that calls an external API (LLM, Deepgram, Resend, Stripe webhooks processing) belongs in an ARQ background job, not in the request handler. The request handler enqueues the job and returns immediately.

### Pagination — never return unbounded lists
Any endpoint that returns a list must be paginated. No exceptions.

```python
@router.get("/reflections")
async def get_reflections(
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db)
):
    """List reflections for the current user, paginated."""
    offset = (page - 1) * per_page
    return db.query(Reflection).filter(
        Reflection.user_id == current_user.id
    ).offset(offset).limit(per_page).all()
```

### Database indexes
Any column used in a `.filter()` clause should have a database index. When creating a new model, check every foreign key and every field used in queries — add `index=True` to the column definition.

---

## 8. Media & Images

### The Core Rule
**Images never go in git.** No JPG, PNG, WebP, GIF, SVG larger than 10KB, or PDF in a git commit. If you see an image in a commit, remove it and upload it to R2.

### Workflow
Local development uses a `/media` folder (gitignored). Before deployment, upload to R2:

```
[project]/
├── media/              ← local originals, in .gitignore
│   ├── hero.jpg
│   └── team/
│       └── peter.jpg
```

R2 URL structure: `https://media.superstories.com/[project-name]/[filename]`

Use Cloudflare's `?width=` parameter for resizing — never upload manually resized versions.

| Context | Width |
|---------|-------|
| Hero / fullwidth | 1400 |
| Section image | 800 |
| Card / thumbnail | 400 |
| Avatar / icon | 80 |

### .gitignore — always present
```
media/
*.jpg
*.jpeg
*.JPG
*.JPEG
*.png
*.PNG
*.gif
*.webp
*.pdf
*.zip
```

---

## 9. LLM Integration

All LLM calls go through `app/ai.py`. Never call OpenAI, Anthropic, or Ollama directly from a router or job — always use the abstraction layer.

### Prompt management
- System prompts live in `app/prompts/[feature].py` as module-level constants — not inline in the function that calls them.
- Prompts are versioned with a comment: `# v1.2 — added stagnation detection`
- Temperature is always set explicitly — never rely on provider defaults.
- `temperature=0.4` for summaries and structured output.
- `temperature=0.7` for conversational AI.

### Cost tracking
Every LLM call logs token usage and estimated cost:

```python
await log_api_cost(
    product=PRODUCT_ID,
    feature="summary",
    provider=os.getenv("LLM_PROVIDER"),
    input_tokens=response.usage.input_tokens,
    output_tokens=response.usage.output_tokens
)
```

---

## 10. Background Jobs

All background jobs live in `app/jobs/`. Each job function:
- Takes only serialisable arguments (IDs, strings — not ORM objects)
- Opens its own database session and closes it when done
- Has a try/except that logs the error with full context
- Is idempotent where possible — safe to run twice if it fails and retries
- Has a maximum retry count (default: 3) to avoid infinite loops

```python
# app/jobs/summaries.py

async def generate_summary(ctx, reflection_id: int):
    """Generate AI summary for a reflection and send it by email."""
    db = SessionLocal()
    try:
        reflection = db.query(Reflection).filter(
            Reflection.id == reflection_id
        ).first()
        if not reflection:
            logger.error(f"generate_summary: reflection {reflection_id} not found")
            return

        summary = await chat_completion(
            messages=[{"role": "user", "content": reflection.transcript}],
            system=SUMMARY_PROMPT,
            temperature=0.4
        )
        reflection.summary = summary
        db.commit()

        await send_summary_email(reflection)

    except Exception as e:
        logger.exception(f"generate_summary failed for reflection {reflection_id}")
        raise  # re-raise so ARQ can retry
    finally:
        db.close()
```

---

## 11. Testing

### Framework
Use `pytest` with `httpx.AsyncClient` for API tests. Test database uses a separate PostgreSQL database (`[product]_test`).

### What to test
- **Every router:** at least one happy-path test and one auth-denied test per endpoint
- **Multi-tenant isolation:** test that user A cannot see user B's data (this is the most important test category)
- **Background jobs:** test that they complete successfully with valid input, and fail gracefully with missing data
- **Licence feature gates:** test that unlicensed features return 403

### What not to test
- SQLAlchemy model definitions (the ORM is tested by its maintainers)
- Pydantic schema validation (Pydantic is tested by its maintainers)
- Third-party library internals

### Test structure
```python
# tests/conftest.py — shared fixtures

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import Base, engine

@pytest.fixture
async def client():
    """Async test client for the FastAPI app."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

@pytest.fixture
async def authenticated_client(client):
    """Test client with a valid auth session."""
    # Create test user, generate magic link, authenticate
    ...
    yield client
```

### Running tests
```bash
pytest tests/ -v
```

---

## 12. Versioning & Releases

### Version format
Semantic versioning: `MAJOR.MINOR.PATCH`

| Bump | When | Example |
|------|------|---------|
| PATCH | Bug fix, no behaviour change | `1.0.0` → `1.0.1` |
| MINOR | New feature, backwards compatible | `1.0.1` → `1.1.0` |
| MAJOR | Breaking change, new licence key required | `1.1.0` → `2.0.0` |

### Release process
1. Update `APP_VERSION` in `.env.example` and in the code
2. Create a git tag: `git tag v1.1.0`
3. Push the tag: `git push origin v1.1.0`
4. GitHub Actions builds the Docker image and pushes to GHCR
5. Coolify picks up the new image and redeploys

### Database migrations in production
- Every schema change gets an Alembic migration
- Migrations run automatically at container startup (`alembic upgrade head` in Dockerfile CMD)
- Never edit a migration that has already been deployed — create a new one
- For destructive migrations (dropping columns/tables): deploy the code change first (that stops using the column), then deploy the migration in a separate release

---

## 13. Development Data

### Seed script
Every product has a `scripts/seed.py` that creates realistic demo data for local development. This is not optional — a builder starting a new session needs data to work with.

```python
# scripts/seed.py
"""
Create demo data for local development.
Run: python scripts/seed.py

Idempotent — safe to run multiple times. Checks for existing data before creating.
"""

from app.database import SessionLocal
from app.models import User  # add product-specific models

def seed():
    db = SessionLocal()
    # Create demo user if not exists
    # Create demo product-specific data
    # Print summary of what was created
    db.close()

if __name__ == "__main__":
    seed()
```

---

## 14. Documentation — Keeping It Alive

Dead documentation is worse than no documentation — it creates false context for future Claude Code sessions.

**When you modify a function:** update its docstring to match what it now does.
**When you remove a feature:** remove all references to it in comments, docstrings, and README sections.
**When you add a new environment variable:** add it to `.env.example` with a comment.
**When you add a new endpoint:** add it to the router's module docstring.
**Never:** leave a comment that says "this used to do X" — remove the comment.

Before ending any session, scan the files you touched for documentation that no longer matches the code. Fix it before finishing.

---

## 15. Code Hygiene Pass

When asked to run a hygiene pass on the repository, perform the following in order. Report findings before making changes — do not auto-delete without confirmation.

```
1. DEAD CODE
   [ ] Functions defined but never called
   [ ] Routes defined but never reached
   [ ] SQLAlchemy models defined but never imported
   [ ] Pydantic schemas defined but never used
   [ ] Commented-out code blocks

2. DOCUMENTATION DRIFT
   [ ] Docstrings describing behaviour that no longer exists
   [ ] .env.example entries for variables no longer used in code
   [ ] Variables in code with no .env.example entry

3. SECURITY SCAN
   [ ] Cache keys not scoped to user_id or tenant identifier
   [ ] Endpoints that query data without filtering by current_user
   [ ] Magic link tokens without expiry
   [ ] Hardcoded secrets or API keys
   [ ] Unhandled external API errors in request handlers

4. PERFORMANCE SCAN
   [ ] Queries inside loops (N+1 pattern)
   [ ] List-returning endpoints without pagination
   [ ] Columns used in filter() without index=True
   [ ] External API calls inside request handlers (should be background jobs)

5. STACK COMPLIANCE
   [ ] Direct LLM provider calls (should go through app/ai.py)
   [ ] File writes to local disk in production paths (should use R2)
   [ ] Synchronous blocking calls in async functions
   [ ] Inconsistent error response shapes

6. TEST COVERAGE
   [ ] Routers with no corresponding test file
   [ ] Multi-tenant isolation without test coverage
   [ ] Feature gates without test coverage
```

Report each finding with: file name, line number, description of the problem, recommended fix.

---

## 16. Before Finishing Any Session

Run through this checklist before declaring work done:

```
[ ] No commented-out code left in any file I touched
[ ] No unused imports in any file I touched
[ ] All new functions have docstrings
[ ] All new environment variables are in .env.example
[ ] All new endpoints have response_model and authentication
[ ] All list-returning endpoints are paginated
[ ] All queries involving relationships use eager loading where appropriate
[ ] All cache keys are scoped to user_id
[ ] All external API calls are in background jobs, not request handlers
[ ] All external API calls have error handling (try/except with logging)
[ ] All error responses follow the standard shape (code + message)
[ ] Documentation matches the code I wrote
[ ] .env.example matches the variables the code actually uses
[ ] Seed script updated if new models were added
```

---

*SuperStories BV — CLAUDE.md SaaS product template — v2.0 — 2026-03-27*
*Copy this file into every SaaS product repo. Add product-specific sections below this line.*
