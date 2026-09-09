/**
 * config.js - Central configuration for API base URL
 * Uses VITE_API_URL env var in production (Render), falls back to localhost in dev
 */
const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const cleanApiBase = rawApiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

export const API_BASE_URL = cleanApiBase || (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:8000' : '');
export const API_URL = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';

export default API_BASE_URL;
