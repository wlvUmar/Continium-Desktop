/**
 * Renderer — mounts HTML templates into #app and manages view lifecycle.
 *
 * Usage:
 *   renderer.render('pages/login.html', initFn)
 *   renderer.render('pages/projects.html', initFn, params, { layout: '/projects' })
 *
 * options.layout  — if set, wraps the template with createLayout(html, layout)
 * initFn(params)  — called after mount; may return a cleanup function
 */

import templateLoader from './template-loader.js';

class Renderer {
    constructor() {
        this._cleanup = null;
    }

    _app() {
        return document.getElementById('app');
    }

    // ── States ────────────────────────────────────────────────────────────────

    _showLoading() {
        this._app().innerHTML = `
            <div class="renderer-state renderer-loading">
                <div class="spinner-large"></div>
                <p style="margin-top:16px;color:#999;">Loading...</p>
            </div>`;
    }

    _showError(message) {
        this._app().innerHTML = `
            <div class="renderer-state renderer-error" style="text-align:center;padding:60px 20px;">
                <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
                <h2 style="color:#333;">Something went wrong</h2>
                <p style="color:#999;">${message || 'An unexpected error occurred.'}</p>
                <button onclick="history.back()" class="btn-primary" style="margin-top:16px;">Go Back</button>
            </div>`;
    }

    _show404() {
        this._app().innerHTML = `
            <div class="renderer-state renderer-404" style="text-align:center;padding:60px 20px;">
                <div style="font-size:64px;font-weight:700;color:#ccc;margin-bottom:16px;">404</div>
                <h2 style="color:#333;">Page Not Found</h2>
                <p style="color:#999;">The page you're looking for doesn't exist.</p>
                <button onclick="router.navigate('/app')" class="btn-primary" style="margin-top:16px;">Go Home</button>
            </div>`;
    }

    // ── Core ──────────────────────────────────────────────────────────────────

    /**
     * Render a template into #app and run the view's init function.
     * @param {string} templatePath - e.g. 'pages/login.html'
     * @param {Function} initFn     - view init(params) → optional cleanup fn
     * @param {object}  params      - route params (e.g. { id: '42' })
     * @param {object}  options
     * @param {string}  options.layout - if set, wraps html with createLayout(html, layout)
     */
    async render(templatePath, initFn, params = {}, options = {}) {
        // Teardown previous view
        if (this._cleanup) {
            try { this._cleanup(); } catch (_) {}
            this._cleanup = null;
        }

        this._showLoading();

        try {
            const html = await templateLoader.load(templatePath);
            const app  = this._app();

            if (options.layout) {
                app.innerHTML = createLayout(html, options.layout);
                attachNavigationListeners();
            } else {
                app.innerHTML = html;
            }

            if (typeof initFn === 'function') {
                const cleanup = await initFn(params);
                if (typeof cleanup === 'function') {
                    this._cleanup = cleanup;
                }
            }
        } catch (err) {
            if (err.status === 404 || (err.message && err.message.toLowerCase().includes('not found'))) {
                this._show404();
            } else {
                this._showError(err.message);
            }
        }
    }
}

const renderer = new Renderer();
window.renderer = renderer;
export default renderer;
