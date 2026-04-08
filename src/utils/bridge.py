"""
Bridge between Python backend and JavaScript frontend
"""
from PyQt6.QtWebEngineCore import QWebEngineScript
from PyQt6.QtCore import QObject, pyqtSlot, pyqtSignal


class JSBridge(QObject):
    """Bridge for communication between Python and JavaScript"""
    
    # Signals to send data to JavaScript
    data_updated = pyqtSignal(str)
    
    def __init__(self):
        super().__init__()
    
    @pyqtSlot(str, result=str)
    def send_to_python(self, message):
        """Receive message from JavaScript"""
        print(f"Received from JS: {message}")
        # Process message and return response
        return f"Python received: {message}"
    
    @pyqtSlot(str, str)
    def api_call(self, method, data):
        """Handle API calls from JavaScript"""
        print(f"API Call - Method: {method}, Data: {data}")
        # Handle different API methods
        if method == "getData":
            self.data_updated.emit('{"status": "success"}')
    
    def send_to_js(self, data):
        """Send data to JavaScript"""
        self.data_updated.emit(data)
