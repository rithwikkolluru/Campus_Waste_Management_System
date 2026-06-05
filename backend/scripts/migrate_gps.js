require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '1234567',
  database: process.env.DB_NAME     || 'collegeDB',
  port:     process.env.DB_PORT     || 5432,
});

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log('🔄 Running GPS feature migrations...');

    const queries = [
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8)`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8)`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT false`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS gps_accuracy INTEGER`
    ];

    for (const q of queries) {
      await client.query(q);
    }
    console.log('✅ GPS columns added to reports');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
};

migrate();
