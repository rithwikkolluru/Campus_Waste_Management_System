const pool = require('../config/db').pool;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Applying Phase 1: State & Administrative Geo-Hierarchy Schema...');

    // 1. Add state-level administrative hierarchy to reports table
    await client.query(`
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'Telangana';
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS district VARCHAR(100) DEFAULT 'Hyderabad';
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS city_municipality VARCHAR(150) DEFAULT 'Greater Hyderabad Municipal Corporation';
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS ward_number VARCHAR(50);
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS formatted_address TEXT;
    `);

    // 2. Add administrative assignment fields to users table
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'Telangana';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS district VARCHAR(100) DEFAULT 'Hyderabad';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_ward VARCHAR(50);
    `);

    // 3. Create districts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS districts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL DEFAULT 'Telangana',
        code VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 4. Create municipal_wards table
    await client.query(`
      CREATE TABLE IF NOT EXISTS municipal_wards (
        id SERIAL PRIMARY KEY,
        district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
        ward_number VARCHAR(50) NOT NULL,
        ward_name VARCHAR(150),
        sanitary_inspector_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 5. Seed default districts if table is empty
    const districtCount = await client.query('SELECT COUNT(*) FROM districts');
    if (parseInt(districtCount.rows[0].count) === 0) {
      console.log('🌱 Seeding administrative districts...');
      const sampleDistricts = [
        ['Hyderabad', 'Telangana', 'HYD'],
        ['Ranga Reddy', 'Telangana', 'RR'],
        ['Medchal-Malkajgiri', 'Telangana', 'MDCL'],
        ['Warangal', 'Telangana', 'WGL'],
        ['Karimnagar', 'Telangana', 'KRM'],
        ['Nizamabad', 'Telangana', 'NZB'],
        ['Khammam', 'Telangana', 'KMM'],
        ['Bengaluru Urban', 'Karnataka', 'BLR'],
        ['Chennai', 'Tamil Nadu', 'CHN'],
        ['Mumbai', 'Maharashtra', 'MUM'],
        ['Delhi', 'Delhi', 'DEL']
      ];

      for (const [name, state, code] of sampleDistricts) {
        await client.query(
          'INSERT INTO districts (name, state, code) VALUES ($1, $2, $3)',
          [name, state, code]
        );
      }
    }

    // 6. Ensure existing reports have consistent district data
    await client.query(`
      UPDATE reports 
      SET district = 'Hyderabad', state = 'Telangana' 
      WHERE district IS NULL OR state IS NULL;
    `);

    await client.query('COMMIT');
    console.log('✅ Phase 1 Migration (State Hierarchy) successfully applied!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration v6 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate().then(() => pool.end());
}

module.exports = migrate;
