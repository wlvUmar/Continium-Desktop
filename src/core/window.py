"""Main application window."""

from __future__ import annotations

from pathlib import Path
import os
import sys

from PyQt6.QtCore import QUrl, QSize, QUrlQuery
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWidgets import QMainWindow, QWidget

DEFAULT_WINDOW_SIZE = QSize(1024, 768)


class MainWindow(QMainWindow):
    """Main application window hosting the web UI."""

    def __init__(self, interface_dir: Path | None = None, api_base_url: str | None = None) -> None:
        super().__init__()
        self.setWindowTitle("Continium")
        self._api_base_url = api_base_url
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
        url = QUrl.fromLocalFile(str(index_path))
        if self._api_base_url:
            query = QUrlQuery()
            query.addQueryItem("api_base_url", self._api_base_url)
            url.setQuery(query)
        self.web_view.load(url)


def _is_test_mode() -> bool:
    return "PYTEST_CURRENT_TEST" in os.environ or "pytest" in sys.modules

