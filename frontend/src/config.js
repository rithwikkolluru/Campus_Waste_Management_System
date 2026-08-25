/**
 * config.js - Central configuration for API base URL
 * Uses VITE_API_URL env var in production (Render), falls back to localhost in dev
 */
const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:8000';

export const API_BASE_URL = API_BASE;
export const API_URL = `${API_BASE}/api`;

export default API_BASE_URL;
