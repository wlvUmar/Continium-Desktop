"""Filesystem helpers for bundled assets and writable application data."""

from __future__ import annotations

import os
import platform
from pathlib import Path

APP_NAME = "Continium"


def project_root() -> Path:
    """Return the repository root or bundled app root."""
    return Path(__file__).resolve().parents[2]


def interface_dir() -> Path:
    """Return the packaged HTML interface directory."""
    return project_root() / "interface"


def resource_dir() -> Path:
    """Return the packaged static resource directory."""
    return project_root() / "resources"


def app_data_root() -> Path:
    """Return the base directory for per-user application data."""
    system = platform.system().lower()
    if system == "windows":
        base = os.getenv("LOCALAPPDATA")
        if base:
            return Path(base)
        return Path.home() / "AppData" / "Local"
    if system == "darwin":
        return Path.home() / "Library" / "Application Support"
    xdg_data_home = os.getenv("XDG_DATA_HOME")
    if xdg_data_home:
        return Path(xdg_data_home)
    return Path.home() / ".local" / "share"


def app_data_dir() -> Path:
    """Return the per-user application data directory."""
    return app_data_root() / APP_NAME


def database_path() -> Path:
    """Return the SQLite database file path."""
    return app_data_dir() / "app.db"


def log_dir() -> Path:
    """Return the log directory path."""
    return app_data_dir() / "logs"


def log_file() -> Path:
    """Return the primary runtime log file path."""
    return log_dir() / "continium.log"

