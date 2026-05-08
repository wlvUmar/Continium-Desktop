"""Standalone timer window for focused sessions."""

from __future__ import annotations

import os
import sys
import time
import base64
from typing import Any, Callable, cast
import logging
from pathlib import Path


from PyQt6.QtCore import QSize, QUrl, QUrlQuery, Qt
from PyQt6 import QtCore
from PyQt6.QtGui import QIcon
from PyQt6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWidgets import QMainWindow, QWidget, QVBoxLayout

from services.event_emitter import EventEmitter
from utils.bridge import JSBridge
from utils.paths import app_data_dir
from utils.paths import interface_dir as packaged_interface_dir
from utils.paths import resource_dir
from utils.wallpaper import get_windows_wallpaper_path

logging.basicConfig(level=logging.DEBUG)


class TimerWindow(QMainWindow):
    window_state_changed = QtCore.pyqtSignal(QtCore.Qt.WindowState)

    def __init__(
        self,
        api_base_url: str | None,
        interface_dir: str | None,
        shared_profile: QWebEngineProfile,
        events: EventEmitter,
        request_handler: Callable,
    ) -> None:
        super().__init__()

        self._api_base_url = api_base_url
        self._interface_dir = interface_dir
        self._shared_profile = shared_profile
        self._events = events
        self._request_handler = request_handler
        self._profile: QWebEngineProfile | None = None

        self._web_view = self._create_web_view(shared_profile)

        if events is not None and request_handler is not None and isinstance(self._web_view, QWebEngineView):
            handler = cast(Callable[[str, str, dict[str, Any], dict[str, Any]], dict[str, Any]], request_handler)
            self._bridge = JSBridge(self._web_view, events, handler)
        else:
            self._bridge = None

        # Set up the window
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.NoDropShadowWindowHint
            | Qt.WindowType.Window
        )
        self.setWindowTitle("Continium Focus")
        self.setWindowIcon(self._load_icon())
        self.resize(QSize(1024, 768))

        # Remove margins so the web view fills the entire window
        root = QWidget()
        root_layout = QVBoxLayout(root)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)
        root_layout.addWidget(self._web_view)
        self.setCentralWidget(root)

    def changeEvent(self, a0: QtCore.QEvent | None):
        super().changeEvent(a0)

        if a0 and a0.type() == QtCore.QEvent.Type.WindowStateChange:
            self.window_state_changed.emit(self.windowState())

        self.setWindowIcon(self._load_icon())

        logging.debug(f"Window state changed: {self.windowState()}")

    def shutdown_webengine(self) -> None:
        if isinstance(self._web_view, QWebEngineView):
            page = self._web_view.page()
            if page is not None:
                page.deleteLater()

    def load_goal(self, goal_id: int, autostart: bool = True) -> None:
        """Load a goal focus route and show the focus window."""
        if not isinstance(self._web_view, QWebEngineView):
            return

        interface_dir = Path(self._interface_dir or packaged_interface_dir())
        index_path = interface_dir / "index.html"
        url = QUrl.fromLocalFile(str(index_path))

        query = QUrlQuery()
        if self._api_base_url:
            query.addQueryItem("api_base_url", self._api_base_url)
        
        wallpaper_path = get_windows_wallpaper_path()
        if wallpaper_path:
            wallpaper_b64 = base64.urlsafe_b64encode(wallpaper_path.encode("utf-8")).decode("ascii")
            query.addQueryItem("wallpaper_b64", wallpaper_b64)
            try:
                query.addQueryItem("wallpaper_mtime", str(int(os.path.getmtime(wallpaper_path))))
            except OSError:
                pass
        query.addQueryItem("wallpaper_nonce", str(int(time.time() * 1000)))

        url.setQuery(query)

        fragment = f"/focus/{goal_id}"
        if autostart:
            fragment = f"{fragment}?autostart=1"
        url.setFragment(fragment)

        self._web_view.load(url)
        if self.isMinimized():
            self.showNormal()

        self.showFullScreen()
        self.raise_()
        self.activateWindow()

    def _create_web_view(self, shared_profile: QWebEngineProfile | None) -> QWidget:
        if _is_test_mode():
            return QWidget(self)

        view = QWebEngineView(self)
        logging.debug("Creating QWebEngineView")
        if shared_profile is not None:
            page = QWebEnginePage(shared_profile, view)
            view.setPage(page)
            return view

        profile_root = app_data_dir() / "timer_webengine"
        storage_path = profile_root / "storage"
        storage_path.mkdir(parents=True, exist_ok=True)

        profile = QWebEngineProfile("ContiniumTimerProfile", self)
        profile.setPersistentStoragePath(str(storage_path))
        if os.name == "nt":
            profile.setHttpCacheType(QWebEngineProfile.HttpCacheType.MemoryHttpCache)
        else:
            cache_path = profile_root / "cache"
            cache_path.mkdir(parents=True, exist_ok=True)
            profile.setCachePath(str(cache_path))
        profile.setPersistentCookiesPolicy(
            QWebEngineProfile.PersistentCookiesPolicy.ForcePersistentCookies
        )
        page = QWebEnginePage(profile, view)
        view.setPage(page)
        self._profile = profile
        return view

    @staticmethod
    def _load_icon() -> QIcon:
        resources = resource_dir()
        for icon_name in ("icon.ico", "icon.svg"):
            icon_path = resources / icon_name
            if icon_path.exists():
                return QIcon(str(icon_path))
        return QIcon()


def _is_test_mode() -> bool:
    return "PYTEST_CURRENT_TEST" in os.environ or "pytest" in sys.modules
