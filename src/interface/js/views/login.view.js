/**
 * Login View — binds submit logic to the login template.
 */

export async function initLoginView() {
    document.getElementById('loginForm').addEventListener('submit', _handleLogin);
}

async function _handleLogin(e) {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    ErrorMessage.clear(document.querySelector('.auth-card'));
    Spinner.show('Logging in...');
    try {
        await authService.login(email, password);
        Toast.success('Welcome back!');
        router.navigate('/app');
    } catch (err) {
        const msg = err.message || 'Login failed. Please check your credentials.';
        Toast.error(msg);
        ErrorMessage.render(msg, document.querySelector('.auth-form'));
    } finally {
        Spinner.hide();
    }
}
