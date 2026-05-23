from __future__ import annotations
import logging
from fastapi import APIRouter, HTTPException, Query
from app.config import settings
from app.data import repo
from app.pipeline.assembler import assemble_briefing, merge_completed_action_carryover
from app.pipeline.ollama_client import OllamaClient
from app.sources.mock_inbox import PersonaNotFound, list_personas, load_raw_inbox
from app.types import Briefing

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/briefing", tags=["briefing"])


async def _generate(persona_id: str) -> Briefing:
    try:
        raw = load_raw_inbox(persona_id)
    except PersonaNotFound as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    client = OllamaClient()
    if settings.llm_pipeline_enabled and not await client.is_reachable():
        log.warning("Ollama not reachable at %s — falling back to non-LLM assembly", settings.ollama_host)
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
    previous = repo.latest_briefing(persona_id)
    merged = merge_completed_action_carryover(fresh, previous)
    repo.save_briefing(persona_id, merged)
    return merged


@router.get("", response_model=Briefing, response_model_by_alias=True)
async def get_briefing(personaId: str = Query(default=None)) -> Briefing:
    persona = personaId or settings.default_persona
    cached = repo.latest_briefing(persona)
    if cached is not None:
        return cached
    return await _generate(persona)


@router.post("/refresh", response_model=Briefing, response_model_by_alias=True)
async def refresh_briefing(personaId: str = Query(default=None)) -> Briefing:
    persona = personaId or settings.default_persona
    return await _generate(persona)


@router.get("/personas", response_model=list[str])
async def get_personas() -> list[str]:
    return list_personas()
