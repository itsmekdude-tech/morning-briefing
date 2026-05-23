from __future__ import annotations
import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Iterable
from app.pipeline.classifier import classify_many
from app.pipeline.extractor import extract_many
from app.pipeline.ollama_client import OllamaClient
from app.types import (
    ActionItem,
    Briefing,
    Classification,
    Extraction,
    InboxSection,
    MailItem,
    MailSender,
    RawInbox,
    RawMessage,
    SectionKind,
)

log = logging.getLogger(__name__)


def _recency_decay(received_at: str, now: datetime) -> float:
    try:
        ts = datetime.fromisoformat(received_at.replace("Z", "+00:00"))
    except ValueError:
        return 0.5
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    hours = max(0.0, (now - ts).total_seconds() / 3600.0)
    # 1.0 at 0h, 0.5 at 12h, ~0.2 at 24h
    return max(0.0, 1.0 - (hours / 24.0))


def _score(c: Classification, recency: float, sender_weight: float) -> float:
    urgency_norm = c.urgency / 3.0
    return 0.5 * urgency_norm + 0.3 * sender_weight + 0.2 * recency


def _to_mail_item(msg: RawMessage, c: Classification) -> MailItem:
    return MailItem(
        id=msg.id,
        **{"from": MailSender(name=msg.from_.name, email=msg.from_.email)},
        subject=msg.subject,
        snippet=msg.snippet,
        body=msg.body,
        receivedAt=msg.receivedAt,
        isUseful=(c.urgency >= 2 and not c.is_noise),
        isNoise=c.is_noise,
        read=False,
    )


def _action_from_extraction(
    msg: RawMessage,
    ext: Extraction,
    idx: int,
) -> ActionItem:
    return ActionItem(
        id=f"act_{idx}_{msg.id}",
        ask=ext.ask,
        due=ext.due,
        **{"from": msg.from_.email},
        sourceMsgId=msg.id,
        confidence=ext.confidence,
        completed=False,
    )


async def assemble_briefing(
    raw: RawInbox,
    *,
    sender_weights: dict[str, float] | None = None,
    client: OllamaClient | None = None,
    enable_llm: bool = True,
) -> Briefing:
    """
    Take a raw inbox and turn it into a fully classified, extracted, ranked Briefing.

    If `enable_llm=False`, returns a degraded briefing using only category hints
    (useful for tests and offline development).
    """
    sender_weights = sender_weights or {}
    client = client or OllamaClient()

    if enable_llm and raw.messages:
        log.info("Classifying %d messages…", len(raw.messages))
        classifications = await classify_many(raw.messages, client=client)
        log.info("Extracting action items where flagged…")
        extractions = await extract_many(raw.messages, classifications, client=client)
    else:
        classifications = [_no_llm_classification(m) for m in raw.messages]
        extractions = [None] * len(raw.messages)

    now = datetime.now(timezone.utc)
    grouped: dict[SectionKind, list[tuple[MailItem, float]]] = defaultdict(list)
    filtered: dict[SectionKind, list[MailItem]] = defaultdict(list)

    for msg, c in zip(raw.messages, classifications):
        sender_weight = sender_weights.get(msg.from_.email.lower(), 0.0)
        recency = _recency_decay(msg.receivedAt, now)
        score = _score(c, recency, sender_weight)
        item = _to_mail_item(msg, c)
        if c.is_noise:
            filtered[c.category].append(item)
        else:
            grouped[c.category].append((item, score))

    sections: dict[SectionKind, InboxSection] = {}
    for kind in ("primary", "updates", "forums", "promotions"):
        kept = sorted(grouped[kind], key=lambda p: p[1], reverse=True)
        kept_items = [it for it, _ in kept]
        sections[kind] = InboxSection(  # type: ignore[index]
            newCount=len(kept_items),
            filteredAsNoise=len(filtered[kind]) or None,
            items=kept_items,
            filteredItems=filtered[kind] or None,
        )

    action_items: list[ActionItem] = []
    for idx, (msg, ext) in enumerate(zip(raw.messages, extractions)):
        if ext is None:
            continue
        action_items.append(_action_from_extraction(msg, ext, idx))
    action_items.sort(key=lambda a: (a.due or "9999-12-31", -a.confidence))

    return Briefing(
        user=raw.user,
        generatedAt=raw.generatedAt,
        calendar=raw.calendar,
        actionItems=action_items,
        sections=sections,
    )


def _no_llm_classification(msg: RawMessage) -> Classification:
    cat = msg.gmailCategoryHint or "primary"
    if cat not in {"primary", "updates", "forums", "promotions"}:
        cat = "primary"
    return Classification(
        category=cat,  # type: ignore[arg-type]
        is_noise=False,
        intent="fyi",
        urgency=1,
    )


def merge_completed_action_carryover(
    fresh: Briefing,
    previous: Briefing | None,
) -> Briefing:
    """If a previous briefing exists, preserve completion status for matching action IDs."""
    if previous is None:
        return fresh
    done_ids = {a.id for a in previous.actionItems if a.completed}
    if not done_ids:
        return fresh
    for action in fresh.actionItems:
        if action.id in done_ids:
            action.completed = True
    return fresh
