

// Focus Modal State
window.__focusWindowMode = window.__focusWindowMode || false;
let _focusModalGoalId = null;
let _focusModalGoal = null;
let _focusTimerInterval = null;
let _focusTimerRunning = false;
let _focusTimerElapsed = 0;           // cumulative elapsed (loaded + new work)
let _focusSessionStart = 0;           // elapsed at start of THIS session (for delta)
let _focusPersistedElapsed = 0;       // persisted/logged elapsed (used by overall project bar)
let _focusTimerGoalSeconds = 0;
let _focusSessionCount = 1;
let _focusSegmentDurations = [0, 0, 0];
let _focusCurrentSegmentIndex = 0;
let _focusBreakPending = false;
let _focusPlayCanvas = null;
let _focusPlayCtx = null;
let _focusPlayFrame = 0;
let _focusPlayTime = 0;
let _focusPlayTransition = 0;
let _focusPlayTarget = 0;
let _focusPlayCanvasSize = 0;
let _focusRingFrame = 0;
let _focusRingVisualElapsed = 0;
let _focusRingLastTickMs = 0;

const FOCUS_RING_RADIUS = 252;
const FOCUS_RING_CIRCUMFERENCE = 2 * Math.PI * FOCUS_RING_RADIUS;
const FOCUS_POMODORO_SEGMENTS = 3;
const FOCUS_RING_SEGMENT_GAP = 62;
const FOCUS_RING_SEGMENT_LENGTH = (FOCUS_RING_CIRCUMFERENCE - (FOCUS_POMODORO_SEGMENTS * FOCUS_RING_SEGMENT_GAP)) / FOCUS_POMODORO_SEGMENTS;
const FOCUS_RING_ROTATION_BASE = -90;
const FOCUS_BTN_VIS_RINGS = [
    { offset: 3, maxH: 12.0, opacity: 0.42, speed: 3.2, sat: '7,182,213' },
    { offset: 2, maxH: 6.0, opacity: 0.38, speed: 2.8, sat: '0,160,200' },
    { offset: 1, maxH: 4.2, opacity: 0.34, speed: 2.0, sat: '0,140,190' },
];
const FOCUS_BTN_VIS_WAVES = [
    { freq: 2.0, speed: 0.018, amp: 1.0, phase: 0 },
    { freq: 3.0, speed: -0.014, amp: 0.85, phase: 1.8 },
];
const FOCUS_BTN_VIS_SEGMENTS = 100;

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

function _focusBuildSegmentDurations(totalSeconds) {
    const safeTotal = Math.max(1, totalSeconds);
    const base = Math.floor(safeTotal / FOCUS_POMODORO_SEGMENTS);
    const remainder = safeTotal % FOCUS_POMODORO_SEGMENTS;
    return Array.from({ length: FOCUS_POMODORO_SEGMENTS }, (_, i) => base + (i < remainder ? 1 : 0));
}

function _focusGetSegmentStart(index) {
    let start = 0;
    for (let i = 0; i < index; i++) {
        start += _focusSegmentDurations[i] || 0;
    }
    return start;
}

function _focusGetSegmentEnd(index) {
    return _focusGetSegmentStart(index) + (_focusSegmentDurations[index] || 0);
}

function _focusSyncSegmentStateFromElapsed() {
    if (_focusTimerElapsed >= _focusTimerGoalSeconds) {
        // Keep the last segment active so timer can overflow past goal without stopping.
        _focusCurrentSegmentIndex = Math.max(0, FOCUS_POMODORO_SEGMENTS - 1);
        _focusBreakPending = false;
        return;
    }

    let matched = false;
    for (let i = 0; i < FOCUS_POMODORO_SEGMENTS; i++) {
        if (_focusTimerElapsed < _focusGetSegmentEnd(i)) {
            _focusCurrentSegmentIndex = i;
            matched = true;
            break;
        }
    }

    if (!matched) {
        _focusCurrentSegmentIndex = FOCUS_POMODORO_SEGMENTS;
        _focusBreakPending = false;
        return;
    }

    const currentStart = _focusGetSegmentStart(_focusCurrentSegmentIndex);
    _focusBreakPending = _focusTimerElapsed > 0 && _focusTimerElapsed === currentStart;
}

