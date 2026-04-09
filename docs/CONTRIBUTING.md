# Contributing to Continium Desktop

**Project:** Continium Desktop — Goal & Time Tracking Desktop Application  
**Contributing Author:** See `git log`

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable, production-ready code; tagged with version numbers |
| `dev` | Integration branch; all PRs target here first |
| `feature/*` | Individual feature or task branches (e.g., `feature/BE-2.1-system-tray`) |

**Rule:** No direct pushes to `main` or `dev`. All changes go through a Pull Request.

---

## Workflow

### 1. Starting a Task

```bash
# Get latest dev
git checkout dev
git pull origin dev

# Create feature branch (use task ID)
git checkout -b feature/BE-2.4-timer-manager
```

### 2. Commit Frequently

```bash
# Atomic commits (one logical change per commit)
git add src/services/timer_manager.py
git commit -m "feat: implement TimerManager.start() method

- Initialize timer with duration
- Spawn background thread
- Emit start event to UI

Implements: BE-2.4"
```

**Commit Message Format:**
- Subject: `<type>: <short description>` (72 chars max, imperative mood)
- Body: Details, algorithm explanation, why not how
- Footer: Task reference, e.g., `Implements: BE-2.4`

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `test:` - Test additions/updates
- `docs:` - Documentation
- `refactor:` - Code restructuring
- `perf:` - Performance improvement

### 3. Push and Open PR

```bash
# Push feature branch
git push origin feature/BE-2.4-timer-manager

# Go to GitHub and open PR to `dev`
# - Link related issue: "Closes #42"
# - Add description of changes
# - Add testing checklist
```

### 4. Code Review & CI

