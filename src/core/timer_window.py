"""Standalone timer window for focused sessions."""

from __future__ import annotations

import os
import sys
import time
import base64
from pathlib import Path
from typing import Any, Callable, cast

from PyQt6.QtCore import QSize, QUrl, QUrlQuery, Qt
from PyQt6.QtGui import QIcon, QKeySequence, QShortcut
from PyQt6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWidgets import QMainWindow, QWidget, QVBoxLayout

from services.event_emitter import EventEmitter
from utils.bridge import JSBridge
from utils.paths import app_data_dir
from utils.paths import interface_dir as packaged_interface_dir
from utils.paths import resource_dir
from utils.wallpaper import get_windows_wallpaper_path

# Timer window will be maximized/fullscreen, but set a reasonable size for non-fullscreen mode
DEFAULT_TIMER_WINDOW_SIZE = QSize(1920, 1080)


class TimerWindow(QMainWindow):
    """Secondary window that loads the focus route for a specific goal."""

    def __init__(
        self,
        api_base_url: str | None = None,
        shared_profile: QWebEngineProfile | None = None,
        interface_dir: Path | None = None,
        events: EventEmitter | None = None,
        request_handler: Any = None,
        devtools_enabled: bool = False,
    ) -> None:
        super().__init__()
        # Remove window chrome and title bar
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.NoDropShadowWindowHint
            | Qt.WindowType.Window
        )
        self.setWindowTitle("Continium Focus")
        self.setWindowIcon(self._load_icon())
        self.resize(DEFAULT_TIMER_WINDOW_SIZE)
        self._api_base_url = api_base_url
        self._devtools_enabled = devtools_enabled
        self._devtools_window: QMainWindow | None = None
        self._devtools_view: QWebEngineView | None = None
        self._devtools_shortcuts: list[QShortcut] = []
        self._interface_dir = interface_dir
        self._web_view = self._create_web_view(shared_profile)
        self._bridge: JSBridge | None = None
        if events is not None and request_handler is not None and isinstance(self._web_view, QWebEngineView):
            handler = cast(Callable[[str, str, dict[str, Any], dict[str, Any]], dict[str, Any]], request_handler)
            self._bridge = JSBridge(self._web_view, events, handler)

        # Remove margins so the web view fills the entire window
        root = QWidget()
        root_layout = QVBoxLayout(root)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)
        root_layout.addWidget(self._web_view)
        self.setCentralWidget(root)
        self._setup_devtools_shortcuts()

    def shutdown_webengine(self) -> None:
        if self._devtools_window is not None:
            self._devtools_window.close()
            self._devtools_window.deleteLater()
            self._devtools_window = None
            self._devtools_view = None
        if isinstance(self._web_view, QWebEngineView):
            page = self._web_view.page()
            if page is not None:
                page.deleteLater()

    def load_goal(self, goal_id: int, autostart: bool = True) -> None:
        """Load a goal focus route and show the focus window."""
        if not isinstance(self._web_view, QWebEngineView):
            return

        interface_dir = self._interface_dir or packaged_interface_dir()
        index_path = interface_dir / "index.html"
        url = QUrl.fromLocalFile(str(index_path))

        query = QUrlQuery()
        if self._api_base_url:
            query.addQueryItem("api_base_url", self._api_base_url)
        
        # Add wallpaper file path if available
        wallpaper_path = get_windows_wallpaper_path()
        if wallpaper_path:
            wallpaper_b64 = base64.urlsafe_b64encode(wallpaper_path.encode("utf-8")).decode("ascii")
            query.addQueryItem("wallpaper_b64", wallpaper_b64)
            # Bust QWebEngine/image cache when wallpaper changes.
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

        # Fill the screen without native window borders or rounded corners.
        self.showFullScreen()
        self.raise_()
        self.activateWindow()

    def _create_web_view(self, shared_profile: QWebEngineProfile | None) -> QWidget:
        if _is_test_mode():
            return QWidget(self)

        view = QWebEngineView(self)
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
            # Avoid Windows cache directory lock contention in Chromium disk cache.
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

    def _setup_devtools_shortcuts(self) -> None:
        if not self._devtools_enabled or not isinstance(self._web_view, QWebEngineView):
            return
        self._devtools_shortcuts = [
            QShortcut(QKeySequence("F12"), self),
            QShortcut(QKeySequence("Ctrl+Shift+I"), self),
        ]
        for shortcut in self._devtools_shortcuts:
            shortcut.activated.connect(self._toggle_devtools)

    def _toggle_devtools(self) -> None:
        if not isinstance(self._web_view, QWebEngineView):
            return
        if self._devtools_window is not None and self._devtools_window.isVisible():
            self._devtools_window.close()
            return

        page = self._web_view.page()
        if page is None:
            return

        devtools_window = QMainWindow(self)
        devtools_window.setWindowTitle("Continium Focus DevTools")
        devtools_window.resize(1100, 760)
        devtools_view = QWebEngineView(devtools_window)
        devtools_page = QWebEnginePage(page.profile(), devtools_view)
        devtools_view.setPage(devtools_page)
        page.setDevToolsPage(devtools_page)
        devtools_window.setCentralWidget(devtools_view)

        def _cleanup_devtools() -> None:
            current_page = self._web_view.page() if isinstance(self._web_view, QWebEngineView) else None
            if current_page is not None:
                current_page.setDevToolsPage(None)
            self._devtools_view = None
            self._devtools_window = None

        devtools_window.destroyed.connect(_cleanup_devtools)
        self._devtools_window = devtools_window
        self._devtools_view = devtools_view
        devtools_window.show()

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

