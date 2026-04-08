/**
 * Error Message Component
 * Extracted from ui-utilities.js
 */

const ErrorMessage = {
    render(message, container) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            background: #fff5f5; border: 1px solid #feb2b2; color: #c53030;
            padding: 12px 16px; border-radius: 8px; margin: 10px 0;
            display: flex; align-items: center; gap: 10px;
        `;
        errorDiv.innerHTML = `
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
            </svg>
            <span>${message}</span>
        `;
        if (container) {
            container.querySelectorAll('.error-message').forEach(el => el.remove());
            container.insertBefore(errorDiv, container.firstChild);
        }
        return errorDiv;
    },

    clear(container) {
        if (container) container.querySelectorAll('.error-message').forEach(el => el.remove());
    }
};

window.ErrorMessage = ErrorMessage;
