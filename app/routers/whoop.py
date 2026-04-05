"""
Vitalix — Whoop OAuth router
Koppelt een gebruiker aan zijn Whoop-account via OAuth 2.0.

Flow:
  1. GET /whoop/auth?user_id=1  → redirect naar Whoop login
  2. Whoop redirects terug naar GET /whoop/callback?code=...&state=...
  3. Backend wisselt code in voor token + refresh token,
     haalt Whoop user_id op via /profile, slaat alles op.

Tokens verlopen na 1 uur — de sync job vernieuwt ze automatisch via
het refresh token zodra een 401 ontvangen wordt.
"""
import secrets
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.integrations.whoop import get_auth_url, exchange_code_for_token
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/auth")
def whoop_auth(user_id: int, db: Session = Depends(get_db)):
    """
    Start de Whoop OAuth flow voor een gebruiker.
    Stuur de gebruiker naar deze URL om zijn Whoop-account te koppelen.

    Args:
        user_id: Vitalix gebruikers-ID.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail={"code": "USER_NOT_FOUND", "message": "Gebruiker niet gevonden."}
        )

    # State bevat user_id zodat de callback weet voor welke gebruiker dit is.
    # Random token voorkomt CSRF.
    state = f"{user_id}:{secrets.token_urlsafe(16)}"
    auth_url = get_auth_url(state=state)

    logger.info(f"Whoop OAuth gestart voor gebruiker {user_id}")
    return RedirectResponse(auth_url)


@router.get("/callback")
async def whoop_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db)
):
    """
    Ontvangt de autorisatiecode van Whoop na gebruiker-login.
    Wisselt de code in voor een access + refresh token,
    haalt het Whoop user_id op en slaat alles op.

    Args:
        code: Autorisatiecode van Whoop.
        state: State-string met user_id (formaat: "user_id:random_token").
    """
    try:
        user_id = int(state.split(":")[0])
    except (ValueError, IndexError):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_STATE", "message": "Ongeldige state parameter."}
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail={"code": "USER_NOT_FOUND", "message": "Gebruiker niet gevonden."}
        )

    try:
        token_data = await exchange_code_for_token(code)
    except Exception:
        logger.exception(f"Whoop token exchange mislukt voor gebruiker {user_id}")
        raise HTTPException(
            status_code=502,
            detail={"code": "WHOOP_AUTH_FAILED", "message": "Koppeling met Whoop mislukt."}
        )

    user.whoop_access_token = token_data["access_token"]
    user.whoop_refresh_token = token_data.get("refresh_token")
    user.whoop_user_id = token_data["user_id"]
    db.commit()

    logger.info(
        f"Whoop gekoppeld voor gebruiker {user_id} "
        f"(Whoop ID: {token_data['user_id']})"
    )
    return {
        "status": "gekoppeld",
        "gebruiker": user.name,
        "whoop_user_id": token_data["user_id"],
    }


@router.get("/status/{user_id}")
def whoop_status(user_id: int, db: Session = Depends(get_db)):
    """Controleer of een gebruiker een actieve Whoop-koppeling heeft."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden.")
    return {
        "gekoppeld": user.whoop_access_token is not None,
        "whoop_user_id": user.whoop_user_id,
    }
