from __future__ import annotations
from datetime import datetime, timezone
from sqlmodel import select
from app.data.db import get_session
from app.data.models import BriefingRow, FeedbackWeight
from app.types import Briefing


def save_briefing(persona_id: str, briefing: Briefing) -> str:
    row = BriefingRow(
        persona_id=persona_id,
        generated_at=datetime.now(timezone.utc),
        payload=briefing.model_dump_json(by_alias=True),
    )
    with get_session() as s:
        s.add(row)
        s.commit()
        s.refresh(row)
    return row.id


def latest_briefing(persona_id: str) -> Briefing | None:
    with get_session() as s:
        row = s.exec(
            select(BriefingRow)
            .where(BriefingRow.persona_id == persona_id)
            .order_by(BriefingRow.generated_at.desc())
        ).first()
        if row is None:
            return None
        return Briefing.model_validate_json(row.payload)


def update_briefing_in_place(persona_id: str, updater) -> Briefing | None:
    """Load latest briefing, apply mutation, persist as new row."""
    current = latest_briefing(persona_id)
    if current is None:
        return None
    updated = updater(current)
    save_briefing(persona_id, updated)
    return updated


# --- Feedback weights -----------------------------------------------------


def get_sender_weights() -> dict[str, float]:
    with get_session() as s:
        rows = s.exec(select(FeedbackWeight)).all()
    return {r.sender_email.lower(): r.weight for r in rows}


def bump_weight(sender_email: str, delta: float, clamp: tuple[float, float] = (-2.0, 2.0)) -> float:
    email = sender_email.lower()
    with get_session() as s:
        row = s.get(FeedbackWeight, email)
        if row is None:
            row = FeedbackWeight(
                sender_email=email,
                weight=0.0,
                updated_at=datetime.now(timezone.utc),
            )
        new_weight = max(clamp[0], min(clamp[1], row.weight + delta))
        row.weight = new_weight
        row.updated_at = datetime.now(timezone.utc)
        s.add(row)
        s.commit()
        return new_weight
