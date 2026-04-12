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
import { initTimerView }          from './views/timer.view.js';
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

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    if (authService && authService.isAuthed()) {
        authService.fetchUser().catch(err => console.error('Failed to fetch user:', err));
    }
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
router.on('/timer/:id', protectedRoute((params) => renderer.render('pages/timer.html',       initTimerView,      params, { layout: `/timer/${params.id}` })));

router.on('/', () => {
    if (authService && authService.isAuthed()) {
        router.navigate('/app');
    } else {
        router.navigate('/login');
    }
});

// Handle current route
router.handleRoute();
