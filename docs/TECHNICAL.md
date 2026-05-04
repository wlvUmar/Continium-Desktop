# Continium Desktop — Technical Reference (Code-Aligned)

**Project:** Continium Desktop  
**Scope:** Current implementation in this repository  
**Last aligned:** 2026-05-04

---

## 1. Purpose

This document captures the **implemented technical behavior** of Continium Desktop: runtime composition, bridge contract, local API surface, data schema, storage paths, and build/test commands that match the code under `src\`.

---

## 2. Technology stack

### 2.1 Runtime

| Layer | Technology | Notes |
|---|---|---|
| Desktop shell | PyQt6 + Qt WebEngine | Main window, tray, overlay, focus window |
| Backend | Python 3.12+ | App orchestration + service layer |
| DB/ORM | SQLite + SQLAlchemy 2.0 | Sync engine (`SessionLocal`) |
| Frontend | Vanilla JS + CSS | Hash-based SPA in embedded web view |
| Bridge | Qt WebChannel | `window.bridge.request` + `window.bridge.emit` |

### 2.2 Python dependencies (`requirements.txt`)

| Package | Version |
|---|---|
| PyQt6 | 6.11.0 |
| PyQt6-WebEngine | 6.11.0 |
| SQLAlchemy | 2.0.49 |
| requests | 2.33.1 |
| pyinstaller | 6.19.0 |

---

## 3. Source layout (actual)

```text
src/
├── main.py
├── core/
│   ├── window.py
│   ├── timer_window.py
│   ├── tray.py
│   └── overlay.py
├── services/
│   ├── event_emitter.py
│   ├── local_api.py
│   ├── remote_auth_api.py
│   ├── session_manager.py
│   ├── timer_manager.py
│   ├── pomodoro_manager.py
│   └── notifications.py
├── dal/
│   ├── base.py
│   ├── session.py
│   ├── user.py
│   ├── goal.py
│   └── stats.py
├── models/
│   ├── user.py
│   ├── goal.py
│   └── stats.py
├── utils/
│   ├── bridge.py
│   ├── paths.py
│   ├── runtime.py
│   └── wallpaper.py
└── interface/
    ├── index.html
    ├── pages/
    ├── js/
    ├── css/
    └── assets/
