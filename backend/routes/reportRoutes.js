const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const reportController = require('../controllers/reportController');

// Multer storage for garbage images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename:    (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname   = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype  = filetypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only JPG, PNG, and WEBP images allowed.'));
  },
});

// Routes
router.get('/',        reportController.getAllReports);
router.post('/submit', upload.single('image'), reportController.submitReport);
router.put('/:id',     reportController.updateStatus);

module.exports = router;
