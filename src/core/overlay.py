"""
Desktop overlay manager
"""
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QPalette, QColor


class OverlayWindow(QWidget):
    """Transparent overlay window that stays on top"""
    
    def __init__(self):
        super().__init__()
        self._setup_window()
        self._setup_ui()
    
    def _setup_window(self):
        """Configure overlay window"""
        # Window flags for overlay
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint |
            Qt.WindowType.Tool
        )
        
        # Make background semi-transparent
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating)
        
        # Set geometry (top-right corner)
        self.setGeometry(100, 100, 300, 200)
    
    def _setup_ui(self):
        """Setup overlay UI"""
        layout = QVBoxLayout()
        
        # Container with background
        container = QWidget()
        container.setStyleSheet("""
            QWidget {
                background-color: rgba(26, 26, 26, 230);
                border-radius: 10px;
                padding: 15px;
            }
        """)
        
        container_layout = QVBoxLayout()
        
        # Title
        title = QLabel("Continium")
        title.setStyleSheet("""
            QLabel {
                color: #4a9eff;
                font-size: 18px;
                font-weight: bold;
                background: transparent;
            }
        """)
        container_layout.addWidget(title)
        
        # Info label
        self.info_label = QLabel("Overlay Active")
        self.info_label.setStyleSheet("""
            QLabel {
                color: white;
                font-size: 14px;
                background: transparent;
            }
        """)
        container_layout.addWidget(self.info_label)
        
        container.setLayout(container_layout)
        layout.addWidget(container)
        
        self.setLayout(layout)
    
    def update_content(self, text):
        """Update overlay content"""
        self.info_label.setText(text)


class OverlayManager:
    """Manages desktop overlay functionality"""
    
    def __init__(self, parent):
        self.parent = parent
        self.overlay = None
        self.is_visible = False
    
    def toggle(self):
        """Toggle overlay visibility"""
        if self.is_visible:
            self.hide()
        else:
            self.show()
    
    def show(self):
        """Show overlay"""
        if not self.overlay:
            self.overlay = OverlayWindow()
        
        self.overlay.show()
        self.is_visible = True
    
    def hide(self):
        """Hide overlay"""
        if self.overlay:
            self.overlay.hide()
        self.is_visible = False
    
    def update(self, text):
        """Update overlay content"""
        if self.overlay:
            self.overlay.update_content(text)
