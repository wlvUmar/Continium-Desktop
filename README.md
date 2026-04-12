<div align="center">

# Continium Desktop

**A Minimum Profitable Product (MPP) goal & time tracking desktop application**

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![PyQt6](https://img.shields.io/badge/PyQt6-6.7-41CD52?style=flat)](https://www.riverbankcomputing.com/software/pyqt/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=flat)](https://www.sqlalchemy.org)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

**[🌐 Web Version (MVP)](https://github.com/wlvUmar/Continium)** · [Roadmap](#roadmap) · [Getting Started](#quick-start)

</div>

---

## What it does

Continium Desktop is an offline-first goal and time tracking application. Create goals, log work sessions, and track progress over time — all locally on your computer. Supports one-time and repeating goals (daily, weekly, monthly), with time aggregation by goal, type, or custom date range.

---

## Features (Sprint 1 MVP)

**Core Functionality**
-  Goal CRUD with one-time and repeating types (daily, weekly, monthly)
-  Time tracking with session logging
-  Stats aggregation by goal, type, or date range
-  Local SQLite database 

**Desktop Integration** *(Sprint 2 MPP)*
- System tray application
- Taskbar preview with project list
- Quick timer start from taskbar
- On-screen overlay widget for active timer
- Pomodoro-style timer UI/UX
- Desktop notifications

**UI/UX**
- Zero-build Vanilla JS SPA (shared with web version)
- Responsive desktop-optimized layout
- Toast notifications

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Desktop Framework** | PyQt6 + WebEngine (Chromium) |
| **Backend** | Python SQLAlchemy |
| **Frontend** | Vanilla JavaScript, custom SPA router |
| **Database** | SQLite |
| **ORM** | SQLAlchemy 2.0 |
| **Build** | PyInstaller 6.19 → standalone EXE |

---

## Architecture

**Desktop (PyQt6) ↔ JavaScript Bridge ↔ Python Backend ↔ SQLAlchemy → SQLite**

```
src/
├── main.py                    # App entry point
├── core/                      # Desktop integration
│   ├── window.py             # Main PyQt6 window
│   ├── tray.py               # System tray icon
│   └── overlay.py            # On-screen timer widget
├── interface/                 # Shared frontend UI
│   ├── index.html
│   ├── css/
│   └── js/
│       ├── core/             # router, API wrapper
│       ├── pages/            # per-page modules
│       └── components/       # reusable UI components
├── models/                   # SQLAlchemy ORM
│   ├── user.py
│   ├── goal.py
│   └── stats.py
├── dal/                      # Data access layer
│   ├── user.py
│   ├── goal.py
│   └── stats.py
├── backend/                  # Core utilities
│   ├── core/
│   │   └── security.py
│   └── db/
│       ├── session.py
│       └── base.py
└── utils/
    └── bridge.py             # PyQt ↔ JS bridge
```

---

## Quick Start

### For Users

Download the latest **Continium-Setup.exe** from [Releases](../../releases) and run it.

Data is stored locally in: `%APPDATA%\Continium\continium.db`

### For Developers

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Run from source:**
```bash
python src/main.py
```

Runtime logs and tracebacks are written to `~/.continium/logs/continium.log`.
Frontend API calls run through the PyQt bridge. Auth endpoints are proxied to the configured remote API (`CONTINIUM_API_BASE_URL`), while goal/stat data is served from the local Python DAL.
If your HTTPS certificate does not match the endpoint host (for example, raw IP usage), set `CONTINIUM_AUTH_VERIFY_SSL=false` for development only.

**Build standalone EXE:**
```bash
python build.py --platform windows
```

Or manually with PyInstaller:
```bash
pyinstaller Continium.spec
```

Output: `dist/Continium-Setup.exe`

---

## CI/CD

GitHub Actions auto-builds on push to `main`/`dev` and on version tags (`v*`):

- **Windows:** Builds `Continium-Setup.exe` (NSIS installer)
- **macOS:** Builds `Continium.dmg` (DMG installer)
- **Auto-Release:** Uploads installers on `v*` tags

See `.github/workflows/build.yml`

---


## Relationship to Web Version

| Aspect | Desktop (MPP) | Web (MVP) |
|--------|---------------|----------|
| **Type** | Standalone desktop app | Cloud web app |
| **Database** | Local SQLite | Cloud SQLite + aiosqlite (async) |
| **Auth** | Local password lock | Email + JWT + refresh tokens |
| **Backend** | Python (sync) | FastAPI (async) |
| **Users** | Single user per install | Multi-user + teams |
| **Availability** | 100% offline | Online required |
| **Deployment** | Windows/macOS EXE | Cloud (DigitalOcean) |
| **UI** | **Shared** JavaScript code | **Shared** JavaScript code |


---

## Contributing

Contributions welcome! Follow the [web version's Contributing Guide](../Continium/docs/CONTRIBUTING.md) for code standards.

---

## License

Part of the Continium ecosystem.
