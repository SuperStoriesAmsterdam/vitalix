"""
Vitalix — Oura Ring API client (v2)
Documentatie: https://cloud.ouraring.com/v2/docs
Personal Access Token via: https://cloud.ouraring.com/personal-access-tokens

Wat dit bestand doet:
- Haalt dagelijkse HRV en slaapdata op
- Haalt readiness score op
- Haalt temperatuurafwijking op (verschil t.o.v. persoonlijke norm — berekend door Oura)

Geen OAuth nodig: Oura werkt met een Personal Access Token per gebruiker.
Het token wordt encrypted opgeslagen in de database (User.oura_access_token).
"""
import httpx
import logging
from datetime import datetime, timedelta, date

logger = logging.getLogger(__name__)

OURA_BASE_URL = "https://api.ouraring.com/v2"


async def get_daily_readiness(
    access_token: str,
    days_back: int = 30
) -> list[dict]:
    """
    Haalt de dagelijkse readiness scores op, inclusief HRV en temperatuurdata.

    Args:
        access_token: Oura Personal Access Token van de gebruiker.
        days_back: Aantal dagen terug om op te halen.

    Returns:
        Lijst van dagelijkse readiness-objecten van de Oura API.
    """
    start_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{OURA_BASE_URL}/usercollection/daily_readiness",
                params={"start_date": start_date},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            response.raise_for_status()
            return response.json().get("data", [])
    except httpx.TimeoutException:
        logger.error("Oura readiness ophalen: timeout")
        raise
    except httpx.HTTPStatusError as exc:
        logger.error(f"Oura readiness ophalen: HTTP {exc.response.status_code}")
        raise
    except Exception:
        logger.exception("Oura readiness ophalen: onverwachte fout")
        raise


async def get_sleep_data(
    access_token: str,
    days_back: int = 30
) -> list[dict]:
    """
    Haalt slaapdata op: diepe slaap, REM, lichte slaap, latentie en efficiëntie.

    Args:
        access_token: Oura Personal Access Token van de gebruiker.
        days_back: Aantal dagen terug om op te halen.

    Returns:
        Lijst van slaapsessies. Eén nacht kan meerdere sessies bevatten.
    """
    start_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{OURA_BASE_URL}/usercollection/sleep",
                params={"start_date": start_date},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            response.raise_for_status()
            return response.json().get("data", [])
    except httpx.TimeoutException:
        logger.error("Oura slaapdata ophalen: timeout")
        raise
    except httpx.HTTPStatusError as exc:
        logger.error(f"Oura slaapdata ophalen: HTTP {exc.response.status_code}")
        raise
    except Exception:
        logger.exception("Oura slaapdata ophalen: onverwachte fout")
        raise


def parse_oura_sleep_to_hrv_reading(
    readiness_data: list[dict],
    sleep_data: list[dict]
) -> list[dict]:
    """
    Combineert readiness- en slaapdata tot één HRVReading per dag.
    Oura geeft beide apart terug — wij slaan ze samen op.

    Args:
        readiness_data: Lijst van dagelijkse readiness-objecten.
        sleep_data: Lijst van slaapsessies.

    Returns:
        Lijst van dicts klaar om als HRVReading opgeslagen te worden.
    """
    # Slaapdata indexeren op datum (hoofdsessie per dag)
    sleep_by_date = {}
    for session in sleep_data:
        session_date = session.get("day")
        # Alleen de hoofdslaap meenemen (type 'long_sleep')
        if session.get("type") == "long_sleep" and session_date:
            sleep_by_date[session_date] = session

    hrv_readings = []
    for readiness in readiness_data:
        reading_date = readiness.get("day")
        if not reading_date:
            continue

        sleep_session = sleep_by_date.get(reading_date, {})
        contributors = readiness.get("contributors", {})

        hrv_readings.append({
            "date": date.fromisoformat(reading_date),
            "rmssd": contributors.get("hrv_balance"),
            "deep_sleep_minutes": (
                sleep_session.get("deep_sleep_duration", 0) // 60
                if sleep_session else None
            ),
            "rem_sleep_minutes": (
                sleep_session.get("rem_sleep_duration", 0) // 60
                if sleep_session else None
            ),
            "light_sleep_minutes": (
                sleep_session.get("light_sleep_duration", 0) // 60
                if sleep_session else None
            ),
            "sleep_efficiency": sleep_session.get("efficiency"),
            "sleep_latency_minutes": (
                sleep_session.get("latency", 0) // 60
                if sleep_session else None
            ),
            "temperature_delta": readiness.get("temperature_deviation"),
            "readiness_score": readiness.get("score"),
        })

    return hrv_readings
