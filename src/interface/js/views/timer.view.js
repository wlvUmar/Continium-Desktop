/**
 * Timer View — populates the timer template and manages the session timer.
 */

const RING_RADIUS        = 252;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

let _timerInterval     = null;
let _timerRunning      = false;
let _timerElapsed      = 0;
let _timerSessionStart = 0;
let _timerGoalSeconds  = 9000;
let _timerCurrentGoalId = null;
let _sessionCount      = 1;

function _fmtTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function _fmtTimeDisplay(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} : ${String(s).padStart(2, '0')}`;
}

async function _saveSession() {
    const newElapsed = _timerElapsed - _timerSessionStart;
    if (!_timerCurrentGoalId || newElapsed < 60) return;
    const minutes = Math.round(newElapsed / 60);
    try {
        await api.post(`/stats/goal/${_timerCurrentGoalId}`, { duration_minutes: minutes });
        _timerSessionStart = _timerElapsed;
        statsManager.invalidateCache(_timerCurrentGoalId);
    } catch (_) {
        Toast.error('Failed to save session');
    }
}

async function _loadTodaySession() {
    if (!_timerCurrentGoalId) return;
    try {
        const stats = await api.get(`/stats/goal/${_timerCurrentGoalId}`);
        if (!Array.isArray(stats)) return;
        const today = new Date().toISOString().split('T')[0];
        const todayMinutes = stats.reduce((sum, stat) => {
            return stat.occurred_at.split('T')[0] === today
                ? sum + (stat.duration_minutes || 0)
                : sum;
        }, 0);
        if (todayMinutes > 0) {
            _timerElapsed      = todayMinutes * 60;
            _timerSessionStart = _timerElapsed;
        }
    } catch (_) {}
}

function _updateDisplay() {
    const progress = Math.min((_timerElapsed / _timerGoalSeconds) * 100, 100);

    const timeDisplay = document.getElementById('timerTimeDisplay');
    if (timeDisplay) timeDisplay.textContent = _fmtTimeDisplay(_timerElapsed);

    const sessionTime = document.getElementById('timerSessionTime');
    if (sessionTime) sessionTime.textContent = _fmtTime(_timerElapsed);

    const bar = document.getElementById('timerSessionBar');
    if (bar) bar.style.setProperty('--progress-percent', progress + '%');

    const arc = document.getElementById('timerProgressArc');
    if (arc) {
        const offset = RING_CIRCUMFERENCE * (1 - Math.min(_timerElapsed / _timerGoalSeconds, 1));
        arc.style.strokeDashoffset = offset;
    }

    const status = document.getElementById('timerStatusLabel');
    if (status) status.textContent = _timerRunning ? 'FOCUS' : 'PAUSED';

    const badge = document.getElementById('timerSessionBadge');
    if (badge) badge.textContent = _sessionCount;
}

window.timerToggle = function() {
    const playBtn  = document.getElementById('timerPlayBtn');
    const playIcon = document.getElementById('timerPlayIcon');

    if (_timerRunning) {
        clearInterval(_timerInterval);
        _timerRunning = false;
        if (playBtn)  playBtn.classList.add('paused');
        if (playIcon) playIcon.innerHTML = `<path d="M8 5v14l11-7z" />`;
        _saveSession();
    } else {
        _timerRunning = true;
        if (playBtn)  playBtn.classList.remove('paused');
        if (playIcon) playIcon.innerHTML = `<rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />`;
        _timerInterval = setInterval(() => { _timerElapsed++; _updateDisplay(); }, 1000);
    }
    _updateDisplay();
};

window.timerReset = function() {
    clearInterval(_timerInterval);
    _timerRunning = false;

    const playBtn  = document.getElementById('timerPlayBtn');
    const playIcon = document.getElementById('timerPlayIcon');
    if (playBtn)  playBtn.classList.add('paused');
    if (playIcon) playIcon.innerHTML = `<path d="M8 5v14l11-7z" />`;

    const elapsed  = _timerElapsed;
    _timerElapsed  = 0;
    _updateDisplay();

    if (elapsed >= 60 && _timerCurrentGoalId) {
        _sessionCount++;
        api.post(`/stats/goal/${_timerCurrentGoalId}`, { duration_minutes: Math.round(elapsed / 60) })
            .catch(() => Toast.error('Failed to save session'));
    }
};

export async function initTimerView({ id }) {
    // Reset state
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    _timerRunning       = false;
    _timerElapsed       = 0;
    _timerSessionStart  = 0;
    _sessionCount       = 1;
    _timerCurrentGoalId = parseInt(id);

    let goal = { id, title: `Project ${id}`, duration_min: 150 };
    try {
        const fetched    = await goalsService.fetchGoal(id);
        goal             = fetched;
        _timerGoalSeconds = (goal.duration_min || 150) * 60;
    } catch (_) {
        _timerGoalSeconds = 9000;
    }

    await _loadTodaySession();

    const container = document.getElementById('timerEmbeddedContainer');
    if (container) {
        container.innerHTML = createTimerEmbedded(goal, _sessionCount, _timerCurrentGoalId);
    }

    _updateDisplay();

    const beforeUnload = (e) => {
        if (_timerRunning || _timerElapsed > 0) {
            clearInterval(_timerInterval);
            _timerRunning = false;
            if (_timerElapsed > 0 && _timerCurrentGoalId) {
                navigator.sendBeacon(
                    `/stats/goal/${_timerCurrentGoalId}`,
                    JSON.stringify({ duration_minutes: Math.max(1, Math.round(_timerElapsed / 60)) })
                );
            }
        }
    };
    window.addEventListener('beforeunload', beforeUnload);

    return () => {
        clearInterval(_timerInterval);
        window.removeEventListener('beforeunload', beforeUnload);
    };
}
