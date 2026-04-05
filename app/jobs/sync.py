"""
Vitalix — nachtelijke data-sync jobs
Draait via ARQ elke nacht om 03:00 voor alle actieve gebruikers.

Wat deze jobs doen:
1. sync_withings_for_user  — haalt nieuwe bloeddrukmetingen op van Withings BPM Vision
2. sync_polar_for_user     — haalt nieuwe HRV, slaap en activiteitsdata op van Polar Loop
3. sync_whoop_for_user     — haalt nieuwe HRV, slaap en recovery op van Whoop
4. sync_all_users          — loopt over alle gebruikers en start alle syncs

Jobs nemen alleen een user_id als argument (geen ORM-objecten — niet serialiseerbaar).
Elke job opent zijn eigen database-sessie en sluit die netjes af.
"""
import logging
from datetime import date

from app.database import SessionLocal
from app.models import User, BloodPressureMeasurement, HRVReading
from app.integrations.withings import get_blood_pressure_measurements
from app.integrations.polar import get_nightly_recharge, get_sleep as polar_get_sleep
from app.integrations.whoop import get_recovery as whoop_get_recovery, get_sleep as whoop_get_sleep
from app.baseline import recalculate_baseline_for_user

logger = logging.getLogger(__name__)


async def sync_withings_for_user(ctx, user_id: int) -> dict:
    """
    Haalt nieuwe Withings-bloeddrukmetingen op en slaat ze op.
    Slaat de sync over als de gebruiker geen Withings-token heeft.

    Args:
        ctx: ARQ context (automatisch meegegeven door de worker).
        user_id: Vitalix gebruikers-ID om te synchroniseren.

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
            logger.info(f"sync_withings_for_user: gebruiker {user_id} heeft geen Withings-token — sla over")
            return {"synced": 0, "user_id": user_id}

        measurements = await get_blood_pressure_measurements(
            access_token=user.withings_access_token,
            days_back=7
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

        logger.info(f"sync_withings_for_user: {synced_count} nieuwe metingen voor gebruiker {user_id}")
        return {"synced": synced_count, "user_id": user_id}

    except Exception:
        logger.exception(f"sync_withings_for_user mislukt voor gebruiker {user_id}")
        raise
    finally:
        db.close()


async def sync_polar_for_user(ctx, user_id: int) -> dict:
    """
    Haalt nieuwe Polar HRV- en slaapdata op en slaat ze op.
    Combineert Nightly Recharge (HRV/herstel) met Sleep API (slaapfases).
    Slaat de sync over als de gebruiker geen Polar-token heeft.

    Args:
        ctx: ARQ context (automatisch meegegeven door de worker).
        user_id: Vitalix gebruikers-ID om te synchroniseren.

    Returns:
        Dict met 'synced' (aantal nieuwe dagen) en 'user_id'.
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"sync_polar_for_user: gebruiker {user_id} niet gevonden")
            return {"synced": 0, "user_id": user_id}

        if not user.polar_access_token or not user.polar_user_id:
            logger.info(f"sync_polar_for_user: gebruiker {user_id} heeft geen Polar-token — sla over")
            return {"synced": 0, "user_id": user_id}

        recharge_data = await get_nightly_recharge(
            access_token=user.polar_access_token,
            polar_user_id=user.polar_user_id,
            days_back=7
        )
        sleep_data = await polar_get_sleep(
            access_token=user.polar_access_token,
            polar_user_id=user.polar_user_id,
            days_back=7
        )

        # Slaapdata indexeren op datum voor snelle koppeling
        sleep_by_date = {entry["date"]: entry for entry in sleep_data}

        synced_count = 0
        for recharge in recharge_data:
            reading_date = recharge.get("date")
            if not reading_date:
                continue

            existing = db.query(HRVReading).filter(
                HRVReading.user_id == user_id,
                HRVReading.date == reading_date
            ).first()

            if existing:
                continue

            sleep = sleep_by_date.get(reading_date, {})
            total_sleep_seconds = sleep.get("total_sleep_seconds") or 0

            db.add(HRVReading(
                user_id=user_id,
                date=reading_date,
                rmssd=recharge.get("heart_rate_variability_avg"),
                ans_charge=recharge.get("ans_charge"),
                deep_sleep_minutes=_seconds_to_minutes(sleep.get("deep_sleep_seconds")),
                rem_sleep_minutes=_seconds_to_minutes(sleep.get("rem_sleep_seconds")),
                light_sleep_minutes=_seconds_to_minutes(sleep.get("light_sleep_seconds")),
                sleep_score=sleep.get("sleep_score"),
                source="polar"
            ))
            synced_count += 1

        db.commit()

        if synced_count > 0:
            recalculate_baseline_for_user(db, user_id, "hrv_rmssd")
            recalculate_baseline_for_user(db, user_id, "deep_sleep_minutes")
            recalculate_baseline_for_user(db, user_id, "ans_charge")

        logger.info(f"sync_polar_for_user: {synced_count} nieuwe dagen voor gebruiker {user_id}")
        return {"synced": synced_count, "user_id": user_id}

    except Exception:
        logger.exception(f"sync_polar_for_user mislukt voor gebruiker {user_id}")
        raise
    finally:
        db.close()


