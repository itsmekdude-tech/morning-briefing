import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_healthz(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_auth_status_stub(client):
    r = client.get("/api/auth/status")
    assert r.status_code == 200
    body = r.json()
    assert body["connected"] is True
    assert body["email"] == "demo@local"


def test_personas_listed(client):
    r = client.get("/api/briefing/personas")
    assert r.status_code == 200
    personas = r.json()
    assert "hersh" in personas
    assert "student" in personas
    assert "founder" in personas


def test_get_briefing_runs_pipeline_without_llm(client):
    # LLM disabled in conftest — should still return a valid briefing
    r = client.get("/api/briefing", params={"personaId": "hersh"})
    assert r.status_code == 200
    body = r.json()
    assert body["user"]["displayName"] == "Hersh"
    assert set(body["sections"].keys()) == {"primary", "updates", "forums", "promotions"}


def test_get_briefing_unknown_persona_returns_404(client):
    r = client.get("/api/briefing", params={"personaId": "nonexistent_persona"})
    assert r.status_code == 404


def test_refresh_briefing_returns_fresh_briefing(client):
    r1 = client.get("/api/briefing", params={"personaId": "hersh"})
    r2 = client.post("/api/briefing/refresh", params={"personaId": "hersh"})
    assert r2.status_code == 200
    assert r2.json()["user"]["displayName"] == "Hersh"


def test_mark_noise_moves_item_to_filtered(client):
    # Generate a fresh briefing first
    r = client.post("/api/briefing/refresh", params={"personaId": "hersh"})
    primary_items = r.json()["sections"]["primary"]["items"]
    if not primary_items:
        pytest.skip("no primary items to mark")
    item_id = primary_items[0]["id"]
    r2 = client.post(f"/api/items/{item_id}/noise", params={"personaId": "hersh"})
    assert r2.status_code == 200
    body = r2.json()
    primary_ids = [i["id"] for i in body["sections"]["primary"]["items"]]
    assert item_id not in primary_ids
