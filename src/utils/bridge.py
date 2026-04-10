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
    event_received = QtCore.pyqtSignal(str, dict)

    @QtCore.pyqtSlot(str, "QVariant")
    def emit(self, event: str, data: object) -> None:
        payload = _normalize_payload(data)
        self.event_received.emit(event, payload)


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

    def _on_event_received(self, event: str, payload: dict[str, Any]) -> None:
        self._events.emit(event, payload)

    def _make_forwarder(self, event: str) -> Callable[[dict[str, Any]], None]:
        def _forward(payload: dict[str, Any]) -> None:
            self._dispatcher.dispatch(event, payload)

        return _forward


def _build_js_event(event: str, payload: dict[str, Any]) -> str:
    event_json = json.dumps(event)
    payload_json = json.dumps(payload or {})
    return f"window.dispatchEvent(new CustomEvent({event_json}, {{ detail: {payload_json} }}));"


def _normalize_payload(payload: object) -> dict[str, Any]:
    if payload is None:
        return {}
    if isinstance(payload, dict):
        return payload
    if isinstance(payload, QtCore.QJsonValue):
        return _json_object_to_dict(payload.toObject())
    if isinstance(payload, QtCore.QJsonObject):
        return _json_object_to_dict(payload)
    if hasattr(payload, "toVariantMap"):
        return dict(payload.toVariantMap())
    raise TypeError(f"Unsupported payload type: {type(payload)}")


def _json_object_to_dict(obj: QtCore.QJsonObject) -> dict[str, Any]:
    if hasattr(obj, "toVariantMap"):
        return dict(obj.toVariantMap())
    return {}

