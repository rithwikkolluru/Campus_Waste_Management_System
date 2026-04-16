const db = require('../config/db');

/**
 * Get all campus zones
 */
exports.getZones = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM zones ORDER BY priority_level DESC');
    res.json({ status: 'success', zones: result.rows });
  } catch (err) {
    console.error('Error fetching zones:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch zones.' });
  }
};
