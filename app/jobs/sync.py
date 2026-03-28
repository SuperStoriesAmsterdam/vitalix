"""
Vitalix — nachtelijke data-sync jobs
Draait via ARQ elke nacht om 03:00 voor alle actieve gebruikers.

Wat deze jobs doen:
1. sync_withings_for_user — haalt nieuwe bloeddrukmetingen op van Withings
2. sync_oura_for_user — haalt nieuwe HRV en slaapdata op van Oura
3. sync_all_users — loopt over alle gebruikers en start beide syncs

Jobs nemen alleen een user_id als argument (geen ORM-objecten — niet serialiseerbaar).
Elke job opent zijn eigen database-sessie en sluit die netjes.
"""
import logging
from datetime import datetime, date

from app.database import SessionLocal
from app.models import User, BloodPressureMeasurement, HRVReading
from app.integrations.withings import get_blood_pressure_measurements
from app.integrations.oura import get_daily_readiness, get_sleep_data, parse_oura_sleep_to_hrv_reading
from app.baseline import recalculate_baseline_for_user

logger = logging.getLogger(__name__)


async def sync_withings_for_user(ctx, user_id: int) -> dict:
    """
    Haalt nieuwe Withings-bloeddrukmetingen op en slaat ze op.
    Sla over als de gebruiker geen Withings-token heeft.

    Args:
        ctx: ARQ context (automatisch meegegeven).
        user_id: ID van de gebruiker om te synchroniseren.

    Returns:
        Dict met 'synced' (aantal nieuwe metingen) en 'user_id'.
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"sync_withings_for_user: gebruiker {user_id} niet gevonden")
            return {"synced": 0, "user_id": user_id}

        if not user.withings_access_token:
            logger.info(f"sync_withings_for_user: gebruiker {user_id} heeft geen Withings-token")
            return {"synced": 0, "user_id": user_id}

        measurements = await get_blood_pressure_measurements(
            access_token=user.withings_access_token,
            days_back=7  # Dagelijkse sync: alleen laatste week ophalen
        )

        synced_count = 0
        for measurement in measurements:
            # Dubbelingen voorkomen: check of deze meting al bestaat
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

        logger.info(f"sync_withings_for_user: {synced_count} nieuwe metingen voor gebruiker {user_id}")
        return {"synced": synced_count, "user_id": user_id}

    except Exception:
        logger.exception(f"sync_withings_for_user mislukt voor gebruiker {user_id}")
        raise
    finally:
        db.close()


async def sync_oura_for_user(ctx, user_id: int) -> dict:
    """
    Haalt nieuwe Oura HRV- en slaapdata op en slaat ze op.
    Sla over als de gebruiker geen Oura-token heeft.

    Args:
        ctx: ARQ context (automatisch meegegeven).
        user_id: ID van de gebruiker om te synchroniseren.

    Returns:
        Dict met 'synced' (aantal nieuwe dagen) en 'user_id'.
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"sync_oura_for_user: gebruiker {user_id} niet gevonden")
            return {"synced": 0, "user_id": user_id}

        if not user.oura_access_token:
            logger.info(f"sync_oura_for_user: gebruiker {user_id} heeft geen Oura-token")
            return {"synced": 0, "user_id": user_id}

        readiness_data = await get_daily_readiness(user.oura_access_token, days_back=7)
        sleep_data = await get_sleep_data(user.oura_access_token, days_back=7)
        hrv_readings = parse_oura_sleep_to_hrv_reading(readiness_data, sleep_data)

        synced_count = 0
        for reading in hrv_readings:
            existing = db.query(HRVReading).filter(
                HRVReading.user_id == user_id,
                HRVReading.date == reading["date"]
            ).first()

            if not existing:
                db.add(HRVReading(user_id=user_id, **reading))
                synced_count += 1

        db.commit()

        if synced_count > 0:
            recalculate_baseline_for_user(db, user_id, "hrv_rmssd")
            recalculate_baseline_for_user(db, user_id, "deep_sleep_minutes")

        logger.info(f"sync_oura_for_user: {synced_count} nieuwe dagen voor gebruiker {user_id}")
        return {"synced": synced_count, "user_id": user_id}

    except Exception:
        logger.exception(f"sync_oura_for_user mislukt voor gebruiker {user_id}")
        raise
    finally:
        db.close()


async def sync_all_users(ctx) -> None:
    """
    Nachtelijke scheduled job: synchroniseert alle actieve gebruikers.
    Wordt automatisch uitgevoerd om 03:00 via ARQ cron.
    """
    db = SessionLocal()
    try:
        users = db.query(User).all()
        logger.info(f"sync_all_users: start sync voor {len(users)} gebruikers")
        for user in users:
            await sync_withings_for_user(ctx, user.id)
            await sync_oura_for_user(ctx, user.id)
    finally:
        db.close()
