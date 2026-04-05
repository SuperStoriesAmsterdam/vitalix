"""
Vitalix — FastAPI applicatie
Startpunt van de backend. Registreert routers en foutafhandeling.
Start met: uvicorn app.main:app --reload

Frontend (React + Vite):
  - Development: cd frontend && npm run dev  (Vite op poort 5173, proxiet naar 8000)
  - Productie:   cd frontend && npm run build  (output naar app/static/, geserveerd door FastAPI)
"""
import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.database import engine, Base
from app.routers import withings, health, polar, whoop, insights
from app.auth import router as auth_router
from app.errors import api_exception_handler
from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s"
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Vitalix API",
    description="Persoonlijk preventief gezondheidssysteem",
    version=settings.app_version,
    docs_url="/api/docs",
    redoc_url=None,
)

app.add_exception_handler(Exception, api_exception_handler)

# Routers
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(withings.router, prefix="/withings", tags=["Withings"])
app.include_router(polar.router, prefix="/polar", tags=["Polar"])
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(whoop.router, prefix="/whoop", tags=["Whoop"])
app.include_router(insights.router, prefix="/insights", tags=["Insights"])

# ── React frontend ─────────────────────────────────────────────────────────────
# Productie: FastAPI serveert de gebouwde React app als statische bestanden.
# Development: gebruik de Vite dev server op poort 5173.
STATIC_DIR = Path(__file__).parent / "static"

if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/favicon.svg", include_in_schema=False)
    def favicon():
        return FileResponse(STATIC_DIR / "favicon.svg")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_react(full_path: str):
        """Serveert de React SPA voor alle niet-API routes."""
        return FileResponse(STATIC_DIR / "index.html")
