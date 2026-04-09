/**
 * timer.js — Timer Page with Focus Mode
 * Embedded timer preview + modal focus mode for deep work sessions
 */

// Timer State
let _timerInterval      = null;
let _timerRunning       = false;
let _timerElapsed       = 0;           // seconds (cumulative: loaded + new work)
let _timerSessionStart   = 0;          // elapsed at the start of THIS session (for calculating delta)
let _timerGoalSeconds   = 9000;        // updated from goal.duration_min on load
let _currentGoalId      = null;
let _sessionCount       = 1;
let _focusModeActive    = false;

// Ring SVG calculation (r="252" in SVG)
const TIMER_RING_RADIUS = 252;
const TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * TIMER_RING_RADIUS;

// ============================================
// HELPERS
// ============================================

function _timerFmtTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function _timerFmtTimeDisplay(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} : ${String(s).padStart(2, '0')}`;
}

// Save elapsed seconds to backend as a stat entry
async function _timerSaveSession() {
    // Calculate only the NEW work done this session (delta, not cumulative)
    const newElapsed = _timerElapsed - _timerSessionStart;
    if (!_currentGoalId || newElapsed < 60) return;
    
    const minutes = Math.round(newElapsed / 60);
    try {

        const response = await api.post(`/stats/goal/${_currentGoalId}`, { duration_minutes: minutes });

        _timerSessionStart = _timerElapsed;  // Update baseline for next save
        
        // Invalidate cache so next fetch gets fresh data
        statsManager.invalidateCache(_currentGoalId);
    } catch (err) {
        console.error(`❌ TIMER: Failed to save session`, err);
        Toast.error('Failed to save session');
    }
}

// Load today's session from database
async function _timerLoadTodaySession() {
    if (!_currentGoalId) return;
    try {

        const stats = await api.get(`/stats/goal/${_currentGoalId}`);
        
        if (!Array.isArray(stats)) return;
        
        // Get today's date in ISO format
        const today = new Date().toISOString().split('T')[0];
        
        // Sum all stats from today (handles multiple sessions per day)
        const todayMinutes = stats.reduce((sum, stat) => {
            const statDate = stat.occurred_at.split('T')[0];
            return statDate === today ? sum + (stat.duration_minutes || 0) : sum;
        }, 0);
        
        if (todayMinutes > 0) {
            _timerElapsed = todayMinutes * 60;
            _timerSessionStart = _timerElapsed;  // Set baseline so delta = 0 at start

        }
    } catch (err) {
        console.error(`❌ TIMER: Failed to load today's session`, err);
    }
}

// ============================================
// CONTENT TEMPLATE
// ============================================

function renderTimerPageContent(goal) {
    return `
        <div class="timer-page-wrapper">
            <!-- Embedded Timer View (main container) -->
            <!-- Fullscreen focus mode opens via global focus-modal when play button is clicked -->
            ${createTimerEmbedded(goal, _sessionCount, _currentGoalId)}
        </div>
    `;
}

// ============================================
// PAGE RENDER (async — fetches real goal data)
// ============================================

async function renderTimerPage(projectId) {
    _currentGoalId = parseInt(projectId);
    _sessionCount = 1;
    _focusModeActive = false;
    const appContainer = document.getElementById('app');

    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    _timerRunning = false;
    _timerElapsed = 0;

    appContainer.innerHTML = `<div style="padding:60px;text-align:center;color:#999;">Loading...</div>`;

    let goal = { id: projectId, title: `Project ${projectId}`, duration_min: 150 };
    try {
        const fetchedGoal = await goalsService.fetchGoal(projectId);
        goal             = fetchedGoal;
        _timerGoalSeconds = (goal.duration_min || 150) * 60;
    } catch (_) {
        // Fallback to default
    }

    // Load today's session from database
    await _timerLoadTodaySession();

    appContainer.innerHTML = createLayout(renderTimerPageContent(goal), `/timer/${projectId}`);
    attachNavigationListeners();
    _timerUpdateDisplay();
}

// ============================================
// TIMER DISPLAY - Updates both embedded and modal
// ============================================

