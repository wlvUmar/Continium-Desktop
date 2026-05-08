from PyQt6 import QtCore, QtGui, QtWidgets


class MiniTimer(QtWidgets.QWidget):
    def __init__(self):
        super().__init__()

        self._remaining = 0
        self._drag_pos = QtCore.QPoint()
        self._dragging = False

        self.setWindowFlags(
            QtCore.Qt.WindowType.FramelessWindowHint |
            QtCore.Qt.WindowType.Tool |
            QtCore.Qt.WindowType.WindowStaysOnTopHint
        )
        self.setAttribute(QtCore.Qt.WidgetAttribute.WA_TranslucentBackground)

        self.setFixedSize(90, 40)

        self.label = QtWidgets.QLabel("00:00", self)
        self.label.setAlignment(QtCore.Qt.AlignmentFlag.AlignCenter)
        self.label.setGeometry(0, 0, 90, 40)

        self.setStyleSheet("""
            QLabel {
                color: #07B6D5;
                font-size: 16px;
                background: rgba(20,20,30,180);
                border-radius: 8px;
            }
        """)

    def set_time(self, remaining_seconds: int):
        self._remaining = max(0, remaining_seconds)
        m, s = divmod(self._remaining, 60)
        self.label.setText(f"{m:02d}:{s:02d}")

    # drag
    def mousePressEvent(self, e):
        if e.button() == QtCore.Qt.MouseButton.LeftButton:
            self._dragging = True
            self._drag_pos = e.globalPosition().toPoint() - self.frameGeometry().topLeft()

    def mouseMoveEvent(self, e):
        if self._dragging:
            self.move(e.globalPosition().toPoint() - self._drag_pos)

    def mouseReleaseEvent(self, e):
        self._dragging = False