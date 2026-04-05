# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: React frontend bouwen
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS frontend-build
WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./

# Bouw naar /static — los van de Python applicatiecode
ENV NODE_BUILD_OUTDIR=/static
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Python runtime
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime
WORKDIR /app

# Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Applicatiecode
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./
COPY scripts/ ./scripts/

# React build output van Stage 1 → app/static/ (FastAPI serveert dit)
COPY --from=frontend-build /static/ ./app/static/

EXPOSE 8000

# Migraties draaien bij opstarten, daarna API starten
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
