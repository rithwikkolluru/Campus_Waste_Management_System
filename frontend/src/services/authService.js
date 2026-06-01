/**
 * authService.js – Auth flow helpers layered on top of api.js
 */
import api from './api';

export const authService = {
  /**
   * Login: call API, store the JWT token and return user info.
   */
  async login(email, password) {
    const data = await api.login(email, password);
    if (data.token) {
      sessionStorage.setItem('ecocampus_token', data.token);
    }
    return data.user;
  },

  /**
   * Register a new user account.
   */
  async register(payload) {
    return api.register(payload);
  },

  /**
   * Logout: clear token and notify backend.
   */
  async logout() {
    try {
      await api.logout();
    } finally {
      sessionStorage.removeItem('ecocampus_token');
      sessionStorage.removeItem('eco_user');
    }
  },

  /**
   * Request a password-reset email.
   */
  async requestPasswordReset(email) {
    return api.requestPasswordReset(email);
  },

  /**
   * Check if a token is currently stored (basic client-side guard).
   */
  isAuthenticated() {
    return !!sessionStorage.getItem('ecocampus_token');
  },
};

export default authService;