```

---

## 4. Application bootstrap

`src\main.py` (`AppController`) is the composition root.

Startup flow:

1. Configure runtime logging (`utils.runtime.configure_runtime_logging`).
2. Configure Qt WebEngine environment flags on Windows.
3. Initialize DB metadata (`dal.init_db()`).
4. Create `QApplication`, main window, timer window, tray, overlay.
5. Create services: `EventEmitter`, `TimerManager`, `PomodoroManager`, `NotificationService`, `SessionManager`.
6. Attach `JSBridge` to web views.
7. Wire service events (`timer:*`, `goal:open_detail`, `ui:theme`, `app:ready`, `auth:debug`).

Shutdown flow:

- Shutdown timer window WebEngine.
- Shutdown main window WebEngine.
- Shutdown timer manager.

---

## 5. Python ↔ JavaScript bridge

Bridge implementation: `src\utils\bridge.py`.

### 5.1 JS to Python

1. **Event channel**
   - JS calls `window.bridge.emit(event, payload)`.
   - Python receives via `_BridgeApi.emit(...)`.
   - Event is re-emitted through `EventEmitter`.

2. **Request channel**
   - JS calls `window.bridge.request(method, endpoint, body, headers, callback)`.
   - Python handles via `_BridgeApi.request(...)`.
   - Routed to `LocalApiService.request(...)`.

### 5.2 Python to JS

`JSBridge` forwards selected backend events to JS as `CustomEvent`s on `window`:

- `app:ack`
- `goal:open_detail`
- `timer:start`, `timer:tick`, `timer:pause`, `timer:resume`, `timer:complete`
- `session:start`, `session:pause`, `session:resume`, `session:end`
- `notification:show`

### 5.3 Frontend bridge initialization

`src\interface\js\services\bridge.service.js`:

- initializes `QWebChannel`,
- exposes `window.bridge`,
- emits `app:ready`,
- emits current UI theme (`ui:theme`),
- dispatches `bridge:ready` readiness events.

---

## 6. Local API contract

Backend implementation: `src\services\local_api.py`.

### 6.1 Response shape

Success:

```json
{ "ok": true, "status": 200, "data": { } }
```

Failure:

```json
{ "ok": false, "status": 400, "error": { "detail": "..." } }
```

### 6.2 Local DAL-backed endpoints

| Method | Path | Behavior |
|---|---|---|
| GET | `/goals` | List goals for authenticated user |
| POST | `/goals` | Create goal |
| GET | `/goals/{id}` | Get one goal |
| PUT | `/goals/{id}` | Update goal |
| DELETE | `/goals/{id}` | Delete goal |
| GET | `/stats/goal/{goal_id}` | List stats rows for goal |
| POST | `/stats/goal/{goal_id}` | Create stats row |
| GET | `/stats/{goal_id}/by-date-range` | Filter stats by date range |
| GET | `/auth/session` | Read persisted desktop auth session |
| POST | `/auth/session/clear` | Clear persisted desktop auth session |

### 6.3 Remote auth proxy

Paths under `/auth/*` are proxied via `RemoteAuthApi` when `CONTINIUM_API_BASE_URL` is configured.

Token handling:

- bearer token required for local goals/stats endpoints,
- session cache is maintained in memory (`token -> user_id`),
- desktop auth session is persisted to `<app_data_dir>\auth_session.json`.

---

## 7. Data model

### 7.1 Engine/session

Defined in `src\dal\session.py`:

- SQLite URL built from `utils.paths.database_path()`,
- `create_engine(..., connect_args={"check_same_thread": False})`,
- `SessionLocal = sessionmaker(...)`,
- tables created by `Base.metadata.create_all(...)`.

### 7.2 ORM tables

#### `users`

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK |
| full_name | VARCHAR(200) | NOT NULL |
| email | VARCHAR(255) | UNIQUE, INDEX, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| image_url | VARCHAR(500) | NULL |
| is_active | BOOLEAN | NOT NULL, default true |
| verified | BOOLEAN | NOT NULL, default false |

#### `goals`

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK |
| title | VARCHAR(200) | NOT NULL |
| type | VARCHAR(50) | NOT NULL |
| start_date | DATE | NOT NULL |
| deadline | DATE | NOT NULL |
| frequency | ENUM(`daily`,`weekly`,`monthly`) | NOT NULL |
| duration_min | INTEGER | NOT NULL, check `>= 0` |
| is_complete | BOOLEAN | NOT NULL, default false |
| user_id | INTEGER | FK `users.id`, index, `ON DELETE CASCADE` |

#### `stats`

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK |
| goal_id | INTEGER | FK `goals.id`, index, `ON DELETE CASCADE` |
| user_id | INTEGER | FK `users.id`, index, `ON DELETE CASCADE` |
| occurred_at | DATETIME(timezone=True) | NOT NULL, default now, index |
| duration_minutes | INTEGER | NOT NULL, check `>= 0` |

Relationships:

- `User` 1..* `Goal`
- `User` 1..* `Stats`
- `Goal` 1..* `Stats`

---

## 8. Timer/session implementation details

### 8.1 Services

- `TimerManager`: in-memory timer state + tick loop (`0.1s` interval), emits `timer:*`.
- `SessionManager`: tracks active session metadata and emits `session:*`.
- `PomodoroManager`: backend-side work/break orchestration attached to `timer:complete`.

### 8.2 UI behavior in current app

Focus and timer pages (`timer.view.js`, `focus-modal.js`) also emit timer events over the bridge.  
Overlay sync is event-driven from these `timer:*` events.

Timer window lifecycle:

- open: `timer:open_window`
- close: `timer:close_window`

---

## 9. Desktop UI components

| Component | File | Responsibility |
|---|---|---|
| Main window | `core\window.py` | Frameless shell hosting SPA |
| Focus timer window | `core\timer_window.py` | Dedicated fullscreen focus route |
| System tray | `core\tray.py` | Open/quit and quick goal timer actions |
| Overlay widget | `core\overlay.py` | Always-on-top timer controls + progress |

---

## 10. Configuration and storage

### 10.1 Environment variables

| Variable | Purpose |
|---|---|
| `CONTINIUM_API_BASE_URL` | Remote API base URL for auth proxy and frontend query param |
| `CONTINIUM_AUTH_VERIFY_SSL` | Toggle TLS verification for remote auth requests |
| `QTWEBENGINE_CHROMIUM_FLAGS` | Extended on Windows to include `--disable-gpu-shader-disk-cache` |

### 10.2 Runtime files

All paths are rooted at `utils.paths.app_data_dir()` (Windows: `%LOCALAPPDATA%\Continium`).

| Artifact | Path |
|---|---|
| SQLite database | `<app_data_dir>\app.db` |
| Runtime logs | `<app_data_dir>\logs\continium.log` |
| Persisted auth session | `<app_data_dir>\auth_session.json` |
| WebEngine profile data | `<app_data_dir>\webengine\...` |
| Timer window WebEngine data | `<app_data_dir>\timer_webengine\...` |

---

## 11. Build and run

### 11.1 Run from source

```powershell
pip install -r requirements.txt
python src\main.py
```

### 11.2 Run tests

```powershell
python -m pytest -q
```

Current repository test files:

- `tests\test_app.py`
- `tests\test_main.py`

### 11.3 Build executable bundles

```powershell
python build.py --platform windows
python build.py --platform macos
```

`build.py` invokes PyInstaller through:

```python
[sys.executable, "-m", "PyInstaller", ...]
```

---

## 12. Packaging artifacts

Primary packaging files:

- `build.py`
- `Continium.spec`
- `resources\icon.ico` / `resources\icon.icns`

PyInstaller data bundles include:

- `src\interface`
- `resources`
- `src\core`
- `src\dal`
- `src\services`
- `src\utils`
- `src\models`

---

## 13. Notes on scope and drift

This file is intentionally limited to behavior that exists in the code today.  
If architecture or runtime behavior changes, update this file and `docs\ARCHITECTURE.md` together to keep both documents aligned.
