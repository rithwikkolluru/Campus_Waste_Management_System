const pool = require('../config/db').pool;

// GET current user's points — call this to refresh UI
const getMyPoints = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const [userResult, dailyResult, monthlyResult, historyResult] = await Promise.all([
      pool.query('SELECT total_points FROM users WHERE id = $1', [userId]),

      pool.query(
        `SELECT COALESCE(SUM(points), 0) as total
         FROM points_logs
         WHERE user_id = $1 AND created_at::date = CURRENT_DATE`,
        [userId]
      ),

      pool.query(
        `SELECT COALESCE(SUM(points), 0) as total
         FROM points_logs
         WHERE user_id = $1
           AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`,
        [userId]
      ),

      pool.query(
        `SELECT points, action, created_at
         FROM points_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [userId]
      ),
    ]);

    res.json({
      total_points: parseInt(userResult.rows[0]?.total_points || 0),
      daily_earned: parseInt(dailyResult.rows[0]?.total || 0),
      monthly_earned: parseInt(monthlyResult.rows[0]?.total || 0),
      daily_limit: 50,
      monthly_limit: 500,
      recent_history: historyResult.rows,
    });
  } catch (err) {
    console.error('getMyPoints error:', err.message);
    res.status(500).json({ error: 'Could not fetch points' });
  }
};

// Award points atomically (safe, no double-counting)
const awardPoints = async (userId, points, action, reportId, client) => {
  // Check daily limit
  const daily = await client.query(
    `SELECT COALESCE(SUM(points), 0) as total
     FROM points_logs
     WHERE user_id = $1 AND created_at::date = CURRENT_DATE`,
    [userId]
  );

  if (parseInt(daily.rows[0].total) + points > 50) {
    return { awarded: false, reason: 'daily_limit_reached' };
  }

  // Check monthly limit
  const monthly = await client.query(
    `SELECT COALESCE(SUM(points), 0) as total
     FROM points_logs
     WHERE user_id = $1
       AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`,
    [userId]
  );

  if (parseInt(monthly.rows[0].total) + points > 500) {
    return { awarded: false, reason: 'monthly_limit_reached' };
  }

  // Log the points event
  await client.query(
    `INSERT INTO points_logs (user_id, points, action, report_id, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [userId, points, action, reportId || null]
  );

  // Update total
  const result = await client.query(
    `UPDATE users SET total_points = total_points + $1 WHERE id = $2
     RETURNING total_points`,
    [points, userId]
  );

  return {
    awarded: true,
    points_added: points,
    new_total: result.rows[0].total_points,
  };
};

module.exports = { getMyPoints, awardPoints };
