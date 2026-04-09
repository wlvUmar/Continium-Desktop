# Requirements Document — Continium Desktop

**Project:** Continium Desktop — Goal & Time Tracking Desktop Application  
**Version:** 2.0 (Sprint 2 MPP)  
**Author:** Team  
**Date:** 2026-04-09

---

## 1. Project Overview

### 1.1 Purpose

Continium Desktop is a **Minimum Profitable Product (MPP)** — a standalone desktop application that brings productivity to professionals' systems. Unlike the web MVP (Continium), the desktop version emphasizes **real-time timer management**, **system integration** (tray, taskbar, notifications), and **Pomodoro-style workflows** for focused work sessions.

### 1.2 Problem Statement

Knowledge workers struggle to:

- **Stay focused** on one goal at a time without distractions
- **Track time accurately** without manual entry overhead
- **See progress** across multiple goals with minimal friction
- **Get reminders** when it's time to take a break or wrap up

Continium Desktop solves this by:
- **System tray integration** — start timers without opening an app
- **On-screen overlay** — minimalist timer widget that stays visible
- **Native notifications** — completion alerts, break reminders
- **Pomodoro methodology** — proven 25/5 cycle for deep work
- **Local data** — no cloud dependency, full privacy

### 1.3 Target Users

| User Type | Description |
|-----------|-------------|
| **Software Developers** | Time personal projects, manage learning goals |
| **Students** | Track study sessions, exam prep, assignments |
| **Creatives** | Protect focus time for writing, design, coding |
| **Knowledge Workers** | Time-box research, planning, and deep work |
| **Academic** | Assess goal-setting and productivity culture |

### 1.4 Product Positioning

| Aspect | Continium Web (MVP) | Continium Desktop (MPP) |
|--------|-------------------|------------------------|
| **Type** | Minimum Viable | Minimum Profitable |
| **Use Case** | Goal planning + time logging | Active time tracking + Pomodoro |
| **Deployment** | Cloud (Remote) | Local (Single-user) |
| **Auth** | JWT + email verification | Local password |
| **Data** | Server-side | Local SQLite |
| **Integration** | Browser only | System tray, overlay, notifications |
| **Workflow** | "Create goal → Log time" | "See tray → Click timer → Work" |

---

## 2. Functional Requirements

### 2.1 User Authentication

| ID | Requirement |
|----|-------------|
| **FR-01** | User can set a password on first launch |
| **FR-02** | Password stored with bcrypt hashing (cost=12) |
| **FR-03** | User can log in with password on app startup |
| **FR-04** | Failed login attempts prevent app access (max 5 attempts) |
| **FR-05** | User can log out; app clears in-memory session |

**Note:** No email verification, password reset, or multi-user support for Sprint 2.

### 2.2 Goal Management

| ID | Requirement |
|----|-------------|
| **FR-10** | User can create a goal with: title, type (OneTime/Repeating), start date, deadline, frequency, target duration |
| **FR-11** | User can view all goals in a list (active + completed) |
| **FR-12** | User can view goal details and edit any field |
| **FR-13** | User can mark a goal complete or incomplete (toggle) |
| **FR-14** | User can delete a goal; associated stats automatically deleted |
| **FR-15** | User can search goals by title (partial match) |
| **FR-16** | User can filter goals by status (active/completed) |
| **FR-17** | User can retrieve goals active on a specific date |

### 2.3 Timer & Time Tracking (NEW for Desktop)

| ID | Requirement |
|----|-------------|
| **FR-20** | User can start a 25-minute timer from the system tray (Pomodoro default) |
| **FR-21** | User can customize timer duration (1–120 minutes) |
| **FR-22** | User can pause/resume an active timer |
| **FR-23** | Timer displays countdown in system tray and floating overlay |
| **FR-24** | When timer completes, system auto-logs the duration to selected goal |
| **FR-25** | Pomodoro mode: After 25min work, prompt for 5min break; after 4 cycles, 15min break |
| **FR-26** | Timer continues counting even if main window is closed (background thread) |
| **FR-27** | Clicking tray shows quick-start menu: [Start 25min] [Start Custom] [Pause] [View Stats] |

### 2.4 Statistics & Analytics (Enhanced)

| ID | Requirement |
|----|-------------|
| **FR-30** | User views total time logged per goal (grouped, sorted) |
| **FR-31** | User can view statistics for a date range (week, month, custom) |
| **FR-32** | User can see "Today's Progress" (time logged so far, remaining target) |
| **FR-33** | Statistics display as charts (bar chart: minutes per goal, line chart: daily trend) |
| **FR-34** | User can export statistics as CSV or JSON |

### 2.5 Notifications (NEW for Desktop)

