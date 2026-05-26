const db = require('../config/db');

/**
 * Assign staff to a specific report
 */
exports.assignStaff = async (req, res) => {
  const { report_id, staff_id, assigned_by } = req.body;

  // Validate required fields
  if (!report_id) {
    return res.status(400).json({ status: 'error', message: 'Report ID is required.' });
  }
  if (!staff_id) {
    return res.status(400).json({ status: 'error', message: 'Staff ID is required.' });
  }
  if (!assigned_by) {
    return res.status(400).json({ status: 'error', message: 'Assigned by (user ID) is required.' });
  }

  try {
    await db.query('BEGIN');

    // 1. Check report exists
    const reportCheck = await db.query('SELECT id, status FROM reports WHERE id = $1', [report_id]);
    if (reportCheck.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Report not found.' });
    }

    // 2. Check staff member exists and has valid role
    const staffCheck = await db.query(
      "SELECT id, name FROM users WHERE id = $1 AND role IN ('staff', 'coordinator')",
      [staff_id]
    );
    if (staffCheck.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Staff member not found.' });
    }

    // 3. Check if already assigned to this staff member
    const existingAssignment = await db.query(
      'SELECT id FROM assignments WHERE report_id = $1 AND staff_id = $2',
      [report_id, staff_id]
    );
    if (existingAssignment.rows.length > 0) {
      await db.query('ROLLBACK');
      return res.status(409).json({ status: 'error', message: 'This staff member is already assigned to this report.' });
    }

    const oldStatus = reportCheck.rows[0].status;

    // 4. Create assignment entry
    const assignmentResult = await db.query(
      'INSERT INTO assignments (report_id, staff_id, assigned_by) VALUES ($1, $2, $3) RETURNING *',
      [report_id, staff_id, assigned_by]
    );

    // 5. Update report status to 'assigned'
    await db.query(
      "UPDATE reports SET status = 'assigned', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [report_id]
    );

    // 6. Log the status change
    await db.query(
      'INSERT INTO report_logs (report_id, old_status, new_status, changed_by) VALUES ($1, $2, $3, $4)',
      [report_id, oldStatus, 'assigned', assigned_by]
    );

    await db.query('COMMIT');

    console.log(`✅ Report #${report_id} assigned to staff ${staffCheck.rows[0].name} by user ${assigned_by}`);

    res.status(201).json({
      status:     'success',
      message:    `Report successfully assigned to ${staffCheck.rows[0].name}!`,
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
    const result = await db.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role,
        COUNT(a.id) AS active_assignments
      FROM users u
      LEFT JOIN assignments a ON a.staff_id = u.id
      WHERE u.role IN ('staff', 'coordinator')
      GROUP BY u.id, u.name, u.email, u.phone, u.role
      ORDER BY u.name ASC
    `);

    res.json({ status: 'success', staff: result.rows });
  } catch (err) {
    console.error('Error fetching staff list:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch staff.' });
  }
};

/**
 * Get all assignments for a specific report
 */
exports.getAssignmentsByReport = async (req, res) => {
  const { report_id } = req.params;

  if (!report_id) {
    return res.status(400).json({ status: 'error', message: 'Report ID is required.' });
  }

  try {
    const result = await db.query(`
      SELECT
        a.*,
        u.name  AS staff_name,
        u.email AS staff_email,
        u.phone AS staff_phone
      FROM assignments a
      JOIN users u ON a.staff_id = u.id
      WHERE a.report_id = $1
      ORDER BY a.assigned_at DESC
    `, [report_id]);

    res.json({ status: 'success', assignments: result.rows });
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch assignments.' });
  }
};