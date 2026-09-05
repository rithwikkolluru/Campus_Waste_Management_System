const express = require('express');
const router = express.Router();
const pool = require('../config/db').pool;
const { authenticate, requireCoordinator } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads/verification-photos directory exists
const verifyDir = path.join(__dirname, '..', 'uploads', 'verification-photos');
if (!fs.existsSync(verifyDir)) {
  fs.mkdirSync(verifyDir, { recursive: true });
}

// Multer storage for verification photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, verifyDir),
  filename: (req, file, cb) => cb(null, `verify-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
const notificationService = require('../services/notificationService');

// Ensure JWT user exists in DB (demo accounts use hardcoded IDs not in users table)
async function ensureUserInDb(req, client = pool) {
  const jwtId = req.user.userId || req.user.id;
  const email = req.user.email || `user${jwtId}@demo.local`;
  const name = req.user.name || 'Demo User';
  const role = req.user.role || 'coordinator';

  const byId = await client.query('SELECT id FROM users WHERE id = $1', [jwtId]);
  if (byId.rows.length > 0) return byId.rows[0].id;

  const byEmail = await client.query('SELECT id FROM users WHERE email = $1', [email]);
  if (byEmail.rows.length > 0) return byEmail.rows[0].id;

  try {
    const inserted = await client.query(
      `INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      [jwtId, name, email, role]
    );
    return inserted.rows[0].id;
  } catch {
    const inserted = await client.query(
      `INSERT INTO users (name, email, role) VALUES ($1, $2, $3) RETURNING id`,
      [name, email, role]
    );
    return inserted.rows[0].id;
  }
}

