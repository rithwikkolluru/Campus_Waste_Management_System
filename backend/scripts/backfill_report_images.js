/**
 * Sync report_images + reports.image_url from report_photos (one-time backfill)
 * Run: node scripts/backfill_report_images.js
 */
require('dotenv').config();
const pool = require('../config/db').pool;

(async () => {
  const client = await pool.connect();
  try {
    const photos = await client.query(
      `SELECT report_id, file_url FROM report_photos ORDER BY report_id`
    );
    let synced = 0;
    for (const row of photos.rows) {
      const exists = await client.query(
        `SELECT id FROM report_images WHERE report_id = $1 AND image_url = $2`,
        [row.report_id, row.file_url]
      );
      if (!exists.rows.length) {
        await client.query(
          `INSERT INTO report_images (report_id, image_url, uploaded_at) VALUES ($1, $2, NOW())`,
          [row.report_id, row.file_url]
        );
      }
      await client.query(
        `UPDATE reports SET image_url = $1 WHERE id = $2 AND (image_url IS NULL OR image_url = '')`,
        [row.file_url, row.report_id]
      );
      synced++;
    }
    console.log(`✅ Backfilled ${synced} image references into report_images`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Backfill failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
})();
