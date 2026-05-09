from PyQt6 import QtCore, QtWidgets
from services import EventEmitter


class MiniTimer(QtWidgets.QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowFlags(
            QtCore.Qt.WindowType.FramelessWindowHint |
            QtCore.Qt.WindowType.Tool |
            QtCore.Qt.WindowType.WindowStaysOnTopHint
        )

        self.setAttribute(QtCore.Qt.WidgetAttribute.WA_TranslucentBackground)

        self.setFixedSize(110, 48)

        # ── glass background layer ──
        self._bg = QtWidgets.QFrame(self)
        self._bg.setGeometry(0, 0, 110, 48)
        self._bg.setObjectName("glass")

        self.label = QtWidgets.QLabel("00:00", self)
        self.label.setGeometry(0, 0, 110, 48)
        self.label.setAlignment(QtCore.Qt.AlignmentFlag.AlignCenter)

        self.label.setStyleSheet("""
            QLabel {
                color: rgba(255,255,255,0.95);
                font-size: 17px;
                font-weight: 500;
                letter-spacing: 1px;
                background: transparent;
            }
        """)

        self.setStyleSheet("""
            QFrame#glass {
                background: rgba(20, 20, 30, 140);
                border-radius: 14px;
            }
        """)

        self._apply_blur()

        self._drag = QtCore.QPoint()
        self._dragging = False

    def _apply_blur(self):
        effect = QtWidgets.QGraphicsBlurEffect(self)
        effect.setBlurRadius(18)
        self._bg.setGraphicsEffect(effect)

    def set_time(self, sec: int):
        sec = max(0, int(sec))
        m, s = divmod(sec, 60)
        self.label.setText(f"{m:02d}:{s:02d}")

    def mousePressEvent(self, a0):
        if a0 and a0.button() == QtCore.Qt.MouseButton.LeftButton:
            self._dragging = True
            self._drag = a0.globalPosition().toPoint() - self.frameGeometry().topLeft()

    def mouseMoveEvent(self, a0):
        if a0 and self._dragging:
            self.move(a0.globalPosition().toPoint() - self._drag)

    def mouseReleaseEvent(self, a0):
        self._dragging = False

class OverlayManager:
    def __init__(self, events: EventEmitter | None):
        self._ui = MiniTimer()

        if events:
            events.on("timer:tick", self._tick)

            events.on("timer:start", lambda _: self._ui.show())
            events.on("timer:stop", lambda _: self._ui.hide())
            events.on("timer:complete", lambda _: self._ui.hide())

    def _tick(self, p: dict):
        total = int(p.get("duration_seconds", 0))
        elapsed = int(p.get("elapsed_seconds", 0))

        if total <= 0:
            return

        segment_len = total // 3

        current_segment = min(elapsed // segment_len, 3 - 1)

        seg_start = current_segment * segment_len
        seg_remaining = segment_len - (elapsed - seg_start)

        self._ui.set_time(seg_remaining)

    def show(self): self._ui.show()
    def hide(self): self._ui.hide()