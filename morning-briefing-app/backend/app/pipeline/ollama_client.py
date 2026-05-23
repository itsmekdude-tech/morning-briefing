from __future__ import annotations
import json
import logging
from typing import Any
import httpx
from app.config import settings

log = logging.getLogger(__name__)


class OllamaError(RuntimeError):
    pass


class OllamaClient:
    """Thin async wrapper around Ollama's OpenAI-compatible chat endpoint."""

    def __init__(
        self,
        host: str | None = None,
        timeout_seconds: int | None = None,
    ) -> None:
        self.host = (host or settings.ollama_host).rstrip("/")
        self.timeout = timeout_seconds or settings.ollama_timeout_seconds

    async def chat_json(
        self,
        model: str,
        system: str,
        user: str,
        temperature: float = 0.0,
    ) -> dict[str, Any]:
        """Call Ollama and force a JSON object response."""
        url = f"{self.host}/v1/chat/completions"
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "response_format": {"type": "json_object"},
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
            except httpx.HTTPError as e:
                raise OllamaError(f"Ollama request failed: {e}") from e

        data = resp.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise OllamaError(f"Unexpected response shape: {data}") from e

        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            # Some small models occasionally wrap JSON in markdown fences; strip them
            cleaned = content.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0]
                try:
                    return json.loads(cleaned)
                except json.JSONDecodeError:
                    pass
            raise OllamaError(f"Model did not return valid JSON: {content!r}") from e

    async def is_reachable(self) -> bool:
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                resp = await client.get(f"{self.host}/api/tags")
                return resp.status_code == 200
            except httpx.HTTPError:
                return False
