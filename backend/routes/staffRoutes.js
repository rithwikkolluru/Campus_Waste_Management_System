const express = require('express');
const router  = express.Router();
const staffController = require('../controllers/staffController');
const { authenticate } = require('../middleware/authMiddleware');

// Routes
router.get('/all', authenticate, staffController.getAllStaff);
router.post('/assign', authenticate, staffController.assignStaff);

module.exports = router;
