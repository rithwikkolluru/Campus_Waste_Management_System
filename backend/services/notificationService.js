const pool = require('../config/db').pool;

// Create a notification for one user
const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, data, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [userId, type, title, message, JSON.stringify(data)]);
  } catch (err) {
    console.error('createNotification error:', err.message);
  }
};

// Notify all reporters in a zone about high activity
const notifyZoneActivity = async (zoneId, reportCount) => {
  try {
    const reporters = await pool.query(`
      SELECT DISTINCT user_id FROM zone_reporters
      WHERE zone_id = $1
    `, [zoneId]);

    for (const r of reporters.rows) {
      await createNotification(
        r.user_id,
        'zone_busy',
        'Area Getting Crowded 📍',
        `${reportCount} students have now reported the same area you flagged. Staff has been notified!`,
        { zoneId, reportCount }
      );
    }
  } catch (err) {
    console.error('notifyZoneActivity error:', err.message);
  }
};

// Notify student when their report status changes
const notifyReportStatus = async (userId, reportId, newStatus, location) => {
  const messages = {
    in_progress: {
      title: 'Report In Progress 🔧',
      message: `Staff is now working on cleaning "${location}". Thank you for reporting!`,
    },
    resolved: {
      title: 'Area Cleaned! ✅',
      message: `"${location}" has been cleaned. Your report made a difference! +15 bonus points awarded.`,
    },
  };

  const notif = messages[newStatus];
  if (!notif) return;

  await createNotification(
    userId, 'report_status',
    notif.title, notif.message,
    { reportId, newStatus }
  );
};

// Notify student they hit daily points limit
const notifyDailyLimit = async (userId) => {
  await createNotification(
    userId,
    'daily_limit',
    'Daily Limit Reached 🏆',
    `You've earned the maximum 50 points today! Come back tomorrow for more points. You can still submit reports to help campus!`,
    {}
  );
};

// Weekly summary notification every Monday
const sendWeeklySummary = async (userId, weekPoints, weekReports, rank) => {
  await createNotification(
    userId,
    'weekly_summary',
    'Your Weekly Summary 📊',
    `This week: ${weekPoints} points earned, ${weekReports} reports submitted. Campus rank: #${rank}. Keep it up! 🌱`,
    { weekPoints, weekReports, rank }
  );
};

module.exports = {
  createNotification,
  notifyZoneActivity,
  notifyReportStatus,
  notifyDailyLimit,
  sendWeeklySummary,
};
