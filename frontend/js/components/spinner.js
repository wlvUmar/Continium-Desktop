/**
 * Loading Spinner Component
 * Extracted from ui-utilities.js
 */

const Spinner = {
    overlay: null,

    show(message = 'Loading...') {
        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.id = 'loading-overlay';
            this.overlay.innerHTML = `
                <div style="
                    position: fixed; top: 0; left: 0;
                    width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 10000;
                ">
                    <div style="background: white; padding: 30px; border-radius: 12px; text-align: center;">
                        <div class="spinner"></div>
                        <p style="margin-top: 15px; color: #666;">${message}</p>
                    </div>
                </div>
            `;
            document.body.appendChild(this.overlay);
        }
        this.overlay.style.display = 'block';
    },

    hide() {
        if (this.overlay) this.overlay.style.display = 'none';
    }
};

// Spinner CSS
const _spinnerStyle = document.createElement('style');
_spinnerStyle.textContent = `
    .spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #4ECDC4;
        border-radius: 50%;
        width: 40px; height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto;
    }
    @keyframes spin {
        0%   { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    .spinner-large {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #00BCD4;
        border-radius: 50%;
        width: 48px; height: 48px;
        animation: spin 1s linear infinite;
        margin: 0 auto;
    }
`;
document.head.appendChild(_spinnerStyle);

window.Spinner = Spinner;
