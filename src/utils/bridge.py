"""Python-JavaScript bridge for frontend-backend communication."""

from __future__ import annotations

import json
from typing import Any, Callable, Iterable

from PyQt6 import QtCore, QtWebChannel
from PyQt6.QtWebEngineWidgets import QWebEngineView

from services.event_emitter import EventEmitter

DEFAULT_FORWARD_EVENTS = (
    "app:ack",
    "timer:start",
    "timer:tick",
    "timer:pause",
    "timer:resume",
    "timer:complete",
    "session:start",
    "session:pause",
    "session:resume",
    "session:end",
    "notification:show",
)


class _BridgeApi(QtCore.QObject):
    event_received = QtCore.pyqtSignal(str, "QVariant")

    @QtCore.pyqtSlot(str, "QVariant")
    def emit(self, event: str, data: Any) -> None:
        self.event_received.emit(event, data)


class _DispatchProxy(QtCore.QObject):
    dispatch_requested = QtCore.pyqtSignal(str, dict)

    def __init__(self, web_view: QWebEngineView) -> None:
        super().__init__()
        self._web_view = web_view
        self.dispatch_requested.connect(self._dispatch)

    def dispatch(self, event: str, payload: dict[str, Any]) -> None:
        self.dispatch_requested.emit(event, payload)

    def _dispatch(self, event: str, payload: dict[str, Any]) -> None:
        script = _build_js_event(event, payload)
        self._web_view.page().runJavaScript(script)


class JSBridge:
    """Bidirectional event bridge between Python and JS."""

    def __init__(self, web_view: QWebEngineView, events: EventEmitter) -> None:
        self._events = events
        self._dispatcher = _DispatchProxy(web_view)
        self._channel = QtWebChannel.QWebChannel(web_view.page())
        self._api = _BridgeApi()
        self._api.event_received.connect(self._on_event_received)
        self._channel.registerObject("bridge", self._api)
        web_view.page().setWebChannel(self._channel)
        self.forward_events(DEFAULT_FORWARD_EVENTS)

    def forward_events(self, event_names: Iterable[str]) -> None:
        """Forward selected Python events to the JS runtime."""
        for event in event_names:
            self._events.on(event, self._make_forwarder(event))

    def _on_event_received(self, event: str, payload: Any) -> None:
        self._events.emit(event, _coerce_payload(payload))

    def _make_forwarder(self, event: str) -> Callable[[dict[str, Any]], None]:
        def _forward(payload: dict[str, Any]) -> None:
            self._dispatcher.dispatch(event, payload)

        return _forward


def _build_js_event(event: str, payload: dict[str, Any]) -> str:
    event_json = json.dumps(event)
    payload_json = json.dumps(payload or {})
    return f"window.dispatchEvent(new CustomEvent({event_json}, {{ detail: {payload_json} }}));"


def _coerce_payload(payload: Any) -> dict[str, Any]:
    if isinstance(payload, dict):
        return payload

    to_variant = getattr(payload, "toVariant", None)
    if callable(to_variant):
        variant = to_variant()
        if isinstance(variant, dict):
            return variant

    return {}

