/**
 * Forgot Password View — binds submit logic to the forgot-password template.
 */

export async function initForgotPasswordView() {
    document.getElementById('forgotPasswordForm').addEventListener('submit', _handleForgotPassword);
}

async function _handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    ErrorMessage.clear(document.querySelector('.auth-card'));
    Spinner.show('Sending reset link...');
    try {
        await authService.forgotPassword(email);
        Toast.success('Reset link sent! Check your email.');
        document.querySelector('.auth-form').innerHTML = `
            <div class="success-message">
                <p>Password reset link has been sent to your email.</p>
                <p class="text-muted">Please check your inbox and follow the instructions.</p>
            </div>`;
    } catch (err) {
        const msg = err.message || 'Failed to send reset link';
        Toast.error(msg);
        ErrorMessage.render(msg, document.querySelector('.auth-form'));
    } finally {
        Spinner.hide();
    }
}
