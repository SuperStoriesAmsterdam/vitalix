"""
Vitalix — applicatie-instellingen
Alle configuratie komt uit environment variables (.env).
Pydantic-settings valideert bij opstarten en faalt luid bij missende verplichte variabelen.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Alle vereiste environment variables voor Vitalix."""

    # Database
    database_url: str

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379

    # App
    app_secret_key: str
    app_base_url: str = "http://localhost:8000"
    product_id: str = "vitalix"
    app_version: str = "0.1.0"

    # Email
    resend_api_key: str = ""
    email_from: str = "noreply@vitalix.com"

    # Withings
    withings_client_id: str = ""
    withings_client_secret: str = ""
    withings_redirect_uri: str = "http://localhost:8000/withings/callback"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
