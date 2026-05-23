from __future__ import annotations
import secrets as _secrets
from pathlib import Path
from typing import Literal
from cryptography.fernet import Fernet
from pydantic_settings import BaseSettings, SettingsConfigDict


def _generate_fernet_key() -> str:
    return Fernet.generate_key().decode()


def _generate_session_secret() -> str:
    return _secrets.token_urlsafe(48)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ollama_host: str = "http://localhost:11434"
    ollama_classifier_model: str = "qwen2.5:3b"
    ollama_extractor_model: str = "qwen2.5:3b"
    ollama_timeout_seconds: int = 120

    db_url: str = "sqlite:///./data/briefing.db"
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    frontend_base: str = "http://localhost:5173"

    inbox_source: Literal["mock", "gmail"] = "mock"
    default_persona: str = "hersh"
    llm_pipeline_enabled: bool = True

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/callback"
    google_oauth_scopes: str = (
        "openid,email,profile,"
        "https://www.googleapis.com/auth/gmail.readonly,"
        "https://www.googleapis.com/auth/calendar.readonly"
    )

    token_encryption_key: str = ""
    session_secret: str = ""

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def google_scopes_list(self) -> list[str]:
        return [s.strip() for s in self.google_oauth_scopes.split(",") if s.strip()]

    def ensure_secrets(self) -> None:
        """Auto-generate ephemeral secrets if blank, and persist them to .env.local
        so they survive restarts. Never overwrites if already set."""
        wrote = []
        if not self.token_encryption_key:
            self.token_encryption_key = _generate_fernet_key()
            wrote.append(f"TOKEN_ENCRYPTION_KEY={self.token_encryption_key}")
        if not self.session_secret:
            self.session_secret = _generate_session_secret()
            wrote.append(f"SESSION_SECRET={self.session_secret}")
        if wrote:
            local = Path(".env.local")
            existing = local.read_text() if local.exists() else ""
            local.write_text(existing + "\n" + "\n".join(wrote) + "\n")


settings = Settings()
settings.ensure_secrets()
