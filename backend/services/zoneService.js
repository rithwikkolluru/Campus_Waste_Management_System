const pool = require('../config/db').pool;

const ZONE_RADIUS_METERS           = 50;
const ZONE_WARNING_THRESHOLD       = 5;
const ZONE_HALF_POINTS_THRESHOLD   = 10;
const ZONE_NO_POINTS_THRESHOLD     = 15;
const ZONE_BONUS_ON_RESOLVE        = 20;

// Generate a zone_id string from GPS coords (~50m grid squares)
const getZoneId = (lat, lng) => {
  const precision  = 0.0005; // ~55 metres
  const roundedLat = Math.round(lat / precision) * precision;
  const roundedLng = Math.round(lng / precision) * precision;
  return `zone_${roundedLat.toFixed(4)}_${roundedLng.toFixed(4)}`;
};

// Haversine distance in metres
const getDistance = (lat1, lng1, lat2, lng2) => {
  const R    = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Check zone status BEFORE a student submits — return warning info
const checkZoneStatus = async (lat, lng) => {
  const zoneId = getZoneId(lat, lng);

  const zoneResult = await pool.query(
    `SELECT * FROM report_zones WHERE zone_id = $1`,
    [zoneId]
  );

  if (zoneResult.rows.length === 0) {
    return {
      zoneId,
      isNew: true,
      reportCount: 0,
      status: 'clear',
      pointsMultiplier: 1.0,
      warningLevel: 'none',
      message: null,
    };
  }

  const zone  = zoneResult.rows[0];
  const count = zone.active_report_count;

  let warningLevel    = 'none';
  let message         = null;
  let pointsMultiplier = 1.0;

  if (count >= ZONE_NO_POINTS_THRESHOLD) {
    warningLevel     = 'no_points';
    pointsMultiplier = 0;
    message = `${count} people already reported this area. You can still submit but no points will be awarded — this area is already being handled! 💪`;
  } else if (count >= ZONE_HALF_POINTS_THRESHOLD) {
    warningLevel     = 'half_points';
    pointsMultiplier = 0.5;
    message = `${count} people reported this area already. You'll earn half points for helping confirm the issue.`;
  } else if (count >= ZONE_WARNING_THRESHOLD) {
    warningLevel     = 'warning';
    pointsMultiplier = 1.0;
    message = `${count} people have already reported nearby. Full points still awarded — thanks for helping! 🌱`;
  }

  return {
    zoneId,
    isNew: false,
    reportCount: count,
    totalReports: zone.total_report_count,
    status: zone.status,
    pointsMultiplier,
    warningLevel,
    message,
    lastReportedAt: zone.last_reported_at,
  };
};

// Update zone after a report is saved (called inside an existing transaction)
const updateZoneAfterReport = async (zoneId, lat, lng, userId, reportId, client) => {
  // Upsert zone row
  await client.query(
    `INSERT INTO report_zones
       (zone_id, center_lat, center_lng, active_report_count, last_reported_at, created_at)
     VALUES ($1, $2, $3, 1, NOW(), NOW())
     ON CONFLICT (zone_id) DO UPDATE SET
       active_report_count = report_zones.active_report_count + 1,
       last_reported_at    = NOW()`,
    [zoneId, lat, lng]
  );

  // Track user in zone_reporters (once per zone per user)
  await client.query(
    `INSERT INTO zone_reporters (zone_id, user_id, report_id, reported_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (zone_id, user_id) DO NOTHING`,
    [zoneId, userId, reportId]
  );

  const updated = await client.query(
    `SELECT active_report_count FROM report_zones WHERE zone_id = $1`,
    [zoneId]
  );
  return updated.rows[0]?.active_report_count || 1;
};

// When admin resolves a report — award bonus to ALL zone reporters
const resolveZoneAndAwardBonus = async (reportId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reportResult = await client.query(
      `SELECT gps_zone_id, user_id, location FROM reports WHERE id = $1`,
      [reportId]
    );

    if (!reportResult.rows[0]?.gps_zone_id) {
      await client.query('ROLLBACK');
      return { bonusAwarded: false };
    }

    const zoneId   = reportResult.rows[0].gps_zone_id;
    const location = reportResult.rows[0].location || 'Campus Area';

    const reporters = await client.query(
      `SELECT zr.user_id, u.name
       FROM zone_reporters zr
       JOIN users u ON zr.user_id = u.id
       WHERE zr.zone_id = $1 AND zr.bonus_points_awarded = false`,
      [zoneId]
    );

    let bonusCount = 0;
    for (const reporter of reporters.rows) {
      // Award bonus via points_logs
      await client.query(
        `INSERT INTO points_logs (user_id, points, action, report_id, created_at)
         VALUES ($1, $2, 'zone_bonus', $3, NOW())`,
        [reporter.user_id, ZONE_BONUS_ON_RESOLVE, reportId]
      );

      await client.query(
        `UPDATE users SET
           total_points   = total_points   + $1,
           monthly_points = COALESCE(monthly_points, 0) + $1,
           weekly_points  = COALESCE(weekly_points, 0)  + $1
         WHERE id = $2`,
        [ZONE_BONUS_ON_RESOLVE, reporter.user_id]
      );

      await client.query(
        `UPDATE zone_reporters SET bonus_points_awarded = true
         WHERE zone_id = $1 AND user_id = $2`,
        [zoneId, reporter.user_id]
      );

      // In-DB notification
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, data, created_at)
         VALUES ($1, 'zone_resolved', 'Zone Cleaned! 🎉', $2, $3, NOW())`,
        [
          reporter.user_id,
          `The area you reported ("${location}") has been cleaned! You earned +${ZONE_BONUS_ON_RESOLVE} bonus points 🌱`,
          JSON.stringify({ zoneId, bonusPoints: ZONE_BONUS_ON_RESOLVE }),
        ]
      );
      bonusCount++;
    }

    // Mark zone as resolved
    await client.query(
      `UPDATE report_zones
       SET status = 'resolved', resolved_at = NOW(), active_report_count = 0
       WHERE zone_id = $1`,
      [zoneId]
    );

    await client.query('COMMIT');
    return { bonusAwarded: true, reportersRewarded: bonusCount, bonusPoints: ZONE_BONUS_ON_RESOLVE, zoneId };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('resolveZoneAndAwardBonus error:', err.message);
    return { bonusAwarded: false };
  } finally {
    client.release();
  }
};

module.exports = {
  getZoneId,
  getDistance,
  checkZoneStatus,
  updateZoneAfterReport,
  resolveZoneAndAwardBonus,
  ZONE_WARNING_THRESHOLD,
  ZONE_HALF_POINTS_THRESHOLD,
  ZONE_NO_POINTS_THRESHOLD,
  ZONE_BONUS_ON_RESOLVE,
};
