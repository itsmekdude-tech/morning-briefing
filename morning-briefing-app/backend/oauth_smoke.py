"""
Standalone OAuth smoke test — proves the Google client credentials work.

Run:
    cd morning-briefing-app/backend
    .venv/bin/uvicorn oauth_smoke:app --port 8000 --reload

Then open http://localhost:8000 and click the link.

This file is intentionally separate from the main `app/` package so it can be
deleted once OAuth is integrated into app/api/auth.py.
"""
from __future__ import annotations
import os
import secrets
import urllib.parse

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse

load_dotenv()

CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
CLIENT_SECRET = os.environ["GOOGLE_CLIENT_SECRET"]
REDIRECT_URI = os.environ["GOOGLE_REDIRECT_URI"]
SCOPES = [s.strip() for s in os.environ["GOOGLE_OAUTH_SCOPES"].split(",") if s.strip()]

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"  # noqa: S105 — public Google endpoint
GMAIL_PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile"

app = FastAPI(title="OAuth Smoke Test")
_state_store: set[str] = set()


@app.get("/", response_class=HTMLResponse)
async def root() -> str:
    return """
        <h1>OAuth Smoke Test</h1>
        <p>Click below to start the Google OAuth flow. You should land back here
        with a real <code>access_token</code> and <code>refresh_token</code>, plus
        a successful Gmail profile fetch proving the token works.</p>
        <p><a href="/auth/start"><b>Start Google OAuth flow →</b></a></p>
    """


@app.get("/auth/start")
async def auth_start() -> RedirectResponse:
    state = secrets.token_urlsafe(32)
    _state_store.add(state)
    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",   # request refresh_token
        "prompt": "consent",        # force consent UI -> always returns refresh_token
        "state": state,
        "include_granted_scopes": "true",
    }
    return RedirectResponse(f"{AUTH_URL}?{urllib.parse.urlencode(params)}")


@app.get("/auth/callback", response_class=HTMLResponse)
async def auth_callback(request: Request) -> str:
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    error = request.query_params.get("error")

    if error:
        return f"<h1>OAuth error</h1><pre>{error}</pre>"
    if not code or state not in _state_store:
        return "<h1>Bad state or missing code</h1>"
    _state_store.discard(state)

    async with httpx.AsyncClient(timeout=20) as client:
        token_resp = await client.post(TOKEN_URL, data={
            "code": code,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        })
    if token_resp.status_code != 200:
        return f"<h1>Token exchange failed</h1><pre>{token_resp.text}</pre>"
    tokens = token_resp.json()

    access_token = tokens.get("access_token", "")
    refresh_token = tokens.get("refresh_token", "")
    access_preview = f"{access_token[:20]}...{access_token[-10:]} ({len(access_token)} chars)"
    refresh_preview = (
        f"{refresh_token[:20]}... ({len(refresh_token)} chars)"
        if refresh_token else "(none — revoke at myaccount.google.com/permissions and retry)"
    )

    async with httpx.AsyncClient(timeout=20) as client:
        gmail_resp = await client.get(
            GMAIL_PROFILE_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    return f"""
        <h1>OAuth handshake succeeded ✓</h1>

        <h2>Tokens received</h2>
        <pre>access_token:  {access_preview}
refresh_token: {refresh_preview}
expires_in:    {tokens.get("expires_in")}s
scope:         {tokens.get("scope")}
token_type:    {tokens.get("token_type")}</pre>

        <h2>Gmail API test ({gmail_resp.status_code})</h2>
        <pre>{gmail_resp.text}</pre>
    """
