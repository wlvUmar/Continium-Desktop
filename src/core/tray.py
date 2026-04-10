"""System tray integration."""

from __future__ import annotations

from pathlib import Path
from typing import Callable

from PyQt6.QtGui import QAction, QIcon
from PyQt6.QtWidgets import QApplication, QMenu, QSystemTrayIcon

from core.window import MainWindow


class SystemTray:
    """Manages the system tray icon and menu actions."""

    def __init__(self, app: QApplication, window: MainWindow) -> None:
        self._app = app
        self._window = window
        self._tray = QSystemTrayIcon(self._load_icon(), self._app)
        self._menu = QMenu()
        self._build_menu()
        self._tray.setContextMenu(self._menu)
        self._tray.show()

    def _load_icon(self) -> QIcon:
        icon_path = Path(__file__).resolve().parents[2] / "resources" / "icon.svg"
        if icon_path.exists():
            return QIcon(str(icon_path))
        return QIcon()

    def _build_menu(self) -> None:
        self._menu.addAction(self._action("Show", self._window.show))
        self._menu.addAction(self._action("Hide", self._window.hide))
        self._menu.addSeparator()
        self._menu.addAction(self._action("Quit", self._app.quit))

    def _action(self, label: str, callback: Callable[[], None]) -> QAction:
        action = QAction(label, self._menu)
        action.triggered.connect(callback)
        return action

