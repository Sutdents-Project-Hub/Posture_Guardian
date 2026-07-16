"""Application configuration loaded from environment variables."""

from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL

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
    db_host: str = ""
    db_port: int = Field(default=5432, ge=1, le=65535)
    db_name: str = "posture_guardian"
    db_user: str = "posture_guardian"
    db_password: str = Field(default="", repr=False)
    cors_origins: str = (
        "http://localhost:8081,http://127.0.0.1:8081,"
        "http://localhost:19006,http://127.0.0.1:19006"
    )
    pose_model_path: Path = API_ROOT / "models/pose_landmarker_lite.task"
    migration_root: Path = API_ROOT
    max_image_bytes: int = 5 * 1024 * 1024

    ai_provider: Literal["fallback", "liangjie"] = "fallback"
    ai_base_url: str = ""
    ai_api_key: str = Field(default="", repr=False)
    ai_model: str = ""
    ai_api_mode: Literal["chat_completions", "responses"] = "chat_completions"
    ai_timeout_seconds: float = Field(default=8.0, ge=1, le=30)

    @model_validator(mode="after")
    def validate_external_services(self) -> "Settings":
        """Reject partial or unsafe production AI configuration at startup."""
        if self.ai_provider == "fallback":
            return self
        missing = [
            name
            for name, value in (
                ("AI_BASE_URL", self.ai_base_url),
                ("AI_API_KEY", self.ai_api_key),
                ("AI_MODEL", self.ai_model),
            )
            if not value.strip()
        ]
        if missing:
            raise ValueError(f"AI_PROVIDER=liangjie 時必須設定：{', '.join(missing)}")

        parsed = urlsplit(self.ai_base_url)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError("AI_BASE_URL 必須是完整的 HTTP(S) base URL")
        if parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError("AI_BASE_URL 不可包含帳密、query 或 fragment")
        if self.app_env == "production" and parsed.scheme != "https":
            raise ValueError("production 的 AI_BASE_URL 必須使用 HTTPS")
        return self

    @property
    def normalized_database_url(self) -> str:
        """Build a password-safe async PostgreSQL URL or normalize an explicit URL."""
        if self.db_host:
            if not self.db_password:
                raise ValueError("設定 DB_HOST 時也必須設定 DB_PASSWORD")
            return URL.create(
                "postgresql+asyncpg",
                username=self.db_user,
                password=self.db_password,
                host=self.db_host,
                port=self.db_port,
                database=self.db_name,
            ).render_as_string(hide_password=False)
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self.database_url

    @property
    def allowed_origins(self) -> list[str]:
        """Return cleaned CORS origins."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def insight_configured(self) -> bool:
        """Whether the selected external insight provider passed startup validation."""
        return self.ai_provider == "liangjie"


@lru_cache
def get_settings() -> Settings:
    """Return a process-wide immutable settings instance."""
    return Settings()
