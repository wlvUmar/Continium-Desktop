"""
System tray integration
"""
from pathlib import Path
from PyQt6.QtWidgets import QSystemTrayIcon, QMenu
from PyQt6.QtGui import QIcon, QAction
from PyQt6.QtCore import pyqtSignal, QObject


class SystemTray(QSystemTrayIcon):
    """System tray icon with context menu"""
    
    show_window = pyqtSignal()
    toggle_overlay = pyqtSignal()
    
    def __init__(self, parent=None):
        # Load icon
        icon_path = Path(__file__).parent.parent.parent / "resources" / "icon.png"
        icon = QIcon(str(icon_path)) if icon_path.exists() else QIcon()
        
        super().__init__(icon, parent)
        
        self.setToolTip("Continium Desktop")
        self._create_menu()
        
        # Connect signals
        self.activated.connect(self._on_activated)
    
    def _create_menu(self):
        """Create context menu"""
        menu = QMenu()
        
        # Show/Hide window
        show_action = QAction("Show Window", menu)
        show_action.triggered.connect(self.show_window.emit)
        menu.addAction(show_action)
        
        # Toggle overlay
        overlay_action = QAction("Toggle Overlay", menu)
        overlay_action.triggered.connect(self.toggle_overlay.emit)
        menu.addAction(overlay_action)
        
        menu.addSeparator()
        
        # Quit
        quit_action = QAction("Quit", menu)
        quit_action.triggered.connect(self._quit_app)
        menu.addAction(quit_action)
        
        self.setContextMenu(menu)
    
    def _on_activated(self, reason):
        """Handle tray icon activation"""
        if reason == QSystemTrayIcon.ActivationReason.Trigger:
            self.show_window.emit()
    
    def _quit_app(self):
        """Quit application"""
        from PyQt6.QtWidgets import QApplication
        QApplication.quit()
    
    def show_notification(self, title, message, duration=3000):
        """Show system notification"""
        self.showMessage(title, message, QSystemTrayIcon.MessageIcon.Information, duration)
