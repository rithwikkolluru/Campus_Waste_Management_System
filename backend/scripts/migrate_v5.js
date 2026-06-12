const pool = require('../config/db').pool;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add SLA and verification columns to reports
    await client.query(`
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS verified_photo_url TEXT;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id);
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
    `);

    // 2. Add action column to points_logs (bug fix - was missing)
    await client.query(`
      ALTER TABLE points_logs ADD COLUMN IF NOT EXISTS action VARCHAR(50);
    `);

    // 3. Add assigned_zone to users (link coordinator to zone)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_zone INTEGER REFERENCES zones(id);
    `);

    // 4. Create bins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bins (
        id SERIAL PRIMARY KEY,
        zone_id INTEGER REFERENCES zones(id) ON DELETE CASCADE,
        location_desc VARCHAR(200) NOT NULL,
        bin_type VARCHAR(50) DEFAULT 'general',
        fill_level INTEGER DEFAULT 0 CHECK (fill_level >= 0 AND fill_level <= 100),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','full','damaged','removed')),
        last_emptied TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 5. Create supply_requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS supply_requests (
        id SERIAL PRIMARY KEY,
        coordinator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        zone_id INTEGER REFERENCES zones(id),
        item_name VARCHAR(200) NOT NULL,
        quantity INTEGER DEFAULT 1,
        urgency VARCHAR(20) DEFAULT 'normal' CHECK (urgency IN ('low','normal','high','critical')),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','delivered','rejected')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 6. Create announcements table
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        coordinator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        zone_id INTEGER REFERENCES zones(id),
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(30) DEFAULT 'info' CHECK (type IN ('info','warning','maintenance','event')),
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Indices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bins_zone ON bins(zone_id);
      CREATE INDEX IF NOT EXISTS idx_announcements_zone ON announcements(zone_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_supply_requests_coord ON supply_requests(coordinator_id);
    `);

    // 7. Upgrade notifications table if created by older init_db schema
    await client.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(200);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
    `);

    await client.query('COMMIT');
    console.log('✅ Migration v5 complete — Coordinator features ready');
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
