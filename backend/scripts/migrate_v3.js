require('dotenv').config({ path: '../.env' });
const { pool } = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Reports must have GPS coordinates
    await client.query(`
      ALTER TABLE reports
        ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
        ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
        ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS gps_accuracy INTEGER,
        ADD COLUMN IF NOT EXISTS zone_id VARCHAR(50);
    `);

    // Zone tracking — groups nearby reports together
    await client.query(`
      CREATE TABLE IF NOT EXISTS report_zones (
        id SERIAL PRIMARY KEY,
        zone_id VARCHAR(50) UNIQUE NOT NULL,
        center_lat DECIMAL(10,8) NOT NULL,
        center_lng DECIMAL(11,8) NOT NULL,
        radius_meters INTEGER DEFAULT 50,
        active_report_count INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        last_reported_at TIMESTAMP,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_zones_id
        ON report_zones(zone_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Migration v3 complete');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration v3 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}
migrate();
