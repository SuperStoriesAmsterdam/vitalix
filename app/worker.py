"""
Vitalix — ARQ worker instellingen
Start met: arq app.worker.WorkerSettings

De worker draait als apart proces naast de FastAPI app.
Hij verwerkt background jobs uit de Redis queue
en voert de nachtelijke sync uit via een cron-schema.
"""
import logging
from arq.connections import RedisSettings
from arq.cron import cron
from app.config import settings
from app.jobs.sync import sync_withings_for_user, sync_polar_for_user, sync_whoop_for_user, sync_all_users

logger = logging.getLogger(__name__)


class WorkerSettings:
    """ARQ worker configuratie voor Vitalix."""

    # Alle job-functies die de worker kan uitvoeren
    functions = [
        sync_withings_for_user,
        sync_polar_for_user,
        sync_whoop_for_user,
    ]

    # Nachtelijke sync: elke dag om 03:00
    cron_jobs = [
        cron(sync_all_users, hour=3, minute=0)
    ]

    redis_settings = RedisSettings(
        host=settings.redis_host,
        port=settings.redis_port,
    )

    max_jobs = 10
    job_timeout = 300  # 5 minuten maximum per job
