// Core
import './core/config.js';
import './core/api.js';
import './core/template-loader.js';
import './core/renderer.js';
import './core/router.js';

// Services
import './services/auth.service.js';
import './services/goals.service.js';
import './services/stats-manager.js';
import './services/color-manager.js';
import './services/bridge.service.js';
import wallpaperManager from './services/wallpaper-manager.js';

// Initialize background wallpaper if provided
wallpaperManager.init();

// Core (depends on authService + router)
import './core/route-protection.js';

// UI components
import './components/toast.js';
import './components/spinner.js';
import './components/error-message.js';
import './components/timer.js';
import './components/layout.js';
import './components/add-goal.js';
import './components/profile.js';
import './components/focus-modal.js';
import './components/help-center.js';

// Views
import { initLoginView }          from './views/login.view.js';
import { initRegisterView }       from './views/register.view.js';
import { initVerifyView }         from './views/verify.view.js';
import { initForgotPasswordView } from './views/forgot-password.view.js';
import { initResetPasswordView }  from './views/reset-password.view.js';
import { initProjectsView }       from './views/projects.view.js';
import { initCompletedView }      from './views/completed.view.js';
import { initGoalDetailView }     from './views/goal-detail.view.js';
import { initFocusWindowView }    from './views/focus-window.view.js';
import { initStatisticsView }     from './views/statistics.view.js';
import { initPomodoroView }       from './views/pomodoro.view.js';

// Shared password visibility toggle (used by login, register, reset-password templates)
window.togglePassword = function(inputId, btn) {
    const input = document.getElementById(inputId);
    const img   = btn.querySelector('img');
    if (input.type === 'password') {
        input.type = 'text';
        img.src    = 'assets/icons/streamline-plump_invisible-2-remix.svg';
    } else {
        input.type = 'password';
        img.src    = 'assets/icons/wpf_invisible.svg';
    }
};

const _authStartupDebugBuffer = [];
let _authStartupDebugSeq = 0;

function _waitForBridgeReady(timeoutMs = 6000) {
    if (window.bridge && typeof window.bridge.request === 'function') {
        return Promise.resolve(true);
    }

    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            window.removeEventListener('bridge:ready', onReady);
            resolve(false);
        }, timeoutMs);

        function onReady(event) {
            if (!event?.detail?.connected || !window.bridge || typeof window.bridge.request !== 'function') {
                return;
            }
            clearTimeout(timer);
            window.removeEventListener('bridge:ready', onReady);
            resolve(true);
        }

        window.addEventListener('bridge:ready', onReady);
    });
}

window.flushAuthStartupDebug = function(reason = 'flush') {
    if (!window.bridge || typeof window.bridge.emit !== 'function') return;
    while (_authStartupDebugBuffer.length) {
        const payload = _authStartupDebugBuffer.shift();
        window.bridge.emit('auth:debug', { ...payload, flushReason: reason });
    }
};

window.authStartupDebug = function(stage, extra = {}) {
    const payload = {
        seq: ++_authStartupDebugSeq,
        stage,
        ts: new Date().toISOString(),
        route: window.location.hash.slice(1) || '/',
        localStorageKeyCount: localStorage.length,
        localStorageKeys: Object.keys(localStorage).slice(0, 20),
        hasSessionToken: !!localStorage.getItem('session_token'),
        hasAccessToken: !!localStorage.getItem('access_token'),
        hasRefreshToken: !!localStorage.getItem('refresh_token'),
        authExpiresAt: localStorage.getItem('auth_expires_at') || null,
        ...extra,
    };

    console.info('[AUTH-STARTUP]', payload);
    if (window.bridge && typeof window.bridge.emit === 'function') {
        window.bridge.emit('auth:debug', payload);
        window.flushAuthStartupDebug('bridge-live');
    } else {
        _authStartupDebugBuffer.push(payload);
    }
};

window.addEventListener('bridge:ready', (event) => {
    const connected = !!event?.detail?.connected;
    window.authStartupDebug('bridge:ready', { connected });
    if (connected) {
        window.flushAuthStartupDebug('bridge-ready-event');
    }
});

window.addEventListener('app:ack', () => {
    window.flushAuthStartupDebug('app-ack');
});

