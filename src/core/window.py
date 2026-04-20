"""Main application window."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from PyQt6.QtCore import QPoint, QSize, QUrl, QUrlQuery, Qt
from PyQt6.QtGui import QCloseEvent, QIcon, QKeySequence, QMouseEvent, QShortcut
from PyQt6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWidgets import (
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from utils.paths import interface_dir as packaged_interface_dir
from utils.paths import app_data_dir
from utils.paths import resource_dir

DEFAULT_WINDOW_SIZE = QSize(1024, 768)

WINDOW_THEME_TOKENS: dict[str, dict[str, str]] = {
    "light": {
        "top_bg": "#F4F9FB",
        "top_border": "#D9E4EC",
        "title_text": "#36465D",
        "button_text": "#475A6C",
        "button_hover": "#E6EFF4",
        "close_hover": "#E85C5C",
    },
    "dark": {
        "top_bg": "#1A1631",
        "top_border": "#2A2A4A",
        "title_text": "#E0E0E0",
        "button_text": "#D0D6E0",
        "button_hover": "#292736",
        "close_hover": "#D94A4A",
    },
}


class MainWindow(QMainWindow):
    """Main application window hosting the web UI."""

    def __init__(
        self,
        interface_dir: Path | None = None,
        api_base_url: str | None = None,
        devtools_enabled: bool = False,
    ) -> None:
        super().__init__()
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.Window)
        self.setWindowTitle("Continium")
        self.setWindowIcon(self._load_icon())
        self._api_base_url = api_base_url
        self._devtools_enabled = devtools_enabled
        self._devtools_window: QMainWindow | None = None
        self._devtools_view: QWebEngineView | None = None
        self._devtools_shortcuts: list[QShortcut] = []
        self._allow_exit = False
        self._drag_pos = QPoint()
        self._theme_mode = "light"
        self._setup_ui(interface_dir)
        self.apply_theme(self._theme_mode)

    def apply_theme(self, mode: str | None) -> None:
        """Apply top-bar colors to match active web UI theme."""
        normalized = (mode or "light").strip().lower()
        self._theme_mode = "dark" if normalized == "dark" else "light"
        self.setStyleSheet(self._get_stylesheet())

    def shutdown_webengine(self) -> None:
        if self._devtools_window is not None:
            self._devtools_window.close()
            self._devtools_window.deleteLater()
            self._devtools_window = None
            self._devtools_view = None
        if isinstance(self.web_view, QWebEngineView):
            page = self.web_view.page()
            if page is not None:
                page.deleteLater()

    def allow_exit(self) -> None:
        """Allow explicit close when user chooses Quit from tray."""
        self._allow_exit = True

    def closeEvent(self, event: QCloseEvent) -> None:  # noqa: N802
        """Hide to tray on close button, only exit when explicitly requested."""
        if self._allow_exit:
            event.accept()
            return
        event.ignore()
        self.hide()

    def _setup_ui(self, interface_dir: Path | None) -> None:
        """Create custom title bar and layout."""
        root = QWidget()
        self.setCentralWidget(root)
        root_layout = QVBoxLayout(root)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)

        # Custom title bar
        self.top_bar = QWidget()
        self.top_bar.setObjectName("topBar")
        self.top_bar.setMaximumHeight(48)
        self.top_bar.setCursor(Qt.CursorShape.PointingHandCursor)
        bar_layout = QHBoxLayout(self.top_bar)
        bar_layout.setContentsMargins(16, 8, 8, 8)
        bar_layout.setSpacing(8)

        title_label = QLabel("Continium")
        title_label.setObjectName("titleLabel")
        bar_layout.addWidget(title_label)
        bar_layout.addStretch()

        btn_min = QPushButton("−")
        btn_min.setObjectName("titleButton")
        btn_min.setMaximumWidth(40)
        btn_min.clicked.connect(self.showMinimized)

        btn_max = QPushButton("□")
        btn_max.setObjectName("titleButton")
        btn_max.setMaximumWidth(40)
        btn_max.clicked.connect(self._toggle_maximize)

        btn_close = QPushButton("✕")
        btn_close.setObjectName("closeButton")
        btn_close.setMaximumWidth(40)
        btn_close.clicked.connect(self.close)

        bar_layout.addWidget(btn_min)
        bar_layout.addWidget(btn_max)
        bar_layout.addWidget(btn_close)

        root_layout.addWidget(self.top_bar)

        # Web view
        self.web_view = self._create_web_view()
        root_layout.addWidget(self.web_view)
        self.resize(DEFAULT_WINDOW_SIZE)
        self._load_interface(interface_dir)
        self._setup_devtools_shortcuts()

        # Title bar drag handlers
        self.top_bar.mousePressEvent = self._title_bar_mouse_press
        self.top_bar.mouseMoveEvent = self._title_bar_mouse_move
        self.top_bar.mouseDoubleClickEvent = lambda _: self._toggle_maximize()

    def _toggle_maximize(self) -> None:
        """Toggle between normal and maximized window state."""
        if self.isMaximized():
            self.showNormal()
        else:
            self.showMaximized()

    def _title_bar_mouse_press(self, event: QMouseEvent) -> None:
        """Record drag start position for window dragging."""
        if event.button() == Qt.MouseButton.LeftButton:
            self._drag_pos = event.globalPosition().toPoint() - self.frameGeometry().topLeft()

    def _title_bar_mouse_move(self, event: QMouseEvent) -> None:
        """Drag window when title bar is clicked and moved."""
        if (event.buttons() & Qt.MouseButton.LeftButton) != Qt.MouseButton.NoButton and not self.isMaximized():
            self.move(event.globalPosition().toPoint() - self._drag_pos)

    def _get_stylesheet(self) -> str:
        """Return stylesheet for custom title bar."""
        tokens = WINDOW_THEME_TOKENS[self._theme_mode]
        stylesheet = """
            #topBar {
                background: __TOP_BG__;
                border-bottom: 1px solid __TOP_BORDER__;
            }
            #titleLabel {
                font-weight: 700;
                font-size: 16px;
                color: __TITLE_TEXT__;
            }
            #titleButton, #closeButton {
                background: transparent;
                color: __BUTTON_TEXT__;
                border: none;
                padding: 6px 10px;
                border-radius: 4px;
                font-weight: 600;
                font-size: 18px;
            }
            #titleButton:hover {
                background: __BUTTON_HOVER__;
            }
            #closeButton:hover {
                background: __CLOSE_HOVER__;
                color: white;
            }
        """
        return (
            stylesheet
            .replace("__TOP_BG__", tokens["top_bg"])
            .replace("__TOP_BORDER__", tokens["top_border"])
            .replace("__TITLE_TEXT__", tokens["title_text"])
            .replace("__BUTTON_TEXT__", tokens["button_text"])
            .replace("__BUTTON_HOVER__", tokens["button_hover"])
            .replace("__CLOSE_HOVER__", tokens["close_hover"])
        )

    def _create_web_view(self) -> QWidget:
        if _is_test_mode():
            return QWidget(self)

        profile_root = app_data_dir() / "webengine"
        storage_path = profile_root / "storage"
        storage_path.mkdir(parents=True, exist_ok=True)

        profile = QWebEngineProfile("ContiniumProfile", self)
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

        view = QWebEngineView(self)
        page = QWebEnginePage(profile, view)
        view.setPage(page)
        self._profile = profile
        return view

    def _setup_devtools_shortcuts(self) -> None:
        if not self._devtools_enabled or not isinstance(self.web_view, QWebEngineView):
            return
        self._devtools_shortcuts = [
            QShortcut(QKeySequence("F12"), self),
            QShortcut(QKeySequence("Ctrl+Shift+I"), self),
        ]
        for shortcut in self._devtools_shortcuts:
            shortcut.activated.connect(self._toggle_devtools)

    def _toggle_devtools(self) -> None:
        if not isinstance(self.web_view, QWebEngineView):
            return
        if self._devtools_window is not None and self._devtools_window.isVisible():
            self._devtools_window.close()
            return

        page = self.web_view.page()
        if page is None:
            return

        devtools_window = QMainWindow(self)
        devtools_window.setWindowTitle("Continium DevTools")
        devtools_window.resize(1100, 760)
        devtools_view = QWebEngineView(devtools_window)
        devtools_page = QWebEnginePage(page.profile(), devtools_view)
        devtools_view.setPage(devtools_page)
        page.setDevToolsPage(devtools_page)
        devtools_window.setCentralWidget(devtools_view)

        def _cleanup_devtools() -> None:
            current_page = self.web_view.page()
            if current_page is not None:
                current_page.setDevToolsPage(None)
            self._devtools_view = None
            self._devtools_window = None

        devtools_window.destroyed.connect(_cleanup_devtools)
        self._devtools_window = devtools_window
        self._devtools_view = devtools_view
        devtools_window.show()

    def _load_interface(self, interface_dir: Path | None) -> None:
        if not isinstance(self.web_view, QWebEngineView):
            return
        if interface_dir is None:
            interface_dir = packaged_interface_dir()
        index_path = interface_dir / "index.html"
        url = QUrl.fromLocalFile(str(index_path))
        if self._api_base_url:
            query = QUrlQuery()
            query.addQueryItem("api_base_url", self._api_base_url)
            url.setQuery(query)
        self.web_view.load(url)

    def _load_icon(self) -> QIcon:
        resources = resource_dir()
        for icon_name in ("icon.ico", "icon.svg"):
            icon_path = resources / icon_name
            if icon_path.exists():
                return QIcon(str(icon_path))
        return QIcon()


def _is_test_mode() -> bool:
    return "PYTEST_CURRENT_TEST" in os.environ or "pytest" in sys.modules

