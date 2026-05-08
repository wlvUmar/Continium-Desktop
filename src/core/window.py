from __future__ import annotations

import os
import sys
from pathlib import Path

from PyQt6.QtCore import QPoint, QSize, QUrl, QUrlQuery, Qt
from PyQt6.QtGui import QIcon, QMouseEvent, QCloseEvent
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
from utils.styles import window_stylesheet



class MainWindow(QMainWindow):
    def __init__(
        self,
        interface_dir: Path | None = None,
        api_base_url: str | None = None,
    ) -> None:
        super().__init__()
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.Window)
        self.setWindowTitle("Continium")
        self.setWindowIcon(self._load_icon())
        self._api_base_url = api_base_url
        self._allow_exit = False
        self._drag_pos = QPoint()
        self._theme_mode = "light"
        self._setup_ui(interface_dir)
        self.apply_theme(self._theme_mode)

    def apply_theme(self, mode: str | None) -> None:
        """Apply top-bar colors to match active web UI theme."""
        normalized = (mode or "light").strip().lower()
        self._theme_mode = "dark" if normalized == "dark" else "light"
        self.setStyleSheet(window_stylesheet(self._theme_mode))

    def shutdown_webengine(self) -> None:
        if isinstance(self.web_view, QWebEngineView):
            page = self.web_view.page()
            if page is not None:
                page.deleteLater()

    def allow_exit(self) -> None:
        """Allow explicit close when user chooses Quit from tray."""
        self._allow_exit = True

    def closeEvent(self, a0: QCloseEvent | None) -> None:  # noqa: N802
        """Hide to tray on close button, only exit when explicitly requested."""
        if a0:
            if self._allow_exit:
                a0.accept()
                return
            
            a0.ignore()
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

        self.web_view = self._create_web_view()
        root_layout.addWidget(self.web_view)
        self.resize(QSize(1024, 768))
        self._load_interface(interface_dir)

        self.top_bar.mousePressEvent = self._title_bar_mouse_press
        self.top_bar.mouseMoveEvent = self._title_bar_mouse_move
        self.top_bar.mouseDoubleClickEvent = self._title_bar_mouse_double_click

    def _title_bar_mouse_double_click(self, a0: QMouseEvent | None) -> None:
        self._toggle_maximize()

    def _toggle_maximize(self) -> None:
        """Toggle between normal and maximized window state."""
        if self.isMaximized():
            self.showNormal()
        else:
            self.showMaximized()

    def _title_bar_mouse_press(self, a0: QMouseEvent | None) -> None:
        if a0 is None:
            return
        if a0.button() == Qt.MouseButton.LeftButton:
            self._drag_pos = a0.globalPosition().toPoint() - self.frameGeometry().topLeft()


    def _title_bar_mouse_move(self, a0: QMouseEvent | None) -> None:
        if a0 is None:
            return
        if (a0.buttons() & Qt.MouseButton.LeftButton) and not self.isMaximized():
            self.move(a0.globalPosition().toPoint() - self._drag_pos)

   

    def _create_web_view(self) -> QWebEngineView:
        if _is_test_mode():
            return QWebEngineView(self)

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

