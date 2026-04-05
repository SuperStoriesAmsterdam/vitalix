"""
Vitalix — Polar AccessLink API client
Documentatie: https://www.polar.com/accesslink-api/
OAuth 2.0 — registreer app op https://admin.polaraccesslink.com/

Wat dit bestand doet:
- Genereert de OAuth autorisatie-URL (stap 1 van login)
- Wisselt een autorisatiecode in voor een access token (stap 2)
- Registreert een nieuwe Polar-gebruiker in het AccessLink-systeem
- Haalt nachtelijke HRV/hersteldata op (Nightly Recharge)
- Haalt slaapdata op (duur, fases, slaapscore)
- Haalt activiteitsdata op (stappen, calorieën, activiteitsniveau)

Hoe de Polar AccessLink API werkt:
Polar gebruikt een transactie-model. Data ophalen gaat in drie stappen:
1. Maak een transactie aan (create transaction)
2. Haal de items op binnen die transactie
3. Sluit de transactie (commit) — daarna geeft Polar nieuwe data
"""
import httpx
import logging
from datetime import datetime, timedelta, date
from app.config import settings

logger = logging.getLogger(__name__)

POLAR_AUTH_URL = "https://flow.polar.com/oauth2/authorization"
POLAR_TOKEN_URL = "https://polarremote.com/v2/oauth2/token"
POLAR_API_BASE = "https://www.polaraccesslink.com/v3"


def get_auth_url(state: str) -> str:
    """
    Genereert de URL waar de gebruiker naartoe gestuurd wordt om in te loggen bij Polar.
    Stap 1 van de OAuth flow.

    Args:
        state: Willekeurige string om CSRF-aanvallen te voorkomen — sla op in sessie.

    Returns:
        Volledige autorisatie-URL als string.
    """
    params = {
        "response_type": "code",
        "client_id": settings.polar_client_id,
        "redirect_uri": settings.polar_redirect_uri,
        "scope": "accesslink.read_all",
        "state": state,
    }
    query_string = "&".join(f"{key}={value}" for key, value in params.items())
    return f"{POLAR_AUTH_URL}?{query_string}"


async def exchange_code_for_token(authorization_code: str) -> dict:
    """
    Wisselt de autorisatiecode (ontvangen via callback) in voor een access token.
    Stap 2 van de OAuth flow.

    Args:
        authorization_code: Code ontvangen van Polar na gebruiker-login.

    Returns:
        Dict met 'access_token', 'token_type', 'x_user_id' en 'expires_in'.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                POLAR_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": authorization_code,
                    "redirect_uri": settings.polar_redirect_uri,
                },
                auth=(settings.polar_client_id, settings.polar_client_secret),
                headers={"Accept": "application/json"},
            )
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException:
        logger.error("Polar token exchange: timeout")
        raise
    except Exception:
        logger.exception("Polar token exchange: onverwachte fout")
        raise


async def register_user(access_token: str, polar_user_id: str) -> bool:
    """
    Registreert een nieuwe gebruiker in het Polar AccessLink systeem.
    Dit moet exact één keer gebeuren per gebruiker — direct na de eerste token-uitwisseling.
    Zonder registratie geeft de API geen data terug.

    Args:
        access_token: Polar OAuth access token van de gebruiker.
        polar_user_id: Polar's eigen gebruikers-ID (ontvangen in token-response als 'x_user_id').

    Returns:
        True als registratie geslaagd of gebruiker al geregistreerd was, anders False.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{POLAR_API_BASE}/users",
                json={"member-id": polar_user_id},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )
            # 200 = succesvol geregistreerd, 409 = al geregistreerd (ook OK)
            if response.status_code in (200, 409):
                logger.info(f"Polar gebruiker geregistreerd: {polar_user_id}")
                return True
            logger.error(f"Polar gebruiker registratie mislukt: {response.status_code} {response.text}")
            return False
    except Exception:
        logger.exception(f"Polar gebruiker registratie: onverwachte fout voor {polar_user_id}")
        return False


