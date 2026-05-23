from __future__ import annotations
import asyncio
import logging
from app.config import settings
from app.pipeline.ollama_client import OllamaClient, OllamaError
from app.types import Classification, RawMessage

log = logging.getLogger(__name__)


SYSTEM_PROMPT = (
    "You classify emails for a personal morning briefing.\n"
    "Decide which Gmail-style category the message belongs to, whether it is "
    "noise (low-value marketing / boilerplate / automated digests with no "
    "specific value), the sender's intent, and its urgency.\n\n"
    "Output ONLY a single JSON object with these keys:\n"
    '  category: one of "primary" | "updates" | "forums" | "promotions"\n'
    "  is_noise: boolean\n"
    '  intent: one of "action_required" | "fyi" | "transactional" '
    '| "marketing" | "newsletter" | "social"\n'
    "  urgency: integer 0..3 (0=ignore, 3=must act today)\n"
    "\n"
    "Rules:\n"
    "- Messages from real people about real work -> primary, intent action_required or fyi.\n"
    "- Account changes, security alerts, invoices, payouts -> updates, NOT noise.\n"
    "- Travel/flight check-in, renewal reminders within 7 days -> promotions, NOT noise.\n"
    "- Mailing list digests, marketing blasts, social pokes -> usually noise=true.\n"
    "- When unsure, prefer intent=fyi, urgency=1, is_noise=false.\n"
)


def build_user_prompt(msg: RawMessage) -> str:
    parts = [
        f"From: {msg.from_.name} <{msg.from_.email}>",
        f"Subject: {msg.subject}",
        f"Snippet: {msg.snippet[:400]}",
    ]
    if msg.gmailCategoryHint:
        parts.append(f"Gmail category hint: {msg.gmailCategoryHint}")
    return "\n".join(parts)


async def classify_one(
    client: OllamaClient,
    msg: RawMessage,
    model: str | None = None,
) -> Classification:
    model = model or settings.ollama_classifier_model
    user_prompt = build_user_prompt(msg)
    try:
        raw = await client.chat_json(model=model, system=SYSTEM_PROMPT, user=user_prompt)
    except OllamaError as e:
        log.warning("Classification failed for msg %s: %s", msg.id, e)
        return _fallback_classification(msg)
    return _coerce_classification(raw, msg)


async def classify_many(
    msgs: list[RawMessage],
    *,
    client: OllamaClient | None = None,
    concurrency: int = 4,
) -> list[Classification]:
    client = client or OllamaClient()
    sem = asyncio.Semaphore(concurrency)

    async def go(m: RawMessage) -> Classification:
        async with sem:
            return await classify_one(client, m)

    return await asyncio.gather(*(go(m) for m in msgs))


def _coerce_classification(raw: dict, msg: RawMessage) -> Classification:
    """Best-effort coercion — small models sometimes return loose types."""
    try:
        cat = str(raw.get("category", "primary")).lower()
        if cat not in {"primary", "updates", "forums", "promotions"}:
            cat = msg.gmailCategoryHint or "primary"

        is_noise = bool(raw.get("is_noise", False))

        intent = str(raw.get("intent", "fyi")).lower()
        if intent not in {
            "action_required",
            "fyi",
            "transactional",
            "marketing",
            "newsletter",
            "social",
        }:
            intent = "fyi"

        urgency = int(raw.get("urgency", 1))
        urgency = max(0, min(3, urgency))

        return Classification(
            category=cat,  # type: ignore[arg-type]
            is_noise=is_noise,
            intent=intent,  # type: ignore[arg-type]
            urgency=urgency,
        )
    except (ValueError, TypeError):
        return _fallback_classification(msg)


def _fallback_classification(msg: RawMessage) -> Classification:
    """When the LLM fails or returns garbage, classify conservatively."""
    cat = msg.gmailCategoryHint or "primary"
    if cat not in {"primary", "updates", "forums", "promotions"}:
        cat = "primary"
    return Classification(
        category=cat,  # type: ignore[arg-type]
        is_noise=False,
        intent="fyi",
        urgency=1,
    )
