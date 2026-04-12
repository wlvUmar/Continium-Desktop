# Technical Document — Continium Desktop

**Project:** Continium Desktop — Goal & Time Tracking Desktop Application  
**Version:** 2.0 (Sprint 2)  
**Author:** Team  
**Date:** 2026-04-09

---

## 1. Tech Stack

### Backend (Python)

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Language** | Python | 3.12+ | Core logic, services, data layer |
| **Desktop Framework** | PyQt6 | 6.7+ | Window management, tray, overlay |
| **ORM** | SQLAlchemy | 2.0+ | Database models (sync, not async) |
| **Database** | SQLite | 3.46+ | Local data storage |
| **Password Hashing** | bcrypt | 4.1+ | Secure password storage |
| **Threading** | stdlib `threading` | builtin | Background timer loop |
| **Packaging** | PyInstaller | 6.0+ | .exe/.dmg/.deb build |
| **Testing** | pytest | 7.4+ | Unit & integration tests |
| **Linting** | pylint, black | latest | Code quality |

### Frontend (Shared with Web)

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Language** | Vanilla JavaScript ES6+ | No frameworks, no build step |
| **Styling** | Plain CSS3 | No SCSS/Less |
| **Routing** | Custom hash-based | src/interface/js/core/router.js |
| **State** | Redux-like store | src/interface/js/core/store.js |
| **HTTP** | Fetch API | Python bridge wrapper in api.js |
| **Charts** | Chart.js | For statistics visualization |

### Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **CI/CD** | GitHub Actions | Build, test, create installers |
| **Package Distribution** | GitHub Releases | Distribute .exe, .dmg |
| **Version Control** | Git + GitHub | Source management |
| **Build Script** | Python `build.py` | Local developer builds |

---

## 2. Directory Structure

```
Continium-Desktop/
│
├── src/                                 # Main application source
│   ├── main.py                         # Entry point (QApplication init)
│   │
│   ├── core/                           # Desktop-specific features
│   │   ├── tray.py                    # System tray integration
│   │   ├── overlay.py                 # Floating timer widget
│   │   ├── main_window.py             # PyQt6 WebEngine container
│   │   └── __init__.py
│   │
│   ├── services/                       # Business logic (stateless)
│   │   ├── timer_manager.py           # Timer control + background thread
│   │   ├── pomodoro_manager.py        # 25/5 cycle logic
│   │   ├── notifications.py           # OS notifications (cross-platform)
│   │   ├── session_manager.py         # User session + password
│   │   └── __init__.py
│   │
│   ├── models/                         # Database ORM models
│   │   ├── user.py                    # User model (single user)
│   │   ├── goal.py                    # Goal model (title, frequency, etc.)
│   │   ├── stats.py                   # Time log model
│   │   ├── base.py                    # SQLAlchemy Base
│   │   └── __init__.py
│   │
│   ├── dal/                            # Data Access Layer
│   │   ├── user.py                    # User queries (login, password)
│   │   ├── goal.py                    # Goal CRUD + filtering
│   │   ├── stats.py                   # Stats logging + aggregation
│   │   └── __init__.py
│   │
│   ├── dal/                            # Data Access Layer + Session
│   │   ├── session.py                 # Sync SQLAlchemy engine & SessionLocal
│   │   ├── base.py                    # DeclarativeBase for models
│   │   ├── user.py                    # User queries (login, password)
│   │   ├── goal.py                    # Goal CRUD + filtering
│   │   ├── stats.py                   # Stats logging + aggregation
│   │   └── __init__.py
│   │
│   ├── utils/                          # Utilities
│   │   ├── bridge.py                  # Python-JS communication
│   │   └── __init__.py
│   │
│   └── interface/                      # Frontend (shared with web)
│       ├── index.html                 # Single-page app entry
│       ├── js/
│       │   ├── core/
│       │   │   ├── api.js            # Bridge wrapper + fetch
│       │   │   ├── router.js         # Hash-based routing
│       │   │   ├── store.js          # Redux-like state
│       │   │   └── route-protection.js
│       │   ├── pages/
│       │   │   ├── goals.js          # Goals list page
│       │   │   ├── goal-detail.js    # Single goal + timer start
│       │   │   ├── statistics.js     # Stats dashboard
│       │   │   ├── settings.js       # User settings
│       │   │   └── auth/             # Login page
│       │   ├── components/
│       │   │   ├── timer-widget.js   # Timer display
│       │   │   ├── layout.js         # Navbar
│       │   │   ├── toast.js          # Notifications
│       │   │   └── spinner.js        # Loading indicator
│       │   └── services/
│       │       └── auth.service.js   # Password management
│       ├── css/
│       │   ├── main.css
│       │   ├── responsive.css        # Desktop-optimized
│       │   └── timer.css
│       └── assets/
│           ├── icons/
│           ├── images/
│           └── fonts/
│
├── tests/                              # Test suite
│   ├── conftest.py                    # pytest fixtures
│   ├── test_timer_manager.py
│   ├── test_models.py
│   ├── test_dal.py
│   ├── integration/
│   │   └── test_full_flow.py
│   └── __init__.py
│
├── installer/                          # Installer scripts
│   └── windows/
│       └── installer.nsi              # NSIS script
│
├── docs/                               # Documentation
│   ├── ARCHITECTURE.md
│   ├── REQUIREMENTS.md
│   ├── TECHNICAL.md
│   └── CONTRIBUTING.md
│
├── resources/                          # App resources
│   └── icon.ico / icon.png            # App icon
│
├── build.py                            # PyInstaller build script
├── Continium.spec                      # PyInstaller spec file
├── requirements.txt                    # Python dependencies
├── pytest.ini                          # Pytest configuration
├── .gitignore
├── README.md
├── LICENSE
└── .github/
    └── workflows/
        └── build.yml                   # CI/CD workflow
```

