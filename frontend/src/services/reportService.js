/**
 * reportService.js – Garbage report CRUD + image upload logic
 */
import api from './api';
import { sanitize } from '../utils/validation';

export const reportService = {
  /**
   * Fetch all reports.  Pass filters like { zone, status, priority }.
   */
  async getAll(filters = {}) {
    return api.getReports(filters);
  },

  /**
   * Submit a new garbage report with an optional image.
   * Sanitises text fields before sending.
   */
  async submit({ image, zone, wasteType, description, priority }) {
    const form = new FormData();
    form.append('zone',        sanitize(zone));
    form.append('wasteType',   sanitize(wasteType));
    form.append('description', sanitize(description));
    form.append('priority',    priority);
    if (image instanceof File) {
      if (!validateImage(image)) {
        throw new Error('Invalid image: must be JPG/PNG/WEBP under 5 MB.');
      }
      form.append('image', image);
    }
    return api.submitReport(form);
  },

  /**
   * Advance a report's status (coordinator/admin action).
   */
  async updateStatus(reportId, status) {
    return api.updateReport(reportId, { status });
  },

  /**
   * Assign cleaning staff to a report.
   */
  async assignStaff(reportId, staffName) {
    return api.updateReport(reportId, { assignedStaff: sanitize(staffName) });
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function validateImage(file) {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_BYTES     = 5 * 1024 * 1024; // 5 MB
  return ALLOWED_TYPES.includes(file.type) && file.size <= MAX_BYTES;
}

export default reportService;
