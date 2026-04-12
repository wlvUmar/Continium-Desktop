/**
 * TemplateLoader — fetches HTML templates and caches them in memory.
 * Templates load once and are reused across navigation.
 */

class TemplateLoader {
    constructor() {
        this._cache = new Map();
    }

    /**
     * Load an HTML template from the given path.
     * Returns cached content on subsequent calls.
     * @param {string} path - Relative path to the HTML template
     * @returns {Promise<string>} HTML string
     */
    async load(path) {
        if (this._cache.has(path)) {
            return this._cache.get(path);
        }

        const res = await fetch(path);
        if (!res.ok) {
            const err = new Error(`Template not found: ${path}`);
            err.status = res.status;
            throw err;
        }

        const html = await res.text();
        this._cache.set(path, html);
        return html;
    }

    /** Remove a cached entry so the next load re-fetches. */
    invalidate(path) {
        this._cache.delete(path);
    }

    /** Clear all cached templates. */
    clear() {
        this._cache.clear();
    }
}

const templateLoader = new TemplateLoader();
window.templateLoader = templateLoader;
export default templateLoader;