| ID | Requirement |
|----|-------------|
| **FR-40** | When timer completes, show native OS notification (Windows, macOS, Linux) |
| **FR-41** | Notification includes: goal title, duration logged, encouragement message |
| **FR-42** | Notification clickable; opens app to show stats |
| **FR-43** | User can enable/disable notifications in settings |
| **FR-44** | Break reminders notify user when break is due (after 25min) |

### 2.6 System Integration (NEW for Desktop)

| ID | Requirement |
|----|-------------|
| **FR-50** | Application has a system tray icon (minimize to tray, not taskbar) |
| **FR-51** | Tray icon shows timer state: idle (normal icon) / running (animated icon) |
| **FR-52** | Right-click tray → context menu with: Start, Pause, View, Settings, Exit |
| **FR-53** | Overlay widget (floating timer) appears when timer running |
| **FR-54** | Overlay draggable, stays on top of other windows, semi-transparent |
| **FR-55** | Taskbar preview shows active timer countdown (Windows only, optional) |
| **FR-56** | App launches on system startup (Windows: registry key, macOS: LaunchAgent, Linux: desktop entry) |

### 2.7 Settings & Preferences

| ID | Requirement |
|----|-------------|
| **FR-60** | User can toggle dark mode |
| **FR-61** | User can set custom Pomodoro duration (default 25/5) |
| **FR-62** | User can enable/disable tray notifications |
| **FR-63** | User can set notification sound (silent, chime, custom) |
| **FR-64** | User can change password |

---

## 3. Non-Functional Requirements

### 3.1 Security

| ID | Requirement |
|----|-------------|
| **NFR-01** | Passwords stored with bcrypt (cost=12), never plaintext |
| **NFR-02** | App session token cleared on logout; no persistent auth tokens |
| **NFR-03** | All database queries bound (no SQL injection) |
| **NFR-04** | No sensitive data logged to console/file in production |
| **NFR-05** | Local database unencrypted (assume user controls machine security) |
| **NFR-06** | App binary signed (Windows: cert signing, macOS: codesigning) |

### 3.2 Performance

| ID | Requirement |
|----|-------------|
| **NFR-08** | App startup < 2 seconds |
| **NFR-09** | Timer accuracy ±100ms per minute |
| **NFR-10** | Tray menu response < 100ms |
| **NFR-11** | UI renders at 60 FPS (no frame drops) |
| **NFR-12** | Memory usage < 150MB idle, < 200MB running timer |
| **NFR-13** | Database queries < 50ms (95th percentile) |
| **NFR-14** | Installer < 200MB (Windows .exe, macOS .dmg) |

### 3.3 Reliability

| ID | Requirement |
|----|-------------|
| **NFR-15** | App survives > 8 hours of continuous timer operation |
| **NFR-16** | Graceful shutdown if database corrupted |
| **NFR-17** | Auto-recovery if app crashes mid-timer (resume on restart) |
| **NFR-18** | Database cascade deletes maintain referential integrity |

### 3.4 Usability

| ID | Requirement |
|----|-------------|
| **NFR-20** | Main UI responsive (scales 768px–4K) |
| **NFR-21** | Keyboard shortcuts: Alt+T (start timer), Alt+P (pause), Alt+S (show) |
| **NFR-22** | Tray interaction (click, right-click) single-hand friendly |
| **NFR-23** | Error messages clear, actionable, not technical jargon |
| **NFR-24** | First-time user onboarding (welcome screen, 3 quick tips) |

### 3.5 Maintainability

| ID | Requirement |
|----|-------------|
| **NFR-25** | Layered architecture: UI → Services → DAL → Models |
| **NFR-26** | All modules < 300 lines, functions < 20 lines |
| **NFR-27** | Type hints on 100% of Python functions |
| **NFR-28** | Code coverage ≥ 80% (pytest) |
| **NFR-29** | Documentation: docstrings, architecture diagram, API reference |
| **NFR-30** | CI/CD: automated tests, linting, building on every PR |

### 3.6 Portability

| ID | Requirement |
|----|-------------|
| **NFR-31** | Support Windows 10/11 (x86-64) |
| **NFR-32** | Support macOS 12+ (Intel + Apple Silicon) |
| **NFR-33** | Support Linux (Ubuntu 20.04+) — optional |
| **NFR-34** | Cross-platform Python code (no OS-specific imports in core) |
| **NFR-35** | Notifications platform-specific (win10toast, pync, notify-send) |

---

## 4. User Stories

### Primary Workflows

