"""Application configuration loaded from environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime settings with local-demo defaults and production overrides."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    database_url: str = f"sqlite+aiosqlite:///{API_ROOT / 'posture_guardian.db'}"
    cors_origins: str = (
        "http://localhost:8081,http://127.0.0.1:8081,"
        "http://localhost:19006,http://127.0.0.1:19006"
    )
    pose_model_path: Path = API_ROOT / "models/pose_landmarker_lite.task"
    max_image_bytes: int = 5 * 1024 * 1024

    ai_provider: str = "fallback"
    azure_foundry_endpoint: str = ""
    azure_foundry_api_key: str = Field(default="", repr=False)
    azure_foundry_model: str = "gpt-4.1-mini"

    @property
    def normalized_database_url(self) -> str:
        """Convert common PostgreSQL URLs to SQLAlchemy's async driver form."""
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self.database_url

    @property
    def allowed_origins(self) -> list[str]:
        """Return cleaned CORS origins."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def foundry_configured(self) -> bool:
        """Whether all credentials required for a Foundry request are present."""
        return bool(
            self.ai_provider == "foundry"
            and self.azure_foundry_endpoint
            and self.azure_foundry_api_key
            and self.azure_foundry_model
        )


@lru_cache
def get_settings() -> Settings:
    """Return a process-wide immutable settings instance."""
    return Settings()
