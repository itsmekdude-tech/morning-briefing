from __future__ import annotations
import base64
import logging
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from app.auth import google_oauth, token_store
from app.config import settings
from app.types import (
    CalendarEvent,
    MailSender,
    RawInbox,
    RawMessage,
    User,
)

log = logging.getLogger(__name__)


async def _credentials_for(user_id: str) -> Credentials:
    """Get a fresh google.oauth2 Credentials object for the user, refreshing if needed."""
    token_pair = token_store.load_refresh_token(user_id)
    if token_pair is None:
        raise RuntimeError(f"No stored refresh token for user {user_id}")
    refresh_token, scopes = token_pair

    # Exchange refresh -> access
    token_resp = await google_oauth.refresh_access_token(refresh_token)
    access_token = token_resp["access_token"]

    return Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri=google_oauth.GOOGLE_TOKEN_URL,
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=scopes,
    )


def _gmail_label_to_category(labels: list[str]) -> str | None:
    if "CATEGORY_PERSONAL" in labels:
        return "primary"
    if "CATEGORY_UPDATES" in labels:
        return "updates"
    if "CATEGORY_FORUMS" in labels:
        return "forums"
    if "CATEGORY_PROMOTIONS" in labels:
        return "promotions"
    if "CATEGORY_SOCIAL" in labels:
        return "forums"
    return None


def _decode_body(part: dict) -> str:
    data = part.get("body", {}).get("data")
    if not data:
        return ""
    try:
        return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        return ""


def _extract_plain_text(payload: dict) -> str:
    """Walk the MIME tree and grab the first text/plain part."""
    if payload.get("mimeType") == "text/plain":
        return _decode_body(payload)
    for part in payload.get("parts", []) or []:
        body = _extract_plain_text(part)
        if body:
            return body
    return ""


def _header(payload: dict, name: str) -> str:
    name_lower = name.lower()
    for h in payload.get("headers", []):
        if h["name"].lower() == name_lower:
            return h.get("value", "")
    return ""


def _parse_from(value: str) -> MailSender:
    """Parse 'Display Name <email@x.com>' or just 'email@x.com'."""
    value = value.strip()
    if "<" in value and ">" in value:
        name = value.split("<")[0].strip().strip('"')
        email = value.split("<")[1].split(">")[0].strip()
        return MailSender(name=name or email, email=email)
    return MailSender(name=value, email=value)


def _parse_received_at(date_header: str, internal_date_ms: str | int | None) -> str:
    """Prefer the Date: header; fall back to Gmail's internalDate (ms since epoch)."""
    if date_header:
        try:
            dt = parsedate_to_datetime(date_header)
            if dt is not None:
                return dt.isoformat()
        except (TypeError, ValueError):
            pass
    if internal_date_ms is not None:
        try:
            ts = int(internal_date_ms) / 1000.0
            return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
        except (ValueError, TypeError):
            pass
    return datetime.now(timezone.utc).isoformat()


def _to_raw_message(msg: dict) -> RawMessage:
    payload = msg.get("payload", {})
    from_header = _header(payload, "From")
    subject = _header(payload, "Subject") or "(no subject)"
    date_header = _header(payload, "Date")
    body = _extract_plain_text(payload)
    snippet = msg.get("snippet", "") or body[:240]
    labels = msg.get("labelIds", []) or []
    category_hint = _gmail_label_to_category(labels)

    return RawMessage.model_validate(
        {
            "id": msg["id"],
            "from": _parse_from(from_header).model_dump(),
            "subject": subject,
            "snippet": snippet,
            "body": body[:5000] if body else None,
            "receivedAt": _parse_received_at(date_header, msg.get("internalDate")),
            "gmailCategoryHint": category_hint,
        }
    )


def _list_recent_message_ids(service, max_results: int = 50) -> list[str]:
    """List message IDs from the last 24h, excluding trash + spam."""
    query = "newer_than:1d -in:trash -in:spam"
    resp = (
        service.users()
        .messages()
        .list(userId="me", q=query, maxResults=max_results)
        .execute()
    )
    return [m["id"] for m in resp.get("messages", [])]


def _fetch_message(service, msg_id: str) -> dict:
    return (
        service.users()
        .messages()
        .get(userId="me", id=msg_id, format="full")
        .execute()
    )


async def fetch_inbox(user: User, *, max_messages: int = 40) -> list[RawMessage]:
    creds = await _credentials_for(user.id if hasattr(user, "id") else user["id"])
    # google-api-python-client is sync; that's fine — runs in threadpool by default under uvicorn
    service = build("gmail", "v1", credentials=creds, cache_discovery=False)
    ids = _list_recent_message_ids(service, max_results=max_messages)
    log.info("Gmail: fetched %d message IDs in last 24h", len(ids))
    messages = []
    for msg_id in ids:
        try:
            raw = _fetch_message(service, msg_id)
            messages.append(_to_raw_message(raw))
        except Exception as e:  # noqa: BLE001
            log.warning("Skipping message %s: %s", msg_id, e)
    return messages


async def fetch_calendar(user: User, *, hours_ahead: int = 24) -> list[CalendarEvent]:
    creds = await _credentials_for(user.id if hasattr(user, "id") else user["id"])
    service = build("calendar", "v3", credentials=creds, cache_discovery=False)
    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=hours_ahead)
    resp = (
        service.events()
        .list(
            calendarId="primary",
            timeMin=now.isoformat(),
            timeMax=end.isoformat(),
            singleEvents=True,
            orderBy="startTime",
            maxResults=20,
        )
        .execute()
    )
    events: list[CalendarEvent] = []
    for e in resp.get("items", []):
        start = e.get("start", {}).get("dateTime") or e.get("start", {}).get("date")
        end_ = e.get("end", {}).get("dateTime") or e.get("end", {}).get("date")
        if not start or not end_:
            continue
        events.append(
            CalendarEvent(
                id=e["id"],
                title=e.get("summary", "(no title)"),
                start=start,
                end=end_,
                location=e.get("location"),
                attendees=len(e.get("attendees", []) or []) or None,
            )
        )
    return events


async def fetch_raw_inbox(user_record) -> RawInbox:
    """Build a complete RawInbox from real Gmail + Calendar."""
    user = User(
        displayName=user_record.display_name or user_record.email.split("@")[0],
        email=user_record.email,
        timezone="America/New_York",  # TODO: read from Calendar settings
    )
    messages = await fetch_inbox(user_record)
    calendar = await fetch_calendar(user_record)
    return RawInbox(
        user=user,
        generatedAt=datetime.now(timezone.utc).isoformat(),
        calendar=calendar,
        messages=messages,
    )
