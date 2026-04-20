"""Local DAL-backed API service for the desktop frontend bridge."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
import json
import logging
from typing import Any
from urllib.parse import parse_qs, urlsplit

from dal import SessionLocal
from dal import goal as goal_dal
from dal import stats as stats_dal
from services.remote_auth_api import RemoteAuthApi
from utils.paths import app_data_dir


@dataclass
class ApiError(Exception):
    status: int
    message: str


class LocalApiService:
    """Implements the frontend API contract using local DAL modules."""

    def __init__(
        self,
        remote_api_base_url: str | None,
        logger: logging.Logger,
        verify_remote_auth_ssl: bool = True,
    ) -> None:
        self._sessions: dict[str, int] = {}
        self._logger = logger
        self._remote_auth = RemoteAuthApi(remote_api_base_url, logger, verify_ssl=verify_remote_auth_ssl)
        self._auth_session_path = app_data_dir() / "auth_session.json"

    def request(
        self,
        method: str,
        endpoint: str,
        body: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        try:
            return self._handle_request(method.upper(), endpoint, body or {}, headers or {})
        except ApiError as exc:
            return {"ok": False, "status": exc.status, "error": {"detail": exc.message}}
        except Exception as exc:  # surface unexpected backend failures to the frontend
            return {"ok": False, "status": 500, "error": {"detail": str(exc)}}

    def _handle_request(
        self, method: str, endpoint: str, body: dict[str, Any], headers: dict[str, str]
    ) -> dict[str, Any]:
        parts = urlsplit(endpoint)
        path = parts.path.rstrip("/")
        query = parse_qs(parts.query)

        if method == "GET" and path == "/auth/session":
            return self._ok(self._read_persisted_session())
        if method == "POST" and path == "/auth/session/clear":
            self._clear_persisted_session()
            return self._ok({"cleared": True})

        if self._remote_auth.handles(path):
            self._logger.debug(
                "Auth endpoint request method=%s path=%s has_auth=%s",
                method,
                path,
                bool(headers.get("Authorization")),
            )
            return self._handle_remote_auth(method, path, body, headers)

        user_id = self._require_user_id(headers)

        if method == "GET" and path == "/goals":
            return self._ok(self._list_goals(user_id))
        if method == "POST" and path == "/goals":
            return self._ok(self._create_goal(user_id, body))
        if path.startswith("/goals/"):
            goal_id = self._path_int(path, "/goals/")
            if method == "GET":
                return self._ok(self._get_goal(user_id, goal_id))
            if method == "PUT":
                return self._ok(self._update_goal(user_id, goal_id, body))
            if method == "DELETE":
                self._delete_goal(user_id, goal_id)
                return {"ok": True, "status": 204, "data": None}

        if path.startswith("/stats/goal/"):
            goal_id = self._path_int(path, "/stats/goal/")
            if method == "GET":
                return self._ok(self._stats_for_goal(user_id, goal_id))
            if method == "POST":
                return self._ok(self._create_stat(user_id, goal_id, body))

        if method == "GET" and path.startswith("/stats/") and path.endswith("/by-date-range"):
            goal_id = self._path_int(path[: -len("/by-date-range")], "/stats/")
            return self._ok(self._stats_by_date_range(user_id, goal_id, query))

        raise ApiError(404, f"Endpoint not found: {method} {path}")

    @staticmethod
    def _ok(payload: Any) -> dict[str, Any]:
        return {"ok": True, "status": 200, "data": payload}

    @staticmethod
    def _path_int(path: str, prefix: str) -> int:
        suffix = path[len(prefix) :].strip("/")
        try:
            return int(suffix)
        except ValueError as exc:
            raise ApiError(400, f"Invalid id in path: {path}") from exc

    def _require_user_id(self, headers: dict[str, str]) -> int:
        auth = headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            raise ApiError(401, "Missing authorization token")
        token = auth.split(" ", 1)[1].strip()
        user_id = self._sessions.get(token)
        if user_id:
            self._logger.debug("Session cache hit for token_fp=%s", self._token_fingerprint(token))
            return user_id
        self._logger.debug("Session cache miss for token_fp=%s; validating remotely", self._token_fingerprint(token))
        user_id = self._resolve_remote_user_id(token, headers)
        if not user_id:
            self._logger.info("Auth token rejected by remote /auth/me validation")
            raise ApiError(401, "Invalid or expired session")
        self._sessions[token] = user_id
        self._logger.debug("Session cached from remote validation user_id=%s token_fp=%s", user_id, self._token_fingerprint(token))
        return user_id

    def _resolve_remote_user_id(self, token: str, headers: dict[str, str]) -> int | None:
        if not self._remote_auth.enabled():
            return None
        forwarded_headers = dict(headers)
        forwarded_headers["Authorization"] = f"Bearer {token}"
        response = self._remote_auth.request("GET", "/auth/me", None, forwarded_headers)
        if not response.get("ok"):
            status = int(response.get("status") or 500)
            detail = response.get("error", {}).get("detail", "Remote auth validation failed")
            if status in {401, 403}:
                return None
            if status >= 500:
                self._logger.warning("Remote auth unavailable while validating session: status=%s detail=%s", status, detail)
                raise ApiError(503, "Authentication service temporarily unavailable")
            self._logger.warning("Unexpected remote auth validation response: status=%s detail=%s", status, detail)
            raise ApiError(502, "Authentication validation failed")
        data = response.get("data") or {}
        user_id = data.get("id")
        if isinstance(user_id, int):
            return user_id
        if isinstance(user_id, str) and user_id.isdigit():
            return int(user_id)
        return None

    def _handle_remote_auth(
        self, method: str, path: str, body: dict[str, Any], headers: dict[str, str]
    ) -> dict[str, Any]:
        response = self._remote_auth.request(method, path, body, headers)
        if not response.get("ok"):
            return response

        data = response.get("data")
        if method == "POST" and path == "/auth/login":
            return self._cache_login_session(response)
        if method == "POST" and path == "/auth/refresh":
            self._persist_remote_session(data)
        if method == "GET" and path == "/auth/me":
            self._cache_current_session(headers, data)
        return response

    def _cache_login_session(self, response: dict[str, Any]) -> dict[str, Any]:
        data = response.get("data") or {}
        token = data.get("session_token") or data.get("access_token")
        user = data.get("user") if isinstance(data, dict) else None
        user_id = user.get("id") if isinstance(user, dict) else None
        if token and user_id:
            try:
                self._sessions[str(token)] = int(user_id)
                self._logger.debug(
                    "Cached login session user_id=%s token_fp=%s",
                    int(user_id),
                    self._token_fingerprint(str(token)),
                )
            except (TypeError, ValueError):
                pass
        self._persist_remote_session(data)
        return response

    def _cache_current_session(self, headers: dict[str, str], payload: Any) -> None:
        auth = headers.get("Authorization", "")
        if not auth.startswith("Bearer ") or not isinstance(payload, dict):
            return
        token = auth.split(" ", 1)[1].strip()
        user_id = payload.get("id")
        try:
            if token and user_id is not None:
                self._sessions[token] = int(user_id)
                self._logger.debug(
                    "Cached /auth/me session user_id=%s token_fp=%s",
                    int(user_id),
                    self._token_fingerprint(token),
                )
        except (TypeError, ValueError):
            return

    def _persist_remote_session(self, payload: Any) -> None:
        if not isinstance(payload, dict):
            return
        token = payload.get("session_token") or payload.get("access_token")
        refresh = payload.get("refresh_token")
        user = payload.get("user") if isinstance(payload.get("user"), dict) else None
        expires_at = payload.get("expires_at") or payload.get("access_token_exp")
        if not token and not refresh:
            return
        record: dict[str, Any] = {
            "session_token": token,
            "access_token": token,
            "refresh_token": refresh,
            "expires_at": expires_at,
            "saved_at": datetime.now(timezone.utc).isoformat(),
        }
        if user:
            record["user"] = user
        self._write_persisted_session(record)

    def _read_persisted_session(self) -> dict[str, Any] | None:
        try:
            if not self._auth_session_path.exists():
                return None
            raw = self._auth_session_path.read_text(encoding="utf-8")
            payload = json.loads(raw)
            if isinstance(payload, dict):
                return payload
        except Exception:
            self._logger.exception("Failed to read persisted auth session")
        return None

    def _write_persisted_session(self, payload: dict[str, Any]) -> None:
        try:
            self._auth_session_path.parent.mkdir(parents=True, exist_ok=True)
            self._auth_session_path.write_text(json.dumps(payload), encoding="utf-8")
            self._logger.debug("Persisted desktop auth session")
        except Exception:
            self._logger.exception("Failed to persist auth session")

    def _clear_persisted_session(self) -> None:
        try:
            if self._auth_session_path.exists():
                self._auth_session_path.unlink()
                self._logger.debug("Cleared persisted desktop auth session")
        except Exception:
            self._logger.exception("Failed to clear persisted auth session")

    @staticmethod
    def _token_fingerprint(token: str) -> str:
        if not token:
            return "none"
        prefix = token[:6]
        return f"{prefix}...len={len(token)}"

    def _list_goals(self, user_id: int) -> list[dict[str, Any]]:
        with SessionLocal() as db:
            goals = goal_dal.list_goals(db, user_id=user_id)
            return [self._serialize_goal(goal) for goal in goals]

    def _get_goal(self, user_id: int, goal_id: int) -> dict[str, Any]:
        with SessionLocal() as db:
            goal = goal_dal.get_goal(db, goal_id)
            if not goal or goal.user_id != user_id:
                raise ApiError(404, "Goal not found")
            return self._serialize_goal(goal)

    def _create_goal(self, user_id: int, body: dict[str, Any]) -> dict[str, Any]:
        payload = {
            "title": str(body.get("title", "")).strip(),
            "type": str(body.get("type", "Repeating")).strip() or "Repeating",
            "start_date": self._parse_date(str(body.get("start_date", ""))),
            "deadline": self._parse_date(str(body.get("deadline", ""))),
            "frequency": str(body.get("frequency", "daily")).lower(),
            "duration_min": int(body.get("duration_min", 0)),
            "is_complete": bool(body.get("is_complete", False)),
        }
        if not payload["title"]:
            raise ApiError(400, "Goal title is required")
        with SessionLocal() as db:
            created = goal_dal.create_goal(db, user_id=user_id, goal_data=payload)
            return self._serialize_goal(created)

    def _update_goal(self, user_id: int, goal_id: int, body: dict[str, Any]) -> dict[str, Any]:
        with SessionLocal() as db:
            existing = goal_dal.get_goal(db, goal_id)
            if not existing or existing.user_id != user_id:
                raise ApiError(404, "Goal not found")
            fields: dict[str, Any] = {}
            if "title" in body:
                fields["title"] = str(body["title"]).strip()
            if "type" in body:
                fields["type"] = str(body["type"])
            if "start_date" in body:
                fields["start_date"] = self._parse_date(str(body["start_date"]))
            if "deadline" in body:
                fields["deadline"] = self._parse_date(str(body["deadline"]))
            if "frequency" in body:
                fields["frequency"] = str(body["frequency"]).lower()
            if "duration_min" in body:
                fields["duration_min"] = int(body["duration_min"])
            if "is_complete" in body:
                fields["is_complete"] = bool(body["is_complete"])
            updated = goal_dal.update_goal(db, goal_id, fields)
            if not updated:
                raise ApiError(404, "Goal not found")
            return self._serialize_goal(updated)

    def _delete_goal(self, user_id: int, goal_id: int) -> None:
        with SessionLocal() as db:
            existing = goal_dal.get_goal(db, goal_id)
            if not existing or existing.user_id != user_id:
                raise ApiError(404, "Goal not found")
            goal_dal.delete_goal(db, goal_id)

    def _stats_for_goal(self, user_id: int, goal_id: int) -> list[dict[str, Any]]:
        with SessionLocal() as db:
            goal = goal_dal.get_goal(db, goal_id)
            if not goal or goal.user_id != user_id:
                raise ApiError(404, "Goal not found")
            stats = stats_dal.get_stats_by_goal(db, goal_id=goal_id, user_id=user_id)
            return [self._serialize_stat(stat) for stat in stats]

    def _create_stat(self, user_id: int, goal_id: int, body: dict[str, Any]) -> dict[str, Any]:
        duration = int(body.get("duration_minutes", 0))
        if duration < 0:
            raise ApiError(400, "duration_minutes must be non-negative")
        with SessionLocal() as db:
            goal = goal_dal.get_goal(db, goal_id)
            if not goal or goal.user_id != user_id:
                raise ApiError(404, "Goal not found")
            created = stats_dal.create_stat(db, goal_id=goal_id, user_id=user_id, duration_minutes=duration)
            return self._serialize_stat(created)

    def _stats_by_date_range(
        self, user_id: int, goal_id: int, query: dict[str, list[str]]
    ) -> list[dict[str, Any]]:
        start_raw = query.get("start_date", [None])[0]
        end_raw = query.get("end_date", [None])[0]
        if not start_raw or not end_raw:
            raise ApiError(400, "start_date and end_date are required")
        start_dt = datetime.fromisoformat(start_raw).replace(tzinfo=timezone.utc)
        end_dt = datetime.fromisoformat(end_raw).replace(tzinfo=timezone.utc)
        with SessionLocal() as db:
            goal = goal_dal.get_goal(db, goal_id)
            if not goal or goal.user_id != user_id:
                raise ApiError(404, "Goal not found")
            stats = stats_dal.get_stats_by_date_range(
                db,
                user_id=user_id,
                goal_id=goal_id,
                start_date=start_dt,
                end_date=end_dt,
            )
            return [self._serialize_stat(stat) for stat in stats]

    @staticmethod
    def _parse_date(value: str) -> date:
        if not value:
            raise ApiError(400, "Invalid date value")
        try:
            return datetime.fromisoformat(value).date()
        except ValueError as exc:
            raise ApiError(400, f"Invalid date value: {value}") from exc

    @staticmethod
    def _serialize_goal(goal: Any) -> dict[str, Any]:
        frequency = goal.frequency.value if hasattr(goal.frequency, "value") else goal.frequency
        return {
            "id": goal.id,
            "title": goal.title,
            "type": goal.type,
            "start_date": goal.start_date.isoformat() if goal.start_date else None,
            "deadline": goal.deadline.isoformat() if goal.deadline else None,
            "frequency": frequency,
            "duration_min": goal.duration_min,
            "is_complete": goal.is_complete,
            "user_id": goal.user_id,
        }

    @staticmethod
    def _serialize_stat(stat: Any) -> dict[str, Any]:
        occurred = stat.occurred_at
        if isinstance(occurred, datetime):
            occurred = occurred.isoformat()
        return {
            "id": stat.id,
            "goal_id": stat.goal_id,
            "user_id": stat.user_id,
            "occurred_at": occurred,
            "duration_minutes": stat.duration_minutes,
        }
