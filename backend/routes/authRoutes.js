const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');
const { googleStudentLogin } = require('../controllers/googleAuthController');

router.post('/register',    authController.register);
router.post('/request-otp', authController.requestOtp);
router.post('/verify-otp',  authController.verifyOtp);
router.post('/login',       authController.login);
router.get('/stats/:id',    authController.getStats);
router.post('/google/student', googleStudentLogin);

const { getMyPoints } = require('../controllers/rewardsController');
router.get('/rewards/my-points', authenticate, getMyPoints);

module.exports = router;