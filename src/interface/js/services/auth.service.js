/**
 * Authentication Service
 * Manages login, logout, and token handling
 */

const authService = {
    _tokenFromResponse(response) {
        if (!response || typeof response !== 'object') return null;
        return response.session_token || response.access_token || null;
    },

    // Login user
    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });

        const token = this._tokenFromResponse(response);
        if (token) {
            localStorage.setItem('session_token', token);
            localStorage.setItem('access_token', token);

            // Store user data if provided
            if (response.user) {
                localStorage.setItem('user', JSON.stringify(response.user));
            }

            // Always fetch latest profile so saved name/email are not lost
            try { await this.fetchUser(); } catch (_) {}
        }

        return response;
    },

    // Register new user
    async register(name, email, password) {
        const response = await api.post('/auth/register', {
            full_name: name,
            email,
            password
        });

        // Store user data returned from registration
        if (response) {
            localStorage.setItem('user', JSON.stringify(response));
        }

        // Auto-login after registration to obtain tokens
        await this.login(email, password);

        return response;
    },

    // Logout
    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('session_token');
        localStorage.removeItem('user');
    },

    // Desktop auth does not use refresh tokens; keep method for compatibility.
    async refreshToken() {
        return null;
    },

    // Check if user is logged in
    isAuthed() {
        return !!(localStorage.getItem('session_token') || localStorage.getItem('access_token'));
    },

    // Get current user
    getUser() {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    },

    // Get current user from server
    async fetchUser() {
        try {
            const user = await api.get('/auth/me');
            if (user) {
                localStorage.setItem('user', JSON.stringify(user));
            }
            return user;
        } catch (err) {
            throw err;
        }
    },

    // Verify email with token
    async verifyEmail(token) {
        return await api.post('/auth/verify', { token });
    },

    // Request password reset link
    async forgotPassword(email) {
        return await api.post('/auth/forgot-password', { email });
    },

    // Reset password using token from email
    async resetPassword(token, newPassword) {
        return await api.post('/auth/reset-password', { token, new_password: newPassword });
    },

    // Change password (authenticated)
    async changePassword(currentPassword, newPassword) {
        return await api.post('/auth/change-password', {
            current_password: currentPassword,
            new_password: newPassword
        });
    },

    // Update profile (full_name, image_url)
    async updateProfile(data) {
        const updated = await api.put('/auth/me', data);
        if (updated) {
            localStorage.setItem('user', JSON.stringify(updated));
        }
        return updated;
    }
};

window.authService = authService;
