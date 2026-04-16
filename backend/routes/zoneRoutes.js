const express = require('express');
const router  = express.Router();
const zoneController = require('../controllers/zoneController');

router.get('/', zoneController.getZones);

module.exports = router;
