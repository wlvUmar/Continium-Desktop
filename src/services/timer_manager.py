from __future__ import annotations

from dataclasses import dataclass
import threading
import time

from services.event_emitter import EventEmitter

TICK_INTERVAL_SEC = 0.1
DEFAULT_DURATION_MIN = 25
MIN_DURATION_MIN = 1
MAX_DURATION_MIN = 120
JOIN_TIMEOUT_SEC = 1


@dataclass
class TimerState:

    goal_id: int | None
    duration_seconds: int
    remaining_seconds: int
    is_running: bool
    is_paused: bool


class TimerManager:

    def __init__(self, events: EventEmitter) -> None:
        self._events = events
        self._lock = threading.Lock()
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._pause_event = threading.Event()
        self._reset_state()

    def start(self, goal_id: int, duration_minutes: int = DEFAULT_DURATION_MIN) -> bool:
        self._validate_duration(duration_minutes)
        if not self._arm_timer(goal_id, duration_minutes):
            return False
        self._events.emit("timer:start", self._payload())
        self._start_thread()
        return True

    def pause(self) -> bool:
        if not self._set_paused(True):
            return False
        self._events.emit("timer:pause", self._payload())
        return True

    def resume(self) -> bool:
        if not self._set_paused(False):
            return False
        self._events.emit("timer:resume", self._payload())
        return True

    def stop(self) -> None:
        if not self._mark_stopped():
            return
        self._stop_event.set()

    def reset(self, duration_minutes: int = DEFAULT_DURATION_MIN) -> None:
        self.stop()
        self._reset_duration(duration_minutes)

    def shutdown(self) -> None:
        self.stop()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=JOIN_TIMEOUT_SEC)

    def get_state(self) -> TimerState:
        with self._lock:
            return TimerState(
                goal_id=self._goal_id,
                duration_seconds=self._duration_seconds,
                remaining_seconds=self._remaining_seconds,
                is_running=self._is_running,
                is_paused=self._is_paused,
            )

    def _reset_state(self) -> None:
        self._goal_id = None
        self._duration_seconds = DEFAULT_DURATION_MIN * 60
        self._remaining_seconds = self._duration_seconds
        self._is_running = False
        self._is_paused = False

    def _reset_duration(self, duration_minutes: int) -> None:
        self._validate_duration(duration_minutes)
        with self._lock:
            self._duration_seconds = duration_minutes * 60
            self._remaining_seconds = self._duration_seconds
            self._goal_id = None
            self._is_running = False
            self._is_paused = False

    def _validate_duration(self, duration_minutes: int) -> None:
        if not MIN_DURATION_MIN <= duration_minutes <= MAX_DURATION_MIN:
            raise ValueError(
                f"Duration must be {MIN_DURATION_MIN}-{MAX_DURATION_MIN}, got {duration_minutes}"
            )

    def _arm_timer(self, goal_id: int, duration_minutes: int) -> bool:
        with self._lock:
            if self._is_running:
                return False
            self._goal_id = goal_id
            self._duration_seconds = duration_minutes * 60
            self._remaining_seconds = self._duration_seconds
            self._is_running = True
            self._is_paused = False
            self._stop_event.clear()
            self._pause_event.clear()
            return True

    def _set_paused(self, paused: bool) -> bool:
        with self._lock:
            if not self._is_running or self._is_paused == paused:
                return False
            self._is_paused = paused
            if paused:
                self._pause_event.set()
            else:
                self._pause_event.clear()
            return True

    def _mark_stopped(self) -> bool:
        with self._lock:
            if not self._is_running:
                return False
            self._is_running = False
            self._is_paused = False
            return True

    def _start_thread(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            time.sleep(TICK_INTERVAL_SEC)
            if self._pause_event.is_set():
                continue
            if self._tick_once():
                return

    def _tick_once(self) -> bool:
        remaining = self._decrement()
        self._events.emit("timer:tick", self._payload())
        if remaining <= 0:
            self._complete()
            return True
        return False

    def _decrement(self) -> int:
        with self._lock:
            if not self._is_running:
                return self._remaining_seconds
            self._remaining_seconds = max(0, self._remaining_seconds - TICK_INTERVAL_SEC)
            return int(self._remaining_seconds)

    def _complete(self) -> None:
        self._mark_stopped()
        self._stop_event.set()
        self._events.emit("timer:complete", self._payload())

    def _payload(self) -> dict[str, object]:
        with self._lock:
            return {
                "goal_id": self._goal_id,
                "duration_seconds": int(self._duration_seconds),
                "remaining_seconds": int(self._remaining_seconds),
                "elapsed_seconds": int(self._duration_seconds - self._remaining_seconds),
                "is_running": self._is_running,
                "is_paused": self._is_paused,
            }
