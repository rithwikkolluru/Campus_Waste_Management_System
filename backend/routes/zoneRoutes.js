const express = require('express');
const router  = express.Router();
const zoneController = require('../controllers/zoneController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, zoneController.getZones);

module.exports = router;
