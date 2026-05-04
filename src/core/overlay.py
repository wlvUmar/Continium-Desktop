from __future__ import annotations

import ctypes
import os

from PyQt6 import QtCore, QtGui, QtWidgets
from services.event_emitter import EventEmitter

THEMES = {
    "dark":  dict(border="#2A2A4A", accent="#07B6D5", accent_dim="#1693C5",
                  text_primary="#E0E0E0", text_secondary="#AEBBD0",
                  btn_bg="#1A1A2E", btn_hover="#2A2A4A", danger="#D94A4A",
                  progress_track="#2A2A4A"),
    "light": dict(border="#D7D6D6", accent="#07B6D5", accent_dim="#1693C5",
                  text_primary="#475A6C", text_secondary="#5A7892",
                  btn_bg="#DDEFF4", btn_hover="#CCE5EC", danger="#E85C5C",
                  progress_track="#D9D9D9"),
}
DEFAULT_TOTAL_SECONDS = 25 * 60
ARC_WIDTH = 3


class _ArcRing(QtWidgets.QWidget):
    def __init__(self, size: int = 72, parent: QtWidgets.QWidget | None = None) -> None:
        super().__init__(parent)
        self._size = size
        self._progress = 1.0
        self._track_color = "#2A2A4A"
        self._arc_color = "#07B6D5"
        self.setFixedSize(size, size)
        self.setAttribute(QtCore.Qt.WidgetAttribute.WA_TranslucentBackground)

    def set_progress(self, value: float) -> None:
        self._progress = max(0.0, min(1.0, value))
        self.update()

    def paintEvent(self, _: QtGui.QPaintEvent) -> None:
        p = QtGui.QPainter(self)
        p.setRenderHint(QtGui.QPainter.RenderHint.Antialiasing)
        m = ARC_WIDTH + 2
        rect = QtCore.QRectF(m, m, self._size - 2 * m, self._size - 2 * m)
        for color, width, cap, span in [
            (self._track_color, ARC_WIDTH,     QtCore.Qt.PenCapStyle.FlatCap,  360 * 16),
            (self._arc_color,   ARC_WIDTH + 1, QtCore.Qt.PenCapStyle.RoundCap, int(self._progress * 360 * 16)),
        ]:
            pen = QtGui.QPen(QtGui.QColor(color), width, QtCore.Qt.PenStyle.SolidLine, cap)
            p.setPen(pen)
            if cap == QtCore.Qt.PenCapStyle.FlatCap:
                p.drawEllipse(rect)
            else:
                p.drawArc(rect, 90 * 16, -span)
        p.end()

    def update_theme(self, t: dict) -> None:
        self._track_color = t["progress_track"]
        self._arc_color = t["accent"]
        self.update()


