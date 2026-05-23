from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ollama_host: str = "http://localhost:11434"
    ollama_classifier_model: str = "qwen2.5:3b"
    ollama_extractor_model: str = "qwen2.5:3b"
    ollama_timeout_seconds: int = 120

    db_url: str = "sqlite:///./data/briefing.db"
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    default_persona: str = "hersh"
    llm_pipeline_enabled: bool = True

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
