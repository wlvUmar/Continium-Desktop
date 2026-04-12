/**
 * Reset Password View — reads token from hash, wires up the reset form.
 */

export async function initResetPasswordView() {
    const hash      = window.location.hash;
    const queryPart = hash.includes('?') ? hash.substring(hash.indexOf('?') + 1) : '';
    const token     = new URLSearchParams(queryPart).get('token');

    if (!token) {
        document.getElementById('resetPasswordContent').innerHTML = `
            <div class="verification-error">
                <div class="error-icon">✕</div>
                <h3>Invalid Link</h3>
                <p>This password reset link is invalid or has expired.</p>
                <a href="#/forgot-password" class="btn-primary">Request New Link</a>
            </div>`;
        return;
    }

    document.getElementById('resetPasswordForm')
        .addEventListener('submit', (e) => _handleResetPassword(e, token));
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
            <div class="auth-header">
                <div class="auth-brand">
                    <img src="favicon.svg" class="auth-logo" alt="Continium logo">
                    <span class="auth-brand-text">Continium</span>
                </div>
            </div>
            <div class="verification-success">
                <div class="success-icon">✓</div>
                <h3>Password Reset!</h3>
                <p>Your password has been successfully updated.</p>
                <a href="#/login" class="btn-primary">Sign In</a>
            </div>`;
    } catch (err) {
        const msg = err.message || 'Reset failed. The link may have expired.';
        Toast.error(msg);
        ErrorMessage.render(msg, document.querySelector('.auth-form'));
    } finally {
        Spinner.hide();
    }
}
