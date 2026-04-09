<div align="center">

# Continium Desktop

**A Minimum Profitable Product (MPP) goal & time tracking desktop application**

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![PyQt6](https://img.shields.io/badge/PyQt6-6.7-41CD52?style=flat)](https://www.riverbankcomputing.com/software/pyqt/)
[![SQLite](https://img.shields.io/badge/SQLite-Local-003B57?style=flat&logo=sqlite&logoColor=white)](https://sqlite.org)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=flat)](https://www.sqlalchemy.org)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![PyInstaller](https://img.shields.io/badge/PyInstaller-Standalone%20EXE-4B4B7A?style=flat)](https://pyinstaller.org)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?style=flat&logo=githubactions&logoColor=white)](https://github.com/features/actions)

**[🌐 Web Version (MVP)](../Continium)** · [Roadmap](#roadmap) · [Getting Started](#quick-start)

</div>

---

## What it does

Continium Desktop is an offline-first goal and time tracking application. Create goals, log work sessions, and track progress over time — all locally on your computer. Supports one-time and repeating goals (daily, weekly, monthly), with time aggregation by goal, type, or custom date range.

---

## Features (Sprint 1 ✅)

**Core Functionality**
- ✅ Goal CRUD with one-time and repeating types (daily, weekly, monthly)
- ✅ Time tracking with session logging
- ✅ Stats aggregation by goal, type, or date range
- ✅ Local SQLite database (100% offline)

**Desktop Integration** *(Sprint 2 🚀)*
- System tray application
- Taskbar preview with project list
- Quick timer start from taskbar
- On-screen overlay widget for active timer
- Pomodoro-style timer UI/UX
- Desktop notifications

**UI/UX**
- Zero-build Vanilla JS SPA (shared with web version)
- Hash-based routing
- Responsive desktop-optimized layout
- Toast notifications

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Desktop Framework** | PyQt6 + WebEngine (Chromium) |
| **Backend** | Python 3.11, synchronous SQLAlchemy |
| **Frontend** | Vanilla JavaScript (ES6+), custom SPA router |
| **Database** | SQLite (local, sync) |
| **ORM** | SQLAlchemy 2.0 |
| **Build** | PyInstaller 6.19 → standalone EXE |
| **CI/CD** | GitHub Actions (auto-build for Windows & macOS) |

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

GitHub Actions auto-builds on push to main/develop and on version tags (`v*`):

- **Windows:** Builds `Continium-Setup.exe` (NSIS installer)
- **macOS:** Builds `Continium.dmg` (DMG installer)
- **Auto-Release:** Uploads installers on `v*` tags

See `.github/workflows/build.yml`

---

## Roadmap

### Sprint 1 ✅
- [x] Project structure & setup
- [x] Database models (User, Goal, Stats)
- [x] DAL (CRUD operations)
- [x] Basic UI (shared with web)
- [x] CI/CD pipelines

### Sprint 2 🚀 (Current)
- [ ] System tray integration
- [ ] Taskbar preview (project list + timer start)
- [ ] On-screen overlay widget
- [ ] Pomodoro timer (25min + breaks)
- [ ] Desktop notifications
- [ ] UI responsiveness for desktop

### Sprint 3+
- [ ] Goal templates
- [ ] Analytics dashboard
- [ ] Custom timer durations
- [ ] Cloud sync (optional)
- [ ] Multi-language support

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

**Frontend code is identical** — both versions use the same HTML/CSS/JavaScript UI codebase.

👉 **[See Continium Web](../Continium)** for the full-featured cloud version.

---

## Contributing

Contributions welcome! Follow the [web version's Contributing Guide](../Continium/docs/CONTRIBUTING.md) for code standards.

---

## License

Part of the Continium ecosystem.
