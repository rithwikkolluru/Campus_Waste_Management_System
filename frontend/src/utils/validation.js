/**
 * validation.js – Input validation + XSS sanitization utilities
 * Used in forms and service layer before API calls.
 */

// ────────────────────────────────────────────────────────────────────────────
// XSS PROTECTION
// Strips HTML tags and dangerous characters from user input.
// ────────────────────────────────────────────────────────────────────────────
export function sanitize(input = '') {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Strips all HTML tags (for plain-text display).
 */
export function stripTags(html = '') {
  return html.replace(/<[^>]*>/g, '');
}

// ────────────────────────────────────────────────────────────────────────────
// EMAIL
// ────────────────────────────────────────────────────────────────────────────
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string') return { ok: false, error: 'Email is required.' };
  if (!re.test(email.trim())) return { ok: false, error: 'Please enter a valid email address.' };
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────────────────
// PASSWORD
// ────────────────────────────────────────────────────────────────────────────
export function validatePassword(password) {
  if (!password) return { ok: false, error: 'Password is required.' };
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
  return { ok: true };
}

export function checkPasswordStrength(password = '') {
  let score = 0;
  if (password.length >= 8)           score++;
  if (/[A-Z]/.test(password))         score++;
  if (/[a-z]/.test(password))         score++;
  if (/[0-9]/.test(password))         score++;
  if (/[^A-Za-z0-9]/.test(password))  score++;

  const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#ef4444',  '#f97316', '#f59e0b', '#3b82f6', '#10b981'];
  return { score, label: levels[score - 1] || 'Very Weak', color: colors[score - 1] || colors[0] };
}

// ────────────────────────────────────────────────────────────────────────────
// DESCRIPTION
// ────────────────────────────────────────────────────────────────────────────
export function validateDescription(text, minLen = 10, maxLen = 1000) {
  if (!text || text.trim().length < minLen)
    return { ok: false, error: `Description must be at least ${minLen} characters.` };
  if (text.trim().length > maxLen)
    return { ok: false, error: `Description must not exceed ${maxLen} characters.` };
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────────────────
// FILE UPLOAD
// ────────────────────────────────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES      = 5 * 1024 * 1024; // 5 MB

export function validateImageFile(file) {
  if (!file) return { ok: false, error: 'No file selected.' };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type))
    return { ok: false, error: 'Only JPG, PNG, and WEBP images are allowed.' };
  if (file.size > MAX_IMAGE_BYTES)
    return { ok: false, error: 'File size must not exceed 5 MB.' };
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────────────────
// PHONE
// ────────────────────────────────────────────────────────────────────────────
export function validatePhone(phone) {
  const re = /^[+]?[\d\s\-().]{7,15}$/;
  if (!phone) return { ok: true }; // optional
  if (!re.test(phone.trim())) return { ok: false, error: 'Enter a valid phone number.' };
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────────────────
// GENERAL FORM VALIDATOR
// ────────────────────────────────────────────────────────────────────────────
/**
 * Validate an entire registration / login form object.
 * Returns { ok: boolean, errors: { field: message } }
 */
export function validateRegisterForm(form) {
  const errors = {};

  const emailResult = validateEmail(form.email);
  if (!emailResult.ok) errors.email = emailResult.error;

  if (!form.name || form.name.trim().length < 2)
    errors.name = 'Full name must be at least 2 characters.';

  const pwdResult = validatePassword(form.password);
  if (!pwdResult.ok) errors.password = pwdResult.error;

  if (form.password !== form.confirm)
    errors.confirm = 'Passwords do not match.';

  if (!form.zone)
    errors.zone = 'Please select your campus zone.';

  if (form.phone) {
    const phoneResult = validatePhone(form.phone);
    if (!phoneResult.ok) errors.phone = phoneResult.error;
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateLoginForm(form) {
  const errors = {};
  const emailResult = validateEmail(form.email);
  if (!emailResult.ok) errors.email = emailResult.error;
  if (!form.password) errors.password = 'Password is required.';
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateReportForm(form) {
  const errors = {};
  if (!form.zone) errors.zone = 'Please select a campus zone.';
  const descResult = validateDescription(form.description);
  if (!descResult.ok) errors.description = descResult.error;
  return { ok: Object.keys(errors).length === 0, errors };
}
