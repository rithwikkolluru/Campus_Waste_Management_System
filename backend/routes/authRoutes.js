const express = require('express');
const router  = express.Router();
const authController = require('../controllers/authController');

// Routes
router.post('/request-otp', authController.requestOtp);
router.post('/verify-otp',  authController.verifyOtp);
router.post('/login',       authController.login);
router.get('/stats/:id',    authController.getStats);

module.exports = router;
