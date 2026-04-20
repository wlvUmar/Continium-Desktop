const CLIENT_HEADERS = {
  "X-Continium-Client": "desktop",
  "X-Auth-Mode": "desktop",
};

function getAuthToken() {
  return localStorage.getItem("session_token") || localStorage.getItem("access_token");
}

function waitForBridge(timeoutMs = 5000) {
  if (window.bridge && typeof window.bridge.request === "function") {
    return Promise.resolve(window.bridge);
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener("bridge:ready", onReady);
      reject(new Error("Desktop bridge is not ready"));
    }, timeoutMs);

    function onReady(event) {
      if (!event?.detail?.connected || !window.bridge || typeof window.bridge.request !== "function") {
        return;
      }
      clearTimeout(timer);
      window.removeEventListener("bridge:ready", onReady);
      resolve(window.bridge);
    }

    window.addEventListener("bridge:ready", onReady);
  });
}

async function bridgeRequest(method, endpoint, body, headers) {
  const bridge = await waitForBridge();
  return new Promise((resolve) => {
    bridge.request(method, endpoint, body || {}, headers || {}, (result) => {
      resolve(result || { ok: false, status: 500, error: { message: "No response from desktop backend" } });
    });
  });
}

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const method = options.method || "GET";
  const headers = {
    ...CLIENT_HEADERS,
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  const body = options.body || {};

  try {
    const response = await bridgeRequest(method, endpoint, body, headers);
    const status = Number(response?.status || 500);

    if (status === 401) {
      if (typeof window.authStartupDebug === 'function') {
        window.authStartupDebug('api:401', { endpoint, method, status });
      }
      const isAuthLogin = endpoint === '/auth/login';
      const isAuthRefresh = endpoint === '/auth/refresh';
      const alreadyRetried = !!options.__retriedAfterRefresh;

      if (!isAuthLogin && !isAuthRefresh && !alreadyRetried && window.authService?.refreshToken) {
        try {
          const refreshed = await window.authService.refreshToken();
          if (refreshed) {
            return apiRequest(endpoint, { ...options, __retriedAfterRefresh: true });
          }
        } catch (refreshErr) {
          console.error('Token refresh failed:', refreshErr);
        }
      }

      if (window.authService && typeof window.authService.logout === 'function') {
        window.authService.logout('api-401');
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('session_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('access_token_exp');
        localStorage.removeItem('auth_expires_at');
        localStorage.removeItem('auth_last_login_at');
        localStorage.removeItem('user');
      }
      if (window.statsManager && typeof window.statsManager.stopPolling === 'function') {
        window.statsManager.stopPolling();
      }
      if (window.router) {
        if (typeof window.authStartupDebug === 'function') {
          window.authStartupDebug('api:redirect-login', { reason: 'api-401', endpoint });
        }
        window.router.navigate('/login');
      }
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }

    if (!response?.ok) {
      const error = response?.error || {};
      const detail = error.detail || error.message;
      const msg = Array.isArray(detail)
        ? detail.map(e => e.msg || JSON.stringify(e)).join(', ')
        : (detail || `HTTP ${status}`);
      return Promise.reject(new Error(msg));
    }

    if (status === 204) {
      return null;
    }

    return response.data ?? null;
  } catch (err) {
    if (typeof window.authStartupDebug === 'function') {
      window.authStartupDebug('api:error', {
        endpoint,
        method,
        message: String(err?.message || err),
      });
    }
    console.error("API Error:", err);
    return Promise.reject(err);
  }
}

const api = {
  get: (endpoint, options = {}) => apiRequest(endpoint, { method: "GET", ...options }),

  post: (endpoint, data, options = {}) =>
    apiRequest(endpoint, {
      method: "POST",
      body: data,
      ...options,
    }),

  put: (endpoint, data, options = {}) =>
    apiRequest(endpoint, {
      method: "PUT",
      body: data,
      ...options,
    }),

  delete: (endpoint, options = {}) => apiRequest(endpoint, { method: "DELETE", ...options }),
};

window.api = api;