function _timerUpdateDisplay() {
    const minutes = Math.floor(_timerElapsed / 60);
    const seconds = _timerElapsed % 60;
    const progressPercent = Math.min((_timerElapsed / _timerGoalSeconds) * 100, 100);

    // ===== EMBEDDED VIEW =====
    // Time display (e.g., "0 : 00")
    const embeddedTimeDisplay = document.getElementById('timerTimeDisplay');
    if (embeddedTimeDisplay) {
        embeddedTimeDisplay.textContent = _timerFmtTimeDisplay(_timerElapsed);
    }

    // Session info (e.g., "0h 0m 0s")
    const embeddedSessionTime = document.getElementById('timerSessionTime');
    if (embeddedSessionTime) {
        embeddedSessionTime.textContent = _timerFmtTime(_timerElapsed);
    }

    // Session bar progress
    const embeddedBar = document.getElementById('timerSessionBar');
    if (embeddedBar) {
        embeddedBar.style.setProperty('--progress-percent', progressPercent + '%');
    }

    // Ring progress (SVG arc)
    const embeddedArc = document.getElementById('timerProgressArc');
    if (embeddedArc) {
        const offset = TIMER_RING_CIRCUMFERENCE * (1 - Math.min(_timerElapsed / _timerGoalSeconds, 1));
        embeddedArc.style.strokeDashoffset = offset;
    }

    // Status label
    const embeddedStatus = document.getElementById('timerStatusLabel');
    if (embeddedStatus) {
        embeddedStatus.textContent = _timerRunning ? 'FOCUS' : 'PAUSED';
    }

    // Session badge
    const embeddedBadge = document.getElementById('timerSessionBadge');
    if (embeddedBadge) {
        embeddedBadge.textContent = _sessionCount;
    }
}

// ============================================
// TIMER CONTROLS - Update embedded view only
// ============================================

// Play/Pause toggle
window.timerToggle = function() {
    const playBtn = document.getElementById('timerPlayBtn');
    const playIcon = document.getElementById('timerPlayIcon');

    if (_timerRunning) {
        // PAUSING - stop timer
        clearInterval(_timerInterval);
        _timerRunning = false;
        
        if (playBtn) playBtn.classList.add('paused');
        if (playIcon) playIcon.innerHTML = `<path d="M8 5v14l11-7z" />`;
        
        _timerSaveSession();
    } else {
        // STARTING
        _timerRunning = true;
        
        if (playBtn) playBtn.classList.remove('paused');
        if (playIcon) playIcon.innerHTML = `<rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />`;
        
        _timerInterval = setInterval(() => {
            _timerElapsed++;
            _timerUpdateDisplay();
        }, 1000);
    }
    _timerUpdateDisplay();
};

// Reset timer
window.timerReset = function() {
    clearInterval(_timerInterval);
    _timerRunning = false;
    
    const playBtn = document.getElementById('timerPlayBtn');
    const playIcon = document.getElementById('timerPlayIcon');
    
    if (playBtn) playBtn.classList.add('paused');
    if (playIcon) playIcon.innerHTML = `<path d="M8 5v14l11-7z" />`;

    const elapsed = _timerElapsed;
    _timerElapsed = 0;
    _timerUpdateDisplay();

    if (elapsed >= 60 && _currentGoalId) {
        _sessionCount++;
        const badge = document.getElementById('timerSessionBadge');
        if (badge) badge.textContent = _sessionCount;

        const minutes = Math.round(elapsed / 60);

        api.post(`/stats/goal/${_currentGoalId}`, { duration_minutes: minutes })
            .catch(() => Toast.error('Failed to save session'));
    }
};

// ============================================
// PAGE LIFECYCLE - Save session on unload
// ============================================

window.addEventListener('beforeunload', (e) => {
    // Only save if timer is running or has elapsed time
    if (_timerRunning || (_timerElapsed > 0 && _timerElapsed < 60)) {
        // Stop the timer
        clearInterval(_timerInterval);
        _timerRunning = false;
        
        // Save any partial session (even < 60 seconds)
        if (_timerElapsed > 0 && _currentGoalId) {
            const minutes = Math.round(_timerElapsed / 60);

            // Use synchronous beacon API for best effort save
            navigator.sendBeacon(
                `/stats/goal/${_currentGoalId}`,
                JSON.stringify({ duration_minutes: Math.max(1, minutes) })
            );
        }
    }
});

// ============================================
// EXPORTS
// ============================================

window.renderTimerPage = renderTimerPage;
