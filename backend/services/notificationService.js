const pool = require('../config/db').pool;

// Create a notification for one user
const createNotification = async (userId, type, title, message, data = {}, client = pool) => {
  try {
    await client.query(`
      INSERT INTO notifications (user_id, type, title, message, data, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, false, NOW())
    `, [userId, type, title, message, JSON.stringify(data)]);
  } catch (err) {
    console.error('createNotification error:', err.message);
  }
};

// Bulk insert notifications for multiple recipients
const createBulkNotifications = async (recipientIds, type, title, message, data = {}, client = pool) => {
  const uniqueIds = [...new Set(recipientIds.filter(Boolean))];
  for (const userId of uniqueIds) {
    await createNotification(userId, type, title, message, data, client);
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
const notifyReportStatus = async (userId, reportId, newStatus, location, client = pool) => {
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
    userId,
    'status_update',
    notif.title,
    notif.message,
    { reportId, newStatus },
    client
  );
};

// Notify student with a custom status_update message (verification flow)
const notifyStatusUpdate = async (userId, reportId, message, client = pool) => {
  await createNotification(
    userId,
    'status_update',
    `Report #${reportId} Update`,
    message,
    { reportId },
    client
  );
};

// Broadcast announcement notifications to students in zone + admin
const notifyAnnouncement = async (zoneId, title, message, client = pool) => {
  try {
    let recipientIds = [];
    const parsedZoneId = zoneId === 'all' || zoneId == null ? null : parseInt(zoneId, 10);

    if (!parsedZoneId || Number.isNaN(parsedZoneId)) {
      const students = await client.query(`SELECT id FROM users WHERE role = 'student'`);
      recipientIds = students.rows.map(r => r.id);
    } else {
      // zone_reporters.zone_id is VARCHAR (GPS grid); reports.zone_id is INTEGER — query reports only
      const zoneUsers = await client.query(
        `SELECT DISTINCT user_id FROM reports WHERE zone_id = $1`,
        [parsedZoneId]
      );
      recipientIds = zoneUsers.rows.map(r => r.user_id);

      const allStudents = await client.query(`SELECT id FROM users WHERE role = 'student'`);
      recipientIds = [...new Set([...recipientIds, ...allStudents.rows.map(r => r.id)])];
    }

    await createBulkNotifications(
      recipientIds,
      'announcement',
      title,
      message,
      { zoneId: zoneId || 'all' },
      client
    );

    const admins = await client.query(`SELECT id FROM users WHERE role = 'admin'`);
    await createBulkNotifications(
      admins.rows.map(r => r.id),
      'announcement',
      title,
      message,
      { zoneId: zoneId || 'all' },
      client
    );
  } catch (err) {
    console.error('notifyAnnouncement error:', err.message);
  }
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
  createBulkNotifications,
  notifyZoneActivity,
  notifyReportStatus,
  notifyStatusUpdate,
  notifyAnnouncement,
  notifyDailyLimit,
  sendWeeklySummary,
};