---

## 3. Database Schema

### SQLite Tables

#### `users`
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt, cost=12
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_email ON users(email);
```

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK | Auto-increment |
| `full_name` | VARCHAR(200) | NOT NULL | User's name |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Unique per app instance |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt(password, cost=12) |
| `created_at` | DATETIME | DEFAULT now() | Account creation time |

#### `goals`
```sql
CREATE TABLE goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- "OneTime" or "Repeating"
    start_date DATE NOT NULL,
    deadline DATE NOT NULL,
    frequency VARCHAR(50),  -- "daily", "weekly", "monthly"
    duration_min INTEGER DEFAULT 25,
    is_complete BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_is_complete ON goals(is_complete);
```

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK | Auto-increment |
| `user_id` | INTEGER | FK, NOT NULL | Goal owner |
| `title` | VARCHAR(200) | NOT NULL | Goal name |
| `type` | VARCHAR(50) | NOT NULL | "OneTime" or "Repeating" |
| `start_date` | DATE | NOT NULL | When goal starts |
| `deadline` | DATE | NOT NULL | Target completion date |
| `frequency` | VARCHAR(50) | NULLABLE | "daily"/"weekly"/"monthly" |
| `duration_min` | INTEGER | DEFAULT 25 | Target time per session (minutes) |
| `is_complete` | BOOLEAN | DEFAULT FALSE | Completion flag |
| `created_at` | DATETIME | DEFAULT now() | Creation timestamp |

#### `stats`
```sql
CREATE TABLE stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INTEGER NOT NULL,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_stats_goal_id ON stats(goal_id);
CREATE INDEX idx_stats_user_id ON stats(user_id);
CREATE INDEX idx_stats_occurred_at ON stats(occurred_at);
```

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK | Auto-increment |
| `goal_id` | INTEGER | FK, NOT NULL | Which goal was worked on |
| `user_id` | INTEGER | FK, NOT NULL | Which user logged |
| `occurred_at` | DATETIME | DEFAULT now() | When time was logged |
| `duration_minutes` | INTEGER | NOT NULL | Minutes logged (≥0) |

### Relationships

```
users 1 ──< goals (one user has many goals)
users 1 ──< stats (one user has many stat records)
goals 1 ──< stats (one goal has many stat records)
```

**Cascade:** Deleting a user cascades delete to goals and stats.

---

## 4. Configuration & Environment

### Runtime Configuration

```python
# src/utils/config.py (optional, can use os.getenv directly)

