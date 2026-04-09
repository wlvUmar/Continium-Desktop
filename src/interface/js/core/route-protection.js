/**
 * Route Protection
 * Prevents unauthorized access to app routes
 */

// Check if user should access this route
function checkAuth(routePath) {
    const isAuthenticated = authService.isAuthed();
    const publicRoutes = ['/login', '/register', '/forgot-password', '/verify', '/reset-password'];
    
    // Strip query string for comparison
    const baseRoute = routePath.split('?')[0];
    const isPublicRoute = publicRoutes.includes(baseRoute);
    
    // Stop polling when on public routes or unauthenticated
    if (!isAuthenticated || isPublicRoute) {
        if (window.statsManager && typeof window.statsManager.stopPolling === 'function') {
            window.statsManager.stopPolling();
        }
    }

    // If not logged in and trying to access protected route
    if (!isAuthenticated && !isPublicRoute) {
        router.navigate('/login');
        return false;
    }
    
    // If logged in and trying to access login/register
    if (isAuthenticated && (routePath === '/login' || routePath === '/register')) {
        router.navigate('/app');
        return false;
    }
    
    return true;
}

// Wrap route handlers with auth check
function protectedRoute(handler) {
    return function(params) {
        const currentPath = window.location.hash.slice(1) || '/';
        
        if (checkAuth(currentPath)) {
            handler(params);
        }
    };
}

// Logout helper
function handleLogout() {
    authService.logout();
    router.navigate('/login');
}

window.protectedRoute = protectedRoute;
window.handleLogout = handleLogout;
