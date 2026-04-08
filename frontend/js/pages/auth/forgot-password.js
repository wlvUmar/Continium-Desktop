/**
 * Forgot Password Page
 * Extracted from auth-pages.js
 */

function renderForgotPassword() {
    const appContainer = document.getElementById('app');
    appContainer.innerHTML = `
        <div class="auth-page">
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <div class="auth-brand">
                            <img src="favicon.svg" class="auth-logo" alt="Continium logo">
                            <span class="auth-brand-text">Continium</span>
                        </div>
                        <p class="auth-subtitle">Forgot Password</p>
                    </div>
                    <p class="text-muted" style="margin-bottom: 20px;">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                    <form id="forgotPasswordForm" class="auth-form">
                        <div class="form-group">
                            <label for="forgotEmail">Email Address</label>
                            <div class="input-wrapper">
                                <img src="assets/icons/ic_baseline-email.svg" class="input-icon" alt="">
                                <input type="email" id="forgotEmail" class="form-input with-icon" placeholder="Enter your email" required>
                            </div>
                        </div>
                        <button type="submit" class="btn-primary btn-full">Send Reset Link</button>
                    </form>
                    <div class="auth-footer">
                        <a href="#/login" class="link-text">← Back to Login</a>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('forgotPasswordForm').addEventListener('submit', handleForgotPassword);
}

async function handleForgotPassword(e) {
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
            </div>
        `;
    } catch (err) {
        const msg = err.message || 'Failed to send reset link';
        Toast.error(msg);
        ErrorMessage.render(msg, document.querySelector('.auth-form'));
    } finally {
        Spinner.hide();
    }
}

window.renderForgotPassword = renderForgotPassword;
