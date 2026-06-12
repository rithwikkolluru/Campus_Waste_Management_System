const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

const BADGE_TIERS = [
  { points: 400000, title: 'JNTUH Pride' },
  { points: 375000, title: 'Platinum Badge 1' },
  { points: 350000, title: 'Platinum Badge 2' },
  { points: 325000, title: 'Platinum Badge 3' },
  { points: 300000, title: 'Diamond Badge 1' },
  { points: 275000, title: 'Diamond Badge 2' },
  { points: 250000, title: 'Diamond Badge 3' },
  { points: 225000, title: 'Gold Badge 1' },
  { points: 200000, title: 'Gold Badge 2' },
  { points: 175000, title: 'Gold Badge 3' },
  { points: 150000, title: 'Silver Badge 1' },
  { points: 125000, title: 'Silver Badge 2' },
  { points: 100000, title: 'Silver Badge 3' },
  { points: 75000,  title: 'Bronze Badge 1' },
  { points: 50000,  title: 'Bronze Badge 2' },
  { points: 25000,  title: 'Bronze Badge 3' },
];

function getBadgeTitle(points) {
  for (const tier of BADGE_TIERS) {
    if (points >= tier.points) return tier.title;
  }
  return 'Seedling';
}

router.get('/leaderboard', async (req, res) => {
  try {
    const { period = 'all_time' } = req.query;

    let queryText = `
      SELECT u.id,
             COALESCE(NULLIF(TRIM(u.name), ''), SPLIT_PART(u.email, '@', 1), 'Student') AS name,
             u.total_points,
             COALESCE(u.weekly_points, 0) AS weekly_points,
             COALESCE(u.monthly_points, 0) AS monthly_points,
             (SELECT COUNT(*)::int FROM reports r WHERE r.user_id = u.id) AS reports_count
      FROM users u
      WHERE u.role = 'student'
    `;

    if (period === 'weekly') {
      queryText += ` ORDER BY weekly_points DESC, total_points DESC LIMIT 50`;
    } else if (period === 'monthly') {
      queryText += ` ORDER BY monthly_points DESC, total_points DESC LIMIT 50`;
    } else {
      queryText += ` ORDER BY total_points DESC LIMIT 50`;
    }

    const result = await pool.query(queryText);
    
    const formatted = result.rows.map((user, index) => {
      const pts = period === 'weekly' ? user.weekly_points : period === 'monthly' ? user.monthly_points : user.total_points;
      return {
        id: user.id,
        name: user.name,
        rank: index + 1,
        points: pts,
        total_points: user.total_points,
        reports_count: user.reports_count,
        badge: getBadgeTitle(user.total_points),
      };
    });

    res.json({ success: true, leaderboard: formatted });
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
