/**
 * Pomodoro View — wires up the PomodoroStateMachine to the pomodoro template.
 */

import PomodoroStateMachine from '../core/pomodoro.js';

const RING_RADIUS        = 252;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const STATE_LABELS = {
    'work':        'FOCUS',
    'short-break': 'SHORT BREAK',
    'long-break':  'LONG BREAK',
    'idle':        'READY',
    'paused':      'PAUSED',
};

const STATE_DURATIONS = {
    'work':        25 * 60,
    'short-break': 5  * 60,
    'long-break':  15 * 60,
    'idle':        25 * 60,
    'paused':      25 * 60,
};

let _pomodoro = null;

function _fmtDisplay(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`;
}

function _updateUI(state, timeRemaining, cycleCount) {
    const stateLabel = document.getElementById('pomodoroStateLabel');
    if (stateLabel) stateLabel.textContent = STATE_LABELS[state] || state.toUpperCase();

    const timeDisplay = document.getElementById('pomodoroTimeDisplay');
    if (timeDisplay) timeDisplay.textContent = _fmtDisplay(timeRemaining);

    const cycleBadge = document.getElementById('pomodoroCycleBadge');
    if (cycleBadge) cycleBadge.textContent = cycleCount + 1;

    const totalDuration = STATE_DURATIONS[state] || STATE_DURATIONS['work'];
    const progress      = Math.min((1 - timeRemaining / totalDuration) * 100, 100);

    const arc = document.getElementById('pomodoroProgressArc');
    if (arc) {
        const offset = RING_CIRCUMFERENCE * (1 - progress / 100);
        arc.style.strokeDashoffset = offset;
    }

    // Highlight active tab
    document.getElementById('tabWork')?.classList.toggle('active', state === 'work' || state === 'idle');
    document.getElementById('tabShortBreak')?.classList.toggle('active', state === 'short-break');
    document.getElementById('tabLongBreak')?.classList.toggle('active', state === 'long-break');

    // Toggle play/pause icon
    const playIcon = document.getElementById('pomodoroPlayIcon');
    if (playIcon) {
        if (state === 'work' || state === 'short-break' || state === 'long-break') {
            // Running — show pause icon
            playIcon.innerHTML = `<rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />`;
        } else {
            // Idle / paused — show play icon
            playIcon.innerHTML = `<path d="M8 5v14l11-7z"></path>`;
        }
    }

    // Update cycle info text
    const info = document.getElementById('pomodoroCycleInfo');
    if (info) {
        const sessionNum  = cycleCount + 1;
        const stateText   = STATE_LABELS[state] || state;
        info.textContent  = `Cycle ${sessionNum} · ${stateText}`;
    }
}

export async function initPomodoroView() {
    _pomodoro = new PomodoroStateMachine();

    // Wire up renderer callbacks
    _pomodoro.on('tick', (timeRemaining) => {
        _updateUI(_pomodoro.getState(), timeRemaining, _pomodoro.getCycleCount());
    });

    _pomodoro.on('stateChange', (state) => {
        _updateUI(state, _pomodoro.getTimeRemaining(), _pomodoro.getCycleCount());
    });

    // Expose controls to the template
    window.pomodoroToggle = () => _pomodoro.toggle();
    window.pomodoroReset  = () => _pomodoro.reset();
    window.pomodoroSkip   = () => _pomodoro.skip();

    // Initial render
    _updateUI('idle', 25 * 60, 0);

    return () => {
        _pomodoro.destroy();
        _pomodoro = null;
    };
}
