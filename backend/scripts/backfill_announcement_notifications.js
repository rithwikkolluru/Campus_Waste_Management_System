require('dotenv').config();
const pool = require('../config/db').pool;
const { notifyAnnouncement } = require('../services/notificationService');

(async () => {
  try {
    const announcements = await pool.query(`
      SELECT id, zone_id, title, message FROM announcements
      WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())
    `);
    for (const a of announcements.rows) {
      const zoneKey = a.zone_id ? a.zone_id : 'all';
      await notifyAnnouncement(zoneKey, a.title, a.message);
      console.log(`Backfilled notifications for announcement #${a.id}: ${a.title}`);
    }
    console.log('✅ Backfill complete');
  } catch (e) {
    console.error('Backfill failed:', e.message);
  }
  process.exit(0);
})();
