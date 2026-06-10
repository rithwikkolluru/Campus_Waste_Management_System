const pool = require('../config/db').pool;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        data JSONB DEFAULT '{}',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notif_user
        ON notifications(user_id, is_read, created_at DESC);
    `);

    // Zone tracking table (GPS-based 50-meter grid zones)
    await client.query(`
      CREATE TABLE IF NOT EXISTS report_zones (
        id SERIAL PRIMARY KEY,
        zone_id VARCHAR(50) UNIQUE NOT NULL,
        center_lat DECIMAL(10,8) NOT NULL,
        center_lng DECIMAL(11,8) NOT NULL,
        radius_meters INTEGER DEFAULT 50,
        active_report_count INTEGER DEFAULT 0,
        total_report_count INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        last_reported_at TIMESTAMP,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_zones_id
        ON report_zones(zone_id);
    `);

    // Zone reporters — tracks who reported in each GPS zone
    await client.query(`
      CREATE TABLE IF NOT EXISTS zone_reporters (
        id SERIAL PRIMARY KEY,
        zone_id VARCHAR(50) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
        reported_at TIMESTAMP DEFAULT NOW(),
        bonus_points_awarded BOOLEAN DEFAULT false,
        UNIQUE(zone_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_zone_reporters_zone
        ON zone_reporters(zone_id);
    `);

    // Leaderboard cache table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        period VARCHAR(20) NOT NULL,
        period_label VARCHAR(50) NOT NULL,
        total_points INTEGER DEFAULT 0,
        reports_count INTEGER DEFAULT 0,
        photos_count INTEGER DEFAULT 0,
        zones_helped INTEGER DEFAULT 0,
        rank INTEGER,
        badge VARCHAR(50),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, period)
      );
      CREATE INDEX IF NOT EXISTS idx_leaderboard_period
        ON leaderboard(period, total_points DESC);
    `);

    // Add gps_zone_id to reports (separate from existing zone_id FK to zones table)
    await client.query(`
      ALTER TABLE reports
        ADD COLUMN IF NOT EXISTS gps_zone_id VARCHAR(50),
        ADD COLUMN IF NOT EXISTS zone_report_count INTEGER DEFAULT 0;
    `);

    // Add extra tracking fields to users table
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS weekly_points INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS monthly_points INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS reports_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS badge VARCHAR(50) DEFAULT 'Newcomer',
        ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_report_date DATE;
    `);

    await client.query('COMMIT');
    console.log('✅ Migration v4 complete');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration v4 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

migrate();
