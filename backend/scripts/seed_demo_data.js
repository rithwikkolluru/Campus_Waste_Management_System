/**
 * Seed demo reports with real photos for student noking773@gmail.com
 * Run: node scripts/seed_demo_data.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db').pool;

const ASSETS_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  '.cursor', 'projects', 'c-Users-user-Desktop-College-Project', 'assets'
);
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'waste-photos');

const DEMO_TAG = '[DEMO]';

const DEMO_IMAGES = [
  { file: 'c__Users_user_AppData_Roaming_Cursor_User_workspaceStorage_73c4f0c30e34da972c548aef2714fc32_images_WhatsApp_Image_2026-06-11_at_17.28.00-fdc18096-5ea5-4396-83c7-3fb51c3fc0b4.png', desc: 'Dry leaves with plastic litter scattered near garden path', waste: 'Mixed', zone: 1, status: 'reported', severity: 4, priority: 'medium', lat: 17.4938, lng: 78.3895 },
  { file: 'c__Users_user_AppData_Roaming_Cursor_User_workspaceStorage_73c4f0c30e34da972c548aef2714fc32_images_WhatsApp_Image_2026-06-11_at_17.27.30-6d758c83-cb0f-4653-9284-e8359d280231.png', desc: 'Discarded INTEX keyboard dumped among leaves — e-waste hazard', waste: 'E-Waste', zone: 1, status: 'reported', severity: 9, priority: 'high', lat: 17.4942, lng: 78.3902 },
  { file: 'c__Users_user_AppData_Roaming_Cursor_User_workspaceStorage_73c4f0c30e34da972c548aef2714fc32_images_WhatsApp_Image_2026-06-11_at_17.28.24-98d8cc1e-acbc-4242-bda5-4906e0202d93.png', desc: 'Large pile of construction rubble and concrete debris', waste: 'Mixed', zone: 3, status: 'reported', severity: 8, priority: 'high', lat: 17.4915, lng: 78.3925 },
  { file: 'c__Users_user_AppData_Roaming_Cursor_User_workspaceStorage_73c4f0c30e34da972c548aef2714fc32_images_WhatsApp_Image_2026-06-11_at_17.26.17-c7efb0cf-9aa5-41e1-9935-eb42485350cd.png', desc: 'Severe litter accumulation in building alleyway — bottles and food containers', waste: 'Plastic', zone: 2, status: 'in_progress', severity: 7, priority: 'high', lat: 17.4925, lng: 78.3918 },
  { file: 'c__Users_user_AppData_Roaming_Cursor_User_workspaceStorage_73c4f0c30e34da972c548aef2714fc32_images_WhatsApp_Image_2026-06-11_at_17.26.39-b8fd3d36-9b8b-40a8-8d5b-be0acd7eee2f.png', desc: 'White debris and litter near building wall under trees', waste: 'Paper', zone: 3, status: 'under_review', severity: 5, priority: 'medium', lat: 17.4910, lng: 78.3908 },
  { file: 'c__Users_user_AppData_Roaming_Cursor_User_workspaceStorage_73c4f0c30e34da972c548aef2714fc32_images_WhatsApp_Image_2026-06-11_at_17.25.59-733fb891-15bd-4c58-9260-61c027061b02.png', desc: 'Empty glass bottle discarded among flower petals and rubble', waste: 'Glass', zone: 4, status: 'reported', severity: 4, priority: 'low', lat: 17.4905, lng: 78.3890 },
  { file: 'c__Users_user_AppData_Roaming_Cursor_User_workspaceStorage_73c4f0c30e34da972c548aef2714fc32_images_WhatsApp_Image_2026-06-11_at_17.27.44-6067eba8-cbfd-490b-a85f-1ec42234fe53.png', desc: 'Kurkure wrapper, plastic bag and pipe discarded in leaf litter', waste: 'Plastic', zone: 2, status: 'assigned', severity: 6, priority: 'medium', lat: 17.4928, lng: 78.3920 },
  { file: 'c__Users_user_AppData_Roaming_Cursor_User_workspaceStorage_73c4f0c30e34da972c548aef2714fc32_images_WhatsApp_Image_2026-06-11_at_17.27.14-9746c1b4-8d95-44a2-b58a-df2233f33221.png', desc: 'Fabric scraps, wooden plank and packaging waste on walkway', waste: 'Mixed', zone: 5, status: 'reported', severity: 5, priority: 'medium', lat: 17.4895, lng: 78.3910 },
];

const ZONE_NAMES = { 1: 'Hostel Area', 2: 'Canteen', 3: 'Academic Block', 4: 'Library', 5: 'Sports Ground' };

function copyPhoto(srcFile, destName) {
  const src = path.join(ASSETS_DIR, srcFile);
  const dest = path.join(UPLOAD_DIR, destName);
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  } else {
    // Fallback to local test.png or a placeholder
    const localTestPng = path.join(__dirname, '..', 'test.png');
    if (fs.existsSync(localTestPng)) {
      fs.copyFileSync(localTestPng, dest);
    } else {
      fs.writeFileSync(dest, 'dummy image data');
    }
  }
  return { dest, url: `/uploads/waste-photos/${destName}` };
}

async function ensureCoordinator(client) {
  let row = await client.query(`SELECT id FROM users WHERE email = 'coordinator@campus.edu'`);
  if (row.rows.length) return row.rows[0].id;
  const ins = await client.query(
    `INSERT INTO users (name, email, role) VALUES ('Coordinator Demo', 'coordinator@campus.edu', 'coordinator') RETURNING id`
  );
  return ins.rows[0].id;
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let studentRes = await client.query(`SELECT id FROM users WHERE email = 'student@campus.edu'`);
    if (!studentRes.rows.length) {
      const insStudent = await client.query(
        `INSERT INTO users (name, email, role, total_points) VALUES ('Student Demo', 'student@campus.edu', 'student', 100) RETURNING id`
      );
      studentRes = insStudent;
    }
    const studentId = studentRes.rows[0].id;
    const coordinatorId = await ensureCoordinator(client);

    // Remove previous demo data
    await client.query(`DELETE FROM report_photos WHERE report_id IN (SELECT id FROM reports WHERE description LIKE $1)`, [`${DEMO_TAG}%`]);
    await client.query(`DELETE FROM reports WHERE description LIKE $1`, [`${DEMO_TAG}%`]);

    console.log(`📸 Seeding ${DEMO_IMAGES.length} demo reports for King No (id ${studentId})...`);

    for (let i = 0; i < DEMO_IMAGES.length; i++) {
      const d = DEMO_IMAGES[i];
      const filename = `demo-waste-${Date.now()}-${i}.png`;
      const { dest, url } = copyPhoto(d.file, filename);

      const reportRes = await client.query(
        `INSERT INTO reports
          (user_id, zone_id, description, waste_type, priority, status,
           ai_severity, ai_priority, location, latitude, longitude,
           location_verified, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,NOW()-interval '${i} hours',NOW())
         RETURNING id`,
        [
          studentId, d.zone, `${DEMO_TAG} ${d.desc}`, d.waste, d.priority, d.status,
          d.severity, d.priority, ZONE_NAMES[d.zone], d.lat, d.lng,
        ]
      );
      const reportId = reportRes.rows[0].id;

      await client.query(
        `INSERT INTO report_photos
          (report_id, user_id, file_path, file_url, original_name, waste_category, ai_waste_type, ai_severity, ai_priority)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [reportId, studentId, dest, url, filename, d.waste, d.waste, d.severity, d.priority]
      );
      await client.query(
        `INSERT INTO report_images (report_id, image_url, uploaded_at) VALUES ($1, $2, NOW())`,
        [reportId, url]
      );
      await client.query(`UPDATE reports SET image_url = $1 WHERE id = $2`, [url, reportId]);
      console.log(`  ✓ Report #${reportId} — ${d.waste} @ ${ZONE_NAMES[d.zone]} (${d.status}, severity ${d.severity})`);
    }

    // Coordinator demo: bins, supply request, announcement (idempotent)
    await client.query(`DELETE FROM supply_requests WHERE item_name LIKE $1`, [`${DEMO_TAG}%`]);
    await client.query(`DELETE FROM announcements WHERE title LIKE $1`, [`${DEMO_TAG}%`]);
    await client.query(`DELETE FROM bins WHERE location_desc LIKE $1`, [`${DEMO_TAG}%`]);

    await client.query(
      `INSERT INTO bins (zone_id, location_desc, bin_type, fill_level, status, created_at, updated_at)
       VALUES (2, $1, 'general', 65, 'active', NOW(), NOW())`,
      [`${DEMO_TAG} Canteen near trees`]
    );
    console.log('  ✓ Demo bin deployed');

    await client.query(
      `INSERT INTO supply_requests (coordinator_id, zone_id, item_name, quantity, urgency, notes, status, created_at, updated_at)
       VALUES ($1, 1, $2, 5, 'high', $3, 'pending', NOW(), NOW())`,
      [coordinatorId, `${DEMO_TAG} Heavy-duty garbage bags for hostel cleanup`, 'Needed for demo audit presentation']
    );
    console.log('  ✓ Demo supply request');

    await client.query(
      `INSERT INTO announcements (coordinator_id, zone_id, title, message, type, is_active, created_at)
       VALUES ($1, NULL, $2, $3, 'event', true, NOW())`,
      [coordinatorId, `${DEMO_TAG} Campus Clean-Up Drive`, 'Join us this Friday at 5 PM for a campus-wide cleanup. All students welcome!']
    );
    console.log('  ✓ Demo announcement');

    await client.query('COMMIT');
    console.log('\n✅ Demo data seeded successfully!');
    console.log('   Student: noking773@gmail.com → My Uploads & Campus Map');
    console.log('   Coordinator: Zone Map tab → colored hotspot circles');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed();
