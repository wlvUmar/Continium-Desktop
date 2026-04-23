
from __future__ import annotations

from PyQt6 import QtCore, QtGui, QtWidgets
from services.event_emitter import EventEmitter

# --- Design tokens (mirror MainWindow WINDOW_THEME_TOKENS) ---
THEMES = {
    "dark": {
        "bg": "#1A1631",
        "bg_card": "#211E3A",
        "border": "#2A2A4A",
        "accent": "#7C6FF7",
        "accent_dim": "#4A4580",
        "text_primary": "#E8E4FF",
        "text_secondary": "#8A85B0",
        "btn_bg": "#2A2748",
        "btn_hover": "#3A3560",
        "btn_active": "#7C6FF7",
        "danger": "#D94A4A",
        "progress_track": "#2A2A4A",
    },
    "light": {
        "bg": "#F4F9FB",
        "bg_card": "#FFFFFF",
        "border": "#D9E4EC",
        "accent": "#5B7FF7",
        "accent_dim": "#B8CAF9",
        "text_primary": "#36465D",
        "text_secondary": "#6B7D94",
        "btn_bg": "#E6EFF4",
        "btn_hover": "#D0DDE8",
        "btn_active": "#5B7FF7",
        "danger": "#E85C5C",
        "progress_track": "#D9E4EC",
    },
}
DEFAULT_TOTAL_SECONDS = 25 * 60
OVERLAY_OPACITY = 0.97
DRAG_HANDLE_HEIGHT = 32
ARC_WIDTH = 3

class _ArcRing(QtWidgets.QWidget):
    def __init__(self, size: int = 72, parent: QtWidgets.QWidget | None = None) -> None:
        super().__init__(parent)
        self._size = size
        self._progress = 1.0
        self.setFixedSize(size, size)
        self.setAttribute(QtCore.Qt.WidgetAttribute.WA_TranslucentBackground)
    def set_progress(self, value: float) -> None:
        self._progress = max(0.0, min(1.0, value))
        self.update()
    def paintEvent(self, _event: QtGui.QPaintEvent) -> None:
        p = QtGui.QPainter(self)
        p.setRenderHint(QtGui.QPainter.RenderHint.Antialiasing)
        margin = ARC_WIDTH + 2
        rect = QtCore.QRectF(margin, margin, self._size - 2 * margin, self._size - 2 * margin)
        pen_track = QtGui.QPen(QtGui.QColor("#2A2A4A"), ARC_WIDTH, QtCore.Qt.PenStyle.SolidLine, QtCore.Qt.PenCapStyle.FlatCap)
        p.setPen(pen_track)
        p.drawEllipse(rect)
        span = int(self._progress * 360 * 16)
        pen_arc = QtGui.QPen(QtGui.QColor("#7C6FF7"), ARC_WIDTH + 1, QtCore.Qt.PenStyle.SolidLine, QtCore.Qt.PenCapStyle.RoundCap)
        p.setPen(pen_arc)
        p.drawArc(rect, 90 * 16, -span)
        p.end()
    def update_theme(self, tokens: dict[str, str]) -> None:
        self._track_color = tokens["progress_track"]
        self._arc_color = tokens["accent"]
        self.update()

