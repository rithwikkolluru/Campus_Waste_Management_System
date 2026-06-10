const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/leaderboard', async (req, res) => {
  try {
    const { period = 'all_time' } = req.query;
    let whereClause = '';
    
    if (period === 'weekly') {
      whereClause = `WHERE created_at >= date_trunc('week', NOW())`;
    } else if (period === 'monthly') {
      whereClause = `WHERE created_at >= date_trunc('month', NOW())`;
    }

    let queryText = `
      SELECT id, name, badge, total_points, reports_count, 
             COALESCE(weekly_points, 0) as weekly_points, 
             COALESCE(monthly_points, 0) as monthly_points
      FROM users
    `;

    if (period === 'weekly') {
      queryText += ` ORDER BY weekly_points DESC, total_points DESC LIMIT 50`;
    } else if (period === 'monthly') {
      queryText += ` ORDER BY monthly_points DESC, total_points DESC LIMIT 50`;
    } else {
      queryText += ` ORDER BY total_points DESC LIMIT 50`;
    }

    const result = await pool.query(queryText);
    
    const formatted = result.rows.map((user, index) => ({
      ...user,
      rank: index + 1,
      points: period === 'weekly' ? user.weekly_points : period === 'monthly' ? user.monthly_points : user.total_points
    }));

    res.json({ success: true, leaderboard: formatted });
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
