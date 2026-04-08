/**
 * Toast Notification Component
 * Extracted from ui-utilities.js
 */

const Toast = {
    container: null,

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(this.container);
        }
    },

    show(message, type = 'info') {
        this.init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const colors = {
            success: '#48bb78',
            error: '#f56565',
            info: '#4299e1',
            warning: '#ed8936'
        };

        toast.style.cssText = `
            background: white;
            color: #333;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-left: 4px solid ${colors[type]};
            animation: slideIn 0.3s ease;
            min-width: 250px;
        `;

        toast.textContent = message;
        this.container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    success(message) { this.show(message, 'success'); },
    error(message)   { this.show(message, 'error'); },
    info(message)    { this.show(message, 'info'); },
    warning(message) { this.show(message, 'warning'); }
};

// CSS animations
const _toastStyle = document.createElement('style');
_toastStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0);    opacity: 1; }
        to   { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(_toastStyle);

window.Toast = Toast;
