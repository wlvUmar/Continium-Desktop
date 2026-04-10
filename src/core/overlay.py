
from __future__ import annotations

from PyQt6 import QtCore, QtWidgets

from services.event_emitter import EventEmitter

DEFAULT_OVERLAY_OPACITY = 0.95
OVERLAY_MARGIN_X = 12
OVERLAY_MARGIN_Y = 8


class OverlayWidget(QtWidgets.QWidget):
    """Lightweight overlay widget for timer status."""

    def __init__(self) -> None:
        super().__init__()
        self._label = QtWidgets.QLabel("00:00")
        self._setup_layout()
        self._setup_window()

    def _setup_layout(self) -> None:
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(OVERLAY_MARGIN_X, OVERLAY_MARGIN_Y, OVERLAY_MARGIN_X, OVERLAY_MARGIN_Y)
        layout.addWidget(self._label)

    def _setup_window(self) -> None:
        flags = (
            QtCore.Qt.WindowType.Tool
            | QtCore.Qt.WindowType.FramelessWindowHint
            | QtCore.Qt.WindowType.WindowStaysOnTopHint
        )
        self.setWindowFlags(flags)
        self.setWindowOpacity(DEFAULT_OVERLAY_OPACITY)

    def set_time(self, display_text: str) -> None:
        self._label.setText(display_text)


class _OverlaySignals(QtCore.QObject):
    tick = QtCore.pyqtSignal(int)


class OverlayManager:
    """Controls overlay visibility and updates."""

    def __init__(self, events: EventEmitter | None = None) -> None:
        self._widget = OverlayWidget()
        self._signals = _OverlaySignals()
        self._signals.tick.connect(self._on_tick)
        if events is not None:
            events.on("timer:tick", self._handle_tick)

    def show(self) -> None:
        self._widget.show()

    def hide(self) -> None:
        self._widget.hide()

    def _handle_tick(self, payload: dict[str, object]) -> None:
        remaining = int(payload.get("remaining_seconds", 0) or 0)
        self._signals.tick.emit(remaining)

    def _on_tick(self, remaining_seconds: int) -> None:
        minutes, seconds = divmod(max(remaining_seconds, 0), 60)
        self._widget.set_time(f"{minutes:02d}:{seconds:02d}")


