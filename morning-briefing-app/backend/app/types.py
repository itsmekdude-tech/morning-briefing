from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field

SectionKind = Literal["primary", "updates", "forums", "promotions"]
Intent = Literal[
    "action_required",
    "fyi",
    "transactional",
    "marketing",
    "newsletter",
    "social",
]


class User(BaseModel):
    displayName: str
    email: str
    timezone: str


class CalendarEvent(BaseModel):
    id: str
    title: str
    start: str
    end: str
    location: Optional[str] = None
    attendees: Optional[int] = None


class ActionItem(BaseModel):
    id: str
    ask: str
    due: Optional[str] = None
    from_: Optional[str] = Field(default=None, alias="from")
    sourceMsgId: Optional[str] = None
    confidence: float
    completed: bool = False

    class Config:
        populate_by_name = True


class MailSender(BaseModel):
    name: str
    email: str


class MailItem(BaseModel):
    id: str
    from_: MailSender = Field(alias="from")
    subject: str
    snippet: str
    body: Optional[str] = None
    receivedAt: str
    isUseful: bool = False
    isNoise: bool = False
    read: Optional[bool] = None

    class Config:
        populate_by_name = True


class InboxSection(BaseModel):
    newCount: int
    filteredAsNoise: Optional[int] = None
    items: list[MailItem] = []
    filteredItems: Optional[list[MailItem]] = None


class Briefing(BaseModel):
    user: User
    generatedAt: str
    calendar: list[CalendarEvent]
    actionItems: list[ActionItem]
    sections: dict[SectionKind, InboxSection]


# --- Raw inbox (pre-classification) — what the LLM pipeline ingests


class RawMessage(BaseModel):
    """A single email before classification — what Gmail (or our mock loader) returns."""

    id: str
    from_: MailSender = Field(alias="from")
    subject: str
    snippet: str
    body: Optional[str] = None
    receivedAt: str
    gmailCategoryHint: Optional[str] = None  # primary | updates | forums | promotions

    class Config:
        populate_by_name = True


class RawInbox(BaseModel):
    """Everything the pipeline needs to assemble a briefing."""

    user: User
    generatedAt: str
    calendar: list[CalendarEvent]
    messages: list[RawMessage]


# --- LLM outputs (per stage)


class Classification(BaseModel):
    category: SectionKind
    is_noise: bool
    intent: Intent
    urgency: int = Field(ge=0, le=3)


class Extraction(BaseModel):
    ask: str
    due: Optional[str] = None
    who_asked: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)


# --- Auth (stub for now)


class AuthStatus(BaseModel):
    connected: bool
    email: Optional[str] = None


class ConnectResponse(BaseModel):
    status: Literal["connected"] = "connected"
    email: str
