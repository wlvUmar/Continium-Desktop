"""
Tests for the desktop application
"""
import pytest
from PyQt6.QtWidgets import QApplication


@pytest.fixture(scope="session")
def qapp():
    """Create QApplication instance for tests"""
    app = QApplication([])
    yield app
    app.quit()


def test_app_imports():
    """Test that all core modules can be imported"""
    from core.window import MainWindow
    from core.tray import SystemTray
    from core.overlay import OverlayManager
    assert True


def test_main_window_creation(qapp):
    """Test main window can be created"""
    from core.window import MainWindow
    window = MainWindow()
    assert window.windowTitle() == "Continium"
    assert window.web_view is not None