import os
from pathlib import Path

# Paths
APP_ROOT = Path(__file__).parent.parent.parent
DB_PATH = APP_ROOT / "app.db"
RESOURCES_PATH = APP_ROOT / "resources"

# Database
DATABASE_URL = f"sqlite:///{DB_PATH}"

# App behavior
WINDOW_WIDTH = 1024
WINDOW_HEIGHT = 768
TIMER_DEFAULT_MINUTES = 25
TIMER_TICK_MS = 100  # Tick every 100ms
OVERLAY_OPACITY = 0.95
NOTIFICATION_TIMEOUT_MS = 5000

# Feature flags
TRAY_ENABLED = True
OVERLAY_ENABLED = True
NOTIFICATIONS_ENABLED = True
DARK_MODE_ENABLED = False

# Security
MAX_LOGIN_ATTEMPTS = 5
SESSION_TIMEOUT_MINUTES = 0  # 0 = no timeout (local app)
```

### Environment Variables (Optional for Advanced Users)

```bash
# .env (not committed, for local testing)
DATABASE_URL=sqlite:///./app.db
DEBUG=False
LOG_LEVEL=INFO
```

---

## 5. API Reference (Python-JavaScript Bridge)

### Event Format

Python emits events to the frontend using **CustomEvent** with a `detail` payload. The frontend sends events to Python via the QWebChannel object named `bridge` using `bridge.emit(event, data)`.

```javascript
// JavaScript: Initialize QWebChannel once
new QWebChannel(qt.webChannelTransport, (channel) => {
    window.bridge = channel.objects.bridge;
});

// JavaScript: Listen for event
window.addEventListener('timer:tick', (e) => {
    const { remaining_seconds } = e.detail;
    console.log(`Time left: ${remaining_seconds}s`);
});

// JavaScript: Emit to Python
window.bridge.emit('timer:start', { goal_id: 5, duration_minutes: 25 });
```

```python
# Python: Listen for event
def on_timer_start(event_data):
    goal_id = event_data["goal_id"]
    duration_minutes = event_data["duration_minutes"]
    timer.start(goal_id, duration_minutes)

events.on("timer:start", on_timer_start)

# Python: Emit to JavaScript
events.emit("timer:tick", {
    "remaining_seconds": 1499,
    "duration_seconds": 1500,
    "goal_id": 5,
    "is_running": True,
    "is_paused": False,
})
```

### Event Catalog

#### Timer Events

| Event | Direction | Payload | Notes |
|-------|-----------|---------|-------|
| `timer:start` | JS → Py | `{goal_id, duration_minutes}` | User clicks "Start" |
| `timer:tick` | Py → JS | `{remaining_seconds, duration_seconds, goal_id, is_running, is_paused}` | Every 100ms |
| `timer:pause` | JS → Py | `{}` | User pauses |
| `timer:resume` | JS → Py | `{}` | User resumes |
| `timer:reset` | JS → Py | `{}` | Abort current session |
| `timer:complete` | Py → JS | `{goal_id, duration_minutes, timestamp}` | Timer finished |

#### Goal Events

| Event | Direction | Payload | Notes |
|-------|-----------|---------|-------|
| `goal:create` | JS → Py | `{title, type, start_date, ...}` | New goal form |
| `goal:update` | JS → Py | `{goal_id, ...fields}` | Edit form |
| `goal:delete` | JS → Py | `{goal_id}` | Confirm delete |
| `goal:list` | Py → JS | `[{id, title, ...}]` | Refresh list |

#### Stats Events

| Event | Direction | Payload | Notes |
|-------|-----------|---------|-------|
| `stats:log` | JS → Py | `{goal_id, duration_minutes, occurred_at}` | Manual entry |
| `stats:updated` | Py → JS | `[{goal_id, total_minutes, ...}]` | Refresh dashboard |

#### Notification Events

| Event | Direction | Payload | Notes |
|-------|-----------|---------|-------|
| `notification:show` | Py → JS | `{title, body, icon, timeout_ms}` | Show toast |
| `notification:os` | Py → local | Native OS API | Desktop notification |

---

## 6. Key Algorithms

### 6.1 Timer Loop (Background Thread)

```python
# services/timer_manager.py

