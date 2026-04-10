"""Main entry point for Continium Desktop application."""

from __future__ import annotations

from dataclasses import dataclass
import sys

from PyQt6.QtWidgets import QApplication

from core.overlay import OverlayManager
from core.tray import SystemTray
from core.window import MainWindow
from dal import init_db
from services import EventEmitter, NotificationService, PomodoroManager, SessionManager, TimerManager
from utils.bridge import JSBridge

MIN_GOAL_ID = 1


@dataclass
class AppServices:
    events: EventEmitter
    timer: TimerManager
    pomodoro: PomodoroManager
    notifications: NotificationService
    sessions: SessionManager


class AppController:
    """Creates and wires up the desktop application."""

    def __init__(self) -> None:
        init_db()
        self._app = QApplication(sys.argv)
        self._services = self._create_services()
        self._wire_service_events()
        self._window = MainWindow()
        self._bridge = JSBridge(self._window.web_view, self._services.events)
        self._tray = SystemTray(self._app, self._window)
        self._overlay = OverlayManager(self._services.events)
        self._wire_shutdown()

    def run(self) -> int:
        """Show the main window and start the event loop."""
        self._window.show()
        return self._app.exec()

    def _create_services(self) -> AppServices:
        events = EventEmitter()
        timer = TimerManager(events)
        pomodoro = PomodoroManager(timer, events)
        notifications = NotificationService(events=events)
        sessions = SessionManager(events)
        return AppServices(events, timer, pomodoro, notifications, sessions)

    def _wire_shutdown(self) -> None:
        self._app.aboutToQuit.connect(self._shutdown_services)

    def _wire_service_events(self) -> None:
        events = self._services.events
        sessions = self._services.sessions
        events.on("timer:start", lambda payload: self._start_session(sessions, payload))
        events.on("timer:pause", lambda _payload: sessions.pause())
        events.on("timer:resume", lambda _payload: sessions.resume())
        events.on("timer:complete", lambda _payload: sessions.end())

    def _shutdown_services(self) -> None:
        self._services.timer.shutdown()

    def _start_session(self, sessions: SessionManager, payload: dict[str, object]) -> None:
        goal_id = payload.get("goal_id")
        duration = payload.get("duration_seconds")
        if goal_id is None or duration is None:
            return
        if int(goal_id) < MIN_GOAL_ID:
            return
        sessions.start(int(goal_id), int(duration))


def main() -> None:
    """Entry point."""
    controller = AppController()
    sys.exit(controller.run())


if __name__ == "__main__":
    main()
