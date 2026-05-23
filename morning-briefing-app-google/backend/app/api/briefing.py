from __future__ import annotations
import logging
from fastapi import APIRouter, HTTPException, Query
from app.auth import token_store
from app.config import settings
from app.data import repo
from app.pipeline.assembler import assemble_briefing, merge_completed_action_carryover
from app.pipeline.ollama_client import OllamaClient
from app.sources import gmail as gmail_source
from app.sources.mock_inbox import PersonaNotFound, list_personas, load_raw_inbox
from app.types import Briefing, RawInbox

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/briefing", tags=["briefing"])


def _briefing_key(persona_id: str | None) -> str:
    """When using Gmail we don't have personas — use a stable key for the connected user."""
    if settings.inbox_source == "gmail":
        user = token_store.get_current_user()
        return f"gmail:{user.email}" if user else "gmail:anon"
    return persona_id or settings.default_persona


async def _load_raw(persona_id: str | None) -> RawInbox:
    if settings.inbox_source == "gmail":
        user = token_store.get_current_user()
        if user is None:
            raise HTTPException(
                status_code=401,
                detail="Not connected to Google. Use POST /api/auth/start.",
            )
        return await gmail_source.fetch_raw_inbox(user)
    persona = persona_id or settings.default_persona
    try:
        return load_raw_inbox(persona)
    except PersonaNotFound as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


async def _generate(persona_id: str | None) -> Briefing:
    raw = await _load_raw(persona_id)
    key = _briefing_key(persona_id)

    client = OllamaClient()
    if settings.llm_pipeline_enabled and not await client.is_reachable():
        log.warning(
            "Ollama not reachable at %s — falling back to non-LLM assembly",
            settings.ollama_host,
        )
        enable_llm = False
    else:
        enable_llm = settings.llm_pipeline_enabled

    sender_weights = repo.get_sender_weights()
    fresh = await assemble_briefing(
        raw,
        sender_weights=sender_weights,
        client=client,
        enable_llm=enable_llm,
    )
    previous = repo.latest_briefing(key)
    merged = merge_completed_action_carryover(fresh, previous)
    repo.save_briefing(key, merged)
    return merged


@router.get("", response_model=Briefing, response_model_by_alias=True)
async def get_briefing(personaId: str = Query(default=None)) -> Briefing:
    key = _briefing_key(personaId)
    cached = repo.latest_briefing(key)
    if cached is not None:
        return cached
    return await _generate(personaId)


@router.post("/refresh", response_model=Briefing, response_model_by_alias=True)
async def refresh_briefing(personaId: str = Query(default=None)) -> Briefing:
    return await _generate(personaId)


@router.get("/personas", response_model=list[str])
async def get_personas() -> list[str]:
    if settings.inbox_source == "gmail":
        return []
    return list_personas()


@router.get("/mode")
async def get_mode() -> dict:
    return {"inbox_source": settings.inbox_source}
