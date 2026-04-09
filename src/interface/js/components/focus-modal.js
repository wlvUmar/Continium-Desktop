

// Focus Modal State
let _focusModalGoalId = null;
let _focusModalGoal = null;
let _focusTimerInterval = null;
let _focusTimerRunning = false;
let _focusTimerElapsed = 0;           // cumulative elapsed (loaded + new work)
let _focusSessionStart = 0;           // elapsed at start of THIS session (for delta)
let _focusTimerGoalSeconds = 0;
let _focusSessionCount = 1;

const FOCUS_RING_RADIUS = 252;
const FOCUS_RING_CIRCUMFERENCE = 2 * Math.PI * FOCUS_RING_RADIUS;

// ============================================
// HELPERS
// ============================================

function _focusFmtTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function _focusFmtTimeDisplay(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} : ${String(s).padStart(2, '0')}`;
}

async function _focusSaveSession() {
    // Calculate only the NEW work done this session (delta, not cumulative)
    const newElapsed = _focusTimerElapsed - _focusSessionStart;
    if (!_focusModalGoalId || newElapsed < 60) return;
    
    const minutes = Math.round(newElapsed / 60);
    try {

        await api.post(`/stats/goal/${_focusModalGoalId}`, { duration_minutes: minutes });
        _focusSessionStart = _focusTimerElapsed;  // Update baseline for next save
        
        // Invalidate cache so next fetch gets fresh data
        statsManager.invalidateCache(_focusModalGoalId);
    } catch (err) {
        console.error(`❌ FOCUS: Failed to save session`, err);
        Toast.error('Failed to save session');
    }
}

// Load today's session from database
async function _focusLoadTodaySession() {
    if (!_focusModalGoalId) return;
    try {

        const stats = await api.get(`/stats/goal/${_focusModalGoalId}`);
        
        if (!Array.isArray(stats)) return;
        
        // Get today's date in ISO format
        const today = new Date().toISOString().split('T')[0];
        
        // Sum all stats from today (handles multiple sessions per day)
        const todayMinutes = stats.reduce((sum, stat) => {
            const statDate = stat.occurred_at.split('T')[0];
            return statDate === today ? sum + (stat.duration_minutes || 0) : sum;
        }, 0);
        
        if (todayMinutes > 0) {
            _focusTimerElapsed = todayMinutes * 60;
            _focusSessionStart = _focusTimerElapsed;  // Set baseline so delta = 0 at start

        }
    } catch (err) {
        console.error(`❌ FOCUS: Failed to load today's session`, err);
    }
}

// ============================================
// MODAL RENDERING
// ============================================

