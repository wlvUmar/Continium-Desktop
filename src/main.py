from __future__ import annotations

from dataclasses import dataclass
import os
import sys
from typing import Any

# Handle PyInstaller's sys._MEIPASS for bundled resources
if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
    # When running as a PyInstaller bundle, add the bundled src directory to sys.path
    sys.path.insert(0, sys._MEIPASS)

from PyQt6.QtGui import QIcon
from PyQt6.QtWidgets import QApplication

from core.overlay import OverlayManager
from core.timer_window import TimerWindow
from core.tray import SystemTray
from core.window import MainWindow
from dal import init_db
from services.local_api import LocalApiService
from services import EventEmitter, NotificationService, PomodoroManager, SessionManager, TimerManager
from utils.bridge import JSBridge
from utils.paths import resource_dir, log_file
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
        self._logger.info("Runtime log file: %s", log_file())
        _configure_webengine_environment()
        self._api_base_url = os.getenv("CONTINIUM_API_BASE_URL", "https://continium.uz/api/v1").strip() or None
        self._verify_remote_auth_ssl = _env_bool("CONTINIUM_AUTH_VERIFY_SSL", True)
        self._devtools_enabled = _env_bool("CONTINIUM_DEVTOOLS_ENABLED", True)
        if self._api_base_url:
            self._logger.info("Configured API base URL: %s", self._api_base_url)
        else:
            self._logger.warning("CONTINIUM_API_BASE_URL is not set; remote auth is unavailable")
        if not self._verify_remote_auth_ssl:
            self._logger.warning("Remote auth SSL verification is disabled")
        init_db()
        self._app = QApplication(sys.argv)
        self._app.setApplicationName("Continium")
        self._app.setWindowIcon(_load_app_icon())
        self._app.setQuitOnLastWindowClosed(False)
        self._services = self._create_services()
        self._wire_service_events()
        self._window = MainWindow(api_base_url=self._api_base_url, devtools_enabled=self._devtools_enabled)
        self._local_api = LocalApiService(
            self._api_base_url,
            self._logger,
            verify_remote_auth_ssl=self._verify_remote_auth_ssl,
        )
        self._timer_window = TimerWindow(
            api_base_url=self._api_base_url,
            shared_profile=self._extract_web_profile(),
            events=self._services.events,
            request_handler=self._handle_api_request,
            devtools_enabled=self._devtools_enabled,
        )
        self._bridge = JSBridge(self._window.web_view, self._services.events, self._handle_api_request)
        self._tray = SystemTray(self._app, self._window, self._services.events)
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
        events.on("auth:debug", self._handle_auth_debug)
        events.on("timer:open_window", self._open_timer_window)
        events.on("timer:close_window", self._close_timer_window)
        events.on("timer:pause", lambda _payload: self._pause_session(sessions))
        events.on("timer:resume", lambda _payload: self._resume_session(sessions))
        events.on("timer:complete", lambda _payload: self._end_session(sessions))
        events.on("ui:theme", self._handle_ui_theme)

    def _extract_web_profile(self):
        web_view = getattr(self._window, "web_view", None)
        if web_view is None:
            return None
        page_getter = getattr(web_view, "page", None)
        if not callable(page_getter):
            return None
        page = page_getter()
        if page is None:
            return None
        profile_getter = getattr(page, "profile", None)
        if not callable(profile_getter):
            return None
        return profile_getter()

    def _shutdown_services(self) -> None:
        self._timer_window.shutdown_webengine()
        self._window.shutdown_webengine()
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

    def _handle_auth_debug(self, payload: dict[str, object]) -> None:
        self._logger.info("AUTH-STARTUP %s", payload)

    def _start_session(self, sessions: SessionManager, payload: dict[str, object]) -> None:
        goal_id = payload.get("goal_id")
        duration = payload.get("duration_seconds")
        if goal_id is None or duration is None:
            self._logger.warning("Ignoring timer start payload: %s", payload)
            return

        try:
            goal_id_int = int(str(goal_id))
            duration_int = int(str(duration))
        except (TypeError, ValueError):
            self._logger.warning("Invalid timer start payload: %s", payload)
            return

        if goal_id_int < 1 or duration_int < 1:
            return
        sessions.start(goal_id_int, duration_int)

    def _open_timer_window(self, payload: dict[str, object]) -> None:
        goal_id = payload.get("goal_id")
        if goal_id is None:
            self._logger.warning("Missing goal_id for timer window payload: %s", payload)
            return

        try:
            goal_id_int = int(str(goal_id))
        except (TypeError, ValueError):
            self._logger.warning("Invalid goal_id for timer window payload: %s", payload)
            return

        if goal_id_int < 1:
            return

        autostart = bool(payload.get("autostart", True))
        self._timer_window.load_goal(goal_id_int, autostart=autostart)

    def _close_timer_window(self, payload: dict[str, object] | None = None) -> None:
        if self._timer_window.isVisible():
            self._timer_window.close()

    @staticmethod
    def _pause_session(sessions: SessionManager) -> None:
        sessions.pause()

    @staticmethod
    def _resume_session(sessions: SessionManager) -> None:
        sessions.resume()

    @staticmethod
    def _end_session(sessions: SessionManager) -> None:
        sessions.end()

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

    def _handle_ui_theme(self, payload: dict[str, object]) -> None:
        mode = str(payload.get("mode", "light")).strip().lower()
        if mode not in {"light", "dark"}:
            return
        self._window.apply_theme(mode)
        tray = getattr(self, "_tray", None)
        if tray is not None:
            tray.apply_theme(mode)


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() not in {"0", "false", "no", "off"}


def _load_app_icon() -> QIcon:
    resources = resource_dir()
    for icon_name in ("icon.ico", "icon.svg"):
        icon_path = resources / icon_name
        if icon_path.exists():
            return QIcon(str(icon_path))
    return QIcon()


def _configure_webengine_environment() -> None:
    """Set Qt WebEngine Chromium flags for better Windows cache stability."""
    if os.name != "nt":
        return
    existing = os.getenv("QTWEBENGINE_CHROMIUM_FLAGS", "").strip()
    required = ["--disable-gpu-shader-disk-cache"]
    for flag in required:
        if flag not in existing:
            existing = f"{existing} {flag}".strip()
    os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = existing


def main() -> None:
    controller = AppController()
    sys.exit(controller.run())


if __name__ == "__main__":
    main()
