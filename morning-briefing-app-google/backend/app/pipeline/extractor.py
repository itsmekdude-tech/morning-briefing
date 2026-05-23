from __future__ import annotations
import asyncio
import logging
from app.config import settings
from app.pipeline.ollama_client import OllamaClient, OllamaError
from app.types import Classification, Extraction, RawMessage

log = logging.getLogger(__name__)


SYSTEM_PROMPT = (
    "You extract a single action item from an email if one exists.\n"
    "An action item is something the recipient is being asked or expected to DO.\n\n"
    "Output ONLY a single JSON object:\n"
    "  has_action: boolean\n"
    '  ask: short verb-led description (or null if has_action=false)\n'
    '  due: ISO date "YYYY-MM-DD" if a deadline is stated or strongly implied, else null\n'
    "  who_asked: name of the sender (or null)\n"
    "  confidence: float 0.0..1.0 (your confidence the ask is real)\n\n"
    "If nothing is being asked of the recipient, set has_action=false and leave other fields null.\n"
    "Do not invent deadlines. Do not extract asks from auto-generated / marketing emails.\n"
)


def build_user_prompt(msg: RawMessage) -> str:
    body = (msg.body or msg.snippet)[:2000]
    return (
        f"From: {msg.from_.name} <{msg.from_.email}>\n"
        f"Subject: {msg.subject}\n"
        f"Body:\n{body}"
    )


async def extract_one(
    client: OllamaClient,
    msg: RawMessage,
    model: str | None = None,
) -> Extraction | None:
    model = model or settings.ollama_extractor_model
    user_prompt = build_user_prompt(msg)
    try:
        raw = await client.chat_json(model=model, system=SYSTEM_PROMPT, user=user_prompt)
    except OllamaError as e:
        log.warning("Extraction failed for msg %s: %s", msg.id, e)
        return None
    return _coerce_extraction(raw, msg)


async def extract_many(
    msgs: list[RawMessage],
    classifications: list[Classification],
    *,
    client: OllamaClient | None = None,
    concurrency: int = 2,
) -> list[Extraction | None]:
    """
    Only run extraction for messages where the classifier flagged intent=action_required.
    Returns a list aligned with `msgs` (None for skipped messages).
    """
    client = client or OllamaClient()
    sem = asyncio.Semaphore(concurrency)
    results: list[Extraction | None] = [None] * len(msgs)

    async def go(idx: int, m: RawMessage) -> None:
        async with sem:
            results[idx] = await extract_one(client, m)

    targets = [
        (i, m)
        for i, (m, c) in enumerate(zip(msgs, classifications))
        if c.intent == "action_required"
    ]
    await asyncio.gather(*(go(i, m) for i, m in targets))
    return results


def _coerce_extraction(raw: dict, msg: RawMessage) -> Extraction | None:
    try:
        has_action = bool(raw.get("has_action", False))
        if not has_action:
            return None

        ask = raw.get("ask")
        if not ask or not isinstance(ask, str):
            return None

        due = raw.get("due")
        if due is not None and (not isinstance(due, str) or len(due) < 8):
            due = None

        who = raw.get("who_asked") or msg.from_.name
        if not isinstance(who, str):
            who = msg.from_.name

        try:
            conf = float(raw.get("confidence", 0.5))
        except (ValueError, TypeError):
            conf = 0.5
        conf = max(0.0, min(1.0, conf))

        return Extraction(ask=ask.strip(), due=due, who_asked=who, confidence=conf)
    except Exception as e:  # noqa: BLE001
        log.warning("Could not coerce extraction for msg %s: %s", msg.id, e)
        return None
