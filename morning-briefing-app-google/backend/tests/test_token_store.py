import pytest
from app.auth import token_store
from app.data.db import init_db


@pytest.fixture(autouse=True)
def _db():
    init_db()


def test_fernet_round_trip():
    original = "fake-refresh-token-1!2@3#"
    enc = token_store.encrypt(original)
    assert enc != original
    assert token_store.decrypt(enc) == original


def test_upsert_user_creates_then_updates():
    u1 = token_store.upsert_user("alice@example.com", "Alice")
    assert u1.email == "alice@example.com"
    assert u1.display_name == "Alice"

    u2 = token_store.upsert_user("alice@example.com", "Alice Smith")
    assert u2.id == u1.id
    assert u2.display_name == "Alice Smith"


def test_store_and_load_refresh_token():
    user = token_store.upsert_user("bob@example.com", "Bob")
    token_store.store_refresh_token(user.id, "fake-refresh", ["openid", "email"])
    loaded = token_store.load_refresh_token(user.id)
    assert loaded is not None
    refresh, scopes = loaded
    assert refresh == "fake-refresh"
    assert "email" in scopes


def test_delete_user_and_token():
    user = token_store.upsert_user("carol@example.com", "Carol")
    token_store.store_refresh_token(user.id, "tok", ["openid"])
    token_store.delete_user_and_token(user.id)
    assert token_store.load_refresh_token(user.id) is None
