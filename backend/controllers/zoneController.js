const db = require('../config/db');

/**
 * Get all campus zones
 */
exports.getZones = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        z.*,
        COUNT(r.id) AS total_reports,
        COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) AS resolved_reports,
        COUNT(CASE WHEN r.status IN ('assigned', 'in_progress') THEN 1 END) AS inprogress_reports,
        COUNT(CASE WHEN r.status IN ('reported', 'under_review') THEN 1 END) AS awaiting_reports,
        COUNT(CASE WHEN r.status IS NOT NULL AND r.status != 'resolved' THEN 1 END) AS pending_reports
      FROM zones z
      LEFT JOIN reports r ON r.zone_id = z.id
      GROUP BY z.id, z.name, z.description, z.priority_level, z.created_at
      ORDER BY z.priority_level DESC
    `);

    if (result.rows.length === 0) {
      return res.json({ status: 'success', zones: [], message: 'No zones found.' });
    }

    res.json({ status: 'success', zones: result.rows });
  } catch (err) {
    console.error('Error fetching zones:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch zones.' });
  }
};

/**
 * Get a single zone by ID with its reports
 */
exports.getZoneById = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ status: 'error', message: 'Zone ID is required.' });
  }

  try {
    // Get zone details
    const zoneRes = await db.query('SELECT * FROM zones WHERE id = $1', [id]);
    if (zoneRes.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Zone not found.' });
    }

    // Get reports for this zone
    const reportsRes = await db.query(`
      SELECT
        r.*,
        COALESCE(u.name, 'Unknown') AS reporter_name
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.zone_id = $1
      ORDER BY r.created_at DESC
      LIMIT 20
    `, [id]);

    res.json({
      status: 'success',
      zone:    zoneRes.rows[0],
      reports: reportsRes.rows,
    });
  } catch (err) {
    console.error('Error fetching zone by ID:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch zone.' });
  }
};

/**
 * Create a new zone (Admin only)
 */
exports.createZone = async (req, res) => {
  const { name, description, priority_level } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ status: 'error', message: 'Zone name is required.' });
  }

  // Priority level must be between 1 and 5
  const priority = parseInt(priority_level);
  if (isNaN(priority) || priority < 1 || priority > 5) {
    return res.status(400).json({ status: 'error', message: 'Priority level must be a number between 1 and 5.' });
  }

  try {
    // Check if zone name already exists
    const existing = await db.query('SELECT id FROM zones WHERE LOWER(name) = LOWER($1)', [name.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: 'A zone with this name already exists.' });
    }

    const result = await db.query(
      'INSERT INTO zones (name, description, priority_level) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), description?.trim() || null, priority]
    );

    console.log(`✅ New zone created: ${name}`);

    res.status(201).json({
      status:  'success',
      message: 'Zone created successfully!',
      zone:    result.rows[0],
    });
  } catch (err) {
    console.error('Error creating zone:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create zone.' });
  }
};