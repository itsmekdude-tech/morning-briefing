from __future__ import annotations
import json
from pathlib import Path
from app.types import RawInbox

MOCKS_DIR = Path(__file__).resolve().parent.parent.parent / "mocks"


class PersonaNotFound(ValueError):
    pass


def load_raw_inbox(persona_id: str) -> RawInbox:
    path = MOCKS_DIR / f"raw_inbox_{persona_id}.json"
    if not path.exists():
        raise PersonaNotFound(
            f"No mock inbox for persona '{persona_id}' at {path}"
        )
    data = json.loads(path.read_text())
    return RawInbox.model_validate(data)


def list_personas() -> list[str]:
    return sorted(
        p.stem.replace("raw_inbox_", "")
        for p in MOCKS_DIR.glob("raw_inbox_*.json")
    )
