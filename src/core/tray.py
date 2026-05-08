"""System tray integration."""

from __future__ import annotations

import logging
from typing import Any, Callable

from PyQt6.QtCore import QPoint, QTimer, QSize, Qt, pyqtSignal
from PyQt6.QtGui import QAction, QGuiApplication, QIcon, QColor, QMouseEvent
from PyQt6.QtWidgets import (
    QApplication,
    QGraphicsDropShadowEffect,
    QGraphicsColorizeEffect,
    QHBoxLayout,
    QLabel,
    QMenu,
    QPushButton,
    QSystemTrayIcon,
    QVBoxLayout,
    QWidget,
    QWidgetAction,
)

from core.window import MainWindow
from dal import SessionLocal
from models.goal import Goal
from utils.paths import resource_dir
from utils.styles import tray_stylesheet
logger = logging.getLogger("continium")


class ClickableRow(QWidget):
    clicked = pyqtSignal()

    def mousePressEvent(self, a0: QMouseEvent | None) -> None:
        self.clicked.emit()
        super().mousePressEvent(a0)

class SystemTray:
    """Manages the system tray icon and menu actions with project quick-launch."""

    def __init__(self, app: QApplication, window: MainWindow, events_emitter: Any = None) -> None:
        self._app = app
        self._window = window
        self._events = events_emitter
        self._theme_mode = "light"
        self._tray = QSystemTrayIcon(self._load_icon(), self._app)
        self._menu = QMenu()
        self._menu.aboutToShow.connect(self._build_menu)
        self._build_menu()
        self._tray.activated.connect(self._handle_tray_activation)
        self.apply_theme(self._theme_mode)
        self._menu.setMinimumWidth(300)
        self._tray.show()

    def apply_theme(self, mode: str | None) -> None:
        """Apply active UI theme to tray menu colors."""
        normalized = (mode or "light").strip().lower()
        self._theme_mode = "dark" if normalized == "dark" else "light"
        self._menu.setStyleSheet(tray_stylesheet(self._theme_mode))

    def _load_icon(self, name="icon") -> QIcon:
        resources = resource_dir()
        for icon_name in (f"{name}.ico", f"{name}.svg"):
            icon_path = resources / icon_name
            if icon_path.exists():
                return QIcon(str(icon_path))
        return QIcon()

    def _build_menu(self) -> None:
        """Build tray menu with recent project rows and a quit action."""
        self._menu.clear()

        # Open button row
        self._menu.addAction(self._icon_button_action("Open", self._open_window, "share", QColor(100, 180, 255)))
        self._menu.addSeparator()

        goals = self._load_recent_active_goals(limit=3)
        if goals:
            for goal in goals:
                self._menu.addAction(self._project_row_action(goal.id, goal.title, goal.duration_min))
        else:
            empty_action = QAction("No active projects", self._menu)
            empty_action.setEnabled(False)
            self._menu.addAction(empty_action)

        self._menu.addSeparator()

        # Quit button row
        self._menu.addAction(self._icon_button_action("Quit", self._quit_application, "exit_vector", QColor(255, 120, 120)))

    def _handle_tray_activation(self, reason: int) -> None:
        """Open tray menu near taskbar instead of cursor."""
        if reason == QSystemTrayIcon.ActivationReason.Context or reason == QSystemTrayIcon.ActivationReason.Trigger:
            QTimer.singleShot(0, self._popup_menu_near_taskbar)

    def _popup_menu_near_taskbar(self) -> None:
        """Popup menu anchored to taskbar edge."""
        self._build_menu()
        self._menu.adjustSize()
        menu_size = self._menu.sizeHint()

        tray_rect = self._tray.geometry()
        if tray_rect.isValid():
            popup_x = max(8, tray_rect.center().x() - (menu_size.width() // 2))
            popup_y = max(8, tray_rect.top() - menu_size.height() - 8)
            self._menu.popup(QPoint(popup_x, popup_y))
            return

        screen = QGuiApplication.primaryScreen()
        if screen is None:
            self._menu.popup(QPoint(20, 20))
            return

        full = screen.geometry()
        avail = screen.availableGeometry()
        margin = 8

        taskbar_top = avail.top() > full.top()
        taskbar_left = avail.left() > full.left()
        taskbar_right = avail.right() < full.right()

        if taskbar_top:
            pos = QPoint(avail.right() - menu_size.width() - margin, avail.top() + margin)
        elif taskbar_left:
            pos = QPoint(avail.left() + margin, avail.bottom() - menu_size.height() - margin)
        elif taskbar_right:
            pos = QPoint(avail.right() - menu_size.width() - margin, avail.bottom() - menu_size.height() - margin)
        else:
            pos = QPoint(avail.right() - menu_size.width() - margin, avail.bottom() - menu_size.height() - margin)

        self._menu.popup(pos)

    def _load_recent_active_goals(self, limit: int = 3) -> list[Goal]:
        """Load most recent active goals using sidebar-compatible filtering."""
        try:
            with SessionLocal() as db:
                goals = (
                    db.query(Goal)
                    .filter(Goal.is_complete.is_(False))
                    .order_by(Goal.id.desc())
                    .limit(limit)
                    .all()
                )
                return goals
        except Exception as e:
            print(f"Error loading goals: {e}")
            return []

    def _icon_button_action(
        self,
        label: str,
        callback: Callable[[], None],
        icon_name: str,
        color: QColor | None = None
    ) -> QWidgetAction:

        action = QWidgetAction(self._menu)

        row = ClickableRow(self._menu)
        row.setObjectName("trayIconRow")

        row_layout = QHBoxLayout(row)
        row_layout.setContentsMargins(10, 8, 10, 8)
        row_layout.setSpacing(10)

        btn = QPushButton(row)
        btn.setIcon(self._load_icon(icon_name))
        btn.setObjectName("trayIconButton")
        btn.setFixedSize(32, 32)
        btn.setIconSize(QSize(20, 20))
        btn.setFlat(True)
        btn.setToolTip(label)

        # effects
        if color:
            effect = QGraphicsColorizeEffect()
            effect.setColor(color)
            effect.setStrength(0.8)
            btn.setGraphicsEffect(effect)
        else:
            shadow = QGraphicsDropShadowEffect()
            shadow.setBlurRadius(8)
            shadow.setOffset(0, 2)
            shadow.setColor(QColor(0, 0, 0, 80))
            btn.setGraphicsEffect(shadow)

        def safe_callback() -> None:
            try:
                logging.debug(f"Icon button clicked: {label}")
                callback()
            except Exception as e:
                logging.exception(f"Error in {label} callback: {e}")

        btn.clicked.connect(safe_callback)

        # row click = same action
        row.clicked.connect(safe_callback)

        row_layout.addWidget(btn)

        label_widget = QLabel(label, row)
        label_widget.setObjectName("trayIconLabel")
        row_layout.addWidget(label_widget, 1)

        action.setDefaultWidget(row)
        return action

    def _project_row_action(self, goal_id: int, title: str, duration_min: int) -> QWidgetAction:
        """Create a project row with play button and project details."""

        action = QWidgetAction(self._menu)

        row = ClickableRow(self._menu)
        row.setObjectName("trayProjectRow")

        row_layout = QHBoxLayout(row)
        row_layout.setContentsMargins(10, 8, 10, 8)
        row_layout.setSpacing(10)

        start_btn = QPushButton(row)
        start_btn.setIcon(self._load_icon("play"))
        start_btn.setObjectName("trayStartButton")
        start_btn.setFixedSize(36, 36)
        start_btn.setIconSize(QSize(24, 24))
        start_btn.setFlat(True)
        start_btn.setToolTip("Start timer")

        shadow = QGraphicsDropShadowEffect()
        shadow.setBlurRadius(8)
        shadow.setOffset(0, 2)
        shadow.setColor(QColor(0, 0, 0, 80))
        start_btn.setGraphicsEffect(shadow)

        start_btn.clicked.connect(
            lambda _checked=False: self._start_timer(goal_id, duration_min)
        )

        row_layout.addWidget(start_btn)

        # ── details ────────────────────────────────
        details = QWidget(row)
        details_layout = QVBoxLayout(details)
        details_layout.setContentsMargins(0, 0, 0, 0)
        details_layout.setSpacing(2)

        name_label = QLabel(title or "Untitled", details)
        name_label.setObjectName("trayProjectName")
        details_layout.addWidget(name_label)

        hours = duration_min // 60
        minutes = duration_min % 60
        meta_label = QLabel(f"0h 00m / {hours}h {minutes:02d}m", details)
        meta_label.setObjectName("trayProjectMeta")
        details_layout.addWidget(meta_label)

        details.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)

        row_layout.addWidget(details, 1)
        row.setCursor(Qt.CursorShape.PointingHandCursor)

        def on_row_click() -> None:
            self._open_goal_detail(goal_id)

        row.clicked.connect(on_row_click)

        action.setDefaultWidget(row)
        return action
    def _start_timer(self, goal_id: int, duration_min: int) -> None:
        """Start a timer for the selected goal."""
        try:
            logger.debug(f"_start_timer called with goal_id={goal_id}, duration_min={duration_min}")
            if not self._events:
                logger.error("Events emitter is not available")
                return

            safe_duration = max(1, int(duration_min or 1))
            safe_goal_id = int(goal_id)

            logger.debug(f"Emitting timer:start event with goal_id={safe_goal_id}, duration_seconds={safe_duration * 60}")
            self._events.emit(
                "timer:start",
                {
                    "goal_id": safe_goal_id,
                    "duration_seconds": safe_duration * 60,
                },
            )
            self._events.emit(
                "timer:open_window",
                {
                    "goal_id": safe_goal_id,
                    "duration_seconds": safe_duration * 60,
                    "autostart": True,
                    "source": "tray",
                },
            )
        except Exception as e:
            logger.exception(f"Error starting timer: {e}")

    def _open_window(self) -> None:
        """Show and focus main window from tray."""
        if self._window.isMinimized():
            self._window.showNormal()
        self._window.show()
        self._window.raise_()
        self._window.activateWindow()

    def _quit_application(self) -> None:
        """Quit app explicitly from tray (bypasses hide-on-close behavior)."""
        if hasattr(self._window, "allow_exit"):
            self._window.allow_exit()
        self._app.quit()

    

    def _action(self, label: str, callback: Callable[[], None]) -> QAction:
        action = QAction(label, self._menu)
        action.triggered.connect(callback)
        return action

    def _open_goal_detail(self, goal_id: int) -> None:
        """Open goal detail view for the selected goal."""
        try:
            logger.debug(f"_open_goal_detail called with goal_id={goal_id}")
            self._open_window()
            if self._events:
                logger.debug(f"Emitting goal:open_detail event with goal_id={goal_id}")
                self._events.emit("goal:open_detail", {"goal_id": goal_id})
            else:
                logger.error("Events emitter is not available for goal:open_detail")
        except Exception as e:
            logger.exception(f"Error opening goal detail: {e}")
