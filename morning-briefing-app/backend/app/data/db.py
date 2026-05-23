from __future__ import annotations
from pathlib import Path
from sqlmodel import SQLModel, Session, create_engine
from app.config import settings


def _ensure_sqlite_parent(url: str) -> None:
    if not url.startswith("sqlite:///"):
        return
    path_str = url.replace("sqlite:///", "", 1)
    path = Path(path_str)
    path.parent.mkdir(parents=True, exist_ok=True)


_ensure_sqlite_parent(settings.db_url)

engine = create_engine(
    settings.db_url,
    echo=False,
    connect_args={"check_same_thread": False}
    if settings.db_url.startswith("sqlite") else {},
)


def init_db() -> None:
    # Import models so they're registered before create_all
    from app.data import models  # noqa: F401
    SQLModel.metadata.create_all(engine)


def get_session() -> Session:
    return Session(engine)
