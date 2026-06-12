require('dotenv').config();
const pool = require('../config/db').pool;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(200);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
    `);

    await client.query(`
      UPDATE notifications
      SET type = COALESCE(type, 'info'),
          title = COALESCE(title, 'Notification'),
          data = COALESCE(data, '{}')
      WHERE type IS NULL OR title IS NULL OR data IS NULL
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notif_user
        ON notifications(user_id, is_read, created_at DESC);
    `);

    await client.query('COMMIT');
    console.log('✅ Notifications schema migration complete');
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