| ID | Story |
|----|-------|
| **US-01** | As a developer, I want to click the tray icon and start a 25-min timer so I can focus on coding without checking the clock |
| **US-02** | As a student, I want the timer to automatically log time to my "Exam Prep" goal when it completes so I don't have to manually enter it |
| **US-03** | As a focused worker, I want an always-visible floating timer so I can see my remaining time without alt-tabbing |
| **US-04** | As a Pomodoro user, I want automatic 5-minute breaks after work sessions so I follow the methodology effortlessly |
| **US-05** | As a goal tracker, I want to view my weekly stats (hours per goal) so I can see where my time actually goes |
| **US-06** | As a new user, I want a simple one-time password setup so I can start tracking immediately |
| **US-07** | As a multitasking user, I want to pause my timer and resume it later so I can handle interruptions |
| **US-08** | As a notification user, I want sound + popup when my timer finishes so I don't miss completion alerts |

---

## 5. System Constraints

- **Python 3.12+** (PyQt6 requires 3.9+; modern practices need 3.10+)
- **PyQt6** for desktop UI (no web framework, native look/feel)
- **SQLite** for local storage (no network, no server)
- **Vanilla JavaScript** for shared frontend (no build step)
- **Windows/macOS/Linux** targets (GitHub Actions CI/CD)
- **Single-user** per app instance (no multi-user or cloud)
- **Offline-first** (no external APIs; Resend/SMTP removed from desktop)

---

## 6. Out of Scope (Sprint 2)

- ❌ Cloud sync / multi-device access
- ❌ Collaborative goals / team sharing
- ❌ Email notifications (local OS notifications only)
- ❌ Goal templates or advanced scheduling
- ❌ Mobile companion app (desktop-only)
- ❌ Advanced analytics (pivot tables, ML predictions)
- ❌ Integration with calendar/email apps
- ❌ Linux taskbar preview (Windows/macOS priority)
- ❌ Dark mode (can add in Sprint 3)
- ❌ Voice commands / AI assistance

---

## 7. Definition of Done

A feature is **DONE** when:

- ✅ Code written with type hints, docstrings, SOLID principles
- ✅ Unit tests pass (≥80% coverage for module)
- ✅ Integration tests pass
- ✅ Code review approved (≥1 reviewer)
- ✅ Docstring + comment written
- ✅ No TODOs or FIXMEs left in code
- ✅ Commits meaningful + linked to task
- ✅ PR merged to `dev` branch
- ✅ Changelog entry written

---

## 8. Acceptance Criteria (Per Sprint)

### Sprint 2 (Desktop Foundation + Timer)

**Acceptance:**
1. App launches and shows main window with goal list
2. User can create/edit/delete goals
3. System tray working (Windows/macOS)
4. Timer starts/pauses/stops from tray
5. Overlay displays countdown
6. Pomodoro cycles work (25/5, break after 4)
7. Stats logged automatically on timer complete
8. Notifications fire (Windows/macOS)
9. All tests pass, coverage ≥ 80%
10. Installers build successfully (Windows .exe, macOS .dmg)

---

## 9. Success Metrics

### For Development Team

| Metric | Target |
|--------|--------|
| Code coverage | ≥ 80% |
| Build success rate | 100% (every commit) |
| Test pass rate | 100% |
| Code review time | < 24 hours |
| Technical debt | 0 (no TODOs in production) |

### For Users (V2.1+)

| Metric | Target |
|--------|--------|
| Timer accuracy | ±100ms/min |
| App startup | < 2 seconds |
| User retention (30-day) | 40%+ |
| Time tracked per user/week | 10+ hours |
| Feature adoption | 70% use Pomodoro |

---

## 10. Roadmap

### Sprint 2 (This Sprint)
- [x] System tray integration
- [x] Timer manager + background thread
- [x] Pomodoro cycles (25/5)
- [x] Overlay widget
- [x] Notifications (Windows/macOS)
- [x] Basic stats dashboard
- [x] Testing & CI/CD

### Sprint 3 (Planned)
- [ ] Dark mode toggle
- [ ] Goal templates
- [ ] Export stats (CSV/JSON)
- [ ] Advanced filtering (date range)
- [ ] Taskbar integration (Windows)
- [ ] Shortcuts (Alt+T, Alt+P)
- [ ] Linux support

### Sprint 4+ (Future)
- [ ] Cloud sync (optional, encrypted)
- [ ] Collaborative goals
- [ ] Mobile web companion
- [ ] Advanced analytics (weekly/monthly views)
- [ ] Custom notifications / sounds
- [ ] Goal categories / tags

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| **Pomodoro** | Productivity technique: 25min focused work + 5min break; after 4 cycles, 15min break |
| **Overlay** | Floating window (always-on-top) showing timer countdown |
| **Tray** | System notification area (Windows: bottom-right, macOS: top-right) |
| **Session** | One timer session (e.g., 25-minute work block) |
| **Cycle** | Four sessions + breaks (full Pomodoro cycle) |
| **Stats** | Time logged for a goal on a specific date |
| **MPP** | Minimum Profitable Product (enough users pay) |
| **MVP** | Minimum Viable Product (test core hypothesis) |

