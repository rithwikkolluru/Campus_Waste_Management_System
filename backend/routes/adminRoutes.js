const express = require('express');
const router = express.Router();
const db = require('../config/db');
const pool = db.pool;
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

router.get('/reports', authenticate, requireAdmin, async (req, res) => {
  const { status, page = 1 } = req.query;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    let where = 'WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      where += ` AND r.status = $${params.length}`;
    }

    const query = `
      SELECT
        r.id, r.zone_id as location, r.waste_type, r.description,
        r.status, r.created_at, r.priority,
        u.name as student_name, u.email as student_email,
        COALESCE(
          json_agg(
            json_build_object('id', rp.id, 'url', rp.file_url, 'at', rp.uploaded_at)
          ) FILTER (WHERE rp.id IS NOT NULL),
          '[]'
        ) as photos
      FROM reports r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN report_photos rp ON r.id = rp.report_id
      ${where}
      GROUP BY r.id, u.name, u.email
      ORDER BY r.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const result = await pool.query(query, params);
    res.json({ reports: result.rows });
  } catch (err) {
    console.error('Admin reports error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Update report status (admin marks as resolved → student gets +15 pts)
router.patch('/reports/:id/status', authenticate, requireAdmin, async (req, res) => {
  const dbClient = await pool.connect();

  try {
    await dbClient.query('BEGIN');
    const { status } = req.body;
    const { id } = req.params;

    const result = await dbClient.query(
      `UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ error: 'Report not found' });
    }

    // Award bonus points when resolved
    if (status === 'resolved') {
      const { awardPoints } = require('../controllers/rewardsController');
      await awardPoints(result.rows[0].user_id, 15, 'report_verified', id, dbClient);
    }

    await dbClient.query('COMMIT');
    res.json({ success: true, report: result.rows[0] });
  } catch (err) {
    await dbClient.query('ROLLBACK');
    console.error('Status update error:', err.message);
    res.status(500).json({ error: 'Failed to update status' });
  } finally {
    dbClient.release();
  }
});

module.exports = router;
