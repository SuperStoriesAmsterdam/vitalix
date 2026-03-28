"""
Vitalix — FastAPI applicatie
Startpunt van de backend. Registreert routers en foutafhandeling.
Start met: uvicorn app.main:app --reload
"""
import logging
from fastapi import FastAPI
from app.database import engine, Base
from app.routers import withings, health
from app.errors import api_exception_handler
from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s"
)

# Maak alle database-tabellen aan bij opstarten (vervangen door Alembic migraties in productie)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Vitalix",
    description="Persoonlijk preventief gezondheidssysteem",
    version=settings.app_version,
)

# Foutafhandeling
app.add_exception_handler(Exception, api_exception_handler)

# Routers
app.include_router(withings.router, prefix="/withings", tags=["Withings"])
app.include_router(health.router, prefix="/health", tags=["Health"])


@app.get("/")
def root():
    """Status check — bevestigt dat de API online is."""
    return {
        "platform": "Vitalix",
        "version": settings.app_version,
        "status": "online",
    }