async function _bootstrapDesktopSession() {
    window.authStartupDebug('bootstrap:desktop-session:start');
    const bridgeReady = await _waitForBridgeReady();
    window.authStartupDebug('bootstrap:desktop-session:bridge-ready', { bridgeReady });
    if (!bridgeReady) return;

    try {
        const session = await api.get('/auth/session');
        const hasSession = !!(session && (session.session_token || session.access_token || session.refresh_token));
        window.authStartupDebug('bootstrap:desktop-session:received', {
            hasSession,
            hasUser: !!session?.user,
        });
        if (hasSession && authService && typeof authService.bootstrapFromDesktopSession === 'function') {
            authService.bootstrapFromDesktopSession(session);
        }
    } catch (err) {
        window.authStartupDebug('bootstrap:desktop-session:error', {
            message: String(err?.message || err),
        });
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.authStartupDebug('dom:ready');
    const authed = !!(authService && authService.isAuthed());
    window.authStartupDebug('dom:isAuthed', { authed });

    if (authed) {
        authService.restoreSession()
            .then((user) => {
                window.authStartupDebug('dom:restoreSession:ok', {
                    userId: user?.id || null,
                });
            })
            .catch((err) => {
                window.authStartupDebug('dom:restoreSession:error', {
                    message: String(err?.message || err),
                });
                console.error('Failed to restore session:', err);
            });
    }
});

window.startTimerForGoal = async function(goalId) {
    const parsedGoalId = parseInt(goalId, 10);
    if (!parsedGoalId) return;

    let durationSeconds = 150 * 60;
    try {
        const goal = await goalsService.fetchGoal(parsedGoalId);
        const durationMin = Math.max(1, parseInt(goal?.duration_min || 150, 10));
        durationSeconds = durationMin * 60;
    } catch (_) {
        // Keep fallback duration when goal lookup fails.
    }

    if (window.bridge && typeof window.bridge.emit === 'function') {
        const payload = {
            goal_id: parsedGoalId,
            duration_seconds: durationSeconds,
            autostart: true,
            source: 'ui',
        };
        window.bridge.emit('timer:start', payload);
        window.bridge.emit('timer:open_window', payload);
        return;
    }

    if (typeof window.openFocusModal === 'function') {
        window.openFocusModal(parsedGoalId);
    }
};

window.addEventListener('goal:open_detail', (event) => {
    if (window.__focusWindowMode) return;
    const goalId = event?.detail?.goal_id;
    if (!goalId) return;
    router.navigate(`/goal/${goalId}`);
});

// ============================================
// ROUTE REGISTRATIONS
// ============================================

router.on('/login',           () => renderer.render('pages/login.html',           initLoginView));
router.on('/register',        () => renderer.render('pages/register.html',        initRegisterView));
router.on('/verify',          () => renderer.render('pages/verify.html',          initVerifyView));
router.on('/forgot-password', () => renderer.render('pages/forgot-password.html', initForgotPasswordView));
router.on('/reset-password',  () => renderer.render('pages/reset-password.html',  initResetPasswordView));

router.on('/app',        protectedRoute(() => router.navigate('/projects')));
router.on('/projects',   protectedRoute(() => renderer.render('pages/projects.html',  initProjectsView,   {}, { layout: '/projects'  })));
router.on('/statistics', protectedRoute(() => renderer.render('pages/statistics.html', initStatisticsView, {}, { layout: '/statistics' })));
router.on('/completed',  protectedRoute(() => renderer.render('pages/completed.html',  initCompletedView,  {}, { layout: '/completed'  })));
router.on('/pomodoro',   protectedRoute(() => renderer.render('pages/pomodoro.html',   initPomodoroView,   {}, { layout: '/pomodoro'   })));

router.on('/goal/:id',  protectedRoute((params) => renderer.render('pages/goal-detail.html', initGoalDetailView, params, { layout: `/goal/${params.id}`  })));
router.on('/focus/:id',  protectedRoute((params) => renderer.render('pages/focus-window.html', initFocusWindowView, params)));

router.on('/', () => {
    if (authService && authService.isAuthed()) {
        window.authStartupDebug('route:/:redirect', { to: '/app', reason: 'isAuthed-true' });
        router.navigate('/app');
    } else {
        window.authStartupDebug('route:/:redirect', { to: '/login', reason: 'isAuthed-false' });
        router.navigate('/login');
    }
});

// Handle current route
(async () => {
    await _bootstrapDesktopSession();
    window.authStartupDebug('router:handleRoute:start');
    router.handleRoute();
})();
