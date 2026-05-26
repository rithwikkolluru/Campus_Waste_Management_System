const db = require('../config/db');

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
  const { zone_id, description, waste_type, priority, user_id } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ status: 'error', message: 'User ID is required. Please log in again.' });
  }
  if (!zone_id) {
    return res.status(400).json({ status: 'error', message: 'Zone is required.' });
  }
  if (!description || description.trim().length === 0) {
    return res.status(400).json({ status: 'error', message: 'Description is required.' });
  }

  // Validate priority value
  const validPriorities = ['low', 'medium', 'high'];
  const finalPriority = validPriorities.includes(priority) ? priority : 'low';

  const MAX_DAILY        = 50;
  const MAX_MONTHLY      = 500;
  const POINTS_PER_UPLOAD = 5;

  try {
    // Use a transaction so everything saves together or nothing does
    await db.query('BEGIN');

    // 1. Insert the report
    const result = await db.query(
      `INSERT INTO reports (user_id, zone_id, description, waste_type, priority, image_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'reported')
       RETURNING *`,
      [user_id, zone_id, description.trim(), waste_type || 'general', finalPriority, image_url]
    );
    const newReport = result.rows[0];

    // 2. Log the initial status
    await db.query(
      'INSERT INTO report_logs (report_id, new_status, changed_by) VALUES ($1, $2, $3)',
      [newReport.id, 'reported', user_id]
    );

    // 3. Calculate points
    const dailyPointsRes = await db.query(`
      SELECT COALESCE(SUM(points), 0) AS daily_total
      FROM points_logs
      WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
    `, [user_id]);
    const dailyTotal = parseInt(dailyPointsRes.rows[0].daily_total);

    const monthlyPointsRes = await db.query(`
      SELECT COALESCE(SUM(points), 0) AS monthly_total
      FROM points_logs
      WHERE user_id = $1
        AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR  FROM created_at) = EXTRACT(YEAR  FROM CURRENT_DATE)
    `, [user_id]);
    const monthlyTotal = parseInt(monthlyPointsRes.rows[0].monthly_total);

    let pointsToAward = 0;
    if (dailyTotal < MAX_DAILY && monthlyTotal < MAX_MONTHLY) {
      pointsToAward = Math.min(POINTS_PER_UPLOAD, MAX_DAILY - dailyTotal, MAX_MONTHLY - monthlyTotal);
    }

    // 4. Award points if eligible
    if (pointsToAward > 0) {
      await db.query(
        'INSERT INTO points_logs (user_id, points, report_id) VALUES ($1, $2, $3)',
        [user_id, pointsToAward, newReport.id]
      );
      await db.query(
        'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
        [pointsToAward, user_id]
      );
    }

    await db.query('COMMIT');

    console.log(`✅ Report #${newReport.id} submitted by user ${user_id} — ${pointsToAward} points awarded`);

    res.status(201).json({
      status:        'success',
      message:       'Report submitted successfully!',
      report:        newReport,
      points_earned: pointsToAward
    });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error submitting report:', err);
    res.status(500).json({ status: 'error', message: 'Failed to submit report.' });
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