require('dotenv').config();
const { Pool } = require('pg');
const zoneService = require('./services/zoneService');
const { awardPoints } = require('./controllers/rewardsController');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '1234567',
  database: process.env.DB_NAME     || 'collegeDB',
  port:     process.env.DB_PORT     || 5432,
});

async function run() {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    const userId = 1; // Existing student ID
    const zone_id = 1;
    const description = 'Test insertion description';
    const finalWasteType = 'Mixed';
    const priority = 'medium';
    
    const latitude = 17.4910;
    const longitude = 78.3910;
    const gps_accuracy = 15;
    const location = 'Hostel Area';
    const gpsZoneId = zoneService.getZoneId(latitude, longitude);
    const zoneStatus = await zoneService.checkZoneStatus(latitude, longitude);

    console.log('Inserting report...');
    const reportResult = await dbClient.query(
      `INSERT INTO reports
        (user_id, zone_id, description, waste_type, priority, status,
         ai_severity, ai_priority, ai_description, location,
         latitude, longitude, location_verified, gps_accuracy, gps_zone_id, zone_report_count)
       VALUES ($1, $2, $3, $4, $5, 'reported', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id`,
      [
        userId,
        zone_id || 1,
        description,
        finalWasteType,
        priority || 'low',
        5,
        'Medium',
        'AI description test',
        location || null,
        latitude,
        longitude,
        true,
        gps_accuracy,
        gpsZoneId,
        zoneStatus.reportCount + 1
      ]
    );

    const reportId = reportResult.rows[0].id;
    console.log('Inserted report ID:', reportId);

    const photoUrl = '/uploads/waste-photos/test_dummy.png';

    console.log('Inserting into report_photos...');
    await dbClient.query(
      `INSERT INTO report_photos
        (report_id, user_id, file_path, file_url, original_name, file_size,
         waste_category, ai_waste_type, ai_bin_color, ai_bin_label,
         ai_confidence, ai_severity, ai_priority, ai_tips, is_duplicate)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        reportId, userId, 'test_dummy_path', photoUrl,
        'test_dummy.png', 1024, finalWasteType,
        finalWasteType, 'Black', 'Landfill',
        90, 5, 'Medium', 'Test tips', false
      ]
    );

    console.log('Inserting into report_images...');
    await dbClient.query(
      `INSERT INTO report_images (report_id, image_url, uploaded_at) VALUES ($1, $2, NOW())`,
      [reportId, photoUrl]
    );

    console.log('Updating reports image_url...');
    await dbClient.query(`UPDATE reports SET image_url = $1 WHERE id = $2`, [photoUrl, reportId]);

    console.log('Awarding points...');
    const photoPoints = await awardPoints(userId, 5, 'photo_upload', reportId, dbClient);
    console.log('Photo points result:', photoPoints);

    console.log('Updating zone...');
    const activeCount = await zoneService.updateZoneAfterReport(gpsZoneId, latitude, longitude, userId, reportId, dbClient);
    console.log('Active count:', activeCount);

    console.log('Awarding report submit points...');
    const baseReportPoints = 10;
    const finalPoints = Math.round(baseReportPoints * zoneStatus.pointsMultiplier);
    const reportPoints = await awardPoints(userId, finalPoints, 'report_submit', reportId, dbClient);
    console.log('Report points result:', reportPoints);

    console.log('Updating user total...');
    await dbClient.query(
      `UPDATE users SET 
         reports_count = reports_count + 1,
         weekly_points = COALESCE(weekly_points, 0) + $1,
         monthly_points = COALESCE(monthly_points, 0) + $1,
         last_report_date = CURRENT_DATE
       WHERE id = $2`,
      [15, userId]
    );

    console.log('Retrieving user total_points...');
    const userResult = await dbClient.query(
      'SELECT total_points FROM users WHERE id = $1', [userId]
    );
    console.log('User total points:', userResult.rows[0].total_points);

    await dbClient.query('COMMIT');
    console.log('TRANSACTION COMMITTED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    await dbClient.query('ROLLBACK');
    console.error('TRANSACTION ERROR:', err);
    process.exit(1);
  } finally {
    dbClient.release();
  }
}

run();
