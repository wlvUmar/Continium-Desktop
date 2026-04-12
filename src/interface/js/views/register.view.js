/**
 * Register View — binds submit logic to the register template.
 */

export async function initRegisterView() {
    document.getElementById('registerForm').addEventListener('submit', _handleRegister);
}

async function _handleRegister(e) {
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
