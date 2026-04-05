"""
Vitalix — Polar OAuth router
Koppelt een gebruiker aan zijn Polar-account via OAuth 2.0.

Flow:
  1. GET /polar/auth?user_id=1  → redirect naar Polar login
  2. Polar redirects terug naar GET /polar/callback?code=...&state=...
  3. Backend wisselt code in voor token, registreert gebruiker in AccessLink,
     slaat token op in database.
"""
import secrets
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.integrations.polar import get_auth_url, exchange_code_for_token, register_user
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/auth")
def polar_auth(user_id: int, db: Session = Depends(get_db)):
    """
    Start de Polar OAuth flow voor een gebruiker.
    Stuur de gebruiker naar deze URL om zijn Polar-account te koppelen.

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

    logger.info(f"Polar OAuth gestart voor gebruiker {user_id}")
    return RedirectResponse(auth_url)


@router.get("/callback")
async def polar_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db)
):
    """
    Ontvangt de autorisatiecode van Polar na gebruiker-login.
    Wisselt de code in voor een token, registreert de gebruiker in AccessLink
    en slaat het token op in de database.

    Args:
        code: Autorisatiecode van Polar.
        state: State-string met user_id (formaat: "user_id:random_token").
    """
    # Haal user_id uit state
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

    # Wissel autorisatiecode in voor access token
    try:
        token_data = await exchange_code_for_token(code)
    except Exception:
        logger.exception(f"Polar token exchange mislukt voor gebruiker {user_id}")
        raise HTTPException(
            status_code=502,
            detail={"code": "POLAR_AUTH_FAILED", "message": "Koppeling met Polar mislukt."}
        )

    access_token = token_data["access_token"]
    polar_user_id = str(token_data["x_user_id"])

    # Registreer gebruiker in AccessLink (vereist bij eerste koppeling)
    registered = await register_user(access_token, polar_user_id)
    if not registered:
        logger.warning(f"Polar gebruikersregistratie mislukt voor {polar_user_id} — doorgaan met opslaan token")

    # Sla tokens op
    user.polar_access_token = access_token
    user.polar_user_id = polar_user_id
    db.commit()

    logger.info(f"Polar gekoppeld voor gebruiker {user_id} (Polar ID: {polar_user_id})")
    return {
        "status": "gekoppeld",
        "gebruiker": user.name,
        "polar_user_id": polar_user_id,
    }


@router.get("/activity/{user_id}")
async def polar_activity(user_id: int, days: int = 30, db: Session = Depends(get_db)):
    """
    Haalt ruwe activiteitsdata op van Polar voor de opgegeven gebruiker.
    Geeft stappen, calorieën en actieve tijd terug per dag.
    """
    from app.integrations.polar import get_activity

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden.")
    if not user.polar_access_token or not user.polar_user_id:
        raise HTTPException(status_code=400, detail="Geen Polar-koppeling gevonden.")

    activity_data = await get_activity(
        access_token=user.polar_access_token,
        polar_user_id=user.polar_user_id,
        days_back=days,
    )

    return {
        "user_id": user_id,
        "days_checked": days,
        "count": len(activity_data),
        "activity": activity_data,
    }


@router.get("/status/{user_id}")
def polar_status(user_id: int, db: Session = Depends(get_db)):
    """Controleer of een gebruiker een actieve Polar-koppeling heeft."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden.")
    return {
        "gekoppeld": user.polar_access_token is not None,
        "polar_user_id": user.polar_user_id,
    }


@router.post("/sync/{user_id}")
async def polar_sync(user_id: int, days: int = 30, db: Session = Depends(get_db)):
    """
    Triggert een handmatige Polar-sync voor de opgegeven gebruiker.
    Haalt HRV, slaap en activiteitsdata op voor de afgelopen N dagen (standaard 30).
    """
    from app.integrations.polar import get_nightly_recharge, get_sleep as polar_get_sleep
    from app.models import HRVReading
    from app.baseline import recalculate_baseline_for_user
    from datetime import timedelta
    import math

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden.")
    if not user.polar_access_token or not user.polar_user_id:
        raise HTTPException(status_code=400, detail="Geen Polar-koppeling gevonden.")

    recharge_data = await get_nightly_recharge(
        access_token=user.polar_access_token,
        polar_user_id=user.polar_user_id,
        days_back=days,
    )
    sleep_data = await polar_get_sleep(
        access_token=user.polar_access_token,
        polar_user_id=user.polar_user_id,
        days_back=days,
    )

    sleep_by_date = {entry["date"]: entry for entry in sleep_data}
    recharge_by_date = {entry["date"]: entry for entry in recharge_data}

    # Verzamel alle unieke datums uit beide datasets
    all_dates = set(sleep_by_date.keys()) | set(recharge_by_date.keys())

    synced = 0

    def to_min(s):
        return math.floor(s / 60) if s else None

    for reading_date in sorted(all_dates):
        if not reading_date:
            continue
        existing = db.query(HRVReading).filter(
            HRVReading.user_id == user_id,
            HRVReading.date == reading_date
        ).first()
        if existing:
            continue

        sleep = sleep_by_date.get(reading_date, {})
        recharge = recharge_by_date.get(reading_date, {})

        db.add(HRVReading(
            user_id=user_id,
            date=reading_date,
            rmssd=recharge.get("heart_rate_variability_avg"),
            ans_charge=recharge.get("ans_charge"),
            deep_sleep_minutes=to_min(sleep.get("deep_sleep_seconds")),
            rem_sleep_minutes=to_min(sleep.get("rem_sleep_seconds")),
            light_sleep_minutes=to_min(sleep.get("light_sleep_seconds")),
            sleep_score=sleep.get("sleep_score"),
            source="polar",
        ))
        synced += 1

    db.commit()

    if synced > 0:
        recalculate_baseline_for_user(db, user_id, "hrv_rmssd")
        recalculate_baseline_for_user(db, user_id, "deep_sleep_minutes")
        recalculate_baseline_for_user(db, user_id, "ans_charge")

    logger.info(f"Handmatige Polar sync: {synced} nieuwe dagen voor gebruiker {user_id}")
    return {"synced": synced, "days_checked": days}