async def sync_whoop_for_user(ctx, user_id: int) -> dict:
    """
    Haalt nieuwe Whoop recovery- en slaapdata op en slaat ze op.
    Combineert /cycle (HRV, resting HR, recovery score) met /activity/sleep (slaapfases).
    Slaat de sync over als de gebruiker geen Whoop-token heeft.

    Args:
        ctx: ARQ context (automatisch meegegeven door de worker).
        user_id: Vitalix gebruikers-ID om te synchroniseren.

    Returns:
        Dict met 'synced' (aantal nieuwe dagen) en 'user_id'.
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"sync_whoop_for_user: gebruiker {user_id} niet gevonden")
            return {"synced": 0, "user_id": user_id}

        if not user.whoop_access_token:
            logger.info(f"sync_whoop_for_user: gebruiker {user_id} heeft geen Whoop-token — sla over")
            return {"synced": 0, "user_id": user_id}

        recovery_data = await whoop_get_recovery(
            access_token=user.whoop_access_token,
            days_back=7
        )
        sleep_data = await whoop_get_sleep(
            access_token=user.whoop_access_token,
            days_back=7
        )

        # Slaapdata indexeren op datum voor snelle koppeling
        sleep_by_date = {entry["date"]: entry for entry in sleep_data}

        synced_count = 0
        for recovery in recovery_data:
            reading_date = recovery.get("date")
            if not reading_date:
                continue

            existing = db.query(HRVReading).filter(
                HRVReading.user_id == user_id,
                HRVReading.date == reading_date
            ).first()

            if existing:
                continue

            sleep = sleep_by_date.get(reading_date, {})

            db.add(HRVReading(
                user_id=user_id,
                date=reading_date,
                rmssd=recovery.get("rmssd"),
                ans_charge=recovery.get("recovery_score"),   # Whoop recovery score 0-100 → ans_charge
                deep_sleep_minutes=_seconds_to_minutes(sleep.get("deep_sleep_seconds")),
                rem_sleep_minutes=_seconds_to_minutes(sleep.get("rem_sleep_seconds")),
                light_sleep_minutes=_seconds_to_minutes(sleep.get("light_sleep_seconds")),
                sleep_efficiency=sleep.get("sleep_efficiency"),
                sleep_latency_minutes=_seconds_to_minutes(sleep.get("sleep_latency_seconds")),
                sleep_score=sleep.get("sleep_score"),
                source="whoop"
            ))
            synced_count += 1

        db.commit()

        if synced_count > 0:
            recalculate_baseline_for_user(db, user_id, "hrv_rmssd")
            recalculate_baseline_for_user(db, user_id, "deep_sleep_minutes")
            recalculate_baseline_for_user(db, user_id, "ans_charge")

        logger.info(f"sync_whoop_for_user: {synced_count} nieuwe dagen voor gebruiker {user_id}")
        return {"synced": synced_count, "user_id": user_id}

    except Exception:
        logger.exception(f"sync_whoop_for_user mislukt voor gebruiker {user_id}")
        raise
    finally:
        db.close()


def _seconds_to_minutes(seconds: int | None) -> int | None:
    """
    Converteert seconden naar minuten. Geeft None terug als invoer None is.

    Args:
        seconds: Aantal seconden, of None.

    Returns:
        Aantal minuten als integer, of None.
    """
    if seconds is None:
        return None
    return seconds // 60


async def sync_all_users(ctx) -> None:
    """
    Nachtelijke scheduled job: synchroniseert alle actieve gebruikers.
    Wordt automatisch uitgevoerd om 03:00 via ARQ cron.
    Loopt over alle gebruikers en start Withings + Polar + Whoop sync per gebruiker.

    Args:
        ctx: ARQ context (automatisch meegegeven door de worker).
    """
    db = SessionLocal()
    try:
        users = db.query(User).all()
        logger.info(f"sync_all_users: start nacht-sync voor {len(users)} gebruikers")
        for user in users:
            await sync_withings_for_user(ctx, user.id)
            await sync_polar_for_user(ctx, user.id)
            await sync_whoop_for_user(ctx, user.id)
        logger.info("sync_all_users: nacht-sync voltooid")
    finally:
        db.close()