class OverlayWidget(QtWidgets.QWidget):
    paused = QtCore.pyqtSignal()
    resumed = QtCore.pyqtSignal()
    stopped = QtCore.pyqtSignal()
    def __init__(self, theme: str = "dark") -> None:
        super().__init__()
        self._theme = theme
        self._tokens = THEMES[theme]
        self._drag_pos: QtCore.QPoint = QtCore.QPoint()
        self._is_running = False
        self._total_seconds = DEFAULT_TOTAL_SECONDS
        self._remaining_seconds = DEFAULT_TOTAL_SECONDS
        self._elapsed_seconds = 0
        self._segment_count = 3
        self._build_ui()
        self._apply_theme()
    def set_goal(self, title: str) -> None:
        self._title_label.setText(title)
    def set_total(self, total_seconds: int) -> None:
        self._total_seconds = max(1, total_seconds)
        self._remaining_seconds = self._total_seconds
        self._refresh_display()
    def set_remaining(self, remaining_seconds: int, elapsed_seconds: int = 0) -> None:
        self._remaining_seconds = max(0, remaining_seconds)
        self._elapsed_seconds = max(0, elapsed_seconds)
        self._refresh_display()
    def start_timer(self) -> None:
        self._is_running = True
        self._update_btn_state()
    def pause_timer(self) -> None:
        self._is_running = False
        self._update_btn_state()
    def stop_timer(self) -> None:
        self._is_running = False
        self._remaining_seconds = self._total_seconds
        self._elapsed_seconds = 0
        self._refresh_display()
        self._update_btn_state()
    def apply_theme(self, mode: str) -> None:
        self._theme = "dark" if mode == "dark" else "light"
        self._tokens = THEMES[self._theme]
        self._apply_theme()
    def _build_ui(self) -> None:
        self.setWindowFlags(
            QtCore.Qt.WindowType.Tool
            | QtCore.Qt.WindowType.FramelessWindowHint
            | QtCore.Qt.WindowType.WindowStaysOnTopHint
        )
        self.setAttribute(QtCore.Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setWindowOpacity(OVERLAY_OPACITY)
        self.setFixedWidth(260)
        self._card = QtWidgets.QWidget(self)
        self._card.setObjectName("overlayCard")
        root_layout = QtWidgets.QVBoxLayout(self)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.addWidget(self._card)
        card_layout = QtWidgets.QVBoxLayout(self._card)
        card_layout.setContentsMargins(0, 0, 0, 14)
        card_layout.setSpacing(0)
        self._drag_bar = QtWidgets.QWidget()
        self._drag_bar.setObjectName("dragBar")
        self._drag_bar.setFixedHeight(DRAG_HANDLE_HEIGHT)
        self._drag_bar.setCursor(QtCore.Qt.CursorShape.SizeAllCursor)
        drag_layout = QtWidgets.QHBoxLayout(self._drag_bar)
        drag_layout.setContentsMargins(12, 0, 8, 0)
        grip_label = QtWidgets.QLabel("\u283f")
        grip_label.setObjectName("gripIcon")
        drag_layout.addWidget(grip_label)
        drag_layout.addStretch()
        close_btn = QtWidgets.QPushButton("\u2715")
        close_btn.setObjectName("overlayClose")
        close_btn.setFixedSize(22, 22)
        close_btn.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
        close_btn.clicked.connect(self.hide)
        drag_layout.addWidget(close_btn)
        self._drag_bar.mousePressEvent = self._start_drag
        self._drag_bar.mouseMoveEvent = self._do_drag
        card_layout.addWidget(self._drag_bar)
        body = QtWidgets.QWidget()
        body_layout = QtWidgets.QVBoxLayout(body)
        body_layout.setContentsMargins(18, 4, 18, 0)
        body_layout.setSpacing(10)
        self._title_label = QtWidgets.QLabel("Focus Session")
        self._title_label.setObjectName("goalTitle")
        self._title_label.setWordWrap(True)
        body_layout.addWidget(self._title_label)
        ring_row = QtWidgets.QHBoxLayout()
        ring_row.setSpacing(14)
        self._ring = _ArcRing(size=64)
        ring_row.addWidget(self._ring, 0, QtCore.Qt.AlignmentFlag.AlignVCenter)
        time_col = QtWidgets.QVBoxLayout()
        time_col.setSpacing(2)
        self._time_label = QtWidgets.QLabel("25:00")
        self._time_label.setObjectName("timeLabel")
        self._status_label = QtWidgets.QLabel("Ready")
        self._status_label.setObjectName("statusLabel")
        time_col.addWidget(self._time_label)
        time_col.addWidget(self._status_label)
        ring_row.addLayout(time_col)
        ring_row.addStretch()
        body_layout.addLayout(ring_row)
        ctrl_row = QtWidgets.QHBoxLayout()
        ctrl_row.setSpacing(8)
        self._play_pause_btn = QtWidgets.QPushButton("\u25b6  Start")
        self._play_pause_btn.setObjectName("primaryBtn")
        self._play_pause_btn.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
        self._play_pause_btn.clicked.connect(self._toggle_timer)
        stop_btn = QtWidgets.QPushButton("\u25a0")
        stop_btn.setObjectName("secondaryBtn")
        stop_btn.setFixedWidth(38)
        stop_btn.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
        stop_btn.setToolTip("Stop & reset")
        stop_btn.clicked.connect(self._stop_timer)
        ctrl_row.addWidget(self._play_pause_btn)
        ctrl_row.addWidget(stop_btn)
        body_layout.addLayout(ctrl_row)
        card_layout.addWidget(body)
    def _start_drag(self, event: QtGui.QMouseEvent) -> None:
        if event.button() == QtCore.Qt.MouseButton.LeftButton:
            self._drag_pos = event.globalPosition().toPoint() - self.frameGeometry().topLeft()
    def _do_drag(self, event: QtGui.QMouseEvent) -> None:
        if (event.buttons() & QtCore.Qt.MouseButton.LeftButton) != QtCore.Qt.MouseButton.NoButton:
            self.move(event.globalPosition().toPoint() - self._drag_pos)
    def _toggle_timer(self) -> None:
        if self._is_running:
            self.paused.emit()
        else:
            self.resumed.emit()
    def _stop_timer(self) -> None:
        self.stopped.emit()
    def _refresh_display(self) -> None:
        # Calculate segment info
        seg_duration = self._total_seconds // self._segment_count
        current_seg = (self._elapsed_seconds // max(1, seg_duration)) + 1
        current_seg = min(current_seg, self._segment_count)
        
        seg_start = (current_seg - 1) * seg_duration
        seg_end = current_seg * seg_duration
        if current_seg == self._segment_count:
            seg_end = self._total_seconds
            
        seg_elapsed = self._elapsed_seconds - seg_start
        seg_remaining = max(0, (seg_end - seg_start) - seg_elapsed)
        
        mins, secs = divmod(seg_remaining, 60)
        self._time_label.setText(f"{mins:02d}:{secs:02d}")
        
        if self._is_running:
            self._status_label.setText(f"Segment {current_seg}/{self._segment_count}")
        
        progress = self._remaining_seconds / max(self._total_seconds, 1)
        self._ring.set_progress(progress)
    def _update_btn_state(self) -> None:
        if self._is_running:
            self._play_pause_btn.setText("\u23f8  Pause")
            self._status_label.setText("Focusing…")
        else:
            elapsed = self._total_seconds - self._remaining_seconds
            if elapsed == 0:
                self._play_pause_btn.setText("\u25b6  Start")
                self._status_label.setText("Ready")
            elif self._remaining_seconds <= 0:
                self._play_pause_btn.setText("\u25b6  Start")
                self._status_label.setText("Done! \U0001f389")
            else:
                self._play_pause_btn.setText("\u25b6  Resume")
                # Note: _refresh_display will override this if running, 
                # but if paused we show Paused
                self._status_label.setText("Paused")
    def _apply_theme(self) -> None:
        t = self._tokens
        self._ring.update_theme(t)
        self.setStyleSheet(f"""
            #overlayCard {{
                background: {t['bg']};
                border: 1px solid {t['border']};
                border-radius: 14px;
            }}
            #dragBar {{
                background: {t['bg_card']};
                border-bottom: 1px solid {t['border']};
                border-top-left-radius: 14px;
                border-top-right-radius: 14px;
            }}
            #gripIcon {{
                color: {t['text_secondary']};
                font-size: 14px;
                letter-spacing: 1px;
            }}
            #overlayClose {{
                background: transparent;
                color: {t['text_secondary']};
                border: none;
                font-size: 11px;
                border-radius: 4px;
            }}
            #overlayClose:hover {{
                background: {t['danger']};
                color: white;
            }}
            #goalTitle {{
                font-size: 12px;
                font-weight: 600;
                color: {t['text_secondary']};
                text-transform: uppercase;
                letter-spacing: 0.8px;
            }}
            #timeLabel {{
                font-size: 30px;
                font-weight: 700;
                color: {t['text_primary']};
                font-variant-numeric: tabular-nums;
                letter-spacing: -1px;
            }}
            #statusLabel {{
                font-size: 11px;
                color: {t['text_secondary']};
            }}
            #primaryBtn {{
                background: {t['accent']};
                color: white;
                border: none;
                border-radius: 8px;
                padding: 7px 14px;
                font-size: 13px;
                font-weight: 600;
            }}
            #primaryBtn:hover {{
                background: {t['accent_dim']};
            }}
            #secondaryBtn {{
                background: {t['btn_bg']};
                color: {t['text_secondary']};
                border: none;
                border-radius: 8px;
                padding: 7px 6px;
                font-size: 13px;
                font-weight: 700;
            }}
            #secondaryBtn:hover {{
                background: {t['btn_hover']};
                color: {t['danger']};
            }}
        """)

class _OverlaySignals(QtCore.QObject):
    tick = QtCore.pyqtSignal(int, int)

class OverlayManager:
    def __init__(self, events: EventEmitter | None = None) -> None:
        self._widget = OverlayWidget()
        self._events = events
        self._signals = _OverlaySignals()
        self._signals.tick.connect(self._on_tick)
        
        self._widget.paused.connect(self._on_ui_pause)
        self._widget.resumed.connect(self._on_ui_resume)
        self._widget.stopped.connect(self._on_ui_stop)
        
        if events is not None:
            events.on("timer:tick", self._handle_tick)
            events.on("timer:start", self._handle_start)
            events.on("timer:pause", self._handle_pause)
            events.on("timer:resume", self._handle_resume)
            events.on("timer:stop", self._handle_stop)
            events.on("timer:complete", self._handle_complete)
            events.on("goal:set", self._handle_goal)
            events.on("theme:change", self._handle_theme)
    def show(self) -> None:
        self._widget.show()
    def hide(self) -> None:
        self._widget.hide()
    def set_goal(self, title: str) -> None:
        self._widget.set_goal(title)
    def set_total(self, total_seconds: int) -> None:
        self._widget.set_total(total_seconds)
        
    def _on_ui_pause(self) -> None:
        if self._events:
            self._events.emit("timer:pause", {})
            
    def _on_ui_resume(self) -> None:
        if self._events:
            self._events.emit("timer:resume", {})
            
    def _on_ui_stop(self) -> None:
        if self._events:
            self._events.emit("timer:stop", {})

    def _handle_tick(self, payload: dict[str, object]) -> None:
        remaining = int(payload.get("remaining_seconds", 0) or 0)
        elapsed = int(payload.get("elapsed_seconds", 0) or 0)
        self._signals.tick.emit(remaining, elapsed)
    def _on_tick(self, remaining_seconds: int, elapsed_seconds: int) -> None:
        self._widget.set_remaining(remaining_seconds, elapsed_seconds)
    def _handle_start(self, payload: dict[str, object]) -> None:
        total = int(payload.get("duration_seconds", DEFAULT_TOTAL_SECONDS))
        self._widget.set_total(total)
        self._widget.start_timer()
        self.show()
    def _handle_pause(self, _payload: dict[str, object]) -> None:
        self._widget.pause_timer()
    def _handle_resume(self, _payload: dict[str, object]) -> None:
        self._widget.start_timer()
        self.show()
    def _handle_stop(self, _payload: dict[str, object]) -> None:
        self._widget.stop_timer()
    def _handle_complete(self, _payload: dict[str, object]) -> None:
        self._widget.pause_timer()
    def _handle_goal(self, payload: dict[str, object]) -> None:
        title = str(payload.get("title", "Focus Session"))
        total = int(payload.get("total_seconds", DEFAULT_TOTAL_SECONDS))
        self._widget.set_goal(title)
        self._widget.set_total(total)
    def _handle_theme(self, payload: dict[str, object]) -> None:
        mode = str(payload.get("mode", "dark"))
        self._widget.apply_theme(mode)
