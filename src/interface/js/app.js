

// Core
import './core/api.js';
import './core/router.js';

// Services
import './services/auth.service.js';
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

// Shared layout (depends on router, authService, goalsService)
// Note: goalsService is loaded later — layout functions that call it are
// only invoked asynchronously after all modules have executed.
import './components/layout.js';

// Auth pages
import './pages/auth/login.js';
import './pages/auth/register.js';
import './pages/auth/verify.js';
import './pages/auth/forgot-password.js';
import './pages/auth/reset-password.js';

// App pages
import './pages/dashboard.js';
import './pages/goals.js';        // defines goalsService + renderProjects + renderCompleted
import './pages/add-goal.js';
import './pages/goal-detail.js';
import './pages/timer.js';        // Timer page
import './pages/profile.js';
import './pages/statistics.js';

// Global components
import './components/focus-modal.js'; // Global focus modal (can open from anywhere)
import './components/help-center.js'; // Help Center modal

// Expose app container
const appContainer = document.getElementById('app');
window.appContainer = appContainer;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    if (authService && authService.isAuthed()) {
        authService.fetchUser().catch(err => console.error('Failed to fetch user:', err));
    }
});

// ============================================
// ROUTE REGISTRATIONS
// ============================================

router.on('/login',           () => renderLogin());
router.on('/register',        () => renderRegister());
router.on('/verify',          () => renderVerification());
router.on('/forgot-password', () => renderForgotPassword());
router.on('/reset-password',  () => renderResetPassword());

router.on('/app', protectedRoute(() => renderDashboard()));

router.on('/projects',  protectedRoute(() => renderProjects()));
router.on('/statistics',protectedRoute(() => renderStatistics()));
router.on('/completed', protectedRoute(() => renderCompleted()));

router.on('/goal/:id',    protectedRoute((params) => renderGoal(params.id)));
router.on('/timer/:id',   protectedRoute((params) => renderTimerPage(params.id)));

router.on('/', () => {
    if (authService && authService.isAuthed()) {
        router.navigate('/app');
    } else {
        router.navigate('/login');
    }
});

// Handle current route
router.handleRoute();
