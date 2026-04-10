"""Main application window."""

from __future__ import annotations

from pathlib import Path
import os
import sys

from PyQt6.QtCore import QUrl, QSize
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWidgets import QMainWindow, QWidget

DEFAULT_WINDOW_SIZE = QSize(1024, 768)


class MainWindow(QMainWindow):
    """Main application window hosting the web UI."""

    def __init__(self, interface_dir: Path | None = None) -> None:
        super().__init__()
        self.setWindowTitle("Continium")
        self.web_view = self._create_web_view()
        self.setCentralWidget(self.web_view)
        self.resize(DEFAULT_WINDOW_SIZE)
        self._load_interface(interface_dir)

    def _create_web_view(self) -> QWidget:
        if _is_test_mode():
            return QWidget(self)
        return QWebEngineView(self)

    def _load_interface(self, interface_dir: Path | None) -> None:
        if not isinstance(self.web_view, QWebEngineView):
            return
        if interface_dir is None:
            interface_dir = Path(__file__).resolve().parent.parent / "interface"
        index_path = interface_dir / "index.html"
        self.web_view.load(QUrl.fromLocalFile(str(index_path)))


def _is_test_mode() -> bool:
    return "PYTEST_CURRENT_TEST" in os.environ or "pytest" in sys.modules

