const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const reportController = require('../controllers/reportController');
const upload  = require('../config/multer');
const { authenticate } = require('../middleware/authMiddleware');

// Multer error handler wrapper
const handleUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ status: 'error', message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }
    next();
  });
};

// ── Routes ──────────────────────────────────────────────────────────────────

// Instant AI pre-analysis (called when student selects a photo before submitting)
router.post('/analyze-photo', authenticate, handleUpload, reportController.analyzePhoto);

// Student's own reports
router.get('/my', authenticate, reportController.getMyReports);

// All reports (admin/coordinator)
router.get('/', reportController.getAllReports);

// Submit a new report with photo + full AI analysis
router.post('/submit', authenticate, handleUpload, reportController.submitReport);

// Update report status
router.put('/:id', reportController.updateStatus);

module.exports = router;