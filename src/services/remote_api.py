"""Remote API proxy service used by the desktop WebChannel bridge."""

from __future__ import annotations

import logging
from typing import Any

import requests

REQUEST_TIMEOUT_SEC = 20


class RemoteApiService:
    """Performs HTTP requests to the configured remote backend."""

    def __init__(self, base_url: str | None, logger: logging.Logger) -> None:
        self._base_url = (base_url or "").rstrip("/")
        self._logger = logger

    def request(
        self,
        method: str,
        endpoint: str,
        body: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        if not self._base_url:
            return {"ok": False, "status": 503, "error": {"message": "CONTINIUM_API_BASE_URL is not set"}}

        url = self._build_url(endpoint)
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update({str(k): str(v) for k, v in headers.items()})

        try:
            response = requests.request(
                method=method.upper(),
                url=url,
                json=body or None,
                headers=req_headers,
                timeout=REQUEST_TIMEOUT_SEC,
            )
            payload = self._parse_response_payload(response)
            if response.ok:
                return {"ok": True, "status": response.status_code, "data": payload}

            return {
                "ok": False,
                "status": response.status_code,
                "error": payload if isinstance(payload, dict) else {"message": str(payload)},
            }
        except requests.RequestException as exc:
            self._logger.exception("Remote API request failed: %s %s", method, endpoint)
            return {"ok": False, "status": 502, "error": {"message": str(exc)}}

    def _build_url(self, endpoint: str) -> str:
        suffix = endpoint if endpoint.startswith("/") else f"/{endpoint}"
        return f"{self._base_url}{suffix}"

    @staticmethod
    def _parse_response_payload(response: requests.Response) -> Any:
        if response.status_code == 204 or not response.text:
            return None
        try:
            return response.json()
        except ValueError:
            return {"message": response.text}
