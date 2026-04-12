"""Remote auth API client for desktop bridge requests."""

from __future__ import annotations

import logging
from typing import Any

import requests

REQUEST_TIMEOUT_SEC = 20


class RemoteAuthApi:
    """Calls remote auth endpoints and returns normalized API responses."""

    AUTH_PREFIX = "/auth/"

    def __init__(self, base_url: str | None, logger: logging.Logger, verify_ssl: bool = True) -> None:
        self._base_url = (base_url or "").rstrip("/")
        self._logger = logger
        self._verify_ssl = verify_ssl

    def enabled(self) -> bool:
        return bool(self._base_url)

    def handles(self, path: str) -> bool:
        return path.startswith(self.AUTH_PREFIX)

    def request(
        self,
        method: str,
        endpoint: str,
        body: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        if not self.enabled():
            return {"ok": False, "status": 503, "error": {"detail": "Remote auth API is not configured"}}

        url = self._build_url(endpoint)
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)

        try:
            response = requests.request(
                method=method.upper(),
                url=url,
                json=body or None,
                headers=req_headers,
                timeout=REQUEST_TIMEOUT_SEC,
                verify=self._verify_ssl,
            )
            payload = self._parse_payload(response)
            if response.ok:
                return {"ok": True, "status": response.status_code, "data": payload}
            return {
                "ok": False,
                "status": response.status_code,
                "error": payload if isinstance(payload, dict) else {"detail": str(payload)},
            }
        except requests.RequestException as exc:
            self._logger.exception("Remote auth request failed: %s %s", method, endpoint)
            return {"ok": False, "status": 502, "error": {"detail": str(exc)}}

    def _build_url(self, endpoint: str) -> str:
        suffix = endpoint if endpoint.startswith("/") else f"/{endpoint}"
        return f"{self._base_url}{suffix}"

    @staticmethod
    def _parse_payload(response: requests.Response) -> Any:
        if response.status_code == 204 or not response.text:
            return None
        try:
            return response.json()
        except ValueError:
            return {"detail": response.text}
