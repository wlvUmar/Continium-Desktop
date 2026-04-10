"""Pomodoro session orchestration."""

from __future__ import annotations

from dataclasses import dataclass
import threading

from services.event_emitter import EventEmitter
from services.timer_manager import TimerManager, MIN_DURATION_MIN, MAX_DURATION_MIN

DEFAULT_WORK_MIN = 25
DEFAULT_BREAK_MIN = 5
BREAK_GOAL_ID = 0


@dataclass
class PomodoroState:
    """Current Pomodoro session state."""

    is_active: bool
    phase: str
    goal_id: int | None
    cycle: int


class PomodoroManager:
    """Controls Pomodoro work/break sequencing."""

    def __init__(self, timer: TimerManager, events: EventEmitter) -> None:
        self._timer = timer
        self._events = events
        self._lock = threading.Lock()
        self._state = PomodoroState(False, "idle", None, 0)
        self._work_minutes = DEFAULT_WORK_MIN
        self._break_minutes = DEFAULT_BREAK_MIN
        self._events.on("timer:complete", self._handle_complete)

    def start(self, goal_id: int, work_minutes: int = DEFAULT_WORK_MIN) -> bool:
        """Start a new Pomodoro work session."""
        self._validate_duration(work_minutes)
        with self._lock:
            if self._state.is_active:
                return False
            self._state = PomodoroState(True, "work", goal_id, self._state.cycle)
            self._work_minutes = work_minutes
        started = self._timer.start(goal_id, work_minutes)
        if started:
            self._events.emit("pomodoro:start", {"goal_id": goal_id})
        return started

    def stop(self) -> None:
        """Stop the active Pomodoro session."""
        with self._lock:
            self._state = PomodoroState(False, "idle", None, self._state.cycle)
        self._timer.stop()

    def get_state(self) -> PomodoroState:
        """Return a snapshot of Pomodoro state."""
        with self._lock:
            return PomodoroState(
                is_active=self._state.is_active,
                phase=self._state.phase,
                goal_id=self._state.goal_id,
                cycle=self._state.cycle,
            )

    def _handle_complete(self, payload: dict[str, object]) -> None:
        if not self._is_active():
            return
        if self._is_work_phase():
            self._start_break()
            return
        self._finish_cycle()

    def _is_active(self) -> bool:
        with self._lock:
            return self._state.is_active

    def _is_work_phase(self) -> bool:
        with self._lock:
            return self._state.phase == "work"

    def _start_break(self) -> None:
        with self._lock:
            self._state = PomodoroState(True, "break", None, self._state.cycle)
        self._timer.start(goal_id=BREAK_GOAL_ID, duration_minutes=self._break_minutes)
        self._events.emit("pomodoro:break", {"duration_minutes": self._break_minutes})

    def _finish_cycle(self) -> None:
        with self._lock:
            cycle = self._state.cycle + 1
            self._state = PomodoroState(False, "idle", None, cycle)
        self._events.emit("pomodoro:complete", {"cycle": cycle})

    def _validate_duration(self, duration_minutes: int) -> None:
        if not MIN_DURATION_MIN <= duration_minutes <= MAX_DURATION_MIN:
            raise ValueError(
                f"Duration must be {MIN_DURATION_MIN}-{MAX_DURATION_MIN}, got {duration_minutes}"
            )
