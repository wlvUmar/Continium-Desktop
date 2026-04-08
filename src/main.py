"""
Continium Desktop Application
Main entry point for the desktop app
"""
import sys
import os
from pathlib import Path
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import Qt, QUrl
from PyQt6.QtGui import QIcon

from core.window import MainWindow
from core.tray import SystemTray
from core.overlay import OverlayManager


class ContiniumApp(QApplication):
    def __init__(self, argv):
        super().__init__(argv)
        
        # Set application metadata
        self.setApplicationName("Continium")
        self.setApplicationVersion("1.0.0")
        self.setOrganizationName("Continium Team")
        
        # Enable high DPI scaling
        self.setAttribute(Qt.ApplicationAttribute.AA_EnableHighDpiScaling, True)
        self.setAttribute(Qt.ApplicationAttribute.AA_UseHighDpiPixmaps, True)
        
        # Initialize components
        self.main_window = None
        self.system_tray = None
        self.overlay_manager = None
        
        self._setup_app()
    
    def _setup_app(self):
        """Initialize application components"""
        # Create main window
        self.main_window = MainWindow()
        
        # Create system tray
        self.system_tray = SystemTray(self.main_window)
        self.system_tray.show()
        
        # Create overlay manager
        self.overlay_manager = OverlayManager(self.main_window)
        
        # Connect signals
        self.system_tray.show_window.connect(self.main_window.show)
        self.system_tray.toggle_overlay.connect(self.overlay_manager.toggle)
        
        # Show main window
        self.main_window.show()


def main():
    """Application entry point"""
    app = ContiniumApp(sys.argv)
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
