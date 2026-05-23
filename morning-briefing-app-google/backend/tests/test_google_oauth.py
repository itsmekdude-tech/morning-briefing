import pytest
from app.auth import google_oauth
from app.config import settings


@pytest.fixture(autouse=True)
def _patch_client_id(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "fake-client-id.apps.googleusercontent.com")


def test_state_round_trip():
    state = google_oauth.make_state()
    assert google_oauth.verify_state(state) is True


def test_state_rejects_tampered_value():
    state = google_oauth.make_state()
    tampered = state[:-2] + "ab"
    assert google_oauth.verify_state(tampered) is False


def test_authorization_url_includes_required_params():
    url = google_oauth.build_authorization_url()
    assert url.startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert "client_id=fake-client-id" in url
    assert "response_type=code" in url
    assert "access_type=offline" in url
    assert "prompt=consent" in url
    assert "scope=" in url
    assert "state=" in url


def test_authorization_url_fails_without_client_id(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "")
    with pytest.raises(RuntimeError):
        google_oauth.build_authorization_url()