- **CI runs automatically:** `pytest` must pass
- **Code review:** At least 1 approval required
- **Address feedback:** Push new commits (don't force-push)

### 5. Merge to Dev

```bash
# After approval, merge via GitHub (use "Squash" for tidy history)
# DO NOT force-push
```

### 6. Release to Main (PM Only)

```bash
# Once sprint is ready:
git checkout main
git pull origin main
git merge --no-ff dev  # Creates merge commit
git tag -a v2.0.0 -m "Sprint 2: Desktop features"
git push origin main --tags
```

---

## Code Standards

### Python (Backend)

**Structure:** Routes → Services → DAL → Models

```python
# Good: Clear separation of concerns
# src/services/timer_manager.py

from typing import Optional, List
from dataclasses import dataclass

@dataclass
class TimerEvent:
    """Emitted when timer state changes."""
    timer_id: str
    action: str  # "start", "pause", "complete"
    remaining_seconds: int

class TimerManager:
    """Manages timer lifecycle and state.
    
    Responsibilities:
    - Start/pause/stop/reset timers
    - Track elapsed time
    - Emit events for UI updates
    """
    
    def start(self, goal_id: int, duration_minutes: int = 25) -> bool:
        """Start timer for a goal.
        
        Args:
            goal_id: ID of goal to track
            duration_minutes: Timer duration (default: 25 for Pomodoro)
        
        Returns:
            True if started, False if already running
        
        Raises:
            ValueError: If duration < 1 or > 120
        """
        if not 1 <= duration_minutes <= 120:
            raise ValueError(f"Duration must be 1-120, got {duration_minutes}")
        
        if self._is_running:
            return False
        
        self._goal_id = goal_id
        self._duration = duration_minutes * 60
        self._elapsed = 0
        self._is_running = True
        
        # Spawn background thread
        self._thread = threading.Thread(target=self._tick_loop, daemon=True)
        self._thread.start()
        
        return True
```

**Standards:**
- Type hints on all functions: `def foo(x: int, y: str) -> bool:`
- Docstrings in Google style (see above)
- No magic numbers (use constants or config)
- No commented-out code
- Functions ≤ 20 lines (split if longer)
- Cyclomatic complexity ≤ 5 (prefer early returns)

**Imports order:**
```python
# Standard library
import os
import sys
from typing import Optional

# Third-party
import sqlalchemy as sa

# Local
from src.models import User, Goal
from src.dal import UserDAL
```

### JavaScript (Frontend)

**Vanilla ES6+** — No frameworks, keep it light

```javascript
/**
 * TimerWidget - Displays a countdown timer
 * 
 * @param {Object} options - Configuration object
 * @param {number} options.duration - Duration in seconds
 * @param {Function} options.onComplete - Callback when timer reaches zero
 */
class TimerWidget {
    constructor(options) {
        this.duration = options.duration || 1500; // 25 minutes
        this.remaining = this.duration;
        this.onComplete = options.onComplete;
        this._interval = null;
        this._element = null;
    }
    
    /**
     * Render timer UI and attach to DOM
     * @returns {HTMLElement} The timer element
     */
    render() {
        this._element = document.createElement('div');
        this._element.className = 'timer-widget';
        this._updateDisplay();
        return this._element;
    }
    
    /**
     * Start the timer countdown
     * @throws {Error} If timer already running
     */
    start() {
        if (this._interval) {
            throw new Error('Timer already running');
        }
        
        this._interval = setInterval(() => {
            this.remaining--;
            this._updateDisplay();
            
            if (this.remaining <= 0) {
                this.stop();
                if (this.onComplete) this.onComplete();
            }
        }, 1000);
    }
    
    /**
     * Update timer display
     * @private
     */
    _updateDisplay() {
        const mins = Math.floor(this.remaining / 60);
        const secs = this.remaining % 60;
        this._element.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}
```

**Standards:**
- JSDoc comments on classes and public methods
- camelCase for variables/functions
- PascalCase for classes
- const > let > var
- No var outside special cases
- Descriptive names (not `x`, `foo`, `temp`)
- Keep functions ≤ 30 lines

---

## Testing

### Python: Unit Tests

```python
# tests/test_timer_manager.py

import pytest
from src.services.timer_manager import TimerManager

class TestTimerManager:
    """Test suite for TimerManager service."""
    
    @pytest.fixture
    def timer(self):
        """Create fresh timer for each test."""
        return TimerManager()
    
    def test_initializes_stopped(self, timer):
        """Timer should start in stopped state."""
        assert timer.is_running == False
        assert timer.remaining == 1500  # 25 min
    
    def test_start_returns_true_when_stopped(self, timer):
        """start() should return True if not running."""
        result = timer.start(goal_id=1, duration_minutes=25)
        assert result == True
        assert timer.is_running == True
    
    def test_start_returns_false_when_running(self, timer):
        """start() should return False if already running."""
        timer.start(goal_id=1)
        result = timer.start(goal_id=2)
        assert result == False
    
    def test_invalid_duration_raises(self, timer):
        """start() should raise ValueError for invalid duration."""
        with pytest.raises(ValueError):
            timer.start(goal_id=1, duration_minutes=0)
        
        with pytest.raises(ValueError):
            timer.start(goal_id=1, duration_minutes=121)
```

**Coverage Target:** 80% minimum per module  
**Command:** `coverage run -m pytest && coverage report`

### JavaScript: Component Tests

```javascript
// tests/timer-widget.test.js

describe('TimerWidget', () => {
    let widget;
    
    beforeEach(() => {
        widget = new TimerWidget({ duration: 60 });
    });
    
    it('should render with correct duration', () => {
        const el = widget.render();
        expect(el.textContent).toBe('1:00');
    });
    
    it('should throw if start called twice', () => {
        widget.start();
        expect(() => widget.start()).toThrow();
    });
    
    it('should call onComplete when timer ends', (done) => {
        widget = new TimerWidget({ 
            duration: 1,  // 1 second
            onComplete: () => {
                expect(true).toBe(true);
                done();
            }
        });
        widget.render();
        widget.start();
    });
});
```

---

## Code Review Checklist

Before approving, reviewers must verify:

**Functionality**
- [ ] Does it solve the task requirements?
- [ ] Are edge cases handled?
- [ ] Error handling present?

**Code Quality**
- [ ] Follows project standards?
- [ ] No duplication (DRY principle)?
- [ ] Cyclomatic complexity reasonable?
- [ ] Comments explain WHY, not WHAT?

**Testing**
- [ ] Tests pass locally?
- [ ] New code has tests?
- [ ] Test coverage maintained/improved?

**Documentation**
- [ ] Docstrings present?
- [ ] API changes documented?
- [ ] Commit messages clear?

**Security**
- [ ] No hardcoded secrets?
- [ ] Input validation present?
- [ ] SQL injection possible?
- [ ] No sensitive data logged?

---

## Development Environment

### Setup

```bash
# Clone repo
git clone https://github.com/yourusername/Continium-Desktop.git
cd Continium-Desktop

# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest

# Run app
python src/main.py
```

### Pre-commit Hook (Optional but Recommended)

```bash
# Create .git/hooks/pre-commit
#!/bin/bash
pytest --quiet
if [ $? -ne 0 ]; then
    echo "Tests failed. Commit aborted."
    exit 1
fi
```

---

## Performance Guidelines

- **Timer accuracy:** ±100ms per minute maximum
- **UI response time:** < 100ms to user interaction
- **Database queries:** < 50ms for 95th percentile
- **App startup:** < 2 seconds
- **Memory usage:** < 150MB idle

**Profiling:**
```python
# Use cProfile for hot paths
python -m cProfile -o results.prof src/main.py
```

---

## Asking for Help

**Questions about a task?** Comment on the GitHub issue.  
**Need to discuss architecture?** Create a discussion or open an RFC.  
**Found a bug?** Open an issue with: Steps to reproduce, Expected vs Actual, Environment.

---

## Release Checklist (PM)

Before tagging a release:

- [ ] All tasks in sprint marked Done
- [ ] All tests passing
- [ ] Coverage > 80%
- [ ] README updated with new features
- [ ] CHANGELOG entry written
- [ ] No TODOs in production code
- [ ] Security audit complete
- [ ] Performance tested
- [ ] Installers build successfully

```bash
# Tag release
git tag -a v2.0.0 -m "Sprint 2: Tray, timer, overlay, notifications"
git push origin main --tags
```

---

**Thank you for contributing!** 🙌
