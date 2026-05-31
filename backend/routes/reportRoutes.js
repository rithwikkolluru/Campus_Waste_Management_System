const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const reportController = require('../controllers/reportController');

const upload = require('../config/multer');

// Multer error handler
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

const { authenticate } = require('../middleware/authMiddleware');

// Routes
router.get('/', reportController.getAllReports);
router.post('/submit', authenticate, handleUpload, reportController.submitReport);
router.put('/:id', reportController.updateStatus);

module.exports = router;