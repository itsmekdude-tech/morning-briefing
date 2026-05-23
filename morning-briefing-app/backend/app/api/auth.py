from __future__ import annotations
from fastapi import APIRouter
from app.types import AuthStatus, ConnectResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Phase 2 stub: we don't have real OAuth yet.
# Returning a permanent "connected" state matches what the frontend POC expects
# so the same UI flow works without modification.

_STUB_EMAIL = "demo@local"


@router.get("/status", response_model=AuthStatus)
async def status() -> AuthStatus:
    return AuthStatus(connected=True, email=_STUB_EMAIL)


@router.post("/connect", response_model=ConnectResponse)
async def connect() -> ConnectResponse:
    return ConnectResponse(email=_STUB_EMAIL)


@router.post("/disconnect")
async def disconnect() -> dict:
    return {"ok": True}
