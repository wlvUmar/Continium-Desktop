/**
 * Authentication Service
 * Manages login, logout, and token handling
 */

const authService = {
    // Login user
    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });

        if (response.access_token) {
            localStorage.setItem('access_token', response.access_token);
            localStorage.setItem('refresh_token', response.refresh_token);

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
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    },

    // Exchange a refresh token for a new access token
    async refreshToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return null;

        const data = await api.post('/auth/refresh', { refresh_token: refreshToken }, { skipRefresh: true });
        if (data && data.access_token) {
            localStorage.setItem('access_token', data.access_token);
            if (data.refresh_token) {
                localStorage.setItem('refresh_token', data.refresh_token);
            }
        }

        return data;
    },

    // Check if user is logged in
    isAuthed() {
        return !!localStorage.getItem('access_token');
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
