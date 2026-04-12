/**
 * Verify View — handles email verification token from URL hash.
 */

export async function initVerifyView() {
    const hash      = window.location.hash;
    const queryPart = hash.includes('?') ? hash.substring(hash.indexOf('?') + 1) : '';
    const token     = new URLSearchParams(queryPart).get('token');

    if (token) {
        document.getElementById('verificationContent').innerHTML = `
            <div class="verification-loading">
                <div class="spinner-large"></div>
                <p>Verifying your email...</p>
            </div>`;
        await _verifyEmail(token);
    }
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
            </div>`;
        Toast.success('Email verified successfully!');
    } catch (err) {
        document.getElementById('verificationContent').innerHTML = `
            <div class="verification-error">
                <div class="error-icon">✕</div>
                <h3>Verification Failed</h3>
                <p>${err.message || 'The verification link is invalid or has expired.'}</p>
                <a href="#/login" class="btn-primary">Back to Login</a>
            </div>`;
        Toast.error('Verification failed');
    }
}
