export default class PomodoroStateMachine {
    static WORK_DURATION           = 25 * 60;   // seconds
    static SHORT_BREAK_DURATION    = 5  * 60;
    static LONG_BREAK_DURATION     = 15 * 60;
    static CYCLES_BEFORE_LONG_BREAK = 4;

    constructor() {
        this._state         = 'idle';   // idle | work | short-break | long-break | paused
        this._prevState     = null;     // state before pause
        this._cycleCount    = 0;        // completed work sessions
        this._timeRemaining = PomodoroStateMachine.WORK_DURATION;
        this._interval      = null;
        this._callbacks     = {};
    }

    // ── Public API ────────────────────────────────────────────────────────────

    toggle() {
        if (this._state === 'idle' || this._state === 'paused') {
            this._start();
        } else {
            this._pause();
        }
    }

    skip() {
        this._stopInterval();
        this._advance();
    }

    reset() {
        this._stopInterval();
        this._state         = 'idle';
        this._prevState     = null;
        this._cycleCount    = 0;
        this._timeRemaining = PomodoroStateMachine.WORK_DURATION;
        this._emit('stateChange', this._state);
        this._emit('tick', this._timeRemaining);
    }

    on(event, fn) {
        this._callbacks[event] = fn;
    }

    destroy() {
        this._stopInterval();
    }

    getState()         { return this._state; }
    getCycleCount()    { return this._cycleCount; }
    getTimeRemaining() { return this._timeRemaining; }

    // ── Internals ─────────────────────────────────────────────────────────────

    _start() {
        if (this._state === 'idle') {
            this._state = 'work';
            this._timeRemaining = PomodoroStateMachine.WORK_DURATION;
        } else if (this._state === 'paused') {
            this._state = this._prevState;
        }
        this._emit('stateChange', this._state);
        this._startInterval();
    }

    _pause() {
        this._prevState = this._state;
        this._state     = 'paused';
        this._stopInterval();
        this._emit('stateChange', this._state);
    }

    _startInterval() {
        this._stopInterval();
        this._interval = setInterval(() => {
            this._timeRemaining--;
            this._emit('tick', this._timeRemaining);
            if (this._timeRemaining <= 0) {
                this._advance();
            }
        }, 1000);
    }

    _stopInterval() {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
    }

    _advance() {
        this._stopInterval();

        if (this._state === 'work') {
            this._cycleCount++;
            this._emit('cycleComplete', this._cycleCount);

            const isLongBreak =
                this._cycleCount % PomodoroStateMachine.CYCLES_BEFORE_LONG_BREAK === 0;

            if (isLongBreak) {
                this._state         = 'long-break';
                this._timeRemaining = PomodoroStateMachine.LONG_BREAK_DURATION;
            } else {
                this._state         = 'short-break';
                this._timeRemaining = PomodoroStateMachine.SHORT_BREAK_DURATION;
            }
        } else {
            // Any break → back to work
            this._state         = 'work';
            this._timeRemaining = PomodoroStateMachine.WORK_DURATION;
        }

        this._emit('stateChange', this._state);
        this._startInterval();
    }

    _emit(event, ...args) {
        if (typeof this._callbacks[event] === 'function') {
            this._callbacks[event](...args);
        }
    }
}
