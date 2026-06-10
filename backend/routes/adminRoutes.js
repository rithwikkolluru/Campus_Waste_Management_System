const express  = require('express');
const router   = express.Router();
const db       = require('../config/db');
const pool     = db.pool;
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');
const { generateWeeklyReport } = require('../services/geminiService');
const zoneService = require('../services/zoneService');
const notificationService = require('../services/notificationService');

// ── Helper: gather last-7-days data ─────────────────────────────────────────
const fetchWeekData = async () => {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const [reportsRes, byTypeRes, byZoneRes] = await Promise.all([
    pool.query(
      `SELECT r.id, r.status, r.waste_type, r.ai_severity, r.ai_priority,
              r.created_at, z.name AS zone_name, u.name AS student_name
       FROM reports r
       LEFT JOIN zones z ON r.zone_id = z.id
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.created_at >= $1`, [weekStart]
    ),
    pool.query(
      `SELECT waste_type, COUNT(*) AS count
       FROM reports WHERE created_at >= $1
       GROUP BY waste_type ORDER BY count DESC`, [weekStart]
    ),
    pool.query(
      `SELECT z.name AS zone, COUNT(r.id) AS total,
              SUM(CASE WHEN r.status = 'resolved' THEN 1 ELSE 0 END) AS resolved
       FROM reports r
       LEFT JOIN zones z ON r.zone_id = z.id
       WHERE r.created_at >= $1
       GROUP BY z.name ORDER BY total DESC`, [weekStart]
    ),
  ]);

  const reports  = reportsRes.rows;
  const resolved = reports.filter(r => r.status === 'resolved').length;

  return {
    totalReports:       reports.length,
    resolvedReports:    resolved,
    pendingReports:     reports.length - resolved,
    resolvedPercentage: reports.length > 0 ? Math.round((resolved / reports.length) * 100) : 0,
    byWasteType:        byTypeRes.rows,
    byZone:             byZoneRes.rows,
    weekStart:          weekStart.toISOString().split('T')[0],
    weekEnd:            new Date().toISOString().split('T')[0],
  };
};

// ── GET /api/admin/reports ───────────────────────────────────────────────────
router.get('/reports', authenticate, requireAdmin, async (req, res) => {
  const { status, page = 1 } = req.query;
  const limit  = 20;
  const offset = (page - 1) * limit;

  try {
    let where  = 'WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      where += ` AND r.status = $${params.length}`;
    }

    const query = `
      SELECT
        r.id, r.zone_id as location, r.waste_type, r.description,
        r.status, r.created_at, r.priority,
        r.ai_severity, r.ai_priority, r.ai_description,
        u.name as student_name, u.email as student_email,
        COALESCE(
          json_agg(
            json_build_object(
              'id',  rp.id,
              'url', rp.file_url,
              'at',  rp.uploaded_at,
              'ai_waste_type', rp.ai_waste_type,
              'ai_bin_color',  rp.ai_bin_color,
              'ai_bin_label',  rp.ai_bin_label,
              'ai_confidence', rp.ai_confidence,
              'ai_tips',       rp.ai_tips,
              'is_duplicate',  rp.is_duplicate
            )
          ) FILTER (WHERE rp.id IS NOT NULL),
          '[]'
        ) as photos
      FROM reports r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN report_photos rp ON r.id = rp.report_id
      ${where}
      GROUP BY r.id, u.name, u.email
      ORDER BY COALESCE(r.ai_severity, 5) DESC, r.created_at DESC
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

// ── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, created_at, total_points FROM users ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Admin users error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ── PATCH /api/admin/reports/:id/status ─────────────────────────────────────
router.patch('/reports/:id/status', authenticate, requireAdmin, async (req, res) => {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    const { status } = req.body;
    const { id }     = req.params;

    const result = await dbClient.query(
      `UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ error: 'Report not found' });
    }

    if (status === 'resolved') {
      const { awardPoints } = require('../controllers/rewardsController');
      await awardPoints(result.rows[0].user_id, 15, 'report_verified', id, dbClient);
      
      // Resolve zone and award bonus to all reporters in that zone
      await zoneService.resolveZoneAndAwardBonus(id);
    }
    
    // Notify the reporter
    await notificationService.notifyReportStatus(result.rows[0].user_id, id, status, result.rows[0].location || 'Campus');

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

// ── GET /api/admin/weekly-report ────────────────────────────────────────────
router.get('/weekly-report', authenticate, requireAdmin, async (req, res) => {
  try {
    // Check if a recent one exists (generated in last 24h)
    const cached = await pool.query(
      `SELECT * FROM weekly_reports ORDER BY created_at DESC LIMIT 1`
    );

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (
      cached.rows.length > 0 &&
      new Date(cached.rows[0].created_at) > twentyFourHoursAgo &&
      req.query.refresh !== 'true'
    ) {
      return res.json({ success: true, report: cached.rows[0], cached: true });
    }

    // Generate fresh report
    const weekData    = await fetchWeekData();
    const aiAnalysis  = await generateWeeklyReport(weekData);

    const saved = await pool.query(
      `INSERT INTO weekly_reports (week_start, week_end, report_data, ai_analysis)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [weekData.weekStart, weekData.weekEnd, JSON.stringify(weekData), JSON.stringify(aiAnalysis)]
    );

    res.json({ success: true, report: saved.rows[0], cached: false });
  } catch (err) {
    console.error('Weekly report error:', err.message);
    res.status(500).json({ error: 'Failed to generate weekly report' });
  }
});

// ── Cron: auto-generate every Monday 8am ────────────────────────────────────
const cron = require('node-cron');
cron.schedule('0 8 * * 1', async () => {
  try {
    console.log('🤖 Auto-generating weekly waste report...');
    const weekData   = await fetchWeekData();
    const aiAnalysis = await generateWeeklyReport(weekData);
    await pool.query(
      `INSERT INTO weekly_reports (week_start, week_end, report_data, ai_analysis)
       VALUES ($1, $2, $3, $4)`,
      [weekData.weekStart, weekData.weekEnd, JSON.stringify(weekData), JSON.stringify(aiAnalysis)]
    );
    console.log('✅ Weekly report generated and saved.');
  } catch (err) {
    console.error('❌ Cron weekly report error:', err.message);
  }
});

module.exports = router;
