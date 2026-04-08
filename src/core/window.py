"""
Main application window
"""
from pathlib import Path
from PyQt6.QtWidgets import QMainWindow
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineSettings, QWebEnginePage
from PyQt6.QtCore import QUrl, pyqtSignal
from PyQt6.QtGui import QIcon


class MainWindow(QMainWindow):
    """Main application window with embedded web view"""
    
    closed = pyqtSignal()
    
    def __init__(self):
        super().__init__()
        self._setup_window()
        self._setup_webview()
    
    def _setup_window(self):
        """Configure main window"""
        self.setWindowTitle("Continium")
        self.setGeometry(100, 100, 1200, 800)
        
        # Set window icon
        icon_path = Path(__file__).parent.parent.parent / "resources" / "icon.png"
        if icon_path.exists():
            self.setWindowIcon(QIcon(str(icon_path)))
    
    def _setup_webview(self):
        """Setup web engine view"""
        self.web_view = QWebEngineView()
        self.setCentralWidget(self.web_view)
        
        # Configure web settings
        settings = self.web_view.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.AllowRunningInsecureContent, False)
        
        # Load frontend
        frontend_path = Path(__file__).parent.parent.parent / "frontend" / "index.html"
        if frontend_path.exists():
            self.web_view.setUrl(QUrl.fromLocalFile(str(frontend_path.absolute())))
        else:
            # Fallback to loading from web if local files not found
            self.web_view.setHtml(self._get_fallback_html())
    
    def _get_fallback_html(self):
        """Fallback HTML when frontend files are not found"""
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Continium</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: #1a1a1a;
                    color: #fff;
                }
                .container {
                    text-align: center;
                }
                h1 { color: #4a9eff; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Continium Desktop</h1>
                <p>Frontend files not found. Please ensure frontend folder is present.</p>
            </div>
        </body>
        </html>
        """
    
    def closeEvent(self, event):
        """Handle window close event"""
        event.ignore()
        self.hide()
        self.closed.emit()
