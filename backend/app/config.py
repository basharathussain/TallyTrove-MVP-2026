from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://tallytrove:tallytrove@db:5432/tallytrove"
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    admin_email: str = "admin@tallytrove.com"
    admin_password: str = "changeme123"
    demo_customer_email: str = "demo@tallytrove.com"
    demo_customer_password: str = "demo123"

    scrapfly_key: str = ""
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""

    drift_threshold: float = 0.02
    default_fx_usd_gbp: float = 0.79

    class Config:
        env_file = ".env"


settings = Settings()
