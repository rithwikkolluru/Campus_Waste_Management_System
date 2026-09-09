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
        'Civic Area High Activity 📍',
        `${reportCount} citizens have now reported issues in this sector. Municipal sanitation fleet has been notified!`,
        { zoneId, reportCount }
      );
    }
  } catch (err) {
    console.error('notifyZoneActivity error:', err.message);
  }
};

// Notify citizen when their report status changes
const notifyReportStatus = async (userId, reportId, newStatus, location, client = pool) => {
  const messages = {
    in_progress: {
      title: 'Action In Progress 🔧',
      message: `Municipal sanitation team is now actively resolving "${location}". Thank you for your civic vigilance!`,
    },
    resolved: {
      title: 'Civic Issue Resolved! ✅',
      message: `"${location}" has been verified and cleared. Your report made a difference! +15 points awarded towards municipal tax rebates.`,
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

// Notify citizen with a custom status_update message (verification flow)
const notifyStatusUpdate = async (userId, reportId, message, client = pool) => {
  await createNotification(
    userId,
    'status_update',
    `Civic Report #${reportId} Update`,
    message,
    { reportId },
    client
  );
};

// Broadcast announcement notifications to citizens in zone + admin
const notifyAnnouncement = async (zoneId, title, message, client = pool) => {
  try {
    let recipientIds = [];
    const parsedZoneId = zoneId === 'all' || zoneId == null ? null : parseInt(zoneId, 10);

    if (!parsedZoneId || Number.isNaN(parsedZoneId)) {
      const citizens = await client.query(`SELECT id FROM users WHERE role IN ('citizen', 'student')`);
      recipientIds = citizens.rows.map(r => r.id);
    } else {
      // zone_reporters.zone_id is VARCHAR (GPS grid); reports.zone_id is INTEGER — query reports only
      const zoneUsers = await client.query(
        `SELECT DISTINCT user_id FROM reports WHERE zone_id = $1`,
        [parsedZoneId]
      );
      recipientIds = zoneUsers.rows.map(r => r.user_id);

      const allCitizens = await client.query(`SELECT id FROM users WHERE role IN ('citizen', 'student')`);
      recipientIds = [...new Set([...recipientIds, ...allCitizens.rows.map(r => r.id)])];
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

// Notify citizen they hit daily points limit
const notifyDailyLimit = async (userId) => {
  await createNotification(
    userId,
    'daily_limit',
    'Daily Points Limit Reached 🏆',
    `You've reached your daily municipal rebate points limit! You can still submit reports to help keep your ward clean.`,
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