class TimerManager:
    def _tick_loop(self):
        """Background thread: tick every 100ms until timer complete."""
        start_time = time.time()
        
        while self._is_running:
            elapsed = time.time() - start_time
            remaining = self._duration - elapsed
            
            # Emit to UI every tick
            self._bridge.emit('timer:tick', {
                'remaining_seconds': max(0, remaining),
                'elapsed_seconds': elapsed,
                'goal_id': self._goal_id
            })
            
            # Check if complete
            if remaining <= 0:
                self._is_running = False
                self._on_complete()
                break
            
            # Sleep 100ms (non-blocking)
            time.sleep(0.1)
    
    def _on_complete(self):
        """Called when timer reaches zero."""
        # Log stats to database
        self._dal.stats.log_time(
            goal_id=self._goal_id,
            duration_minutes=self._duration / 60,
            occurred_at=datetime.now()
        )
        
        # Show notification
        self._notifier.show(
            title="Timer Complete!",
            message=f"Logged {self._duration / 60:.0f}min to goal #{self._goal_id}"
        )
        
        # Emit to UI
        self._bridge.emit('timer:complete', {
            'goal_id': self._goal_id,
            'duration_minutes': self._duration / 60
        })
```

### 6.2 Pomodoro Cycle Manager

```python
# services/pomodoro_manager.py

class PomodoroManager:
    def __init__(self, work_minutes=25, break_short=5, break_long=15):
        self.work_duration = work_minutes * 60
        self.break_short_duration = break_short * 60
        self.break_long_duration = break_long * 60
        self.session_count = 0
        self.current_state = "idle"  # idle, working, break
    
    def start_work_session(self, goal_id: int) -> int:
        """Start a 25-minute work session."""
        self.session_count += 1
        self.current_state = "working"
        return self.work_duration
    
    def end_work_session(self) -> dict:
        """Return next break duration."""
        self.current_state = "break"
        
        if self.session_count % 4 == 0:
            # Long break after 4 cycles
            duration = self.break_long_duration
            description = "Long break (15 min)"
        else:
            # Short break
            duration = self.break_short_duration
            description = "Short break (5 min)"
        
        return {
            'state': 'break',
            'duration_seconds': duration,
            'description': description,
            'cycle_number': self.session_count
        }
    
    def end_break(self) -> dict:
        """Ready for next work session?"""
        return {
            'state': 'ready',
            'cycle_number': self.session_count,
            'message': "Start next work session?"
        }
```

### 6.3 Daily Aggregation Query

```python
# dal/stats.py

class StatsDAL:
    def log_time(self, goal_id: int, duration_minutes: int):
        """
        Log time for a goal.
        
        If a record exists for today, ADD to it.
        Otherwise, CREATE a new record.
        """
        today = datetime.now().date()
        
        existing = self.db.query(Stats).filter(
            Stats.goal_id == goal_id,
            func.date(Stats.occurred_at) == today
        ).first()
        
        if existing:
            # Aggregate: add to today's total
            existing.duration_minutes += duration_minutes
        else:
            # New record
            new_stat = Stats(
                goal_id=goal_id,
                user_id=self.current_user.id,
                duration_minutes=duration_minutes,
                occurred_at=datetime.now()
            )
            self.db.add(new_stat)
        
        self.db.commit()

    def get_weekly_summary(self, start_date: date) -> dict:
        """Sum time per goal for a week."""
        end_date = start_date + timedelta(days=7)
        
        results = self.db.query(
            Goals.title,
            func.sum(Stats.duration_minutes).label('total_minutes')
        ).join(Stats).filter(
            Stats.user_id == self.current_user.id,
            Stats.occurred_at >= start_date,
            Stats.occurred_at < end_date
        ).group_by(Goals.id).all()
        
        return {row.title: row.total_minutes for row in results}
```

---

## 7. Python-JavaScript Communication (Detailed)

### Using PyQt6 WebChannel

The app uses **PyQt6's WebChannel** to enable bidirectional communication between Python and JavaScript via a single bridge object named `bridge`.

**Setup (Python):**

```python
# src/main.py

from services import EventEmitter
from utils.bridge import JSBridge

