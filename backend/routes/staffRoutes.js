const express = require('express');
const router  = express.Router();
const staffController = require('../controllers/staffController');

// Routes
router.get('/all',       staffController.getAllStaff);
router.post('/assign',   staffController.assignStaff);

module.exports = router;
