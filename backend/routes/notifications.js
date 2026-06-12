const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/authMiddleware');

// GET all notifications for current user
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, type, title, message, data, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.userId || req.user.id]);

    const unreadCount = result.rows.filter(n => !n.is_read).length;

    res.json({
      notifications: result.rows,
      unreadCount,
    });
  } catch (err) {
    console.error('Get notifications error:', err.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH mark one notification as read
router.patch('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    await pool.query(`
      UPDATE notifications
      SET is_read = true
      WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.userId || req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// PATCH mark ALL notifications as read
router.patch('/notifications/read-all', authenticate, async (req, res) => {
  try {
    await pool.query(`
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1 AND is_read = false
    `, [req.user.userId || req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all read' });
  }
});

// GET unread count only (for badge in nav)
router.get('/notifications/unread-count', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) FROM notifications
      WHERE user_id = $1 AND is_read = false
    `, [req.user.userId || req.user.id]);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

// GET active campus announcements for logged-in student
router.get('/announcements/active', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.id, a.title, a.message, a.type, a.created_at, a.expires_at,
             COALESCE(z.name, 'All Zones') AS zone_name
      FROM announcements a
      LEFT JOIN zones z ON a.zone_id = z.id
      WHERE a.is_active = true
        AND (a.expires_at IS NULL OR a.expires_at > NOW())
      ORDER BY a.created_at DESC
      LIMIT 30
    `);
    res.json({ announcements: result.rows });
  } catch (err) {
    console.error('Active announcements error:', err.message);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

module.exports = router;
