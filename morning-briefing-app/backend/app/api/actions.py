from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query
from app.config import settings
from app.data import repo
from app.types import Briefing

router = APIRouter(prefix="/api/actions", tags=["actions"])


@router.post("/{action_id}/complete", response_model=Briefing, response_model_by_alias=True)
async def complete_action(action_id: str, personaId: str = Query(default=None)) -> Briefing:
    persona = personaId or settings.default_persona

    def mutate(b: Briefing) -> Briefing:
        for a in b.actionItems:
            if a.id == action_id:
                a.completed = not a.completed
                return b
        raise HTTPException(status_code=404, detail=f"action {action_id} not found")

    out = repo.update_briefing_in_place(persona, mutate)
    if out is None:
        raise HTTPException(status_code=404, detail="no briefing yet")
    return out
