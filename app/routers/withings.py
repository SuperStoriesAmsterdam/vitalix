"""
Vitalix — Withings router
Endpoints voor OAuth koppeling en handmatige sync.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, BloodPressureMeasurement
from app.integrations.withings import get_auth_url, exchange_code_for_token, get_blood_pressure_measurements
from app.baseline import recalculate_baseline_for_user
from app.schemas import BloodPressureResponse
from typing import List

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/auth")
def start_withings_auth():
    """Geeft de URL terug waar de gebruiker naartoe gestuurd wordt om Withings te koppelen."""
    return {"auth_url": get_auth_url()}


@router.get("/callback")
async def withings_callback(
    code: str,
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Ontvangt de autorisatiecode van Withings na login.
    Wisselt de code in voor een access token en slaat dit op bij de gebruiker.

    Args:
        code: Autorisatiecode van Withings (automatisch meegegeven in URL).
        user_id: ID van de gebruiker die koppelt (meegegeven als query parameter).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail={"code": "USER_NOT_FOUND", "message": "Gebruiker niet gevonden."}
        )

    token_data = await exchange_code_for_token(code)
    if token_data.get("status") != 0:
        logger.error(f"Withings token exchange mislukt voor gebruiker {user_id}: {token_data}")
        raise HTTPException(
            status_code=400,
            detail={"code": "WITHINGS_AUTH_FAILED", "message": "Withings koppeling mislukt. Probeer opnieuw."}
        )

    user.withings_access_token = token_data["body"]["access_token"]
    user.withings_refresh_token = token_data["body"]["refresh_token"]
    db.commit()

    return {"status": "gekoppeld", "message": "Withings BPM Core succesvol gekoppeld."}


@router.post("/sync/{user_id}")
async def sync_withings(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Haalt direct de laatste 30 dagen Withings-metingen op voor deze gebruiker.
    Gebruik dit na de eerste koppeling om historische data binnen te halen.
    De nachtelijke sync doet dit daarna automatisch.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail={"code": "USER_NOT_FOUND", "message": "Gebruiker niet gevonden."}
        )
    if not user.withings_access_token:
        raise HTTPException(
            status_code=400,
            detail={"code": "WITHINGS_NOT_CONNECTED", "message": "Koppel eerst je Withings account."}
        )

    measurements = await get_blood_pressure_measurements(
        access_token=user.withings_access_token,
        days_back=30
    )

    synced_count = 0
    for measurement in measurements:
        existing = db.query(BloodPressureMeasurement).filter(
            BloodPressureMeasurement.user_id == user_id,
            BloodPressureMeasurement.measured_at == measurement["measured_at"]
        ).first()
        if not existing:
            db.add(BloodPressureMeasurement(
                user_id=user_id,
                measured_at=measurement["measured_at"],
                systolic=measurement["systolic"],
                diastolic=measurement["diastolic"],
                heart_rate=measurement["heart_rate"],
                source="withings"
            ))
            synced_count += 1

    db.commit()

    if synced_count > 0:
        recalculate_baseline_for_user(db, user_id, "systolic")
        recalculate_baseline_for_user(db, user_id, "diastolic")

    return {"synced": synced_count, "user_id": user_id}


@router.get("/measurements/{user_id}", response_model=List[BloodPressureResponse])
def get_measurements(
    user_id: int,
    limit: int = 30,
    db: Session = Depends(get_db)
):
    """
    Geeft de laatste bloeddrukmetingen terug voor deze gebruiker.

    Args:
        limit: Maximum aantal metingen terug te geven (standaard 30).
    """
    return db.query(BloodPressureMeasurement).filter(
        BloodPressureMeasurement.user_id == user_id
    ).order_by(
        BloodPressureMeasurement.measured_at.desc()
    ).limit(limit).all()
