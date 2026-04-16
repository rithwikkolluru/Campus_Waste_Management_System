/**
 * api.js – Centralised HTTP client for EcoCampus backend API
 * Updated to talk to the Node.js Express server
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// ── Token helpers ───────────────────────────────────────────────────────────
function getToken() {
  return sessionStorage.getItem('eco_token');
}

function buildHeaders(isFormData = false) {
  const headers = {};
  const token   = getToken();

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';
  
  return headers;
}

// ── Core request wrapper ────────────────────────────────────────────────────
async function request(method, endpoint, body = null, isFormData = false) {
  const config = {
    method,
    headers: buildHeaders(isFormData),
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data?.message || data?.error || `Request failed (${res.status})`;
      throw new ApiError(errorMsg, res.status, data);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Network error – ensure your backend server is running.', 0);
  }
}

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
    this.data   = data;
  }
}

// ── API methods (aligned with backend/routes/) ──────────────────────────────
export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (email, password) =>
    request('POST', '/auth/login', { email, password }),

  register: (payload) =>
    request('POST', '/auth/register', payload),

  // ── Reports ───────────────────────────────────────────────────────────────
  getReports: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/reports${qs ? `?${qs}` : ''}`);
  },

  submitReport: (formData) =>
    request('POST', '/reports/submit', formData, true),

  updateStatus: (id, status, userId) =>
    request('PUT', `/reports/${id}`, { status, user_id: userId }),

  // ── Assignments ───────────────────────────────────────────────────────────
  assignStaff: (payload) =>
    request('POST', '/staff/assign', payload),

  getStaff: () =>
    request('GET', '/staff/all'),

  // ── Zones ─────────────────────────────────────────────────────────────────
  getZones: () =>
    request('GET', '/zones'),
};

export { ApiError };
export default api;
