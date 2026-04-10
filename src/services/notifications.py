from __future__ import annotations
from PyQt6.QtWidgets import QSystemTrayIcon
from services.event_emitter import EventEmitter

DEFAULT_NOTIFICATION_TIMEOUT_MS = 5000


class NotificationService:

    def __init__(
        self,
        events: EventEmitter | None = None,
        tray: QSystemTrayIcon | None = None,
    ) -> None:
        self._events = events
        self._tray = tray

    def show(self, title: str, message: str) -> None:
        if self._tray and self._tray.supportsMessages():
            self._tray.showMessage(title, message, msecs=DEFAULT_NOTIFICATION_TIMEOUT_MS)
        if self._events:
            self._events.emit("notification:show", {"title": title, "message": message})
