const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/authMiddleware');

// ── GET all report markers for map ──────────────
router.get('/maps/reports', authenticate, async (req, res) => {
  try {
    const { status, wasteType, days = 30 } = req.query;

    let where = `WHERE r.latitude IS NOT NULL
                   AND r.longitude IS NOT NULL
                   AND r.created_at >= NOW() - INTERVAL '${parseInt(days)} days'`;
    const params = [];

    if (status && status !== 'all') {
      if (status === 'pending') {
        params.push('reported');
        where += ` AND r.status = $${params.length}`;
      } else {
        params.push(status);
        where += ` AND r.status = $${params.length}`;
      }
    }
    if (wasteType && wasteType !== 'all') {
      params.push(wasteType);
      where += ` AND r.waste_type = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT
        r.id,
        r.latitude,
        r.longitude,
        r.waste_type,
        r.status,
        r.description,
        r.location,
        r.created_at,
        COALESCE(r.ai_severity, 5) as severity,
        COALESCE(r.ai_priority, 'Medium') as priority,
        u.name as student_name,
        COALESCE(
          json_agg(
            json_build_object('url', rp.file_url)
          ) FILTER (WHERE rp.id IS NOT NULL),
          '[]'
        ) as photos
      FROM reports r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN report_photos rp ON r.id = rp.report_id
      ${where}
      GROUP BY r.id, u.name
      ORDER BY r.created_at DESC
    `, params);

    // Add pin color based on status and severity
    const markers = result.rows.map(r => {
      // Map reported status to pending for frontend matching
      const uiStatus = r.status === 'reported' ? 'pending' : r.status;
      return {
        id: r.id,
        lat: parseFloat(r.latitude),
        lng: parseFloat(r.longitude),
        wasteType: r.waste_type,
        status: uiStatus,
        severity: parseInt(r.severity),
        priority: r.priority,
        description: r.description,
        location: r.location,
        studentName: r.student_name,
        photo: r.photos?.[0]?.url || null,
        createdAt: r.created_at,
        pinColor:
          uiStatus === 'resolved'   ? 'green'  :
          uiStatus === 'in_progress'? 'blue'   :
          parseInt(r.severity) >= 8 ? 'red'    :
          parseInt(r.severity) >= 5 ? 'orange' :
                                      'yellow',
      };
    });

    res.json({ markers, total: markers.length });
  } catch (err) {
    console.error('Maps reports error:', err.message);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

// ── GET heatmap data ────────────────────────────
router.get('/maps/heatmap', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const result = await pool.query(`
      SELECT
        ROUND(latitude::numeric, 4) as lat,
        ROUND(longitude::numeric, 4) as lng,
        COUNT(*) as report_count,
        AVG(COALESCE(ai_severity, 5)) as avg_severity
      FROM reports
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY
        ROUND(latitude::numeric, 4),
        ROUND(longitude::numeric, 4)
      ORDER BY report_count DESC
    `);

    // leaflet.heat expects [lat, lng, intensity]
    const points = result.rows.map(r => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lng),
      intensity: Math.min(
        parseInt(r.report_count) * parseFloat(r.avg_severity) / 10,
        1.0
      ),
    }));

    res.json({ points });
  } catch (err) {
    console.error('Heatmap error:', err.message);
    res.status(500).json({ error: 'Failed to fetch heatmap' });
  }
});

// ── GET campus stats for map header ────────────
router.get('/maps/stats', authenticate, async (req, res) => {
  try {
    const [total, pending, resolved, critical] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM reports
                  WHERE created_at >= NOW() - INTERVAL '30 days'`),
      pool.query(`SELECT COUNT(*) FROM reports
                  WHERE status = 'reported'`),
      pool.query(`SELECT COUNT(*) FROM reports
                  WHERE status = 'resolved'
                  AND created_at >= NOW() - INTERVAL '30 days'`),
      pool.query(`SELECT COUNT(*) FROM reports
                  WHERE COALESCE(ai_severity,5) >= 7
                  AND status != 'resolved'`),
    ]);

    res.json({
      totalThisMonth: parseInt(total.rows[0].count),
      pendingReports:  parseInt(pending.rows[0].count),
      resolvedThisMonth: parseInt(resolved.rows[0].count),
      criticalActive:  parseInt(critical.rows[0].count),
    });
  } catch (err) {
    console.error('Maps stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── GET report history list for sidebar panel ──
router.get('/maps/history', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { mine = 'false' } = req.query;

    const where = mine === 'true'
      ? `WHERE r.user_id = $1 AND r.latitude IS NOT NULL`
      : `WHERE r.latitude IS NOT NULL`;

    const params = mine === 'true' ? [userId] : [];

    const result = await pool.query(`
      SELECT
        r.id, r.waste_type, r.status, r.description,
        r.location, r.created_at, r.latitude, r.longitude,
        COALESCE(r.ai_severity, 5) as severity,
        COALESCE(
          (SELECT file_url FROM report_photos
           WHERE report_id = r.id LIMIT 1),
          NULL
        ) as photo
      FROM reports r
      ${where}
      ORDER BY r.created_at DESC
      LIMIT 50
    `, params);

    const reports = result.rows.map(r => ({
      ...r,
      // Map reported status to pending
      status: r.status === 'reported' ? 'pending' : r.status
    }));

    res.json({ reports });
  } catch (err) {
    console.error('Maps history error:', err.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
