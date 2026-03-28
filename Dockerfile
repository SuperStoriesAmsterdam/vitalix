FROM python:3.11-slim AS runtime
WORKDIR /app

# Embed public key voor licentievalidatie (Sprint 3 — nu nog leeg)
ARG SUPERSTORIES_PUBLIC_KEY
ENV SUPERSTORIES_PUBLIC_KEY=$SUPERSTORIES_PUBLIC_KEY

# Dependencies installeren
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Applicatiecode kopiëren
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./

EXPOSE 8000

# Bij opstarten: migraties draaien, daarna de API starten
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
