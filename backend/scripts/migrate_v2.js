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
    console.log('🔄 Running AI feature migrations...');

    // Ensure report_photos table exists (controller uses this name)
    await client.query(`
      CREATE TABLE IF NOT EXISTS report_photos (
        id            SERIAL PRIMARY KEY,
        report_id     INTEGER REFERENCES reports(id) ON DELETE CASCADE,
        user_id       INTEGER REFERENCES users(id),
        file_path     TEXT,
        file_url      TEXT NOT NULL,
        original_name TEXT,
        file_size     INTEGER,
        waste_category VARCHAR(50),
        uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ report_photos table ready');

    // Add AI columns to report_photos
    const photoColumns = [
      `ALTER TABLE report_photos ADD COLUMN IF NOT EXISTS ai_waste_type VARCHAR(50)`,
      `ALTER TABLE report_photos ADD COLUMN IF NOT EXISTS ai_bin_color  VARCHAR(20)`,
      `ALTER TABLE report_photos ADD COLUMN IF NOT EXISTS ai_bin_label  VARCHAR(50)`,
      `ALTER TABLE report_photos ADD COLUMN IF NOT EXISTS ai_confidence INTEGER`,
      `ALTER TABLE report_photos ADD COLUMN IF NOT EXISTS ai_severity   INTEGER`,
      `ALTER TABLE report_photos ADD COLUMN IF NOT EXISTS ai_priority   VARCHAR(20)`,
      `ALTER TABLE report_photos ADD COLUMN IF NOT EXISTS ai_tips       TEXT`,
      `ALTER TABLE report_photos ADD COLUMN IF NOT EXISTS is_duplicate  BOOLEAN DEFAULT false`,
    ];
    for (const q of photoColumns) await client.query(q);
    console.log('✅ AI columns added to report_photos');

    // Add AI columns to reports
    const reportColumns = [
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_severity    INTEGER DEFAULT 5`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_priority    VARCHAR(20) DEFAULT 'Medium'`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_description TEXT`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS location       TEXT`,
    ];
    for (const q of reportColumns) await client.query(q);
    console.log('✅ AI columns added to reports');

    // Create weekly_reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS weekly_reports (
        id          SERIAL PRIMARY KEY,
        week_start  DATE NOT NULL,
        week_end    DATE NOT NULL,
        report_data JSONB NOT NULL,
        ai_analysis JSONB,
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ weekly_reports table created');

    console.log('\n🎉 All migrations completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
};

migrate();
