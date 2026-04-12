from __future__ import annotations

from dataclasses import dataclass
import os
import sys
from typing import Any

from PyQt6.QtWidgets import QApplication

from core.overlay import OverlayManager
from core.tray import SystemTray
from core.window import MainWindow
from dal import init_db
from services.local_api import LocalApiService
from services import EventEmitter, NotificationService, PomodoroManager, SessionManager, TimerManager
from utils.bridge import JSBridge
from utils.runtime import configure_runtime_logging


@dataclass
class AppServices:
    events: EventEmitter
    timer: TimerManager
    pomodoro: PomodoroManager
    notifications: NotificationService
    sessions: SessionManager


class AppController:
    def __init__(self) -> None:
        self._logger = configure_runtime_logging()
        self._logger.info("Starting Continium desktop app")
        self._api_base_url = os.getenv("CONTINIUM_API_BASE_URL", "").strip() or None
        self._verify_remote_auth_ssl = _env_bool("CONTINIUM_AUTH_VERIFY_SSL", True)
        if self._api_base_url:
            self._logger.info("Configured API base URL: %s", self._api_base_url)
        else:
            self._logger.warning("CONTINIUM_API_BASE_URL is not set; remote auth is unavailable")
        if not self._verify_remote_auth_ssl:
            self._logger.warning("Remote auth SSL verification is disabled")
        init_db()
        self._app = QApplication(sys.argv)
        self._app.setApplicationName("Continium")
        self._services = self._create_services()
        self._wire_service_events()
        self._window = MainWindow(api_base_url=self._api_base_url)
        self._local_api = LocalApiService(
            self._api_base_url,
            self._logger,
            verify_remote_auth_ssl=self._verify_remote_auth_ssl,
        )
        self._bridge = JSBridge(self._window.web_view, self._services.events, self._handle_api_request)
        self._tray = SystemTray(self._app, self._window)
        self._overlay = OverlayManager(self._services.events)
        self._wire_shutdown()

    def run(self) -> int:
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
        events.on("app:ready", self._handle_app_ready)
        events.on("timer:start", lambda payload: self._start_session(sessions, payload))
        events.on("timer:pause", lambda _payload: sessions.pause())
        events.on("timer:resume", lambda _payload: sessions.resume())
        events.on("timer:complete", lambda _payload: sessions.end())

    def _shutdown_services(self) -> None:
        self._services.timer.shutdown()

    def _handle_app_ready(self, payload: dict[str, object]) -> None:
        self._logger.info("Bridge connected: %s", payload.get("timestamp"))
        self._services.events.emit(
            "app:ack",
            {
                "status": "connected",
                "timestamp": payload.get("timestamp"),
            },
        )

    def _start_session(self, sessions: SessionManager, payload: dict[str, object]) -> None:
        goal_id = payload.get("goal_id")
        duration = payload.get("duration_seconds")
        if goal_id is None or duration is None:
            self._logger.warning("Ignoring timer start payload: %s", payload)
            return
        if int(goal_id) < 1:
            return
        sessions.start(int(goal_id), int(duration))

    def _handle_api_request(
        self,
        method: str,
        endpoint: str,
        payload: dict[str, Any],
        headers: dict[str, Any],
    ) -> dict[str, Any]:
        self._logger.debug("Bridge API request %s %s", method, endpoint)
        return self._local_api.request(
            method=method,
            endpoint=endpoint,
            body=payload,
            headers={k: str(v) for k, v in headers.items()},
        )


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() not in {"0", "false", "no", "off"}


def main() -> None:
    controller = AppController()
    sys.exit(controller.run())


if __name__ == "__main__":
    main()