function _focusRingSegmentRotation(index) {
    const segmentOffsetLength = index * (FOCUS_RING_SEGMENT_LENGTH + FOCUS_RING_SEGMENT_GAP);
    return FOCUS_RING_ROTATION_BASE + ((segmentOffsetLength / FOCUS_RING_CIRCUMFERENCE) * 360);
}

function _focusInitSegmentedRing() {
    for (let i = 0; i < FOCUS_POMODORO_SEGMENTS; i++) {
        const track = document.getElementById(`focusRingTrackSegment${i}`);
        const fill = document.getElementById(`focusRingFillSegment${i}`);
        const rotation = _focusRingSegmentRotation(i);

        if (track) {
            track.style.strokeDasharray = `${FOCUS_RING_SEGMENT_LENGTH} ${FOCUS_RING_CIRCUMFERENCE}`;
            track.style.transform = `rotate(${rotation}deg)`;
        }

        if (fill) {
            fill.style.strokeDasharray = `0 ${FOCUS_RING_CIRCUMFERENCE}`;
            fill.style.transform = `rotate(${rotation}deg)`;
            fill.style.opacity = '0';
        }
    }
}

function _drawRoundedRect(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
}

function _focusButtonWaveHeight(i, speedMult, maxH) {
    const a = (i / FOCUS_BTN_VIS_SEGMENTS) * Math.PI * 2;
    let h = 0;
    for (const w of FOCUS_BTN_VIS_WAVES) {
        h += w.amp * Math.max(0, Math.sin(a * w.freq + _focusPlayTime * w.speed * speedMult + w.phase));
    }
    return Math.min(h * 2.6, maxH);
}