events = EventEmitter()
bridge = JSBridge(self._window.web_view, events)
```

**Setup (JavaScript):**

```javascript
// src/interface/index.html

<script src="qwebchannel.js"></script>
<script>
    new QWebChannel(qt.webChannelTransport, (channel) => {
        window.bridge = channel.objects.bridge;

        // Send events to Python
        window.bridge.emit('timer:start', { goal_id: 5, duration_minutes: 25 });

        // Receive events from Python
        window.addEventListener('timer:tick', (e) => {
            console.log('Tick:', e.detail.remaining_seconds);
        });
    });
</script>
```

---

## 8. Building & Distribution

### Local Development Build

```bash
cd Continium-Desktop

# Install dependencies
pip install -r requirements.txt

# Run app
python src/main.py
```

### PyInstaller Build (Developer)

```bash
# Windows
python build.py --windows

# macOS
python build.py --macos

# Produces: dist/Continium-Setup.exe or dist/Continium.dmg
```

### CI/CD Build (GitHub Actions)

See `.github/workflows/build.yml`:

1. **Trigger:** Every push to `main`/`dev`
2. **Windows:** Run PyInstaller → Create NSIS installer → Upload .exe
3. **macOS:** Run PyInstaller → Create .dmg → Upload .dmg
4. **Artifacts:** Available in GitHub Actions "Artifacts" tab

---

## 9. Security Implementation

| Area | Implementation |
|------|----------------|
| **Password Hashing** | bcrypt (cost=12, ~100ms per hash) |
| **Session** | In-memory token cleared on logout |
| **Database Access** | Bound parameters (no SQL injection) |
| **User Isolation** | Single-user app; no cross-user access possible |
| **File Permissions** | SQLite file readable by app user only |
| **Secrets** | No API keys or credentials in code |
| **Logging** | No passwords/tokens logged |
| **Binary Signing** | Windows: Authenticode cert (future), macOS: codesign (future) |

---

## 10. Performance Notes

### Profiling

```bash
# Profile with cProfile
python -m cProfile -o stats.prof src/main.py

# View results
python -m pstats stats.prof
```

### Optimization Targets

1. **App Startup:** < 2 seconds
   - Lazy-load UI components
   - Index database efficiently
   - Cache frequently-used queries

2. **Timer Accuracy:** ±100ms per minute
   - Use `time.time()` not `datetime.now()` (higher resolution)
   - Avoid blocking operations in timer loop
   - Run timer in background thread

3. **Database Performance:** < 50ms for 95th percentile
   - Add indexes on `user_id`, `goal_id`, `occurred_at`
   - Use batch inserts where possible
   - Profile slow queries with `EXPLAIN QUERY PLAN`

---

## 11. Deployment Checklist

Before release:

- [ ] All tests passing (pytest)
- [ ] Coverage ≥ 80% (coverage.py report)
- [ ] Code linted (pylint, black)
- [ ] No TODO/FIXME in production code
- [ ] Version bumped in `README.md`, `build.py`
- [ ] CHANGELOG entry written
- [ ] Installers built successfully
- [ ] Smoke test on target OS (Windows 10/11, macOS 12+)
- [ ] Security audit complete (no hardcoded secrets)
- [ ] Git tag created (e.g., `v2.0.0`)

```bash
# Tag release
git tag -a v2.0.0 -m "Sprint 2: Tray, timer, overlay, notifications"
git push origin main --tags
```

---

## 12. Troubleshooting

### App Won't Start

```bash
# Check Python version
python --version  # Should be 3.12+

# Check dependencies
pip install -r requirements.txt

# Run with verbose output
python -u src/main.py
```

### Timer Inaccurate

- [ ] Check system CPU usage (may be throttling thread)
- [ ] Verify no GUI freezes during ticks
- [ ] Profile with cProfile to find hot paths

### Database Locked

```bash
# If app crashes, SQLite may leave lock file
rm app.db-shm
rm app.db-wal
```

### Installer Won't Build

```bash
# Rebuild spec file
pyinstaller --onefile --windowed \
    --icon=resources/icon.ico \
    --add-data="src/interface:interface" \
    src/main.py
```

