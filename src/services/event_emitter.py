from __future__ import annotations

from collections import defaultdict
from typing import Any, Callable
import threading

EventHandler = Callable[[dict[str, Any]], None]


class EventEmitter:

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._handlers: dict[str, list[EventHandler]] = defaultdict(list)

    def on(self, event: str, handler: EventHandler) -> None:
        with self._lock:
            self._handlers[event].append(handler)

    def off(self, event: str, handler: EventHandler) -> None:
        with self._lock:
            if handler in self._handlers.get(event, []):
                self._handlers[event].remove(handler)

    def emit(self, event: str, payload: dict[str, Any]) -> None:
        handlers = self._get_handlers(event)
        for handler in handlers:
            handler(payload)

    def _get_handlers(self, event: str) -> list[EventHandler]:
        with self._lock:
            return list(self._handlers.get(event, []))
