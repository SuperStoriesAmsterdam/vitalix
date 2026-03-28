"""
Vitalix — standaard foutafhandeling
Alle API-fouten volgen dezelfde structuur: code + message.
Consistent met SuperStories standaard (zie CLAUDE.md sectie 5).
"""
import logging
from pydantic import BaseModel
from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class ErrorResponse(BaseModel):
    """Standaard foutresponse die alle endpoints teruggeven."""
    code: str     # machine-leesbare code, e.g. "USER_NOT_FOUND"
    message: str  # leesbare uitleg voor de gebruiker


async def api_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Vangt onverwachte fouten op en geeft een consistente foutstructuur terug."""
    logger.exception(f"Onverwachte fout op {request.method} {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"code": "INTERNAL_ERROR", "message": "Er is iets misgegaan. Probeer het opnieuw."}
    )
