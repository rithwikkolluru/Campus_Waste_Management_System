const pool = require('../config/db').pool;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add columns safely
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(500),
        ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS points_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        points INTEGER NOT NULL,
        action VARCHAR(50) NOT NULL,
        report_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS report_photos (
        id SERIAL PRIMARY KEY,
        report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        file_path VARCHAR(500) NOT NULL,
        file_url VARCHAR(500),
        original_name VARCHAR(255),
        file_size INTEGER,
        waste_category VARCHAR(50),
        uploaded_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE reports
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
    `);

    await client.query('COMMIT');
    console.log('✅ Migration v2 complete — all tables ready');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

migrate();