function _drawFocusButtonRing(ctx, ring, centerX, centerY, baseR, waveBlend) {
    const r0 = baseR + ring.offset;
    const step = (Math.PI * 2) / FOCUS_BTN_VIS_SEGMENTS;
    ctx.beginPath();
    for (let i = 0; i <= FOCUS_BTN_VIS_SEGMENTS; i++) {
        const angle = i * step - Math.PI / 2;
        const dynamicH = _focusButtonWaveHeight(i % FOCUS_BTN_VIS_SEGMENTS, ring.speed, ring.maxH);
        const h = 1 + dynamicH * waveBlend;
        const r = r0 + h;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(${ring.sat}, ${ring.opacity})`;
    ctx.fill();
}

function _easeInOutCubic(value) {
    const x = Math.max(0, Math.min(1, value));
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function _drawFocusButtonIcon(ctx, size) {
    const centerX = size / 2;
    const centerY = size / 2;
    const iconScaleBase = 0.62;
    const morph = _easeInOutCubic(_focusPlayTransition);

    // Phase 1: play triangle compresses/slides/rotates out.
    const triangleVisibility = 1 - Math.max(0, (morph - 0.35) / 0.65);
    if (triangleVisibility > 0.001) {
        const playScaleX = iconScaleBase * (1 - 0.58 * morph);
        const playScaleY = iconScaleBase * (1 - 0.12 * morph);
        const playShiftX = -2 + (morph * 7);
        const playRotation = (-14 * morph) * Math.PI / 180;
        ctx.save();
        ctx.globalAlpha = triangleVisibility;
        ctx.translate(centerX + playShiftX, centerY);
        ctx.rotate(playRotation);
        ctx.scale(Math.max(0.22, playScaleX), playScaleY);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(-10, -15);
        ctx.lineTo(16, 0);
        ctx.lineTo(-10, 15);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // Phase 2: pause bars reveal with a slight "pop".
    const barReveal = _easeInOutCubic(Math.max(0, (morph - 0.12) / 0.88));
    if (barReveal > 0.001) {
        const pauseScale = iconScaleBase;
        const pausePop = 1 + 0.08 * Math.sin(barReveal * Math.PI);
        const barWidth = 8 * barReveal;
        const barHeight = 28 * pausePop;
        const barGap = 8 + (1 - barReveal) * 8;
        const radius = 2 + (0.8 * barReveal);
        const leftX = -(barGap / 2 + barWidth);
        const rightX = barGap / 2;
        ctx.save();
        ctx.globalAlpha = 0.35 + (0.65 * barReveal);
        ctx.translate(centerX, centerY);
        ctx.scale(pauseScale, pauseScale);
        ctx.fillStyle = '#FFFFFF';
        _drawRoundedRect(ctx, leftX, -(barHeight / 2), barWidth, barHeight, radius);
        ctx.fill();
        _drawRoundedRect(ctx, rightX, -(barHeight / 2), barWidth, barHeight, radius);
        ctx.fill();
        ctx.restore();
    }
}

function _drawFocusPlayVisualizer() {
    if (!_focusPlayCanvas || !_focusPlayCtx || !_focusPlayCanvas.isConnected) {
        _focusPlayFrame = 0;
        return;
    }

    const size = _focusPlayCanvasSize || _focusPlayCanvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    const baseR = size * 0.29;
    const buttonR = size * 0.305;

    _focusPlayTransition += (_focusPlayTarget - _focusPlayTransition) * 0.18;
    const waveBlend = 0.12 + (_focusPlayTransition * 0.65);
    if (_focusPlayTarget > 0.001) {
        _focusPlayTime += 1;
    }

    _focusPlayCtx.clearRect(0, 0, size, size);
    _focusPlayCtx.save();
    _focusPlayCtx.globalCompositeOperation = 'lighter';
    for (let i = FOCUS_BTN_VIS_RINGS.length - 1; i >= 0; i--) {
        _drawFocusButtonRing(_focusPlayCtx, FOCUS_BTN_VIS_RINGS[i], centerX, centerY, baseR, waveBlend);
    }
    _focusPlayCtx.restore();

    _focusPlayCtx.beginPath();
    _focusPlayCtx.arc(centerX, centerY, baseR, 0, Math.PI * 2);
    _focusPlayCtx.strokeStyle = 'rgba(7,182,213,0.1)';
    _focusPlayCtx.lineWidth = 1;
    _focusPlayCtx.stroke();

    const g = _focusPlayCtx.createRadialGradient(centerX - size * 0.045, centerY - size * 0.045, 4, centerX, centerY, buttonR);
    g.addColorStop(0, 'rgb(7 182 213 / 0.56)');
    g.addColorStop(1, 'rgb(22 147 197 / 0.62)');
    _focusPlayCtx.beginPath();
    _focusPlayCtx.arc(centerX, centerY, buttonR, 0, Math.PI * 2);
    _focusPlayCtx.fillStyle = g;
    _focusPlayCtx.fill();

    _drawFocusButtonIcon(_focusPlayCtx, size);
    _focusPlayFrame = requestAnimationFrame(_drawFocusPlayVisualizer);
}

function _focusInitPlayButtonAnimation() {
    const canvas = document.getElementById('focusPlayVisualizer');
    if (!canvas) return;

    _focusPlayCanvas = canvas;
    _focusPlayCtx = canvas.getContext('2d');
    if (!_focusPlayCtx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = Math.max(96, Math.floor(canvas.getBoundingClientRect().width || 20));
    _focusPlayCanvasSize = size;
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    _focusPlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    _focusPlayTransition = _focusTimerRunning ? 1 : 0;
    _focusPlayTarget = _focusTimerRunning ? 1 : 0;
    if (_focusPlayFrame) {
        cancelAnimationFrame(_focusPlayFrame);
    }
    _focusPlayFrame = requestAnimationFrame(_drawFocusPlayVisualizer);
}

function _focusDestroyPlayButtonAnimation() {
    if (_focusPlayFrame) {
        cancelAnimationFrame(_focusPlayFrame);
    }
    _focusPlayFrame = 0;
    _focusPlayCanvas = null;
    _focusPlayCtx = null;
    _focusPlayCanvasSize = 0;
}

function _focusSetPlayButtonState(isPlaying) {
    _focusPlayTarget = isPlaying ? 1 : 0;
}

function _focusStopRingAnimation() {
    if (_focusRingFrame) {
        cancelAnimationFrame(_focusRingFrame);
    }
    _focusRingFrame = 0;
}

function _focusRenderRingFrame() {
    const now = performance.now();
    const currentSegmentEnd = _focusCurrentSegmentIndex < FOCUS_POMODORO_SEGMENTS
        ? _focusGetSegmentEnd(_focusCurrentSegmentIndex)
        : _focusTimerGoalSeconds;

    // Interpolate visual progress between whole-second ticks for smoother ring motion.
    const tickFraction = _focusTimerRunning
        ? Math.min(Math.max((now - _focusRingLastTickMs) / 1000, 0), 0.98)
        : 0;

    const targetVisualElapsed = Math.min(
        _focusTimerGoalSeconds,
        Math.max(0, Math.min(_focusTimerElapsed + tickFraction, currentSegmentEnd))
    );

    _focusRingVisualElapsed += (targetVisualElapsed - _focusRingVisualElapsed) * 0.24;
    if (Math.abs(targetVisualElapsed - _focusRingVisualElapsed) < 0.002) {
        _focusRingVisualElapsed = targetVisualElapsed;
    }

    _focusUpdateDisplay(_focusRingVisualElapsed);

    const shouldContinue = _focusTimerRunning || Math.abs(targetVisualElapsed - _focusRingVisualElapsed) > 0.002;
    if (shouldContinue) {
        _focusRingFrame = requestAnimationFrame(_focusRenderRingFrame);
    } else {
        _focusRingFrame = 0;
    }
}

function _focusStartRingAnimation() {
    _focusRingLastTickMs = performance.now();
    _focusRingVisualElapsed = _focusTimerElapsed;
    if (_focusRingFrame) return;
    _focusRingFrame = requestAnimationFrame(_focusRenderRingFrame);
}

async function _focusSaveSession() {
    // Calculate only the NEW work done this session (delta, not cumulative)
    const newElapsed = _focusTimerElapsed - _focusSessionStart;
    if (!_focusModalGoalId || newElapsed < 60) return;
    
    const minutes = Math.round(newElapsed / 60);
    try {

        await api.post(`/stats/goal/${_focusModalGoalId}`, { duration_minutes: minutes });
        _focusPersistedElapsed += (minutes * 60);
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
            _focusPersistedElapsed = _focusTimerElapsed;
            _focusSessionStart = _focusTimerElapsed;  // Set baseline so delta = 0 at start
            // Sync segment state and recalculate which segment we're in
            _focusSyncSegmentStateFromElapsed();
            // Restore visual ring state to match loaded elapsed time
            _focusRingVisualElapsed = _focusTimerElapsed;
            // Update session count based on which segment we're resuming in
            if (_focusCurrentSegmentIndex > 0) {
                _focusSessionCount = _focusCurrentSegmentIndex + 1;
            }

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
                    <button class="focus-modal-btn exit-btn" id="focusExitBtn" title="Close Focus Mode" onclick="window.closeFocusModal()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <!-- Modal Content -->
                <div class="focus-modal-content">
                    <div class="focus-modal-header">
                        <div class="focus-modal-project-name">${goal.title}</div>

                        <div class="focus-modal-session-info">
                            <span id="focusSessionTime">0h 0m 0s</span> / <span id="focusGoalTime">${_focusFmtTime(durationSec)}</span>
                        </div>
                        <div class="focus-modal-session-bar" id="focusSessionBar" style="--progress-percent: 0%;"></div>
                    </div>

                    <div class="focus-modal-ring-wrapper">
                        <svg class="focus-ring-svg" viewBox="0 0 520 520">
                            <circle id="focusRingTrackSegment0" class="focus-ring-segment-track" cx="260" cy="260" r="252" />
                            <circle id="focusRingTrackSegment1" class="focus-ring-segment-track" cx="260" cy="260" r="252" />
                            <circle id="focusRingTrackSegment2" class="focus-ring-segment-track" cx="260" cy="260" r="252" />
                            <circle id="focusRingFillSegment0" class="focus-ring-progress-segment" cx="260" cy="260" r="252" />
                            <circle id="focusRingFillSegment1" class="focus-ring-progress-segment" cx="260" cy="260" r="252" />
                            <circle id="focusRingFillSegment2" class="focus-ring-progress-segment" cx="260" cy="260" r="252" />
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

                        <button class="focus-modal-play-btn paused" id="focusPlayBtn" title="Play/Pause" onclick="window.focusToggle()">
                            <canvas id="focusPlayVisualizer" class="focus-play-visualizer-canvas" aria-hidden="true"></canvas>
                        </button>

                        <button class="focus-modal-control-btn" title="Next Segment" onclick="window.focusNextSegment()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M5 5v14"></path>
                                <path d="M19 12 8 5v14z"></path>
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
    _focusBreakPending = false;
    _focusCurrentSegmentIndex = 0;
    _focusPersistedElapsed = 0;
    _focusRingVisualElapsed = 0;
    _focusRingLastTickMs = 0;

    if (_focusTimerInterval) { clearInterval(_focusTimerInterval); }
    _focusDestroyPlayButtonAnimation();
    _focusStopRingAnimation();

    try {
        const goal = await goalsService.fetchGoal(_focusModalGoalId);
        _focusModalGoal = goal;
        _focusTimerGoalSeconds = (goal.duration_min || 150) * 60;
    } catch (_) {
        _focusModalGoal = { title: `Project ${_focusModalGoalId}`, duration_min: 150 };
        _focusTimerGoalSeconds = 150 * 60;
    }
    _focusSegmentDurations = _focusBuildSegmentDurations(_focusTimerGoalSeconds);

    // Render modal IMMEDIATELY without waiting for stats (show fast)
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

    _focusInitSegmentedRing();
    _focusUpdateDisplay();
    _focusInitPlayButtonAnimation();
    window.focusToggle();

    // Load today's session in the background (non-blocking)
    _focusLoadTodaySession().then(() => {
        // Update display after stats load
        _focusUpdateDisplay();
    });
};

window.closeFocusModal = async function() {
    const goalId = _focusModalGoalId;
    const isWindowMode = !!window.__focusWindowMode;

    // Stop the timer and save session
    if (_focusTimerRunning) {
        clearInterval(_focusTimerInterval);
        _focusTimerRunning = false;
        const playBtn  = document.getElementById('focusPlayBtn');
        if (playBtn)  playBtn.classList.add('paused');
        _focusSetPlayButtonState(false);
        _focusStopRingAnimation();
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
    _focusCurrentSegmentIndex = 0;
    _focusBreakPending = false;
    _focusPersistedElapsed = 0;
    _focusRingVisualElapsed = 0;
    _focusRingLastTickMs = 0;
    _focusDestroyPlayButtonAnimation();
    _focusStopRingAnimation();

    if (isWindowMode && window.bridge && typeof window.bridge.emit === 'function') {
        window.bridge.emit('timer:close_window', { goal_id: goalId });
    }
};

window.focusToggle = function() {
    const playBtn = document.getElementById('focusPlayBtn');

    const pauseTimer = () => {
        clearInterval(_focusTimerInterval);
        _focusTimerRunning = false;
        if (playBtn) playBtn.classList.add('paused');
        _focusSetPlayButtonState(false);
        _focusStopRingAnimation();
    };

    if (_focusTimerRunning) {
        pauseTimer();

        _focusSaveSession();
    } else {
        _focusBreakPending = false;
        _focusTimerRunning = true;
        _focusRingLastTickMs = performance.now();

        if (playBtn) playBtn.classList.remove('paused');
        _focusSetPlayButtonState(true);
        _focusStartRingAnimation();

        _focusTimerInterval = setInterval(() => {
            _focusTimerElapsed++;
            _focusRingLastTickMs = performance.now();

            _focusSyncSegmentStateFromElapsed();

            _focusUpdateDisplay();
        }, 1000);
    }

    _focusUpdateDisplay();
};

window.focusReset = function() {
    clearInterval(_focusTimerInterval);
    _focusTimerRunning = false;
    _focusStopRingAnimation();

    const playBtn = document.getElementById('focusPlayBtn');

    if (playBtn) playBtn.classList.add('paused');
    _focusSetPlayButtonState(false);

    const elapsed = _focusTimerElapsed;
    const pendingDelta = _focusTimerElapsed - _focusSessionStart;
    _focusTimerElapsed = 0;
    _focusCurrentSegmentIndex = 0;
    _focusBreakPending = false;
    _focusSessionStart = 0;
    _focusRingVisualElapsed = 0;
    _focusRingLastTickMs = 0;
    _focusUpdateDisplay();

    if (pendingDelta >= 60 && _focusModalGoalId) {
        const minutes = Math.round(pendingDelta / 60);
        api.post(`/stats/goal/${_focusModalGoalId}`, { duration_minutes: minutes })
            .catch(() => Toast.error('Failed to save session'));
        _focusPersistedElapsed += (minutes * 60);
        _focusSessionStart = _focusTimerElapsed;

        _focusSessionCount++;
    } else if (elapsed >= 60) {
        _focusSessionCount++;
    }
};

window.focusNextSegment = function() {
    if (_focusCurrentSegmentIndex >= FOCUS_POMODORO_SEGMENTS) {
        _focusCurrentSegmentIndex = Math.max(0, FOCUS_POMODORO_SEGMENTS - 1);
    }

    const wasRunning = _focusTimerRunning;
    if (_focusTimerRunning) {
        clearInterval(_focusTimerInterval);
        _focusTimerRunning = false;
        _focusSetPlayButtonState(false);
        _focusStopRingAnimation();
    }

    const playBtn = document.getElementById('focusPlayBtn');
    if (playBtn) {
        playBtn.classList.add('paused');
    }

    // Skip current segment completely and DO NOT save skipped time.
    const beforeSkipElapsed = _focusTimerElapsed;
    const currentEnd = _focusGetSegmentEnd(_focusCurrentSegmentIndex);
    _focusTimerElapsed = Math.min(currentEnd, _focusTimerGoalSeconds);
    _focusRingVisualElapsed = _focusTimerElapsed;
    const skippedSeconds = Math.max(0, _focusTimerElapsed - beforeSkipElapsed);
    _focusSessionStart = Math.min(_focusTimerElapsed, _focusSessionStart + skippedSeconds);

    _focusCurrentSegmentIndex = Math.min(_focusCurrentSegmentIndex + 1, Math.max(0, FOCUS_POMODORO_SEGMENTS - 1));
    _focusBreakPending = _focusCurrentSegmentIndex < FOCUS_POMODORO_SEGMENTS;

    _focusBreakPending = false;

    _focusUpdateDisplay();

    // Keep flow predictable: if timer was running, continue on next segment.
    if (wasRunning) {
        window.focusToggle();
    }
};

function _focusUpdateDisplay(visualElapsed = _focusTimerElapsed) {
    const safeGoal = Math.max(1, _focusTimerGoalSeconds);
    const totalProgressPercent = Math.min((_focusPersistedElapsed / safeGoal) * 100, 100);
    const activeSegmentIndex = Math.min(_focusCurrentSegmentIndex, FOCUS_POMODORO_SEGMENTS - 1);
    const segmentStart = _focusGetSegmentStart(activeSegmentIndex);
    const segmentDuration = Math.max(1, _focusSegmentDurations[activeSegmentIndex] || 1);
    const segmentElapsed = Math.max(0, Math.min(_focusTimerElapsed - segmentStart, segmentDuration));
    const ringElapsed = Math.max(0, Math.min(visualElapsed, _focusTimerGoalSeconds));

    // Time display
    const timeDisplay = document.getElementById('focusTimeDisplay');
    if (timeDisplay) {
        const remaining = _focusCurrentSegmentIndex >= FOCUS_POMODORO_SEGMENTS
            ? 0
            : Math.max(0, segmentDuration - segmentElapsed);
        timeDisplay.textContent = _focusFmtTimeDisplay(remaining);
    }

    // Session info
    const sessionTime = document.getElementById('focusSessionTime');
    if (sessionTime) {
        sessionTime.textContent = _focusFmtTime(_focusTimerElapsed);
    }

    // Progress bar (overall)
    const bar = document.getElementById('focusSessionBar');
    if (bar) {
        bar.style.setProperty('--progress-percent', `${totalProgressPercent}%`);
    }

    // Ring progress (per segment)
    for (let i = 0; i < FOCUS_POMODORO_SEGMENTS; i++) {
        const segmentFill = document.getElementById(`focusRingFillSegment${i}`);
        if (!segmentFill) continue;

        const start = _focusGetSegmentStart(i);
        const end = _focusGetSegmentEnd(i);
        let pct = 0;
        if (ringElapsed >= end) {
            pct = 1;
        } else if (ringElapsed > start) {
            pct = (ringElapsed - start) / Math.max(1, end - start);
        }

        const filledLength = Math.max(0, Math.min(1, pct)) * FOCUS_RING_SEGMENT_LENGTH;
        segmentFill.style.strokeDasharray = `${filledLength} ${FOCUS_RING_CIRCUMFERENCE}`;
        segmentFill.style.opacity = filledLength > 0.6 ? '1' : '0';
        segmentFill.classList.toggle(
            'active',
            _focusTimerRunning && i === _focusCurrentSegmentIndex && filledLength > 0.6
        );
    }

    // Status label
    const status = document.getElementById('focusStatusLabel');
    if (status) {
        if (_focusTimerRunning) {
            status.textContent = 'FOCUS';
        } else if (_focusBreakPending) {
            status.textContent = 'BREAK';
        } else {
            status.textContent = 'PAUSED';
        }
    }

    // Session badge
    const badge = document.getElementById('focusSessionBadge');
    if (badge) {
        badge.textContent = `${Math.min(_focusCurrentSegmentIndex + 1, FOCUS_POMODORO_SEGMENTS)}`;
    }
}

window.focusUpdateDisplay = _focusUpdateDisplay;

// ============================================
// PAGE LIFECYCLE - Save session on unload
// ============================================

window.addEventListener('beforeunload', () => {
    // Only save if focus modal is open and timer is running
    const overlay = document.getElementById('focusModalOverlay');
    const isModalOpen = overlay && overlay.classList.contains('active');
    
    if (isModalOpen && (_focusTimerRunning || _focusTimerElapsed > _focusSessionStart)) {
        // Stop the timer
        clearInterval(_focusTimerInterval);
        _focusTimerRunning = false;
        
        // Save any partial session (even < 60 seconds)
        const newElapsed = _focusTimerElapsed - _focusSessionStart;
        if (newElapsed > 0 && _focusModalGoalId) {
            const minutes = Math.round(newElapsed / 60);

            // Use synchronous beacon API for best effort save
            navigator.sendBeacon(
                `/stats/goal/${_focusModalGoalId}`,
                JSON.stringify({ duration_minutes: Math.max(1, minutes) })
            );
        }
    }
});

// ============================================
// WALLPAPER INITIALIZATION
// ============================================

function _initializeWallpaper() {
    // Get wallpaper path from URL query parameter
    const params = new URLSearchParams(window.location.search);
    const wallpaperB64 = params.get('wallpaper_b64');
    const wallpaperMtime = params.get('wallpaper_mtime') || '';
    const wallpaperNonce = params.get('wallpaper_nonce') || '';

    let wallpaperPath = null;
    if (wallpaperB64) {
        try {
            const normalized = wallpaperB64.replace(/-/g, '+').replace(/_/g, '/');
            const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
            wallpaperPath = atob(padded);
        } catch (err) {
            console.error('Failed to decode wallpaper path from query:', err);
        }
    }

    if (wallpaperPath) {
        // Convert Windows path to file:// URL for CSS
        // Replace backslashes with forward slashes
        const normalizedPath = wallpaperPath.replace(/\\/g, '/').replace(/^\/+/, '');
        let fileUrl = `file:///${encodeURI(normalizedPath)}`;
        const version = `${wallpaperMtime}:${wallpaperNonce}`;
        if (version !== ':') {
            fileUrl = `${fileUrl}?v=${encodeURIComponent(version)}`;
        }

        // Set CSS variable on root for modal to use
        document.documentElement.style.setProperty('--modal-bg-image', `url("${fileUrl}")`);
        console.log('Wallpaper loaded:', fileUrl);
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', _initializeWallpaper);
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initializeWallpaper);
} else {
    _initializeWallpaper();
}

