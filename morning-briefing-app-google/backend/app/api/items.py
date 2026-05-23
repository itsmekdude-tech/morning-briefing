from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.config import settings
from app.data import repo
from app.types import Briefing, InboxSection, MailItem

router = APIRouter(prefix="/api/items", tags=["items"])


class SnoozeBody(BaseModel):
    until: str


def _find_section_with_item(briefing: Briefing, item_id: str) -> tuple[str, InboxSection, MailItem, str] | None:
    for kind, section in briefing.sections.items():
        for item in section.items:
            if item.id == item_id:
                return kind, section, item, "items"
        if section.filteredItems:
            for item in section.filteredItems:
                if item.id == item_id:
                    return kind, section, item, "filtered"
    return None


@router.post("/{item_id}/noise", response_model=Briefing, response_model_by_alias=True)
async def mark_noise(item_id: str, personaId: str = Query(default=None)) -> Briefing:
    persona = personaId or settings.default_persona

    def mutate(b: Briefing) -> Briefing:
        found = _find_section_with_item(b, item_id)
        if not found:
            raise HTTPException(status_code=404, detail=f"item {item_id} not found")
        kind, section, item, location = found
        item.isNoise = True
        item.isUseful = False
        if location == "items":
            section.items = [i for i in section.items if i.id != item_id]
            section.filteredItems = [item, *(section.filteredItems or [])]
            section.filteredAsNoise = (section.filteredAsNoise or 0) + 1
            section.newCount = max(0, section.newCount - 1)
        repo.bump_weight(item.from_.email, -0.25)
        return b

    out = repo.update_briefing_in_place(persona, mutate)
    if out is None:
        raise HTTPException(status_code=404, detail="no briefing yet")
    return out


@router.post("/{item_id}/useful", response_model=Briefing, response_model_by_alias=True)
async def mark_useful(item_id: str, personaId: str = Query(default=None)) -> Briefing:
    persona = personaId or settings.default_persona

    def mutate(b: Briefing) -> Briefing:
        found = _find_section_with_item(b, item_id)
        if not found:
            raise HTTPException(status_code=404, detail=f"item {item_id} not found")
        kind, section, item, location = found
        item.isUseful = True
        item.isNoise = False
        if location == "filtered" and section.filteredItems:
            section.filteredItems = [i for i in section.filteredItems if i.id != item_id]
            section.items = [item, *section.items]
            section.filteredAsNoise = max(0, (section.filteredAsNoise or 1) - 1)
        else:
            section.items = [item, *[i for i in section.items if i.id != item_id]]
        repo.bump_weight(item.from_.email, +0.25)
        return b

    out = repo.update_briefing_in_place(persona, mutate)
    if out is None:
        raise HTTPException(status_code=404, detail="no briefing yet")
    return out


@router.post("/{item_id}/snooze", response_model=Briefing, response_model_by_alias=True)
async def snooze(item_id: str, body: SnoozeBody, personaId: str = Query(default=None)) -> Briefing:
    persona = personaId or settings.default_persona

    def mutate(b: Briefing) -> Briefing:
        for section in b.sections.values():
            section.items = [i for i in section.items if i.id != item_id]
        return b

    out = repo.update_briefing_in_place(persona, mutate)
    if out is None:
        raise HTTPException(status_code=404, detail="no briefing yet")
    return out