function renderFocusModal() {
    const goal = _focusModalGoal || { title: 'Project', duration_min: 150 };
    const durationSec = (goal.duration_min || 150) * 60;

    return `
        <div class="focus-modal-overlay" id="focusModalOverlay">
            <div class="focus-modal" id="focusModalWindow">
                <!-- Top Controls -->
                <div class="focus-modal-controls">
                    <button class="focus-modal-btn timer-page-btn" id="focusTimerPageBtn" title="Go to Timer Page" onclick="window.closeFocusModalAndNavigate('/timer/${_focusModalGoalId}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                    </button>
                    <button class="focus-modal-btn exit-btn" id="focusExitBtn" title="Close Focus Mode" onclick="window.closeFocusModal()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <!-- Modal Content -->
                <div class="focus-modal-content">
                    <div class="focus-modal-project-name">${goal.title}</div>

                    <div class="focus-modal-session-info">
                        <span id="focusSessionTime">0h 0m 0s</span> / <span id="focusGoalTime">${_focusFmtTime(durationSec)}</span>
                    </div>
                    <div class="focus-modal-session-bar" id="focusSessionBar" style="--progress-percent: 0%;"></div>

                    <div class="focus-modal-ring-wrapper">
                        <svg class="focus-ring-svg" viewBox="0 0 520 520">
                            <circle class="focus-ring-circle" cx="260" cy="260" r="252" />
                            <circle id="focusProgressArc" class="focus-ring-progress" cx="260" cy="260" r="252" />
                        </svg>
                        <div class="focus-inner-content">
                            <div class="focus-status-label" id="focusStatusLabel">PAUSED</div>
                            <div class="focus-time-display" id="focusTimeDisplay">0 : 00</div>
                            <div class="focus-session-badge" id="focusSessionBadge">1</div>
                        </div>
                    </div>

                    <div class="focus-modal-controls-wrapper">
                        <button class="focus-modal-control-btn" title="Reset" onclick="window.focusReset()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                <path d="M3 3v5h5"></path>
                            </svg>
                        </button>

                        <button class="focus-modal-play-btn focus-modal-control-btn paused" id="focusPlayBtn" title="Play/Pause" onclick="window.focusToggle()">
                            <svg id="focusPlayIcon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// MODAL CONTROL FUNCTIONS
// ============================================

window.openFocusModal = async function(goalId) {
    _focusModalGoalId = parseInt(goalId);
    _focusSessionCount = 1;
    _focusTimerElapsed = 0;  // Will be set by _focusLoadTodaySession
    _focusTimerRunning = false;

    if (_focusTimerInterval) { clearInterval(_focusTimerInterval); }

    try {
        const goal = await goalsService.fetchGoal(_focusModalGoalId);
        _focusModalGoal = goal;
        _focusTimerGoalSeconds = (goal.duration_min || 150) * 60;
    } catch (_) {
        _focusModalGoal = { title: `Project ${_focusModalGoalId}`, duration_min: 150 };
        _focusTimerGoalSeconds = 150 * 60;
    }

    // Load today's session from database BEFORE rendering
    await _focusLoadTodaySession();

    // Render modal if not already in DOM
    let modal = document.getElementById('focusModalOverlay');
    if (!modal) {
        const modalContainer = document.createElement('div');
        modalContainer.id = 'focusModalContainer';
        document.body.appendChild(modalContainer);
        modalContainer.innerHTML = renderFocusModal();
    } else {
        document.getElementById('focusModalOverlay').outerHTML = renderFocusModal();
    }

    // Show modal and auto-start
    const overlay = document.getElementById('focusModalOverlay');
    if (overlay) {
        overlay.classList.add('active');
    }

    _focusUpdateDisplay();
    window.focusToggle();
};

window.closeFocusModal = async function() {
    // Stop the timer and save session
    if (_focusTimerRunning) {
        clearInterval(_focusTimerInterval);
        _focusTimerRunning = false;
        const playBtn  = document.getElementById('focusPlayBtn');
        const playIcon = document.getElementById('focusPlayIcon');
        if (playBtn)  playBtn.classList.add('paused');
        if (playIcon) playIcon.innerHTML = `<path d="M8 5v14l11-7z" />`;
    }

    if (_focusTimerElapsed > _focusSessionStart) {
        await _focusSaveSession();
    }

    // Remove modal from DOM entirely
    const container = document.getElementById('focusModalContainer');
    if (container) container.remove();
    const overlay = document.getElementById('focusModalOverlay');
    if (overlay) overlay.remove();

    // Reset state
    _focusTimerElapsed  = 0;
    _focusSessionStart  = 0;
    _focusTimerRunning  = false;
    _focusModalGoalId   = null;
    _focusModalGoal     = null;
};

window.closeFocusModalAndNavigate = async function(route) {
    await window.closeFocusModal();
    router.navigate(route);
};

window.focusToggle = function() {
    const playBtn = document.getElementById('focusPlayBtn');
    const playIcon = document.getElementById('focusPlayIcon');

    if (_focusTimerRunning) {
        clearInterval(_focusTimerInterval);
        _focusTimerRunning = false;

        if (playBtn) playBtn.classList.add('paused');
        if (playIcon) playIcon.innerHTML = `<path d="M8 5v14l11-7z" />`;

        _focusSaveSession();
    } else {
        _focusTimerRunning = true;

        if (playBtn) playBtn.classList.remove('paused');
        if (playIcon) playIcon.innerHTML = `<rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />`;

        _focusTimerInterval = setInterval(() => {
            _focusTimerElapsed++;
            _focusUpdateDisplay();
        }, 1000);
    }

    _focusUpdateDisplay();
};

window.focusReset = function() {
    clearInterval(_focusTimerInterval);
    _focusTimerRunning = false;

    const playBtn = document.getElementById('focusPlayBtn');
    const playIcon = document.getElementById('focusPlayIcon');

    if (playBtn) playBtn.classList.add('paused');
    if (playIcon) playIcon.innerHTML = `<path d="M8 5v14l11-7z" />`;

    const elapsed = _focusTimerElapsed;
    _focusTimerElapsed = 0;
    _focusUpdateDisplay();

    if (elapsed >= 60 && _focusModalGoalId) {
        _focusSessionCount++;
        const badge = document.getElementById('focusSessionBadge');
        if (badge) badge.textContent = _focusSessionCount;

        const minutes = Math.round(elapsed / 60);

        api.post(`/stats/goal/${_focusModalGoalId}`, { duration_minutes: minutes })
            .catch(() => Toast.error('Failed to save session'));
    }
};

function _focusUpdateDisplay() {
    const progressPercent = Math.min((_focusTimerElapsed / _focusTimerGoalSeconds) * 100, 100);

    // Time display
    const timeDisplay = document.getElementById('focusTimeDisplay');
    if (timeDisplay) {
        timeDisplay.textContent = _focusFmtTimeDisplay(_focusTimerElapsed);
    }

    // Session info
    const sessionTime = document.getElementById('focusSessionTime');
    if (sessionTime) {
        sessionTime.textContent = _focusFmtTime(_focusTimerElapsed);
    }

    // Progress bar
    const bar = document.getElementById('focusSessionBar');
    if (bar) {
        bar.style.setProperty('--progress-percent', progressPercent + '%');
    }

    // Ring progress
    const arc = document.getElementById('focusProgressArc');
    if (arc) {
        const offset = FOCUS_RING_CIRCUMFERENCE * (1 - Math.min(_focusTimerElapsed / _focusTimerGoalSeconds, 1));
        arc.style.strokeDashoffset = offset;
    }

    // Status label
    const status = document.getElementById('focusStatusLabel');
    if (status) {
        status.textContent = _focusTimerRunning ? 'FOCUS' : 'PAUSED';
    }

    // Session badge
    const badge = document.getElementById('focusSessionBadge');
    if (badge) {
        badge.textContent = _focusSessionCount;
    }
}

window.focusUpdateDisplay = _focusUpdateDisplay;

// ============================================
// PAGE LIFECYCLE - Save session on unload
// ============================================

window.addEventListener('beforeunload', (e) => {
    // Only save if focus modal is open and timer is running
    const overlay = document.getElementById('focusModalOverlay');
    const isModalOpen = overlay && overlay.classList.contains('active');
    
    if (isModalOpen && (_focusTimerRunning || (_focusTimerElapsed > 0 && _focusTimerElapsed < 60))) {
        // Stop the timer
        clearInterval(_focusTimerInterval);
        _focusTimerRunning = false;
        
        // Save any partial session (even < 60 seconds)
        if (_focusTimerElapsed > 0 && _focusModalGoalId) {
            const minutes = Math.round(_focusTimerElapsed / 60);

            // Use synchronous beacon API for best effort save
            navigator.sendBeacon(
                `/stats/goal/${_focusModalGoalId}`,
                JSON.stringify({ duration_minutes: Math.max(1, minutes) })
            );
        }
    }
});
