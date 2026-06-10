const express = require('express');
const router  = express.Router();
const zoneController = require('../controllers/zoneController');
const { authenticate } = require('../middleware/authMiddleware');
const zoneService = require('../services/zoneService');

const pool = require('../config/db').pool;

router.get('/', authenticate, zoneController.getZones);

router.get('/check-status', authenticate, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }
    const status = await zoneService.checkZoneStatus(parseFloat(lat), parseFloat(lng));
    res.json(status);
  } catch (err) {
    console.error('check-status error:', err.message);
    res.status(500).json({ error: 'Failed to check zone status' });
  }
});

// Public: get active announcements for a zone
router.get('/announcements/:zoneId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, message, type, expires_at FROM announcements 
       WHERE zone_id = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC`,
      [req.params.zoneId]
    );
    res.json({ announcements: result.rows });
  } catch (err) {
    console.error('Zone announcements error:', err.message);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

module.exports = router;
