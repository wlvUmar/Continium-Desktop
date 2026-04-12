"""Local DAL-backed API service for the desktop frontend bridge."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
import hashlib
import hmac
import secrets
from typing import Any
from urllib.parse import parse_qs, urlsplit

from dal import SessionLocal
from dal import goal as goal_dal
from dal import stats as stats_dal
from dal import user as user_dal
from models.user import User


@dataclass
class ApiError(Exception):
    status: int
    message: str


class LocalApiService:
    """Implements the frontend API contract using local DAL modules."""

    def __init__(self) -> None:
        self._sessions: dict[str, int] = {}
        self._reset_tokens: dict[str, int] = {}

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

        if method == "POST" and path == "/auth/login":
            return self._ok(self._auth_login(body))
        if method == "POST" and path == "/auth/register":
            return self._ok(self._auth_register(body))
        if method == "POST" and path == "/auth/verify":
            return self._ok({"status": "verified"})
        if method == "POST" and path == "/auth/forgot-password":
            return self._ok(self._auth_forgot_password(body))
        if method == "POST" and path == "/auth/reset-password":
            return self._ok(self._auth_reset_password(body))

        user_id = self._require_user_id(headers)

        if method == "GET" and path == "/auth/me":
            return self._ok(self._auth_me(user_id))
        if method == "PUT" and path == "/auth/me":
            return self._ok(self._auth_update_me(user_id, body))
        if method == "POST" and path == "/auth/change-password":
            return self._ok(self._auth_change_password(user_id, body))

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
        if not user_id:
            raise ApiError(401, "Invalid or expired session")
        return user_id

    def _auth_login(self, body: dict[str, Any]) -> dict[str, Any]:
        email = str(body.get("email", "")).strip().lower()
        password = str(body.get("password", ""))
        if not email or not password:
            raise ApiError(400, "Email and password are required")

        with SessionLocal() as db:
            user = user_dal.get_by_email(db, email)
            if not user or not self._verify_password(password, user.password_hash):
                raise ApiError(401, "Invalid email or password")
            token = self._issue_token(user.id)
            return {"session_token": token, "user": self._serialize_user(user)}

    def _auth_register(self, body: dict[str, Any]) -> dict[str, Any]:
        full_name = str(body.get("full_name", "")).strip()
        email = str(body.get("email", "")).strip().lower()
        password = str(body.get("password", ""))
        if not full_name or not email or not password:
            raise ApiError(400, "full_name, email and password are required")
        if len(password) < 6:
            raise ApiError(400, "Password must be at least 6 characters")

        with SessionLocal() as db:
            if user_dal.get_by_email(db, email):
                raise ApiError(409, "Email already registered")
            new_user = User(
                full_name=full_name,
                email=email,
                password_hash=self._hash_password(password),
                verified=True,
                is_active=True,
            )
            created = user_dal.create(db, new_user)
            return self._serialize_user(created)

    def _auth_me(self, user_id: int) -> dict[str, Any]:
        with SessionLocal() as db:
            user = user_dal.get_by_id(db, user_id)
            if not user:
                raise ApiError(404, "User not found")
            return self._serialize_user(user)

    def _auth_update_me(self, user_id: int, body: dict[str, Any]) -> dict[str, Any]:
        allowed = {k: v for k, v in body.items() if k in {"full_name", "image_url"}}
        if not allowed:
            raise ApiError(400, "No updatable fields provided")
        with SessionLocal() as db:
            user = user_dal.update(db, user_id, allowed)
            if not user:
                raise ApiError(404, "User not found")
            return self._serialize_user(user)

    def _auth_change_password(self, user_id: int, body: dict[str, Any]) -> dict[str, Any]:
        current = str(body.get("current_password", ""))
        new_password = str(body.get("new_password", ""))
        if not current or not new_password:
            raise ApiError(400, "current_password and new_password are required")
        if len(new_password) < 6:
            raise ApiError(400, "Password must be at least 6 characters")
        with SessionLocal() as db:
            user = user_dal.get_by_id(db, user_id)
            if not user or not self._verify_password(current, user.password_hash):
                raise ApiError(401, "Current password is incorrect")
            updated = user_dal.update(db, user_id, {"password_hash": self._hash_password(new_password)})
            if not updated:
                raise ApiError(404, "User not found")
            return {"status": "ok"}

    def _auth_forgot_password(self, body: dict[str, Any]) -> dict[str, Any]:
        email = str(body.get("email", "")).strip().lower()
        if not email:
            raise ApiError(400, "Email is required")
        with SessionLocal() as db:
            user = user_dal.get_by_email(db, email)
            if not user:
                return {"status": "ok"}
            token = secrets.token_urlsafe(24)
            self._reset_tokens[token] = user.id
            return {"status": "ok", "token": token}

    def _auth_reset_password(self, body: dict[str, Any]) -> dict[str, Any]:
        token = str(body.get("token", "")).strip()
        new_password = str(body.get("new_password", ""))
        if not token or not new_password:
            raise ApiError(400, "token and new_password are required")
        if len(new_password) < 6:
            raise ApiError(400, "Password must be at least 6 characters")
        user_id = self._reset_tokens.pop(token, None)
        if not user_id:
            raise ApiError(400, "Invalid or expired reset token")
        with SessionLocal() as db:
            updated = user_dal.update(db, user_id, {"password_hash": self._hash_password(new_password)})
            if not updated:
                raise ApiError(404, "User not found")
            return {"status": "ok"}

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
    def _hash_password(password: str) -> str:
        salt = secrets.token_bytes(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
        return f"{salt.hex()}:{digest.hex()}"

    @staticmethod
    def _verify_password(password: str, stored_hash: str) -> bool:
        try:
            salt_hex, digest_hex = stored_hash.split(":", 1)
            salt = bytes.fromhex(salt_hex)
            expected = bytes.fromhex(digest_hex)
        except ValueError:
            return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
        return hmac.compare_digest(actual, expected)

    def _issue_token(self, user_id: int) -> str:
        token = secrets.token_urlsafe(32)
        self._sessions[token] = user_id
        return token

    @staticmethod
    def _serialize_user(user: User) -> dict[str, Any]:
        return {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "image_url": user.image_url,
            "is_active": user.is_active,
            "verified": user.verified,
        }

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