async def get_nightly_recharge(
    access_token: str,
    polar_user_id: str,
    days_back: int = 30,
) -> list[dict]:
    """
    Haalt Nightly Recharge data op — Polar's maat voor autonome herstel tijdens de nacht.
    Dit is de HRV-equivalent voor Vitalix: hoe goed heeft het autonome zenuwstelsel
    hersteld tijdens de slaap?

    Polar geeft per nacht:
    - ans_charge: autonome zenuwstelsel-lading (0-100, hoger = beter herstel)
    - ans_rate: gemiddelde hartslag tijdens diepe slaap
    - heart_rate: nachtelijke hartslag statistieken

    Args:
        access_token: Polar OAuth access token van de gebruiker.
        polar_user_id: Polar's eigen gebruikers-ID.
        days_back: Aantal dagen terug om op te halen (standaard 30).

    Returns:
        Lijst van dicts met 'date', 'ans_charge', 'ans_rate', 'heart_rate_avg'.
    """
    start_date = (date.today() - timedelta(days=days_back)).isoformat()
    end_date = date.today().isoformat()

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{POLAR_API_BASE}/users/{polar_user_id}/nightly-recharge",
                params={"from": start_date, "to": end_date},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )
            if response.status_code == 404:
                logger.info(f"Polar Nightly Recharge niet beschikbaar voor gebruiker {polar_user_id} (device ondersteunt dit niet)")
                return []
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException:
        logger.error(f"Polar Nightly Recharge ophalen: timeout voor gebruiker {polar_user_id}")
        raise
    except Exception:
        logger.exception(f"Polar Nightly Recharge ophalen: fout voor gebruiker {polar_user_id}")
        raise

    results = []
    for entry in data.get("recharges", []):
        results.append({
            "date": entry.get("date"),
            "ans_charge": entry.get("ans_charge"),
            "ans_rate": entry.get("ans_rate"),
            "heart_rate_avg": entry.get("heart_rate_avg"),
            "heart_rate_variability_avg": entry.get("heart_rate_variability_avg"),
        })

    return results


async def get_sleep(
    access_token: str,
    polar_user_id: str,
    days_back: int = 30,
) -> list[dict]:
    """
    Haalt slaapdata op van de Polar Loop via de AccessLink API.

    Per nacht geeft Polar:
    - Totale slaapduur
    - Slaapfases: diepe slaap, lichte slaap, REM-slaap
    - Slaapscore (0-100)
    - Slaap start- en eindtijd

    Args:
        access_token: Polar OAuth access token van de gebruiker.
        polar_user_id: Polar's eigen gebruikers-ID.
        days_back: Aantal dagen terug om op te halen (standaard 30).

    Returns:
        Lijst van dicts met 'date', 'sleep_score', 'total_sleep_seconds',
        'deep_sleep_seconds', 'rem_sleep_seconds', 'light_sleep_seconds',
        'sleep_start', 'sleep_end'.
    """
    start_date = (date.today() - timedelta(days=days_back)).isoformat()
    end_date = date.today().isoformat()

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{POLAR_API_BASE}/users/{polar_user_id}/sleep",
                params={"from": start_date, "to": end_date},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )
            if response.status_code == 404:
                logger.info(f"Polar slaap niet beschikbaar voor gebruiker {polar_user_id} (device ondersteunt dit niet)")
                return []
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException:
        logger.error(f"Polar slaap ophalen: timeout voor gebruiker {polar_user_id}")
        raise
    except Exception:
        logger.exception(f"Polar slaap ophalen: fout voor gebruiker {polar_user_id}")
        raise

    results = []
    for entry in data.get("nights", []):
        results.append({
            "date": entry.get("date"),
            "sleep_score": entry.get("sleep_score"),
            "total_sleep_seconds": entry.get("total_sleep"),
            "deep_sleep_seconds": entry.get("deep_sleep"),
            "rem_sleep_seconds": entry.get("rem_sleep"),
            "light_sleep_seconds": entry.get("light_sleep"),
            "sleep_start": entry.get("sleep_start_time"),
            "sleep_end": entry.get("sleep_end_time"),
            "continuity": entry.get("continuity"),
        })

    return results


async def get_activity(
    access_token: str,
    polar_user_id: str,
    days_back: int = 30,
) -> list[dict]:
    """
    Haalt dagelijkse activiteitsdata op van de Polar Loop.

    Per dag geeft Polar:
    - Stappen
    - Verbrande calorieën
    - Actieve tijd (minuten)
    - Inactiviteitswaarschuwingen

    Args:
        access_token: Polar OAuth access token van de gebruiker.
        polar_user_id: Polar's eigen gebruikers-ID.
        days_back: Aantal dagen terug om op te halen (standaard 30).

    Returns:
        Lijst van dicts met 'date', 'steps', 'calories', 'active_seconds'.
    """
    start_date = (date.today() - timedelta(days=days_back)).isoformat()
    end_date = date.today().isoformat()

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{POLAR_API_BASE}/users/{polar_user_id}/activity",
                params={"from": start_date, "to": end_date},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )
            if response.status_code == 404:
                logger.info(f"Polar activiteit niet beschikbaar voor gebruiker {polar_user_id}")
                return []
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException:
        logger.error(f"Polar activiteit ophalen: timeout voor gebruiker {polar_user_id}")
        raise
    except Exception:
        logger.exception(f"Polar activiteit ophalen: fout voor gebruiker {polar_user_id}")
        raise

    results = []
    for entry in data.get("activity", []):
        results.append({
            "date": entry.get("date"),
            "steps": entry.get("steps"),
            "calories": entry.get("calories"),
            "active_seconds": entry.get("active_seconds"),
            "duration": entry.get("duration"),
        })

    return results
