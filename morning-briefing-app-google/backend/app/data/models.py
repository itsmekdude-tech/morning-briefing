from __future__ import annotations
import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel


class BriefingRow(SQLModel, table=True):
    __tablename__ = "briefings"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    persona_id: str = Field(index=True)
    generated_at: datetime
    payload: str  # JSON


class FeedbackWeight(SQLModel, table=True):
    __tablename__ = "feedback_weights"
    sender_email: str = Field(primary_key=True)
    weight: float = 0.0
    updated_at: datetime


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    email: str = Field(index=True, unique=True)
    display_name: str = ""
    created_at: datetime
    updated_at: datetime


class GoogleToken(SQLModel, table=True):
    __tablename__ = "google_tokens"
    user_id: str = Field(primary_key=True)  # FK -> users.id
    refresh_token_enc: str  # Fernet-encrypted
    scopes: str  # comma-separated
    created_at: datetime
    updated_at: datetime
