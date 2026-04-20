/**
 * Simple Hash Router
 * Handles routing for #/login, #/app, #/goal/:id
 */

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.init();
    }

    on(path, handler) {
        this.routes[path] = handler;
    }

    navigate(path) {
        if (typeof window.authStartupDebug === 'function') {
            window.authStartupDebug('router:navigate', { to: path, from: window.location.hash.slice(1) || '/' });
        }
        window.location.hash = path;
    }

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        // Routes are registered in app.js after this module loads.
        // app.js calls router.handleRoute() explicitly once all routes are set up.
    }

    handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        // Strip query string for matching
        const pathPart = hash.split('?')[0];
        const matchedRoute = this.matchRoute(pathPart);
        if (typeof window.authStartupDebug === 'function') {
            window.authStartupDebug('router:handleRoute', {
                hash,
                pathPart,
                matched: !!matchedRoute,
            });
        }

        if (matchedRoute) {
            this.currentRoute = hash;
            matchedRoute.handler(matchedRoute.params);
        } else {
            if (typeof window.authStartupDebug === 'function') {
                window.authStartupDebug('router:redirect-login', { reason: 'no-route-match', hash });
            }
            this.navigate('/login');
        }
    }

    matchRoute(hash) {
        for (const [path, handler] of Object.entries(this.routes)) {
            const params = this.extractParams(path, hash);
            if (params !== null) {
                return { handler, params };
            }
        }
        return null;
    }

    extractParams(pattern, path) {
        const patternParts = pattern.split('/');
        const pathParts = path.split('/');

        if (patternParts.length !== pathParts.length) {
            return null;
        }

        const params = {};
        
        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
                const paramName = patternParts[i].slice(1);
                params[paramName] = pathParts[i];
            } else if (patternParts[i] !== pathParts[i]) {
                return null;
            }
        }

        return params;
    }
}

const router = new Router();
window.router = router;
export default router;
