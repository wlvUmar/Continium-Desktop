/**
 * Register Page
 * Extracted from auth-pages.js
 */

function renderRegister() {
    const appContainer = document.getElementById('app');
    appContainer.innerHTML = `
        <div class="auth-page">
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <h1 class="logo-text">Continium</h1>
                        <p class="auth-subtitle">Registration</p>
                    </div>
                    <form id="registerForm" class="auth-form">
                        <div class="form-group">
                            <div class="input-wrapper">
                                <img src="assets/icons/mdi_user.svg" class="input-icon" alt="">
                                <input type="text" id="registerName" class="form-input with-icon" placeholder="Full name" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <div class="input-wrapper">
                                <img src="assets/icons/ic_baseline-email.svg" class="input-icon" alt="">
                                <input type="email" id="registerEmail" class="form-input with-icon" placeholder="Email" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <div class="input-wrapper">
                                <img src="assets/icons/mdi_password.svg" class="input-icon" alt="">
                                <input type="password" id="registerPassword" class="form-input with-icon with-toggle" placeholder="Password" required>
                                <button type="button" class="password-toggle" onclick="togglePassword('registerPassword', this)">
                                    <img src="assets/icons/wpf_invisible.svg" alt="Show password">
                                </button>
                            </div>
                        </div>
                        <div class="form-group">
                            <div class="input-wrapper">
                                <img src="assets/icons/line-md_confirm.svg" class="input-icon" alt="">
                                <input type="password" id="registerConfirmPassword" class="form-input with-icon with-toggle" placeholder="Confirm your password" required>
                                <button type="button" class="password-toggle" onclick="togglePassword('registerConfirmPassword', this)">
                                    <img src="assets/icons/wpf_invisible.svg" alt="Show password">
                                </button>
                            </div>
                        </div>
                        <button type="submit" class="btn-primary btn-full">Sign Up</button>
                    </form>
                    <div class="auth-divider" aria-hidden="true">
                        <span class="auth-divider-line"></span>
                        <span class="auth-divider-text">OR</span>
                        <span class="auth-divider-line"></span>
                    </div>
                    <button type="button" class="btn-secondary-auth btn-full" onclick="router.navigate('/login')">Sign In</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

async function handleRegister(e) {
    e.preventDefault();
    const name            = document.getElementById('registerName').value;
    const email           = document.getElementById('registerEmail').value;
    const password        = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    ErrorMessage.clear(document.querySelector('.auth-card'));
    if (password !== confirmPassword) {
        Toast.error('Passwords do not match');
        ErrorMessage.render('Passwords do not match', document.querySelector('.auth-form'));
        return;
    }
    if (password.length < 6) {
        Toast.error('Password must be at least 6 characters');
        ErrorMessage.render('Password must be at least 6 characters', document.querySelector('.auth-form'));
        return;
    }
    Spinner.show('Creating account...');
    try {
        await authService.register(name, email, password);
        Toast.success('Account created! Please verify your email.');
        router.navigate('/verify');
    } catch (err) {
        const msg = err.message || 'Registration failed. Please try again.';
        Toast.error(msg);
        ErrorMessage.render(msg, document.querySelector('.auth-form'));
    } finally {
        Spinner.hide();
    }
}

window.renderRegister = renderRegister;
