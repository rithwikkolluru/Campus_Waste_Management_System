const db = require('../config/db');
const pool = db.pool;
const { awardPoints } = require('./rewardsController');


const VALID_STATUSES = ['reported', 'under_review', 'assigned', 'in_progress', 'resolved'];

/**
 * Fetch all reports with filtering (priority, status, zone)
 */
exports.getAllReports = async (req, res) => {
  const { status, zone, priority } = req.query;

  // Use LEFT JOIN so reports still show even if user/zone data is missing
  let queryText = `
    SELECT r.*,
           COALESCE(u.name, 'Unknown') AS reporter_name,
           COALESCE(z.name, 'Unknown') AS zone_name
    FROM reports r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN zones z ON r.zone_id = z.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    params.push(status);
    queryText += ` AND r.status = $${params.length}`;
  }
  if (zone) {
    params.push(zone);
    queryText += ` AND z.name ILIKE $${params.length}`;
  }
  if (priority) {
    params.push(priority);
    queryText += ` AND r.priority = $${params.length}`;
  }

  queryText += ' ORDER BY r.created_at DESC';

  try {
    const result = await db.query(queryText, params);
    res.json({ status: 'success', reports: result.rows });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch reports.' });
  }
};

/**
 * Submit a new garbage report
 */
exports.submitReport = async (req, res) => {
  const dbClient = await pool.connect();

  try {
    await dbClient.query('BEGIN');

    const { location, waste_type, description, priority, zone_id } = req.body;
    const userId = req.user.userId || req.user.id;

    // Insert report
    const reportResult = await dbClient.query(
      `INSERT INTO reports
        (user_id, zone_id, description, waste_type, priority, status)
       VALUES ($1, $2, $3, $4, $5, 'reported')
       RETURNING id`,
      [userId, zone_id || 1, description, waste_type || 'general', priority || 'low']
    );

    const reportId = reportResult.rows[0].id;
    let photoUrl = null;
    let totalPointsEarned = 0;

    let photoPointsEarned = 0;
    // Save photo if uploaded
    if (req.file) {
      photoUrl = `/uploads/waste-photos/${req.file.filename}`;

      await dbClient.query(
        `INSERT INTO report_photos
          (report_id, user_id, file_path, file_url, original_name, file_size, waste_category)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [reportId, userId, req.file.path, photoUrl,
         req.file.originalname, req.file.size, waste_type]
      );

      // Award photo points
      const photoPoints = await awardPoints(userId, 5, 'photo_upload', reportId, dbClient);
      if (photoPoints.awarded) {
        totalPointsEarned += 5;
        photoPointsEarned = 5;
      }
    }

    let reportPointsEarned = 0;
    // Award report submission points
    const reportPoints = await awardPoints(userId, 10, 'report_submit', reportId, dbClient);
    if (reportPoints.awarded) {
      totalPointsEarned += 10;
      reportPointsEarned = 10;
    }

    // Get updated total
    const userResult = await dbClient.query(
      'SELECT total_points FROM users WHERE id = $1',
      [userId]
    );

    await dbClient.query('COMMIT');

    res.json({
      success: true,
      reportId,
      photoUrl,
      pointsEarned: totalPointsEarned,
      photoPointsEarned,
      reportPointsEarned,
      newTotalPoints: userResult.rows[0].total_points,
      message: totalPointsEarned > 0
        ? `Report submitted! You earned +${totalPointsEarned} points 🌱`
        : 'Report submitted! (Daily points limit reached)',
    });

  } catch (err) {
    await dbClient.query('ROLLBACK');
    // Clean up uploaded file if DB failed
    if (req.file && require('fs').existsSync(req.file.path)) {
      require('fs').unlinkSync(req.file.path);
    }
    console.error('submitReport error:', err.message);
    res.status(500).json({ error: 'Failed to submit report. Please try again.' });
  } finally {
    dbClient.release();
  }
};

/**
 * Update report status (Coordinator / Admin action)
 */
exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status, user_id } = req.body;

  // Validate inputs
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
    });
  }
  if (!user_id) {
    return res.status(400).json({ status: 'error', message: 'User ID is required.' });
  }

  try {
    // 1. Get current status for logging
    const current = await db.query('SELECT status FROM reports WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Report not found.' });
    }
    const oldStatus = current.rows[0].status;

    // Prevent updating to the same status
    if (oldStatus === status) {
      return res.status(400).json({ status: 'error', message: `Report is already in '${status}' status.` });
    }

    // 2. Update report status
    const updated = await db.query(
      'UPDATE reports SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    // 3. Log the status change
    await db.query(
      'INSERT INTO report_logs (report_id, old_status, new_status, changed_by) VALUES ($1, $2, $3, $4)',
      [id, oldStatus, status, user_id]
    );

    console.log(`✅ Report #${id} status changed: ${oldStatus} → ${status} by user ${user_id}`);

    res.json({
      status:  'success',
      message: `Report status updated to '${status}'.`,
      report:  updated.rows[0]
    });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update status.' });
  }
};