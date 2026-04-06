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


@router.post("/sync/{user_id}")
async def whoop_sync(user_id: int, days: int = 30, db: Session = Depends(get_db)):
    """
    Triggert een handmatige Whoop-sync voor de opgegeven gebruiker.
    Haalt recovery (HRV, herstel) en slaapdata op voor de afgelopen N dagen.

    Vernieuwt automatisch het access token als het verlopen is (Whoop tokens
    verlopen na 1 uur — het refresh token heeft geen vervaldatum).
    """
    from app.integrations.whoop import get_recovery, get_sleep as whoop_get_sleep, refresh_access_token
    from app.models import HRVReading
    from app.baseline import recalculate_baseline_for_user
    import math

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden.")
    if not user.whoop_access_token or not user.whoop_user_id:
        raise HTTPException(status_code=400, detail="Geen Whoop-koppeling gevonden.")

    async def fetch_with_token_refresh(fetch_fn, *args):
        """
        Voert een API-aanroep uit. Als Whoop een 401 (verlopen token) teruggeeft,
        wordt het token automatisch vernieuwd en de aanroep herhaald.
        """
        import httpx
        try:
            return await fetch_fn(user.whoop_access_token, *args)
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401 and user.whoop_refresh_token:
                logger.info(f"Whoop token verlopen voor gebruiker {user_id} — vernieuwen")
                new_tokens = await refresh_access_token(user.whoop_refresh_token)
                user.whoop_access_token = new_tokens["access_token"]
                user.whoop_refresh_token = new_tokens["refresh_token"]
                db.commit()
                return await fetch_fn(user.whoop_access_token, *args)
            raise

    recovery_data = await fetch_with_token_refresh(get_recovery, days)
    sleep_data = await fetch_with_token_refresh(whoop_get_sleep, days)

    # Combineer op datum
    sleep_by_date = {str(entry["date"]): entry for entry in sleep_data}
    recovery_by_date = {str(entry["date"]): entry for entry in recovery_data}
    all_dates = set(sleep_by_date.keys()) | set(recovery_by_date.keys())

    synced = 0

    def to_min(seconds):
        return math.floor(seconds / 60) if seconds else None

    for reading_date in sorted(all_dates):
        if not reading_date:
            continue

        existing = db.query(HRVReading).filter(
            HRVReading.user_id == user_id,
            HRVReading.date == reading_date,
        ).first()
        if existing:
            continue

        sleep = sleep_by_date.get(reading_date, {})
        recovery = recovery_by_date.get(reading_date, {})

        db.add(HRVReading(
            user_id=user_id,
            date=reading_date,
            rmssd=recovery.get("rmssd"),
            ans_charge=recovery.get("recovery_score"),   # Whoop recovery score = ANS-equivalent
            deep_sleep_minutes=to_min(sleep.get("deep_sleep_seconds")),
            rem_sleep_minutes=to_min(sleep.get("rem_sleep_seconds")),
            light_sleep_minutes=to_min(sleep.get("light_sleep_seconds")),
            sleep_efficiency=sleep.get("sleep_efficiency"),
            sleep_latency_minutes=to_min(sleep.get("sleep_latency_seconds")),
            sleep_score=sleep.get("sleep_score"),
            source="whoop",
        ))
        synced += 1

    db.commit()

    if synced > 0:
        recalculate_baseline_for_user(db, user_id, "hrv_rmssd")
        recalculate_baseline_for_user(db, user_id, "deep_sleep_minutes")
        recalculate_baseline_for_user(db, user_id, "ans_charge")

    logger.info(f"Whoop sync: {synced} nieuwe dagen voor gebruiker {user_id}")
    return {"synced": synced, "days_checked": days}