// GET /api/coordinator/reports
router.get('/reports', authenticate, requireCoordinator, async (req, res) => {
  try {
    const coordZone = req.user.assigned_zone;
    const { district, ward } = req.query;

    let whereClauses = [];
    let params = [];

    if (coordZone) {
      params.push(coordZone);
      whereClauses.push(`r.zone_id = $${params.length}`);
    }
    if (district) {
      params.push(district);
      whereClauses.push(`r.district = $${params.length}`);
    }
    if (ward) {
      params.push(ward);
      whereClauses.push(`r.ward_number = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT r.id, r.description, r.waste_type, r.priority, r.status,
             r.latitude, r.longitude,
             r.state, r.district, r.city_municipality, r.ward_number, r.pincode, r.formatted_address,
             r.created_at, r.updated_at, r.sla_deadline,
             r.verified_photo_url, r.verified_at,
             r.ai_severity, r.ai_priority, r.ai_description,
             u.name as reporter_name, u.email as reporter_email,
             z.name as zone_name,
             a.staff_id as assigned_worker_id,
             wu.name as assigned_worker_name,
             COALESCE(
               json_agg(
                 json_build_object('id', rp.id, 'url', rp.file_url)
               ) FILTER (WHERE rp.id IS NOT NULL), '[]'
             ) as photos
      FROM reports r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN zones z ON r.zone_id = z.id
      LEFT JOIN assignments a ON a.report_id = r.id
      LEFT JOIN users wu ON a.staff_id = wu.id
      LEFT JOIN report_photos rp ON r.id = rp.report_id
      ${whereSql}
      GROUP BY r.id, u.name, u.email, z.name, a.staff_id, wu.name
      ORDER BY r.created_at DESC
    `, params);
    res.json({ reports: result.rows });
  } catch (err) {
    console.error('Coordinator reports error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/coordinator/workers
router.get('/workers', authenticate, requireCoordinator, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, assigned_zone, role FROM users WHERE role IN ('staff', 'coordinator') ORDER BY name`
    );
    res.json({ workers: result.rows });
  } catch (err) {
    console.error('Workers fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch workers' });
  }
});

// POST /api/coordinator/assign/:reportId
router.post('/assign/:reportId', authenticate, requireCoordinator, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { workerId } = req.body;
    const { reportId } = req.params;

    // Get report to calculate SLA
    const reportRes = await client.query('SELECT ai_severity, priority FROM reports WHERE id = $1', [reportId]);
    if (reportRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Report not found' });
    }

    const severity = reportRes.rows[0].ai_severity || 5;
    let slaHours = 48;
    if (severity >= 9) slaHours = 2;
    else if (severity >= 7) slaHours = 6;
    else if (severity >= 4) slaHours = 24;

    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    // Remove old assignment if exists
    await client.query('DELETE FROM assignments WHERE report_id = $1', [reportId]);

    // Create new assignment
    await client.query(
      'INSERT INTO assignments (report_id, staff_id, assigned_by) VALUES ($1, $2, $3)',
      [reportId, workerId, req.user.userId || req.user.id]
    );

    // Update report status and SLA
    await client.query(
      'UPDATE reports SET status = $1, sla_deadline = $2, updated_at = NOW() WHERE id = $3',
      ['assigned', slaDeadline, reportId]
    );

    await client.query('COMMIT');
    res.json({ success: true, sla_deadline: slaDeadline });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Assignment error:', err.message);
    res.status(500).json({ error: 'Failed to assign worker' });
  } finally {
    client.release();
  }
});

// PATCH /api/coordinator/status/:reportId
router.patch('/status/:reportId', authenticate, requireCoordinator, async (req, res) => {
  try {
    const { status } = req.body;
    const { reportId } = req.params;
    const coordinatorId = await ensureUserInDb(req);

    const current = await pool.query(
      'SELECT status, user_id, description, location FROM reports WHERE id = $1',
      [reportId]
    );
    if (current.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    const { status: oldStatus, user_id: reporterId, description, location } = current.rows[0];

    const result = await pool.query(
      'UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, reportId]
    );

    await pool.query(
      'INSERT INTO report_logs (report_id, old_status, new_status, changed_by) VALUES ($1, $2, $3, $4)',
      [reportId, oldStatus, status, coordinatorId]
    );

    const locationLabel = location || description || 'your report';
    const statusMessages = {
      under_review: `Your report #${reportId} is now under review.`,
      assigned: `Your report #${reportId} has been assigned to cleaning staff.`,
      in_progress: `Your report #${reportId} is now in progress.`,
      resolved: `Your report #${reportId} has been resolved. Thank you for helping keep campus clean!`,
      reported: `Your report #${reportId} status was updated to reported.`,
    };
    if (reporterId && statusMessages[status]) {
      await notificationService.notifyStatusUpdate(
        reporterId,
        reportId,
        statusMessages[status]
      );
    }

    res.json({ success: true, report: result.rows[0] });
  } catch (err) {
    console.error('Status update error:', err.message);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// POST /api/coordinator/verify/:reportId
router.post('/verify/:reportId', authenticate, requireCoordinator, upload.single('photo'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { reportId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    const coordinatorId = await ensureUserInDb(req, client);
    const photoUrl = req.file ? `/uploads/verification-photos/${req.file.filename}` : null;

    const reportRes = await client.query(
      'SELECT user_id, description, location FROM reports WHERE id = $1',
      [reportId]
    );
    if (reportRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Report not found' });
    }
    const { user_id: reporterId } = reportRes.rows[0];

    if (action === 'approve') {
      await client.query(
        `UPDATE reports SET status = 'resolved', verified = true,
         verified_photo_url = $1, verified_at = NOW(), verified_by = $2, updated_at = NOW()
         WHERE id = $3`,
        [photoUrl, coordinatorId, reportId]
      );

      const { awardPoints } = require('../controllers/rewardsController');
      await awardPoints(reporterId, 15, 'report_verified', reportId, client);

      await notificationService.notifyStatusUpdate(
        reporterId,
        reportId,
        `Your report #${reportId} has been verified and cleaned! +15 XP awarded.`,
        client
      );
    } else {
      await client.query(
        `UPDATE reports SET status = 'in_progress', verified = false,
         verified_photo_url = NULL, verified_at = NULL, updated_at = NOW()
         WHERE id = $1`,
        [reportId]
      );

      await notificationService.notifyStatusUpdate(
        reporterId,
        reportId,
        'Your cleanup proof was rejected. Please re-submit.',
        client
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, action });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Verification error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to verify report' });
  } finally {
    client.release();
  }
});

// GET /api/coordinator/bins
router.get('/bins', authenticate, requireCoordinator, async (req, res) => {
  try {
    const coordZone = req.user.assigned_zone;
    const zoneClause = coordZone ? 'WHERE b.zone_id = $1 AND b.status = \'active\'' : 'WHERE b.status = \'active\'';
    const result = await pool.query(
      `SELECT b.*, z.name as zone_name FROM bins b LEFT JOIN zones z ON b.zone_id = z.id ${zoneClause} ORDER BY b.created_at DESC`,
      coordZone ? [coordZone] : []
    );
    res.json({ bins: result.rows });
  } catch (err) {
    console.error('Bins fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch bins' });
  }
});

// POST /api/coordinator/bins
router.post('/bins', authenticate, requireCoordinator, async (req, res) => {
  try {
    await ensureUserInDb(req);
    const { zone_id, location_desc, bin_type } = req.body;
    const targetZoneId = parseInt(zone_id || req.user.assigned_zone, 10);

    if (!targetZoneId || Number.isNaN(targetZoneId)) {
      return res.status(400).json({ error: 'Please select a target zone.' });
    }
    if (!location_desc || !location_desc.trim()) {
      return res.status(400).json({ error: 'Location description is required.' });
    }

    const result = await pool.query(
      `INSERT INTO bins (zone_id, location_desc, bin_type, fill_level, status, created_at, updated_at)
       VALUES ($1, $2, $3, 0, 'active', NOW(), NOW()) RETURNING *`,
      [targetZoneId, location_desc.trim(), bin_type || 'general']
    );
    res.json({ success: true, bin: result.rows[0] });
  } catch (err) {
    console.error('Bin create error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create bin' });
  }
});

// PATCH /api/coordinator/bins/:id
router.patch('/bins/:id', authenticate, requireCoordinator, async (req, res) => {
  try {
    const { fill_level, status } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;
    if (fill_level !== undefined) { 
      updates.push(`fill_level = $${idx++}`); 
      values.push(fill_level); 
    }
    if (status) { 
      updates.push(`status = $${idx++}`); 
      values.push(status); 
    }
    if (status === 'active' && fill_level === 0) { 
      updates.push(`last_emptied = NOW()`); 
    }
    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);
    
    const result = await pool.query(
      `UPDATE bins SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    res.json({ success: true, bin: result.rows[0] });
  } catch (err) {
    console.error('Bin update error:', err.message);
    res.status(500).json({ error: 'Failed to update bin' });
  }
});

// GET /api/coordinator/supply-requests
router.get('/supply-requests', authenticate, requireCoordinator, async (req, res) => {
  try {
    const coordinatorId = await ensureUserInDb(req);
    const result = await pool.query(
      `SELECT sr.*, z.name as zone_name FROM supply_requests sr LEFT JOIN zones z ON sr.zone_id = z.id WHERE sr.coordinator_id = $1 ORDER BY sr.created_at DESC`,
      [coordinatorId]
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error('Supply requests error:', err.message);
    res.status(500).json({ error: 'Failed to fetch supply requests' });
  }
});

// POST /api/coordinator/supply-requests
router.post('/supply-requests', authenticate, requireCoordinator, async (req, res) => {
  try {
    const coordinatorId = await ensureUserInDb(req);
    const { zone_id, item_name, quantity, urgency, notes } = req.body;
    const targetZoneId = parseInt(zone_id || req.user.assigned_zone, 10);

    if (!targetZoneId || Number.isNaN(targetZoneId)) {
      return res.status(400).json({ error: 'Please select a zone.' });
    }
    if (!item_name || !String(item_name).trim()) {
      return res.status(400).json({ error: 'Supply item is required.' });
    }

    const qty = parseInt(quantity, 10);
    const result = await pool.query(
      `INSERT INTO supply_requests (coordinator_id, zone_id, item_name, quantity, urgency, notes, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW()) RETURNING *`,
      [coordinatorId, targetZoneId, String(item_name).trim(), Number.isNaN(qty) ? 1 : qty, urgency || 'normal', notes || '']
    );
    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    console.error('Supply request error:', err);
    res.status(500).json({ error: err.message || 'Failed to create supply request' });
  }
});

// GET /api/coordinator/announcements
router.get('/announcements', authenticate, requireCoordinator, async (req, res) => {
  try {
    const coordZone = req.user.assigned_zone;
    const result = await pool.query(
      `SELECT a.*, z.name as zone_name FROM announcements a LEFT JOIN zones z ON a.zone_id = z.id ${coordZone ? 'WHERE a.zone_id = $1' : ''} ORDER BY a.created_at DESC`,
      coordZone ? [coordZone] : []
    );
    res.json({ announcements: result.rows });
  } catch (err) {
    console.error('Announcements error:', err.message);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// POST /api/coordinator/announcements
router.post('/announcements', authenticate, requireCoordinator, async (req, res) => {
  try {
    const coordinatorId = await ensureUserInDb(req);
    const { zone_id, title, message, type, expires_at } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Announcement title is required.' });
    }
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Announcement message is required.' });
    }

    const isAllZones = zone_id === 'all' || zone_id === '0';
    const parsedZoneId = isAllZones ? null : parseInt(zone_id || req.user.assigned_zone, 10);

    if (!isAllZones && (!parsedZoneId || Number.isNaN(parsedZoneId))) {
      return res.status(400).json({ error: 'Please select a target zone.' });
    }

    const expiresAt = expires_at ? new Date(expires_at) : null;
    const expiresValue = expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null;

    const result = await pool.query(
      `INSERT INTO announcements (coordinator_id, zone_id, title, message, type, expires_at, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, NOW()) RETURNING *`,
      [coordinatorId, parsedZoneId, String(title).trim(), String(message).trim(), type || 'info', expiresValue]
    );

    // Notify students AFTER save — avoids transaction abort if notification insert fails
    try {
      await notificationService.notifyAnnouncement(
        isAllZones ? 'all' : parsedZoneId,
        String(title).trim(),
        String(message).trim()
      );
    } catch (notifErr) {
      console.error('Announcement notification error:', notifErr.message);
    }

    res.json({ success: true, announcement: result.rows[0] });
  } catch (err) {
    console.error('Announcement create error:', err);
    res.status(500).json({ error: err.message || 'Failed to create announcement' });
  }
});

// PATCH /api/coordinator/announcements/:id
router.patch('/announcements/:id', authenticate, requireCoordinator, async (req, res) => {
  try {
    const { is_active } = req.body;
    const result = await pool.query(
      'UPDATE announcements SET is_active = $1 WHERE id = $2 RETURNING *',
      [is_active, req.params.id]
    );
    res.json({ success: true, announcement: result.rows[0] });
  } catch (err) {
    console.error('Announcement update error:', err.message);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// DELETE /api/coordinator/announcements/:id
router.delete('/announcements/:id', authenticate, requireCoordinator, async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Announcement delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// GET /api/coordinator/analytics
router.get('/analytics', authenticate, requireCoordinator, async (req, res) => {
  try {
    const coordZone = req.user.assigned_zone;
    const zoneFilter = coordZone ? 'WHERE r.zone_id = $1' : '';
    const params = coordZone ? [coordZone] : [];

    const [totalRes, resolvedRes, avgTimeRes, recentRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM reports r ${zoneFilter}`, params),
      pool.query(`SELECT COUNT(*) as resolved FROM reports r ${zoneFilter} ${coordZone ? 'AND' : 'WHERE'} r.status = 'resolved'`, params),
      pool.query(`SELECT AVG(EXTRACT(EPOCH FROM (r.updated_at - r.created_at)) / 3600) as avg_hours FROM reports r ${zoneFilter} ${coordZone ? 'AND' : 'WHERE'} r.status = 'resolved'`, params),
      pool.query(`SELECT COUNT(*) as recent FROM reports r ${zoneFilter} ${coordZone ? 'AND' : 'WHERE'} r.created_at > NOW() - INTERVAL '7 days'`, params),
    ]);

    const total = parseInt(totalRes.rows[0].total);
    const resolved = parseInt(resolvedRes.rows[0].resolved);
    const avgHours = parseFloat(avgTimeRes.rows[0].avg_hours) || 0;
    const recentCount = parseInt(recentRes.rows[0].recent);
    
    // Overdue SLA count
    const overdueRes = await pool.query(
      `SELECT COUNT(*) as overdue FROM reports r ${zoneFilter} ${coordZone ? 'AND' : 'WHERE'} r.sla_deadline IS NOT NULL AND r.sla_deadline < NOW() AND r.status != 'resolved'`,
      params
    );

    // Active workers count
    const workersRes = await pool.query(
      `SELECT COUNT(*) as active_workers FROM users WHERE role = 'staff'`
    );

    res.json({
      total,
      resolved,
      pending: total - resolved,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
      avgResponseHours: Math.round(avgHours * 10) / 10,
      recentWeek: recentCount,
      overdueSLA: parseInt(overdueRes.rows[0].overdue),
      activeWorkers: parseInt(workersRes.rows[0].active_workers),
    });
  } catch (err) {
    console.error('Analytics error:', err.message);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
