from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://mcphub:mcphub@localhost:5432/mcphub"
    redis_url: str = "redis://localhost:6379"
    app_env: str = "development"
    secret_key: str = "changeme"
    allowed_origins: str = "http://localhost:3000"
    slack_webhook_url: str = ""
    alert_webhook_url: str = ""
    cron_secret: str = "changeme-cron-secret"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()
