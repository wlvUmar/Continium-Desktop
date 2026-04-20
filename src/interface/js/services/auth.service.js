/**
 * Authentication Service
 * Manages login, logout, and token handling
 */

const AUTH_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const authService = {
    _debug(stage, extra = {}) {
        if (typeof window.authStartupDebug === 'function') {
            window.authStartupDebug(stage, extra);
        }
    },

    _isInvalidSessionError(err) {
        const msg = String(err?.message || '').toLowerCase();
        return (
            msg.includes('session expired') ||
            msg.includes('invalid or expired session') ||
            msg.includes('missing authorization token') ||
            msg.includes('http 401') ||
            msg.includes('unauthorized')
        );
    },

    _safeJsonParse(value) {
        try {
            return JSON.parse(value);
        } catch (_) {
            return null;
        }
    },

    _unwrapAuthPayload(response) {
        if (!response || typeof response !== 'object') return null;
        if (response.data && typeof response.data === 'object') return response.data;
        if (response.payload && typeof response.payload === 'object') return response.payload;
        return response;
    },

    _decodeJwtPayload(token) {
        if (!token || typeof token !== 'string') return null;
        const parts = token.split('.');
        if (parts.length < 2) return null;
        try {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const json = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
                    .join('')
            );
            return this._safeJsonParse(json);
        } catch (_) {
            return null;
        }
    },

    _tokenFromResponse(response) {
        const payload = this._unwrapAuthPayload(response);
        if (!payload) return null;
        return payload.session_token || payload.access_token || null;
    },

    _refreshTokenFromResponse(response) {
        const payload = this._unwrapAuthPayload(response);
        if (!payload) return null;
        return payload.refresh_token || null;
    },

    _normalizeExpiry(value) {
        if (!value) return null;
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) return null;
        return numeric < 10_000_000_000 ? Math.floor(numeric * 1000) : Math.floor(numeric);
    },

    _sessionExpiryFromResponse(response) {
        const payload = this._unwrapAuthPayload(response);
        if (!payload) return null;
        return (
            this._normalizeExpiry(payload.expires_at) ||
            this._normalizeExpiry(payload.access_token_exp) ||
            (Number.isFinite(Number(payload.expires_in)) ? Date.now() + (Number(payload.expires_in) * 1000) : null)
        );
    },

    _getSessionExpiry() {
        const savedExpiry = this._normalizeExpiry(localStorage.getItem('auth_expires_at'));
        if (savedExpiry) return savedExpiry;

        const token = localStorage.getItem('session_token') || localStorage.getItem('access_token');
        const payload = this._decodeJwtPayload(token);
        if (payload?.exp) {
            return this._normalizeExpiry(payload.exp);
        }
        return null;
    },

    _hasValidSession() {
        const token = localStorage.getItem('session_token') || localStorage.getItem('access_token');
        if (!token) return false;
        const expiry = this._getSessionExpiry();
        if (expiry) {
            return Date.now() <= expiry;
        }
        return true;
    },

    _persistTokens(response) {
        const payload = this._unwrapAuthPayload(response);
        const token = this._tokenFromResponse(response);
        const refresh = this._refreshTokenFromResponse(response);
        const expiry = this._sessionExpiryFromResponse(response) || (Date.now() + AUTH_SESSION_TTL_MS);

        this._debug('auth:persist:attempt', {
            hasPayload: !!payload,
            hasTokenInPayload: !!(payload?.session_token || payload?.access_token),
            hasRefreshInPayload: !!payload?.refresh_token,
            payloadKeys: payload ? Object.keys(payload).slice(0, 12) : [],
        });

        if (token) {
            localStorage.setItem('session_token', token);
            localStorage.setItem('access_token', token);

            const payload = this._decodeJwtPayload(token);
            if (payload?.exp) {
                localStorage.setItem('access_token_exp', String(payload.exp));
            }
        }

        localStorage.setItem('auth_expires_at', String(expiry));
        localStorage.setItem('auth_last_login_at', String(Date.now()));

        if (refresh) {
            localStorage.setItem('refresh_token', refresh);
        }

        this._debug('auth:persist:result', {
            persisted: !!token,
            hasSessionToken: !!localStorage.getItem('session_token'),
            hasRefreshToken: !!localStorage.getItem('refresh_token'),
            authExpiresAt: localStorage.getItem('auth_expires_at') || null,
        });

        return !!token;
    },

    bootstrapFromDesktopSession(sessionPayload) {
        if (!sessionPayload || typeof sessionPayload !== 'object') {
            this._debug('auth:bootstrap:no-session-payload');
            return false;
        }
        const persisted = this._persistTokens(sessionPayload);
        const user = sessionPayload.user;
        if (user && typeof user === 'object') {
            localStorage.setItem('user', JSON.stringify(user));
        }
        this._debug('auth:bootstrap:desktop-session', {
            persisted,
            hasUser: !!user,
        });
        return persisted;
    },

    // Login user
    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });
        this._debug('auth:login:response', {
            responseKeys: response && typeof response === 'object' ? Object.keys(response).slice(0, 12) : [],
        });

        const persisted = this._persistTokens(response);
        if (persisted) {

            // Store user data if provided
            if (response.user) {
                localStorage.setItem('user', JSON.stringify(response.user));
            }

            // Always fetch latest profile so saved name/email are not lost
            try { await this.fetchUser(); } catch (_) {}
        }
        this._debug('auth:login:persisted', { persisted });

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
    logout(reason = 'manual') {
        this._debug('auth:logout', { reason });
        if (window.api && typeof window.api.post === 'function') {
            window.api.post('/auth/session/clear', {}).catch(() => {});
        }
        localStorage.removeItem('access_token');
        localStorage.removeItem('session_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('access_token_exp');
        localStorage.removeItem('auth_expires_at');
        localStorage.removeItem('auth_last_login_at');
        localStorage.removeItem('user');
    },

    // Attempt refresh flow if backend supports desktop refresh tokens.
    async refreshToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return null;

        const response = await api.post('/auth/refresh', { refresh_token: refreshToken }, {
            headers: {
                'X-Refresh-Attempt': '1'
            }
        });

        if (!response || !this._persistTokens(response)) {
            return null;
        }

        return response;
    },

    // Check if user is logged in
    isAuthed() {
        const hasValidSession = this._hasValidSession();
        const hasRefresh = !!localStorage.getItem('refresh_token');
        const authed = hasValidSession || hasRefresh;
        this._debug('auth:isAuthed', { hasValidSession, hasRefresh, authed });
        return authed;
    },

    async restoreSession() {
        const hasToken = !!(localStorage.getItem('session_token') || localStorage.getItem('access_token'));
        const hasRefresh = !!localStorage.getItem('refresh_token');
        this._debug('auth:restore:start', { hasToken, hasRefresh });

        if (!hasToken && !hasRefresh) {
            this._debug('auth:restore:skip-no-credentials');
            return null;
        }

        const expiry = this._getSessionExpiry();
        if (expiry && Date.now() > expiry) {
            this._debug('auth:restore:expired', { expiry });
            this.logout('restore-expired');
            return null;
        }

        try {
            const user = await this.fetchUser();
            this._debug('auth:restore:fetch-user-ok', { userId: user?.id || null });
            return user;
        } catch (err) {
            this._debug('auth:restore:fetch-user-failed', { message: String(err?.message || err) });
            if (hasRefresh) {
                try {
                    this._debug('auth:restore:refresh-attempt');
                    const refreshed = await this.refreshToken();
                    if (refreshed) {
                        this._debug('auth:restore:refresh-ok');
                        try {
                            const refreshedUser = await this.fetchUser();
                            this._debug('auth:restore:fetch-user-after-refresh-ok', { userId: refreshedUser?.id || null });
                            return refreshedUser;
                        } catch (refreshErr) {
                            if (this._isInvalidSessionError(refreshErr)) {
                                this.logout('restore-refresh-invalid-session');
                            }
                            this._debug('auth:restore:fetch-user-after-refresh-failed', {
                                message: String(refreshErr?.message || refreshErr),
                            });
                            throw refreshErr;
                        }
                    }
                } catch (_) {
                    this._debug('auth:restore:refresh-failed');
                    // Fall through to logout below.
                }
            }

            if (this._isInvalidSessionError(err)) {
                this.logout('restore-invalid-session');
            }
            throw err;
        }
    },

    // Get current user
    getUser() {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    },

    // Get current user from server
    async fetchUser() {
        try {
            const rawUser = await api.get('/auth/me');
            const user = this._unwrapAuthPayload(rawUser);
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
