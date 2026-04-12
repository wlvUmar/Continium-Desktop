"""Runtime logging and exception handling helpers."""

from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
import sys
from typing import Any

from PyQt6 import QtCore

LOG_DIR = Path.home() / ".continium" / "logs"
LOG_FILE = LOG_DIR / "continium.log"


def configure_runtime_logging() -> logging.Logger:
    logger = logging.getLogger("continium")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    if not logger.handlers:
        formatter = logging.Formatter(
            "%(asctime)s %(levelname)s %(name)s: %(message)s"
        )
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)
        file_handler = RotatingFileHandler(LOG_FILE, maxBytes=1_048_576, backupCount=3)
        file_handler.setFormatter(formatter)
        logger.addHandler(stream_handler)
        logger.addHandler(file_handler)
        logging.captureWarnings(True)

    install_exception_hooks(logger)
    install_qt_message_handler(logger)
    return logger


def install_exception_hooks(logger: logging.Logger) -> None:
    def _excepthook(exc_type: type[BaseException], exc: BaseException, tb: Any) -> None:
        logger.exception("Unhandled exception", exc_info=(exc_type, exc, tb))
        sys.__excepthook__(exc_type, exc, tb)

    sys.excepthook = _excepthook


def install_qt_message_handler(logger: logging.Logger) -> None:
    def _handler(mode: QtCore.QtMsgType, context: QtCore.QMessageLogContext, message: str) -> None:
        level = _qt_level(mode)
        location = _qt_location(context)
        logger.log(level, "Qt%s%s", location, f": {message}" if message else "")

    QtCore.qInstallMessageHandler(_handler)


def _qt_level(mode: QtCore.QtMsgType) -> int:
    if mode == QtCore.QtMsgType.QtDebugMsg:
        return logging.DEBUG
    if mode == QtCore.QtMsgType.QtWarningMsg:
        return logging.WARNING
    if mode == QtCore.QtMsgType.QtCriticalMsg:
        return logging.ERROR
    if mode == QtCore.QtMsgType.QtFatalMsg:
        return logging.CRITICAL
    return logging.INFO


def _qt_location(context: QtCore.QMessageLogContext) -> str:
    parts = [part for part in (context.file, str(context.line) if context.line else "", context.function) if part]
    if not parts:
        return ""
    return f" ({' | '.join(parts)})"
