"""Backend services for Continium Desktop."""

from .event_emitter import EventEmitter
from .timer_manager import TimerManager
from .pomodoro_manager import PomodoroManager
from .notifications import NotificationService
from .session_manager import SessionManager

__all__ = [
    "EventEmitter",
    "TimerManager",
    "PomodoroManager",
    "NotificationService",
    "SessionManager",
]
