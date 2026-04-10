"""Session tracking for active goal timers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import threading

from services.event_emitter import EventEmitter


@dataclass
class SessionState:
    """Current in-memory session state."""

    goal_id: int | None
    started_at: datetime | None
    duration_seconds: int
    is_active: bool
    is_paused: bool


class SessionManager:
    """Tracks session lifecycle and emits session events."""

    def __init__(self, events: EventEmitter) -> None:
        self._events = events
        self._lock = threading.Lock()
        self._state = SessionState(None, None, 0, False, False)

    def start(self, goal_id: int, duration_seconds: int) -> None:
        """Start a new session."""
        with self._lock:
            self._state = SessionState(
                goal_id=goal_id,
                started_at=datetime.now(timezone.utc),
                duration_seconds=duration_seconds,
                is_active=True,
                is_paused=False,
            )
        self._events.emit("session:start", self._payload())

    def pause(self) -> bool:
        """Pause the active session."""
        with self._lock:
            if not self._state.is_active or self._state.is_paused:
                return False
            self._state.is_paused = True
        self._events.emit("session:pause", self._payload())
        return True

    def resume(self) -> bool:
        """Resume a paused session."""
        with self._lock:
            if not self._state.is_active or not self._state.is_paused:
                return False
            self._state.is_paused = False
        self._events.emit("session:resume", self._payload())
        return True

    def end(self) -> None:
        """End the current session."""
        with self._lock:
            self._state = SessionState(None, None, 0, False, False)
        self._events.emit("session:end", self._payload())

    def get_state(self) -> SessionState:
        """Return a snapshot of session state."""
        with self._lock:
            return SessionState(
                goal_id=self._state.goal_id,
                started_at=self._state.started_at,
                duration_seconds=self._state.duration_seconds,
                is_active=self._state.is_active,
                is_paused=self._state.is_paused,
            )

    def _payload(self) -> dict[str, object]:
        with self._lock:
            return {
                "goal_id": self._state.goal_id,
                "started_at": self._state.started_at.isoformat() if self._state.started_at else None,
                "duration_seconds": self._state.duration_seconds,
                "is_active": self._state.is_active,
                "is_paused": self._state.is_paused,
            }
