"""
Vitalix — Whoop Developer API v1 client
Documentatie: https://developer.whoop.com/api

Wat dit bestand doet:
- Genereert de OAuth autorisatie-URL
- Wisselt een autorisatiecode in voor een access + refresh token
- Vernieuwt een verlopen access token via het refresh token
- Haalt recovery data op (HRV, resting HR, recovery score)
- Haalt slaapdata op (duur, fases, slaapscore)

Hoe de Whoop API werkt:
Whoop gebruikt standaard OAuth 2.0 met PKCE. Data staat beschikbaar via
REST endpoints — geen transaction model zoals Polar. Tokens verlopen na 1 uur;
gebruik het refresh token om een nieuw access token op te halen.

Scopes die we nodig hebben:
  read:recovery   — recovery score, HRV, resting HR
  read:sleep      — slaapfases, duur, slaapscore
  read:profile    — user ID ophalen na login
  offline         — refresh token (lange toegang)
"""
import httpx
import logging
from datetime import datetime, timedelta, date
from app.config import settings

logger = logging.getLogger(__name__)

WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth"
WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token"
WHOOP_API_BASE = "https://api.prod.whoop.com/developer/v1"

WHOOP_SCOPES = "read:recovery read:sleep read:profile offline"


def get_auth_url(state: str) -> str:
    """
    Genereert de URL waar de gebruiker naartoe gestuurd wordt om in te loggen bij Whoop.
    Stap 1 van de OAuth flow.

    Args:
        state: Willekeurige string om CSRF-aanvallen te voorkomen.

    Returns:
        Volledige autorisatie-URL als string.
    """
    params = {
        "response_type": "code",
        "client_id": settings.whoop_client_id,
        "redirect_uri": settings.whoop_redirect_uri,
        "scope": WHOOP_SCOPES,
        "state": state,
    }
    query_string = "&".join(f"{key}={value}" for key, value in params.items())
    return f"{WHOOP_AUTH_URL}?{query_string}"


async def exchange_code_for_token(authorization_code: str) -> dict:
    """
    Wisselt de autorisatiecode (ontvangen via callback) in voor tokens.

    Args:
        authorization_code: Code ontvangen van Whoop na gebruiker-login.

    Returns:
        Dict met 'access_token', 'refresh_token', 'user_id'.
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            WHOOP_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": authorization_code,
                "client_id": settings.whoop_client_id,
                "client_secret": settings.whoop_client_secret,
                "redirect_uri": settings.whoop_redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        response.raise_for_status()
        data = response.json()

    # Haal user_id op via /profile endpoint
    user_id = await _get_user_id(data["access_token"])

    return {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token"),
        "user_id": user_id,
    }


async def refresh_access_token(refresh_token: str) -> dict:
    """
    Vernieuwt een verlopen access token via het refresh token.
    Whoop tokens verlopen na 1 uur — roep dit aan bij een 401-response.

    Args:
        refresh_token: Het refresh token opgeslagen bij de gebruiker.

    Returns:
        Dict met nieuw 'access_token' en 'refresh_token'.
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            WHOOP_TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": settings.whoop_client_id,
                "client_secret": settings.whoop_client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        response.raise_for_status()
        data = response.json()

    return {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token", refresh_token),
    }


async def _get_user_id(access_token: str) -> str:
    """
    Haalt het Whoop user_id op via het /profile endpoint.
    Intern gebruikt na token-uitwisseling.
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{WHOOP_API_BASE}/user/profile/basic",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return str(response.json()["user_id"])


async def get_recovery(access_token: str, days_back: int = 7) -> list[dict]:
    """
    Haalt recovery data op voor de afgelopen N dagen.
    Bevat HRV, resting heart rate en recovery score.

    Args:
        access_token: Whoop access token van de gebruiker.
        days_back: Aantal dagen terugkijken (standaard 7).

    Returns:
        Lijst van dicts per dag met:
          - date (date)
          - rmssd (float | None) — HRV in ms
          - resting_heart_rate (int | None) — bpm
          - recovery_score (float | None) — 0-100%
    """
    start = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%dT00:00:00.000Z")
    end = datetime.utcnow().strftime("%Y-%m-%dT23:59:59.999Z")

    results = []
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{WHOOP_API_BASE}/cycle",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"start": start, "end": end, "limit": 25},
        )
        response.raise_for_status()
        cycles = response.json().get("records", [])

    for cycle in cycles:
        score = cycle.get("score") or {}
        # Datum van het cycle komt als ISO-string — normaliseer naar date
        cycle_start = cycle.get("start", "")
        try:
            cycle_date = datetime.fromisoformat(cycle_start[:10]).date()
        except (ValueError, TypeError):
            continue

        results.append({
            "date": cycle_date,
            "rmssd": score.get("hrv_rmssd_milli"),
            "resting_heart_rate": score.get("resting_heart_rate"),
            "recovery_score": score.get("recovery_score"),
        })

    return results


async def get_sleep(access_token: str, days_back: int = 7) -> list[dict]:
    """
    Haalt slaapdata op voor de afgelopen N dagen.
    Bevat duur, fases en slaapscore.

    Args:
        access_token: Whoop access token van de gebruiker.
        days_back: Aantal dagen terugkijken (standaard 7).

    Returns:
        Lijst van dicts per dag met:
          - date (date)
          - deep_sleep_seconds (int | None)
          - rem_sleep_seconds (int | None)
          - light_sleep_seconds (int | None)
          - sleep_efficiency (float | None) — 0-100%
          - sleep_latency_seconds (int | None)
          - sleep_score (float | None) — 0-100%
    """
    start = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%dT00:00:00.000Z")
    end = datetime.utcnow().strftime("%Y-%m-%dT23:59:59.999Z")

    results = []
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{WHOOP_API_BASE}/activity/sleep",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"start": start, "end": end, "limit": 25},
        )
        response.raise_for_status()
        sleeps = response.json().get("records", [])

    for sleep in sleeps:
        score = sleep.get("score") or {}
        stage_summary = score.get("stage_summary") or {}

        sleep_start = sleep.get("start", "")
        try:
            sleep_date = datetime.fromisoformat(sleep_start[:10]).date()
        except (ValueError, TypeError):
            continue

        results.append({
            "date": sleep_date,
            "deep_sleep_seconds": stage_summary.get("total_slow_wave_sleep_time_milli", 0) // 1000,
            "rem_sleep_seconds": stage_summary.get("total_rem_sleep_time_milli", 0) // 1000,
            "light_sleep_seconds": stage_summary.get("total_light_sleep_time_milli", 0) // 1000,
            "sleep_efficiency": score.get("sleep_efficiency_percentage"),
            "sleep_latency_seconds": stage_summary.get("sleep_onset_latency_time_milli", 0) // 1000,
            "sleep_score": score.get("sleep_performance_percentage"),
        })

    return results
