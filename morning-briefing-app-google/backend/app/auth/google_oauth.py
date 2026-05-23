from __future__ import annotations
import logging
from urllib.parse import urlencode
import httpx
from itsdangerous import BadSignature, URLSafeTimedSerializer
from app.config import settings

log = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.session_secret, salt="oauth-state")


def make_state() -> str:
    """Sign a single-use random state token for CSRF protection."""
    import secrets
    return _serializer().dumps(secrets.token_urlsafe(16))


def verify_state(state: str, max_age_seconds: int = 600) -> bool:
    try:
        _serializer().loads(state, max_age=max_age_seconds)
        return True
    except BadSignature:
        return False


def build_authorization_url() -> str:
    if not settings.google_client_id:
        raise RuntimeError("GOOGLE_CLIENT_ID is not set in .env")
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": " ".join(settings.google_scopes_list),
        "access_type": "offline",
        "prompt": "consent",  # force refresh_token even if user already consented
        "include_granted_scopes": "true",
        "state": make_state(),
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> dict:
    """POST code -> Google's token endpoint, returns the full token response."""
    payload = {
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": settings.google_redirect_uri,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data=payload)
        resp.raise_for_status()
        return resp.json()


async def fetch_userinfo(access_token: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()


async def refresh_access_token(refresh_token: str) -> dict:
    """Use a stored refresh_token to get a new access_token."""
    payload = {
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data=payload)
        resp.raise_for_status()
        return resp.json()


async def revoke(token: str) -> None:
    async with httpx.AsyncClient(timeout=15.0) as client:
        await client.post(GOOGLE_REVOKE_URL, data={"token": token})
