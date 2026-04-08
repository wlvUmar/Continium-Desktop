const API_BASE_URL = "http://localhost:8000/api/v1";
function buildUrl(endpoint) {
  return `${API_BASE_URL}${endpoint}`;
}

function getAuthToken() {
  return localStorage.getItem("access_token");
}

// Shared promise for an in-flight refresh so concurrent 401s reuse one request
let refreshPromise = null;

async function refreshAccessToken() {
  // Reuse an ongoing refresh rather than firing a duplicate request
  if (refreshPromise) {

    return refreshPromise;
  }

  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    console.error('❌ API: No refresh token available');
    throw new Error('No refresh token available');
  }


  refreshPromise = fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  })
    .then(async (response) => {
      if (!response.ok) {
        console.error(`❌ API: Token refresh failed with status ${response.status}`);
        throw new Error('Token refresh failed');
      }
      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }

      return data.access_token;
    })
    .catch(err => {
      console.error('❌ API: Token refresh error:', err);
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();

  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(buildUrl(endpoint), config);

    // On 401, attempt a single token refresh then retry the original request.
    // The _isRetry flag prevents an infinite loop if the retry also gets a 401.
    if (response.status === 401 && !options._isRetry) {

      try {
        const newToken = await refreshAccessToken();

      } catch (_refreshError) {
        // Refresh failed — clear session and redirect to login
        console.error(`❌ API: Token refresh failed:`, _refreshError);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');

        // Stop any background polling
        if (window.statsManager && typeof window.statsManager.stopPolling === 'function') {
          window.statsManager.stopPolling();
        }

        if (window.router) {
          window.router.navigate('/login');
        }
        throw new Error('Session expired. Please log in again.');
      }

      // Retry original request with the new access token
      return apiRequest(endpoint, { ...options, _isRetry: true });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      // FastAPI uses "detail", express-style APIs use "message"
      const detail = error.detail || error.message;
      const msg = Array.isArray(detail)
        ? detail.map(e => e.msg || JSON.stringify(e)).join(', ')
        : (detail || `HTTP ${response.status}`);
      throw new Error(msg);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error("API Error:", err);
    throw err;
  }
}

const api = {
  get: (endpoint) => apiRequest(endpoint, { method: "GET" }),

  post: (endpoint, data) =>
    apiRequest(endpoint, {
      method: "POST",
      body: data,
    }),

  put: (endpoint, data) =>
    apiRequest(endpoint, {
      method: "PUT",
      body: data,
    }),

  delete: (endpoint) => apiRequest(endpoint, { method: "DELETE" }),
};

window.api = api;
