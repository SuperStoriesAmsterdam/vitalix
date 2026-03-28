"""
Vitalix — Withings Health API client
Documentatie: https://developer.withings.com/api-reference
OAuth 2.0 — credentials via developer.withings.com

Wat dit bestand doet:
- Genereert de OAuth autorisatie-URL (stap 1 van login)
- Wisselt een autorisatiecode in voor een access token (stap 2)
- Haalt bloeddrukmetingen op voor een gebruiker
"""
import httpx
import logging
from datetime import datetime, timedelta
from app.config import settings

logger = logging.getLogger(__name__)

WITHINGS_AUTH_URL = "https://account.withings.com/oauth2_user/authorize2"
WITHINGS_TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2"
WITHINGS_MEASURE_URL = "https://wbsapi.withings.net/measure"

# Withings meting-type codes
MEASURE_TYPE_DIASTOLIC = 9
MEASURE_TYPE_SYSTOLIC = 10
MEASURE_TYPE_HEART_RATE = 11


def get_auth_url() -> str:
    """
    Genereert de URL waar de gebruiker naartoe gestuurd wordt om in te loggen bij Withings.
    Stap 1 van de OAuth flow.
    """
    params = {
        "response_type": "code",
        "client_id": settings.withings_client_id,
        "redirect_uri": settings.withings_redirect_uri,
        "scope": "user.metrics",
        "state": "vitalix_auth",
    }
    query_string = "&".join(f"{key}={value}" for key, value in params.items())
    return f"{WITHINGS_AUTH_URL}?{query_string}"


async def exchange_code_for_token(authorization_code: str) -> dict:
    """
    Wisselt de autorisatiecode (ontvangen via callback) in voor een access token.
    Stap 2 van de OAuth flow.

    Returns:
        Dict met 'access_token', 'refresh_token' en metadata — of een fout.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                WITHINGS_TOKEN_URL,
                data={
                    "action": "requesttoken",
                    "grant_type": "authorization_code",
                    "client_id": settings.withings_client_id,
                    "client_secret": settings.withings_client_secret,
                    "code": authorization_code,
                    "redirect_uri": settings.withings_redirect_uri,
                }
            )
            return response.json()
    except httpx.TimeoutException:
        logger.error("Withings token exchange: timeout")
        raise
    except Exception:
        logger.exception("Withings token exchange: onverwachte fout")
        raise


async def get_blood_pressure_measurements(
    access_token: str,
    days_back: int = 30
) -> list[dict]:
    """
    Haalt bloeddrukmetingen op van de Withings API voor de opgegeven periode.

    Args:
        access_token: Withings OAuth access token van de gebruiker.
        days_back: Aantal dagen terug om op te halen (standaard 30).

    Returns:
        Lijst van dicts met 'measured_at', 'systolic', 'diastolic', 'heart_rate'.
        Alleen complete metingen (met zowel systolisch als diastolisch) worden teruggegeven.
    """
    start_timestamp = int(
        (datetime.utcnow() - timedelta(days=days_back)).timestamp()
    )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                WITHINGS_MEASURE_URL,
                params={
                    "action": "getmeas",
                    "meastypes": f"{MEASURE_TYPE_DIASTOLIC},{MEASURE_TYPE_SYSTOLIC},{MEASURE_TYPE_HEART_RATE}",
                    "category": 1,
                    "startdate": start_timestamp,
                },
                headers={"Authorization": f"Bearer {access_token}"}
            )
            data = response.json()
    except httpx.TimeoutException:
        logger.error("Withings metingen ophalen: timeout")
        raise
    except Exception:
        logger.exception("Withings metingen ophalen: onverwachte fout")
        raise

    if data.get("status") != 0:
        logger.error(f"Withings API fout: status {data.get('status')}")
        return []

    measurements = []
    for group in data.get("body", {}).get("measuregrps", []):
        entry = {
            "measured_at": datetime.fromtimestamp(group["date"]),
            "systolic": None,
            "diastolic": None,
            "heart_rate": None,
        }
        for measure in group.get("measures", []):
            value = measure["value"] * (10 ** measure["unit"])
            if measure["type"] == MEASURE_TYPE_SYSTOLIC:
                entry["systolic"] = int(value)
            elif measure["type"] == MEASURE_TYPE_DIASTOLIC:
                entry["diastolic"] = int(value)
            elif measure["type"] == MEASURE_TYPE_HEART_RATE:
                entry["heart_rate"] = int(value)

        # Alleen complete bloeddrukmetingen opslaan
        if entry["systolic"] and entry["diastolic"]:
            measurements.append(entry)

    return measurements
