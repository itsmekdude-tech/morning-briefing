from __future__ import annotations
import logging
from datetime import datetime, timezone
from cryptography.fernet import Fernet, InvalidToken
from sqlmodel import select
from app.config import settings
from app.data.db import get_session
from app.data.models import GoogleToken, User

log = logging.getLogger(__name__)


def _fernet() -> Fernet:
    return Fernet(settings.token_encryption_key.encode())


def encrypt(refresh_token: str) -> str:
    return _fernet().encrypt(refresh_token.encode()).decode()


def decrypt(enc: str) -> str:
    try:
        return _fernet().decrypt(enc.encode()).decode()
    except InvalidToken as e:
        raise ValueError("Could not decrypt refresh token — encryption key changed?") from e


def upsert_user(email: str, display_name: str = "") -> User:
    now = datetime.now(timezone.utc)
    with get_session() as s:
        user = s.exec(select(User).where(User.email == email.lower())).first()
        if user is None:
            user = User(
                email=email.lower(),
                display_name=display_name,
                created_at=now,
                updated_at=now,
            )
            s.add(user)
        else:
            user.display_name = display_name or user.display_name
            user.updated_at = now
            s.add(user)
        s.commit()
        s.refresh(user)
        return user


def store_refresh_token(user_id: str, refresh_token: str, scopes: list[str]) -> None:
    now = datetime.now(timezone.utc)
    enc = encrypt(refresh_token)
    with get_session() as s:
        existing = s.get(GoogleToken, user_id)
        if existing is None:
            s.add(GoogleToken(
                user_id=user_id,
                refresh_token_enc=enc,
                scopes=",".join(scopes),
                created_at=now,
                updated_at=now,
            ))
        else:
            existing.refresh_token_enc = enc
            existing.scopes = ",".join(scopes)
            existing.updated_at = now
            s.add(existing)
        s.commit()


def load_refresh_token(user_id: str) -> tuple[str, list[str]] | None:
    with get_session() as s:
        row = s.get(GoogleToken, user_id)
        if row is None:
            return None
        return decrypt(row.refresh_token_enc), row.scopes.split(",")


def get_current_user() -> User | None:
    """Return the single user, if any. v1 is single-user — we just take the first row."""
    with get_session() as s:
        return s.exec(select(User).order_by(User.created_at.desc())).first()


def delete_user_and_token(user_id: str) -> None:
    with get_session() as s:
        token = s.get(GoogleToken, user_id)
        user = s.get(User, user_id)
        if token:
            s.delete(token)
        if user:
            s.delete(user)
        s.commit()
