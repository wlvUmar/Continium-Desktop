/**
 * Email Verification Page
 * Extracted from auth-pages.js
 */

function _getHashParams() {
    const hash = window.location.hash;
    const queryPart = hash.includes('?') ? hash.substring(hash.indexOf('?') + 1) : '';
    return new URLSearchParams(queryPart);
}

function renderVerification() {
    const appContainer = document.getElementById('app');
    const token = _getHashParams().get('token');
    appContainer.innerHTML = `
        <div class="auth-page">
            <div class="auth-container">
                <div class="auth-card verification-card">
                    <div class="auth-header">
                        <div class="auth-brand">
                            <img src="favicon.svg" class="auth-logo" alt="Continium logo">
                            <span class="auth-brand-text">Continium</span>
                        </div>
                        <p class="auth-subtitle">Email Verification</p>
                    </div>
                    <div id="verificationContent" class="verification-content">
                        ${token ? `
                            <div class="verification-loading">
                                <div class="spinner-large"></div>
                                <p>Verifying your email...</p>
                            </div>
                        ` : `
                            <div class="verification-message">
                                <p>Please check your email for a verification link.</p>
                                <p class="text-muted">We've sent a verification email to your address.</p>
                                <a href="#/login" class="btn-primary">Back to Login</a>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
    if (token) _verifyEmail(token);
}

async function _verifyEmail(token) {
    try {
        await authService.verifyEmail(token);
        document.getElementById('verificationContent').innerHTML = `
            <div class="verification-success">
                <div class="success-icon">✓</div>
                <h3>Email Verified!</h3>
                <p>Your account has been successfully verified.</p>
                <a href="#/login" class="btn-primary">Continue to Login</a>
            </div>
        `;
        Toast.success('Email verified successfully!');
    } catch (err) {
        document.getElementById('verificationContent').innerHTML = `
            <div class="verification-error">
                <div class="error-icon">✕</div>
                <h3>Verification Failed</h3>
                <p>${err.message || 'The verification link is invalid or has expired.'}</p>
                <a href="#/login" class="btn-primary">Back to Login</a>
            </div>
        `;
        Toast.error('Verification failed');
    }
}

window.renderVerification = renderVerification;
