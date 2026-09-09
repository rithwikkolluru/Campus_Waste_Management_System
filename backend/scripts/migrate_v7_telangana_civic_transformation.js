/**
 * Migration v7: Telangana Civic Transformation
 * - Updates user roles constraint to support 'citizen' alongside 'student'
 * - Updates report status constraint to support full civic lifecycle
 * - Adds mandal, landmark, area_locality columns to reports
 * - Updates legacy college zones to real Telangana municipal zones
 * - Cleans up machine-specific image paths
 * - Seeds realistic Telangana civic demo reports
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../config/db').pool;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🏛️ Starting Migration v7: Telangana Statewide Civic Transformation...');

    // 1. Update user roles constraint to allow 'citizen'
    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('citizen', 'student', 'coordinator', 'admin', 'staff'));
      ALTER TABLE users ALTER COLUMN role SET DEFAULT 'citizen';
    `);
    console.log('✅ Users role constraint updated (citizen default enabled)');

    // 2. Update reports status constraint for full civic lifecycle
    await client.query(`
      ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;
      ALTER TABLE reports ADD CONSTRAINT reports_status_check 
        CHECK (status IN (
          'submitted', 'reported', 'under_verification', 'under_review', 
          'verified', 'assigned', 'in_progress', 'dispatched', 
          'resolved', 'rejected', 'closed'
        ));
    `);
    console.log('✅ Reports status constraint updated for full civic lifecycle');

    // 3. Add civic administrative columns to reports table
    await client.query(`
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS mandal VARCHAR(100);
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS landmark VARCHAR(200);
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS area_locality VARCHAR(150);
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS accuracy_meters INTEGER;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS verified_photo_url TEXT;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id);
    `);
    console.log('✅ Reports table civic columns verified');

    // 4. Transform legacy college zones to Telangana Municipal Zones
    const civicZones = [
      { id: 1, name: 'GHMC Central Zone - Khairatabad Circle', description: 'Central municipal division covering Khairatabad, Somajiguda, Banjara Hills', priority: 4 },
      { id: 2, name: 'GHMC West Zone - Serilingampally Circle', description: 'West municipal division covering Gachibowli, Madhapur, Hitec City', priority: 5 },
      { id: 3, name: 'Greater Warangal Municipal Corporation (GWMC)', description: 'Civic jurisdiction covering Hanamkonda, Kazipet and Warangal Urban', priority: 3 },
      { id: 4, name: 'Karimnagar Municipal Corporation (MCK)', description: 'Municipal corporation division covering Karimnagar Smart City wards', priority: 2 },
      { id: 5, name: 'Nizamabad Central Municipal Zone', description: 'NMC urban cleanliness jurisdiction and commercial center', priority: 2 },
    ];

    for (const z of civicZones) {
      await client.query(`
        INSERT INTO zones (id, name, description, priority_level)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          priority_level = EXCLUDED.priority_level;
      `, [z.id, z.name, z.description, z.priority]);
    }
    // Reset zones serial sequence to prevent primary key collision
    await client.query(`SELECT setval('zones_id_seq', (SELECT MAX(id) FROM zones));`);
    console.log('✅ Municipal zones updated to Telangana civic circles');

    // 5. Clean up any stored machine-specific local paths in image URLs
    await client.query(`
      UPDATE reports 
      SET image_url = regexp_replace(image_url, '^.*[\\\\/]uploads[\\\\/]', '/uploads/')
      WHERE image_url LIKE '%uploads%';

      UPDATE reports 
      SET image_url = replace(image_url, '\\', '/')
      WHERE image_url LIKE '%\\%';

      UPDATE report_photos 
      SET file_url = regexp_replace(file_url, '^.*[\\\\/]uploads[\\\\/]', '/uploads/')
      WHERE file_url LIKE '%uploads%';

      UPDATE report_photos 
      SET file_url = replace(file_url, '\\', '/')
      WHERE file_url LIKE '%\\%';
    `);
    console.log('✅ Image URL paths normalized');

    // 6. Ensure standard civic demo accounts exist
    const demoAccounts = [
      { name: 'Srinivas Rathna (Citizen)', email: 'citizen@cleanstate.telangana.gov.in', role: 'citizen', zone: 1 },
      { name: 'Student Demo (Legacy)', email: 'student@campus.edu', role: 'citizen', zone: 1 },
      { name: 'K. Rama Rao (Ward Inspector)', email: 'inspector@cleanstate.telangana.gov.in', role: 'coordinator', zone: 1 },
      { name: 'Coordinator Demo (Legacy)', email: 'coordinator@campus.edu', role: 'coordinator', zone: 1 },
      { name: 'Urban Directorate Admin', email: 'admin@cleanstate.telangana.gov.in', role: 'admin', zone: null },
      { name: 'Admin Demo (Legacy)', email: 'admin@campus.edu', role: 'admin', zone: null },
    ];

    for (const acc of demoAccounts) {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [acc.email]);
      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO users (name, email, role, total_points, assigned_zone)
          VALUES ($1, $2, $3, 150, $4)
        `, [acc.name, acc.email, acc.role, acc.zone]);
      } else {
        await client.query(`
          UPDATE users SET role = $1, name = $2, assigned_zone = COALESCE(assigned_zone, $3)
          WHERE email = $4
        `, [acc.role, acc.name, acc.zone, acc.email]);
      }
    }
    console.log('✅ Civic demo accounts synchronized');

    // 7. Update old college descriptions and locations in reports
    await client.query(`
      UPDATE reports 
      SET location = 'Khairatabad Circle, Ward 12, Hyderabad'
      WHERE location ILIKE '%hostel%' OR location ILIKE '%canteen%' OR location ILIKE '%campus%';
      
      UPDATE reports
      SET district = 'Hyderabad', state = 'Telangana', city_municipality = 'Greater Hyderabad Municipal Corporation'
      WHERE district IS NULL OR district = '';
    `);

    // 8. Seed realistic Telangana civic demo reports if count is low
    const reportCount = await client.query('SELECT COUNT(*) FROM reports');
    if (parseInt(reportCount.rows[0].count, 10) < 5) {
      console.log('🌱 Seeding realistic Telangana civic reports...');
      const citizenRes = await client.query(`SELECT id FROM users WHERE email = 'citizen@cleanstate.telangana.gov.in' LIMIT 1`);
      const citizenId = citizenRes.rows[0]?.id || 1;

      const demoReports = [
        {
          desc: 'Overflowing municipal commercial dumpster near Panjagutta Metro station. Pedestrian walkway blocked.',
          waste: 'Mixed', priority: 'high', status: 'reported', severity: 8,
          lat: 17.4265, lng: 78.4513, acc: 8,
          district: 'Hyderabad', city: 'Greater Hyderabad Municipal Corporation', mandal: 'Khairatabad',
          ward: 'Ward 14 - Panjagutta', locality: 'Panjagutta Circle', landmark: 'Opposite Metro Pillar 1042',
          zone: 1, photo: '/uploads/waste-photos/demo-panjagutta.jpg'
        },
        {
          desc: 'Illegal plastic dumping and burning hazard near Madhapur 100 Feet Road junction.',
          waste: 'Plastic', priority: 'high', status: 'in_progress', severity: 7,
          lat: 17.4483, lng: 78.3915, acc: 6,
          district: 'Hyderabad', city: 'Greater Hyderabad Municipal Corporation', mandal: 'Serilingampally',
          ward: 'Ward 24 - Madhapur', locality: 'Ayyappa Society', landmark: 'Near Cyber Towers Flyover',
          zone: 2, photo: '/uploads/waste-photos/demo-madhapur.jpg'
        },
        {
          desc: 'Open stormwater drain clogged with organic market waste and plastic containers.',
          waste: 'Organic', priority: 'medium', status: 'verified', severity: 6,
          lat: 17.9784, lng: 79.5941, acc: 12,
          district: 'Warangal', city: 'Greater Warangal Municipal Corporation (GWMC)', mandal: 'Hanamkonda',
          ward: 'Ward 8 - Subedari', locality: 'Subedari Market Road', landmark: 'Near Bus Depot',
          zone: 3, photo: '/uploads/waste-photos/demo-warangal.jpg'
        },
        {
          desc: 'Construction debris and discarded concrete rubble dumped along public avenue.',
          waste: 'Mixed', priority: 'low', status: 'resolved', severity: 4,
          lat: 18.4386, lng: 79.1288, acc: 10,
          district: 'Karimnagar', city: 'Karimnagar Municipal Corporation (MCK)', mandal: 'Karimnagar Urban',
          ward: 'Ward 5 - Collectorate Colony', locality: 'Court Road', landmark: 'Beside Municipal Park',
          zone: 4, photo: '/uploads/waste-photos/demo-karimnagar.jpg'
        },
        {
          desc: 'Discarded electronic waste, computer monitors, and cables dumped in vacant municipal plot.',
          waste: 'E-Waste', priority: 'high', status: 'assigned', severity: 9,
          lat: 18.6725, lng: 78.0941, acc: 5,
          district: 'Nizamabad', city: 'Nizamabad Municipal Corporation (NMC)', mandal: 'Nizamabad Central',
          ward: 'Ward 11 - Khaleelwadi', locality: 'Khaleelwadi Commercial Belt', landmark: 'Behind BSNL Office',
          zone: 5, photo: '/uploads/waste-photos/demo-nizamabad.jpg'
        }
      ];

      for (const r of demoReports) {
        const ins = await client.query(`
          INSERT INTO reports (
            user_id, zone_id, description, waste_type, priority, status,
            ai_severity, ai_priority, location, latitude, longitude,
            location_verified, gps_accuracy, state, district,
            city_municipality, mandal, ward_number, area_locality, landmark,
            formatted_address, image_url, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12,
            'Telangana', $13, $14, $15, $16, $17, $18,
            $19, $20, NOW() - INTERVAL '2 hours', NOW()
          ) RETURNING id
        `, [
          citizenId, r.zone, r.desc, r.waste, r.priority, r.status,
          r.severity, r.priority === 'high' ? 'High' : 'Medium', `${r.ward}, ${r.district}`,
          r.lat, r.lng, r.acc, r.district, r.city, r.mandal, r.ward,
          r.locality, r.landmark, `${r.locality}, ${r.ward}, ${r.city}, ${r.district}, Telangana`,
          r.photo
        ]);
        const reportId = ins.rows[0].id;
        await client.query(`
          INSERT INTO report_photos (
            report_id, user_id, file_url, original_name, waste_category,
            ai_waste_type, ai_severity, ai_priority
          ) VALUES ($1, $2, $3, 'civic-report.jpg', $4, $5, $6, $7)
        `, [reportId, citizenId, r.photo, r.waste, r.waste, r.severity, r.priority]);
      }
      console.log(`✅ Seeded ${demoReports.length} realistic Telangana civic demo reports`);
    }

    await client.query('COMMIT');
    console.log('🎉 Migration v7 completed successfully! Platform is now a Statewide Telangana Civic System.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration v7 failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migrate;
