/**
 * helpers.js – General utility functions used across the frontend
 */

// ── Date / Time ──────────────────────────────────────────────────────────────
/**
 * Returns a human-readable "time ago" string.
 *   e.g. "2h ago", "3d ago", "just now"
 */
export function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60)  return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)  return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)    return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7)      return `${days}d ago`;
  return new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Formats an ISO date string to a readable local date.
 *   e.g. "18 Mar 2026"
 */
export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── ID Generation ────────────────────────────────────────────────────────────
export function generateReportId() {
  return `RPT-${String(Math.floor(Math.random() * 9000 + 1000))}`;
}

// ── String utilities ─────────────────────────────────────────────────────────
export function initials(name = '') {
  return name.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2);
}

export function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ── Priority helpers ─────────────────────────────────────────────────────────
export const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

export function sortByPriority(items) {
  return [...items].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
  );
}

// ── File helpers ─────────────────────────────────────────────────────────────
export function humanFileSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1048576)     return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ── URL / query helpers ──────────────────────────────────────────────────────
export function buildQueryString(params = {}) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

// ── Colour helpers ───────────────────────────────────────────────────────────
export const STATUS_COLOR_MAP = {
  'Reported':             '#ef4444',
  'Under Review':         '#f59e0b',
  'Assigned to Staff':    '#3b82f6',
  'Cleaning in Progress': '#8b5cf6',
  'Resolved':             '#10b981',
};

export const PRIORITY_COLOR_MAP = {
  High:   '#ef4444',
  Medium: '#f59e0b',
  Low:    '#10b981',
};

export function statusColor(status)   { return STATUS_COLOR_MAP[status]   || '#64748b'; }
export function priorityColor(priority) { return PRIORITY_COLOR_MAP[priority] || '#64748b'; }