class _DragBar(QtWidgets.QWidget):
    """Top bar — full surface draggable, including visually transparent gaps."""
    def __init__(self, overlay: "OverlayWidget", parent: QtWidgets.QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("dragBar")
        self.setFixedHeight(44)
        self.setCursor(QtCore.Qt.CursorShape.SizeAllCursor)
        self.setMouseTracking(True)
        # Without a solid (even 1-alpha) background Qt may pass clicks through
        # transparent regions to whatever sits behind the window.
        self.setAutoFillBackground(False)
        self._overlay = overlay

    def mousePressEvent(self, e: QtGui.QMouseEvent) -> None:
        self._overlay._start_drag(e)

    def mouseMoveEvent(self, e: QtGui.QMouseEvent) -> None:
        self._overlay._do_drag(e)

    def mouseReleaseEvent(self, e: QtGui.QMouseEvent) -> None:
        self._overlay._end_drag(e)


class OverlayWidget(QtWidgets.QWidget):
    paused  = QtCore.pyqtSignal()
    resumed = QtCore.pyqtSignal()
    stopped = QtCore.pyqtSignal()

    def __init__(self, theme: str = "light") -> None:
        super().__init__()
        self._tokens = THEMES[theme if theme in THEMES else "light"]
        self._is_running = False
        self._total = DEFAULT_TOTAL_SECONDS
        self._remaining = DEFAULT_TOTAL_SECONDS
        self._elapsed = 0
        self._segment_count = 3
        self._drag_pos = QtCore.QPoint()
        self._dragging = False
        self._build_ui()
        self._apply_theme()

    # ── public API ─────────────────────────────────────────────────────────────
    def set_goal(self, title: str)                          -> None: self._title_label.setText(title)
    def apply_theme(self, mode: str)                        -> None:
        self._tokens = THEMES.get(mode, THEMES["light"]); self._apply_theme()

    def set_total(self, secs: int) -> None:
        self._total = self._remaining = max(1, secs)
        self._elapsed = 0
        self._refresh_display()

    def set_remaining(self, remaining: int, elapsed: int = 0) -> None:
        self._remaining = max(0, remaining)
        self._elapsed   = max(0, elapsed)
        self._refresh_display()

    def start_timer(self) -> None:
        self._is_running = True;  self._update_btn_state()

    def pause_timer(self) -> None:
        self._is_running = False; self._update_btn_state()

    def stop_timer(self) -> None:
        self._is_running = False
        self._remaining  = self._total
        self._elapsed    = 0
        self._refresh_display()
        self._update_btn_state()

    # ── UI construction ─────────────────────────────────────────────────────────
    def _build_ui(self) -> None:
        self.setWindowFlags(
            QtCore.Qt.WindowType.Tool
            | QtCore.Qt.WindowType.FramelessWindowHint
            | QtCore.Qt.WindowType.WindowStaysOnTopHint
        )
        self.setAttribute(QtCore.Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setFixedWidth(260)

        self._card = QtWidgets.QWidget(self)
        self._card.setObjectName("overlayCard")
        root = QtWidgets.QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.addWidget(self._card)

        card = QtWidgets.QVBoxLayout(self._card)
        card.setContentsMargins(0, 0, 0, 14)
        card.setSpacing(0)

        # drag bar — proper subclass so child widgets don't swallow events
        drag_bar = _DragBar(self, self._card)
        dl = QtWidgets.QHBoxLayout(drag_bar)
        dl.setContentsMargins(12, 0, 8, 0)
        grip = QtWidgets.QLabel("⠿")
        grip.setObjectName("gripIcon")
        grip.setAttribute(QtCore.Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        close_btn = QtWidgets.QPushButton("✕")
        close_btn.setObjectName("overlayClose")
        close_btn.setFixedSize(22, 22)
        close_btn.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
        close_btn.clicked.connect(self.hide)
        dl.addWidget(grip); dl.addStretch(); dl.addWidget(close_btn)
        card.addWidget(drag_bar)

        # body
        body = QtWidgets.QWidget()
        bl = QtWidgets.QVBoxLayout(body)
        bl.setContentsMargins(18, 4, 18, 0)
        bl.setSpacing(10)

        self._title_label = QtWidgets.QLabel("Focus Session")
        self._title_label.setObjectName("goalTitle")
        self._title_label.setWordWrap(True)
        bl.addWidget(self._title_label)

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
        ring_row.addLayout(time_col); ring_row.addStretch()
        bl.addLayout(ring_row)

        ctrl = QtWidgets.QHBoxLayout()
        ctrl.setSpacing(8)
        self._play_pause_btn = QtWidgets.QPushButton("Start")
        self._play_pause_btn.setObjectName("primaryBtn")
        self._play_pause_btn.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
        self._play_pause_btn.clicked.connect(self._toggle_timer)
        stop_btn = QtWidgets.QPushButton("■")
        stop_btn.setObjectName("secondaryBtn")
        stop_btn.setFixedWidth(38)
        stop_btn.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
        stop_btn.setToolTip("Stop & reset")
        stop_btn.clicked.connect(self._stop_timer)
        ctrl.addWidget(self._play_pause_btn); ctrl.addWidget(stop_btn)
        bl.addLayout(ctrl)

        card.addWidget(body)

    # ── drag handling ───────────────────────────────────────────────────────────
    def _start_drag(self, e: QtGui.QMouseEvent) -> None:
        if e.button() != QtCore.Qt.MouseButton.LeftButton:
            return
        wh = self.windowHandle()
        if wh and wh.startSystemMove():
            return
        self._drag_pos = e.globalPosition().toPoint() - self.frameGeometry().topLeft()
        self._dragging = True

    def _do_drag(self, e: QtGui.QMouseEvent) -> None:
        if self._dragging and e.buttons() & QtCore.Qt.MouseButton.LeftButton:
            self.move(e.globalPosition().toPoint() - self._drag_pos)

    def _end_drag(self, e: QtGui.QMouseEvent) -> None:
        if e.button() == QtCore.Qt.MouseButton.LeftButton:
            self._dragging = False

    # ── internal helpers ────────────────────────────────────────────────────────
    def _toggle_timer(self) -> None:
        (self.paused if self._is_running else self.resumed).emit()

    def _stop_timer(self) -> None:
        self.stopped.emit()

    def _refresh_display(self) -> None:
        seg_dur  = self._total // self._segment_count
        cur_seg  = min(self._elapsed // max(1, seg_dur) + 1, self._segment_count)
        seg_start = (cur_seg - 1) * seg_dur
        seg_end   = self._total if cur_seg == self._segment_count else cur_seg * seg_dur
        seg_rem   = max(0, seg_end - seg_start - (self._elapsed - seg_start))
        m, s = divmod(seg_rem, 60)
        self._time_label.setText(f"{m:02d}:{s:02d}")
        if self._is_running:
            self._status_label.setText(f"Segment {cur_seg}/{self._segment_count}")
        self._ring.set_progress(self._remaining / max(self._total, 1))

    def _update_btn_state(self) -> None:
        elapsed = self._total - self._remaining
        if self._is_running:
            self._play_pause_btn.setText("Pause")
            self._status_label.setText("Focusing…")
        elif elapsed == 0:
            self._play_pause_btn.setText("Start");  self._status_label.setText("Ready")
        elif self._remaining <= 0:
            self._play_pause_btn.setText("Start");  self._status_label.setText("Done! 🎉")
        else:
            self._play_pause_btn.setText("Resume"); self._status_label.setText("Paused")

    def _apply_theme(self) -> None:
        t = self._tokens
        self._ring.update_theme(t)
        self.setStyleSheet(f"""
            #overlayCard  {{ background:transparent; border:1px solid {t['border']}; border-radius:16px; }}
            #dragBar      {{ background:transparent; border:none; }}
            #gripIcon     {{ color:{t['text_secondary']}; font-size:14px; letter-spacing:1px; }}
            #overlayClose {{ background:transparent; color:{t['text_secondary']}; border:none;
                             font-size:11px; border-radius:4px; }}
            #overlayClose:hover {{ background:{t['danger']}; color:white; }}
            #goalTitle    {{ font-size:12px; font-weight:600; color:{t['text_secondary']};
                             text-transform:uppercase; letter-spacing:0.8px; }}
            #timeLabel    {{ font-size:30px; font-weight:700; color:{t['text_primary']};
                             font-variant-numeric:tabular-nums; letter-spacing:-1px; }}
            #statusLabel  {{ font-size:11px; color:{t['text_secondary']}; }}
            #primaryBtn   {{ background:{t['accent']}; color:white; border:none; border-radius:8px;
                             padding:7px 14px; font-size:13px; font-weight:600; }}
            #primaryBtn:hover  {{ background:{t['accent_dim']}; }}
            #secondaryBtn {{ background:{t['btn_bg']}; color:{t['text_secondary']}; border:none;
                             border-radius:8px; padding:7px 6px; font-size:13px; font-weight:700; }}
            #secondaryBtn:hover {{ background:{t['btn_hover']}; color:{t['danger']}; }}
        """)

    def showEvent(self, e: QtGui.QShowEvent) -> None:
        super().showEvent(e)
        self._enable_windows_blur()

    def _enable_windows_blur(self) -> None:
        if os.name != "nt":
            return
        hwnd = int(self.winId())
        user32 = ctypes.windll.user32
        fn = getattr(user32, "SetWindowCompositionAttribute", None)
        if callable(fn):
            class _Accent(ctypes.Structure):
                _fields_ = [("AccentState",ctypes.c_int),("AccentFlags",ctypes.c_int),
                             ("GradientColor",ctypes.c_uint32),("AnimationId",ctypes.c_int)]
            class _WCA(ctypes.Structure):
                _fields_ = [("Attrib",ctypes.c_int),("pvData",ctypes.c_void_p),("cbData",ctypes.c_size_t)]
            accent = _Accent(AccentState=3)
            data   = _WCA(Attrib=19, pvData=ctypes.addressof(accent), cbData=ctypes.sizeof(accent))
            if fn(ctypes.c_void_p(hwnd), ctypes.byref(data)):
                return
        try:
            class _BB(ctypes.Structure):
                _fields_ = [("dwFlags",ctypes.c_uint32),("fEnable",ctypes.c_int),
                             ("hRgnBlur",ctypes.c_void_p),("fTransitionOnMaximized",ctypes.c_int)]
            ctypes.WinDLL("dwmapi").DwmEnableBlurBehindWindow(
                ctypes.c_void_p(hwnd), ctypes.byref(_BB(dwFlags=1, fEnable=1)))
        except OSError:
            pass


class OverlayManager:
    def __init__(self, events: EventEmitter | None = None) -> None:
        self._widget  = OverlayWidget()
        self._events  = events
        # cross-thread tick relay
        self._signals = type("S", (QtCore.QObject,),
                             {"tick": QtCore.pyqtSignal(int, int)})()
        self._signals.tick.connect(
            lambda r, e: self._widget.set_remaining(r, e))

        self._widget.paused.connect( lambda: events and events.emit("timer:pause",  {}))
        self._widget.resumed.connect(lambda: events and events.emit("timer:resume", {}))
        self._widget.stopped.connect(lambda: events and events.emit("timer:stop",   {}))

        if events:
            events.on("timer:tick",     self._handle_tick)
            events.on("timer:start",    self._handle_start)
            events.on("timer:pause",    lambda _: self._widget.pause_timer())
            events.on("timer:resume",   lambda _: (self._widget.start_timer(), self.show()))
            events.on("timer:stop",     lambda _: self._widget.stop_timer())
            events.on("timer:complete", lambda _: self._widget.pause_timer())
            events.on("goal:set",       self._handle_goal)
            events.on("ui:theme",       self._handle_theme)
            events.on("theme:change",   self._handle_theme)

    def show(self)                       -> None: self._widget.show()
    def hide(self)                       -> None: self._widget.hide()
    def set_goal(self, title: str)       -> None: self._widget.set_goal(title)
    def set_total(self, secs: int)       -> None: self._widget.set_total(secs)

    def _handle_tick(self, p: dict) -> None:
        self._signals.tick.emit(int(p.get("remaining_seconds", 0) or 0),
                                int(p.get("elapsed_seconds",   0) or 0))

    def _handle_start(self, p: dict) -> None:
        self._widget.set_total(int(p.get("duration_seconds", DEFAULT_TOTAL_SECONDS)))
        self._widget.start_timer()
        self.show()

    def _handle_goal(self, p: dict) -> None:
        self._widget.set_goal(str(p.get("title", "Focus Session")))
        self._widget.set_total(int(p.get("total_seconds", DEFAULT_TOTAL_SECONDS)))

    def _handle_theme(self, p: dict) -> None:
        self._widget.apply_theme(str(p.get("mode", "dark")))