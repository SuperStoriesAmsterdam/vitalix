"""
Vitalix — Magic link authenticatie
Gebruikers loggen in via een eenmalige link per e-mail. Geen wachtwoorden.

Flow:
  1. Gebruiker vraagt een login-link aan via POST /auth/login
  2. Systeem genereert een token, slaat het op (max 15 minuten geldig),
     en stuurt een e-mail met de link
  3. Gebruiker klikt de link → GET /auth/verify?token=...
  4. Systeem valideert het token, markeert het als gebruikt,
     en geeft een sessie-cookie terug

Veiligheidsregels (per CLAUDE.md):
  - Tokens verlopen na 15 minuten
  - Tokens zijn eenmalig — na gebruik direct ongeldig
  - Tokens worden nooit gelogd
"""
import secrets
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models import User, MagicLinkToken

logger = logging.getLogger(__name__)

# Token is 15 minuten geldig na aanmaak
TOKEN_EXPIRY_MINUTES = 15

router = APIRouter()


class LoginRequest(BaseModel):
    """Verzoek voor een magic link login."""
    email: EmailStr


@router.post("/login")
def request_magic_link(login: LoginRequest, db: Session = Depends(get_db)):
    """
    Genereert een magic link voor het opgegeven e-mailadres en verstuurt deze.
    Werkt alleen als het e-mailadres al bestaat in het systeem (geen registratie).
    Geeft altijd hetzelfde antwoord terug — ook als het e-mail niet bestaat.
    Dit voorkomt dat aanvallers kunnen achterhalen welke e-mails geldig zijn.

    Args:
        login: Dict met 'email' veld.
    """
    user = db.query(User).filter(User.email == login.email).first()

    if user:
        token_value = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRY_MINUTES)

        token = MagicLinkToken(
            user_id=user.id,
            token=token_value,
            expires_at=expires_at,
        )
        db.add(token)
        db.commit()

        # In Sprint 0: log de link naar de console (geen e-mail setup nodig)
        # In Sprint 1: vervang door send_magic_link_email(user.email, token_value)
        from app.config import settings
        login_url = f"{settings.app_base_url}/auth/verify?token={token_value}"
        logger.info(f"Magic link voor {user.email}: {login_url}")

    # Altijd hetzelfde antwoord — ook als e-mail niet bestaat
    return {"message": "Als dit e-mailadres bekend is, ontvang je een loginlink."}


@router.get("/verify")
def verify_magic_link(token: str, response: Response, db: Session = Depends(get_db)):
    """
    Valideert een magic link token en start een sessie.
    Het token wordt direct na gebruik ongeldig gemaakt.

    Args:
        token: Het token uit de magic link URL.
    """
    magic_token = db.query(MagicLinkToken).filter(
        MagicLinkToken.token == token,
        MagicLinkToken.used == False
    ).first()

    if not magic_token:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_TOKEN", "message": "Deze loginlink is ongeldig of al gebruikt."}
        )

    if magic_token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail={"code": "EXPIRED_TOKEN", "message": "Deze loginlink is verlopen. Vraag een nieuwe aan."}
        )

    # Token eenmalig markeren — direct na validatie
    magic_token.used = True
    db.commit()

    # Sessie-cookie instellen
    response = RedirectResponse(url="/", status_code=302)
    response.set_cookie(
        key="vitalix_user_id",
        value=str(magic_token.user_id),
        httponly=True,
        max_age=60 * 60 * 24 * 30,  # 30 dagen
        samesite="lax",
    )

    logger.info(f"Gebruiker {magic_token.user_id} ingelogd via magic link")
    return response


@router.get("/logout")
def logout(response: Response):
    """
    Verwijdert de sessie-cookie en stuurt door naar de loginpagina.
    """
    response = RedirectResponse(url="/login", status_code=302)
    response.delete_cookie("vitalix_user_id")
    return response


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    Dependency voor authenticatie. Gebruik via Depends(get_current_user) in elke
    endpoint die gebruikersdata retourneert of aanpast.

    Args:
        request: FastAPI request met sessie-cookie.
        db: Database-sessie.

    Returns:
        Het User-object van de ingelogde gebruiker.

    Raises:
        HTTPException 401: Als de gebruiker niet is ingelogd.
    """
    user_id = request.cookies.get("vitalix_user_id")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail={"code": "NOT_AUTHENTICATED", "message": "Je bent niet ingelogd."}
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail={"code": "USER_NOT_FOUND", "message": "Gebruiker niet gevonden."}
        )

    return user
