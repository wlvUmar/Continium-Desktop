/**
 * Focus Window View — launches the real focus modal in a dedicated window.
 */

export async function initFocusWindowView({ id }) {
    window.__focusWindowMode = true;

    try {
        await window.openFocusModal(id);
    } catch (err) {
        console.error('Failed to open focus modal:', err);
        const root = document.querySelector('.focus-window-page');
        if (root) {
            root.innerHTML = `
                <div style="padding:60px;text-align:center;color:#999;">
                    <h2 style="color:#333;">Failed to open focus session</h2>
                    <p>${err?.message || 'Please try again.'}</p>
                </div>`;
        }
    }

    return () => {
        window.__focusWindowMode = false;
    };
}

