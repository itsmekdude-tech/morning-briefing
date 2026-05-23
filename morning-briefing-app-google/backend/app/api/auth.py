from __future__ import annotations
import logging
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from app.auth import google_oauth, token_store
from app.config import settings
from app.types import AuthStatus, ConnectResponse

log = logging.getLogger(__name__)

# Routes under /api/auth/* are the ones the frontend calls.
api_router = APIRouter(prefix="/api/auth", tags=["auth"])

# The callback route must match exactly what is registered in Google Cloud
# (we registered http://localhost:8000/auth/callback — no /api prefix).
callback_router = APIRouter(prefix="/auth", tags=["auth-callback"])


@api_router.get("/status", response_model=AuthStatus)
async def status() -> AuthStatus:
    if settings.inbox_source != "gmail":
        # Mock mode: pretend always connected so the existing UI works
        return AuthStatus(connected=True, email="demo@local")
    user = token_store.get_current_user()
    if user is None:
        return AuthStatus(connected=False)
    return AuthStatus(connected=True, email=user.email)


@api_router.get("/start")
async def start() -> dict:
    """Frontend hits this to get the Google consent URL — then navigates the browser there."""
    if settings.inbox_source != "gmail":
        raise HTTPException(
            status_code=400,
            detail="OAuth is only enabled when INBOX_SOURCE=gmail",
        )
    if not settings.google_client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not configured")
    return {"authorization_url": google_oauth.build_authorization_url()}


@api_router.post("/connect", response_model=ConnectResponse)
async def connect_compat() -> ConnectResponse:
    """Legacy stub kept for the POC frontend's old flow — just returns current state."""
    if settings.inbox_source != "gmail":
        return ConnectResponse(email="demo@local")
    user = token_store.get_current_user()
    if user is None:
        raise HTTPException(status_code=400, detail="Not connected. Use /api/auth/start.")
    return ConnectResponse(email=user.email)


@api_router.post("/disconnect")
async def disconnect() -> dict:
    user = token_store.get_current_user()
    if user is None:
        return {"ok": True}
    token_pair = token_store.load_refresh_token(user.id)
    if token_pair is not None:
        try:
            await google_oauth.revoke(token_pair[0])
        except Exception as e:  # noqa: BLE001
            log.warning("Token revoke failed (will still delete locally): %s", e)
    token_store.delete_user_and_token(user.id)
    return {"ok": True}


@callback_router.get("/callback")
async def callback(
    code: str = Query(default=""),
    state: str = Query(default=""),
    error: str = Query(default=""),
) -> RedirectResponse:
    """Google redirects here after the user clicks Allow on the consent screen."""
    if error:
        return RedirectResponse(f"{settings.frontend_base}/?auth_error={error}")
    if not code:
        return RedirectResponse(f"{settings.frontend_base}/?auth_error=missing_code")
    if not state or not google_oauth.verify_state(state):
        return RedirectResponse(f"{settings.frontend_base}/?auth_error=bad_state")

    try:
        token_resp = await google_oauth.exchange_code_for_tokens(code)
    except Exception as e:  # noqa: BLE001
        log.exception("Token exchange failed")
        return RedirectResponse(f"{settings.frontend_base}/?auth_error=token_exchange")

    access_token = token_resp.get("access_token")
    refresh_token = token_resp.get("refresh_token")
    scope_str = token_resp.get("scope", "")
    scopes = scope_str.split(" ") if scope_str else settings.google_scopes_list

    if not access_token:
        return RedirectResponse(f"{settings.frontend_base}/?auth_error=no_access_token")

    try:
        info = await google_oauth.fetch_userinfo(access_token)
    except Exception as e:  # noqa: BLE001
        log.exception("Userinfo fetch failed")
        return RedirectResponse(f"{settings.frontend_base}/?auth_error=userinfo")

    email = info.get("email")
    name = info.get("name") or info.get("given_name") or ""
    if not email:
        return RedirectResponse(f"{settings.frontend_base}/?auth_error=no_email")

    user = token_store.upsert_user(email=email, display_name=name)

    if not refresh_token:
        log.warning(
            "Google returned no refresh_token — user may have already consented. "
            "We forced prompt=consent so this is unexpected."
        )
        return RedirectResponse(f"{settings.frontend_base}/?auth_error=no_refresh_token")

    token_store.store_refresh_token(user.id, refresh_token, scopes)
    return RedirectResponse(f"{settings.frontend_base}/briefing?connected=1")
