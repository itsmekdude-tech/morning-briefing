import os
import tempfile
from pathlib import Path

# Set env BEFORE any app modules are imported so Settings picks them up
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()
os.environ.setdefault("DB_URL", f"sqlite:///{_tmp_db.name}")
os.environ.setdefault("LLM_PIPELINE_ENABLED", "false")
os.environ.setdefault("OLLAMA_HOST", "http://localhost:65535")

import pytest  # noqa: E402

from app.data.db import init_db  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _init_db():
    init_db()
    yield
    try:
        Path(_tmp_db.name).unlink()
    except FileNotFoundError:
        pass
