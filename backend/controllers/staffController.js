const db = require('../config/db');

/**
 * Assign staff to a specific report
 */
exports.assignStaff = async (req, res) => {
  const { report_id, staff_id, assigned_by } = req.body;

  try {
    // 1. Transactional update: Add assignment + update report status to 'assigned'
    await db.query('BEGIN');

    // Create entry in assignments table (Table 4)
    const assignmentResult = await db.query(
      'INSERT INTO assignments (report_id, staff_id, assigned_by) VALUES ($1, $2, $3) RETURNING *',
      [report_id, staff_id, assigned_by]
    );

    // 2. Fetch current status for logging
    const current = await db.query('SELECT status FROM reports WHERE id = $1', [report_id]);
    const oldStatus = current.rows[0]?.status || 'reported';

    // 3. Update status in reports table (Table 3)
    await db.query(
      "UPDATE reports SET status = 'assigned', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [report_id]
    );

    // 4. Log status change (Table 7)
    await db.query(
      'INSERT INTO report_logs (report_id, old_status, new_status, changed_by) VALUES ($1, $2, $3, $4)',
      [report_id, oldStatus, 'assigned', assigned_by]
    );

    await db.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: 'Staff assigned successfully!',
      assignment: assignmentResult.rows[0],
    });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error during assignment:', err);
    res.status(500).json({ status: 'error', message: 'Assignment failed.' });
  }
};

/**
 * Get all staff members
 */
exports.getAllStaff = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, phone FROM users WHERE role = 'staff' OR role = 'coordinator'`
    );
    res.json({ status: 'success', staff: result.rows });
  } catch (err) {
    console.error('Error fetching staff list:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch staff.' });
  }
};
