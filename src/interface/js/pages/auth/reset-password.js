/**
 * Reset Password Page
 * Extracted from auth-pages.js
 */

// Shared toggle helper (also used by login/register)
window.togglePassword = function(inputId, btn) {
    const input = document.getElementById(inputId);
    const img   = btn.querySelector('img');
    if (input.type === 'password') {
        input.type = 'text';
        img.src = 'assets/icons/streamline-plump_invisible-2-remix.svg';
    } else {
        input.type = 'password';
        img.src = 'assets/icons/wpf_invisible.svg';
    }
};

function renderResetPassword() {
    const appContainer = document.getElementById('app');
    const hash = window.location.hash;
    const queryPart = hash.includes('?') ? hash.substring(hash.indexOf('?') + 1) : '';
    const token = new URLSearchParams(queryPart).get('token');

    if (!token) {
        appContainer.innerHTML = `
            <div class="auth-page"><div class="auth-container"><div class="auth-card">
                <div class="auth-header"><div class="auth-brand"><img src="favicon.svg" class="auth-logo" alt="Continium logo"><span class="auth-brand-text">Continium</span></div></div>
                <div class="verification-error">
                    <div class="error-icon">✕</div>
                    <h3>Invalid Link</h3>
                    <p>This password reset link is invalid or has expired.</p>
                    <a href="#/forgot-password" class="btn-primary">Request New Link</a>
                </div>
            </div></div></div>
        `;
        return;
    }

    appContainer.innerHTML = `
        <div class="auth-page">
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <div class="auth-brand">
                            <img src="favicon.svg" class="auth-logo" alt="Continium logo">
                            <span class="auth-brand-text">Continium</span>
                        </div>
                        <p class="auth-subtitle">Set New Password</p>
                    </div>
                    <form id="resetPasswordForm" class="auth-form">
                        <div class="form-group">
                            <label for="newPassword">New Password</label>
                            <div class="input-wrapper">
                                <img src="assets/icons/mdi_password.svg" class="input-icon" alt="">
                                <input type="password" id="newPassword" class="form-input with-icon with-toggle" placeholder="Enter new password" required>
                                <button type="button" class="password-toggle" onclick="togglePassword('newPassword', this)">
                                    <img src="assets/icons/wpf_invisible.svg" alt="Show password">
                                </button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="confirmNewPassword">Confirm Password</label>
                            <div class="input-wrapper">
                                <img src="assets/icons/line-md_confirm.svg" class="input-icon" alt="">
                                <input type="password" id="confirmNewPassword" class="form-input with-icon with-toggle" placeholder="Confirm new password" required>
                                <button type="button" class="password-toggle" onclick="togglePassword('confirmNewPassword', this)">
                                    <img src="assets/icons/wpf_invisible.svg" alt="Show password">
                                </button>
                            </div>
                        </div>
                        <button type="submit" class="btn-primary btn-full">Reset Password</button>
                    </form>
                    <div class="auth-footer">
                        <a href="#/login" class="link-text">← Back to Login</a>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('resetPasswordForm').addEventListener('submit', (e) => _handleResetPassword(e, token));
}

async function _handleResetPassword(e, token) {
    e.preventDefault();
    const newPassword     = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    ErrorMessage.clear(document.querySelector('.auth-card'));
    if (newPassword !== confirmPassword) {
        Toast.error('Passwords do not match');
        ErrorMessage.render('Passwords do not match', document.querySelector('.auth-form'));
        return;
    }
    if (newPassword.length < 6) {
        Toast.error('Password must be at least 6 characters');
        ErrorMessage.render('Password must be at least 6 characters', document.querySelector('.auth-form'));
        return;
    }
    Spinner.show('Resetting password...');
    try {
        await authService.resetPassword(token, newPassword);
        Toast.success('Password reset successfully!');
        document.querySelector('.auth-card').innerHTML = `
            <div class="auth-header"><div class="auth-brand"><img src="favicon.svg" class="auth-logo" alt="Continium logo"><span class="auth-brand-text">Continium</span></div></div>
            <div class="verification-success">
                <div class="success-icon">✓</div>
                <h3>Password Reset!</h3>
                <p>Your password has been successfully updated.</p>
                <a href="#/login" class="btn-primary">Sign In</a>
            </div>
        `;
    } catch (err) {
        const msg = err.message || 'Reset failed. The link may have expired.';
        Toast.error(msg);
        ErrorMessage.render(msg, document.querySelector('.auth-form'));
    } finally {
        Spinner.hide();
    }
}

window.renderResetPassword = renderResetPassword;
