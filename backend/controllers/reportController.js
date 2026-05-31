const db = require('../config/db');
const pool = db.pool;
const fs = require('fs');
const { awardPoints } = require('./rewardsController');
const { classifyWaste, validateWastePhoto, scoreSeverity } = require('../services/geminiService');

const VALID_STATUSES = ['reported', 'under_review', 'assigned', 'in_progress', 'resolved'];

/**
 * Fetch all reports with filtering (priority, status, zone)
 */
exports.getAllReports = async (req, res) => {
  const { status, zone, priority } = req.query;

  let queryText = `
    SELECT r.*,
           COALESCE(u.name, 'Unknown') AS reporter_name,
           COALESCE(z.name, 'Unknown') AS zone_name
    FROM reports r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN zones z ON r.zone_id = z.id
    WHERE 1=1
  `;
  const params = [];

  if (status) { params.push(status); queryText += ` AND r.status = $${params.length}`; }
  if (zone)   { params.push(zone);   queryText += ` AND z.name ILIKE $${params.length}`; }
  if (priority){ params.push(priority); queryText += ` AND r.priority = $${params.length}`; }

  queryText += ' ORDER BY r.created_at DESC';

  try {
    const result = await db.query(queryText, params);
    res.json({ status: 'success', reports: result.rows });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch reports.' });
  }
};

/**
 * Fetch reports for the logged-in user only
 */
exports.getMyReports = async (req, res) => {
  const userId = req.user.userId || req.user.id;
  try {
    const queryText = `
      SELECT r.*,
             COALESCE(z.name, 'Unknown') AS zone_name,
             COALESCE(
               json_agg(
                 json_build_object('id', rp.id, 'url', rp.file_url, 'at', rp.uploaded_at)
               ) FILTER (WHERE rp.id IS NOT NULL),
               '[]'
             ) as photos
      FROM reports r
      LEFT JOIN zones z ON r.zone_id = z.id
      LEFT JOIN report_photos rp ON r.id = rp.report_id
      WHERE r.user_id = $1
      GROUP BY r.id, z.name
      ORDER BY r.created_at DESC
    `;
    const result = await db.query(queryText, [userId]);
    res.json({ status: 'success', reports: result.rows });
  } catch (err) {
    console.error('getMyReports error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch your reports.' });
  }
};

/**
 * Analyze photo with AI only (instant pre-submit classification)
 * POST /api/reports/analyze-photo
 */
exports.analyzePhoto = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No photo uploaded' });
  }

  try {
    const classification = await classifyWaste(req.file.path);

    // Clean up temp file after reading
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.json({
      success: true,
      aiResult: {
        wasteType:  classification.wasteType,
        binColor:   classification.binColor,
        binLabel:   classification.binLabel,
        confidence: classification.confidence,
        tips:       classification.tips,
        isWaste:    classification.isWaste,
        aiAvailable: classification.aiAvailable,
      }
    });
  } catch (err) {
    console.error('analyzePhoto error:', err.message);
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.json({
      success: true,
      aiResult: { wasteType: 'General Waste', binColor: 'Black', binLabel: 'Landfill', confidence: 0, aiAvailable: false }
    });
  }
};

/**
 * Submit a new garbage report with full AI analysis
 */
exports.submitReport = async (req, res) => {
  const dbClient = await pool.connect();

  try {
    await dbClient.query('BEGIN');

    // user can manually set waste_type; AI may suggest but user override wins
    const { location, waste_type, description, priority, zone_id } = req.body;
    const userId = req.user.userId || req.user.id;

    let aiData        = null;
    let finalWasteType = waste_type || 'General Waste';

    // ── AI Analysis (runs if photo is present) ──────────────────────────────
    if (req.file) {
      try {
        // Fetch recent descriptions to detect duplicates
        const recentRes = await dbClient.query(
          `SELECT ai_description FROM reports
           WHERE created_at > NOW() - INTERVAL '2 hours'
             AND ai_description IS NOT NULL
           LIMIT 10`
        );
        const recentDescriptions = recentRes.rows.map(r => r.ai_description).filter(Boolean);

        // Run all 3 AI checks in parallel
        const [classification, validation, severity] = await Promise.all([
          classifyWaste(req.file.path),
          validateWastePhoto(req.file.path, recentDescriptions),
          scoreSeverity(req.file.path),
        ]);

        // Block fake / non-waste photos
        if (validation.isFake && validation.aiAvailable) {
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          await dbClient.query('ROLLBACK');
          return res.status(400).json({
            error: 'Invalid photo. Please upload an actual waste/garbage photo.',
            reason: validation.reason,
            isFake: true,
          });
        }

        // Use AI waste type ONLY if user didn't manually select one
        if (!waste_type && classification.aiAvailable && classification.wasteType) {
          finalWasteType = classification.wasteType;
        }

        aiData = { classification, validation, severity };
      } catch (aiErr) {
        // AI errors should not block submission — graceful fallback
        console.warn('AI analysis skipped due to error:', aiErr.message);
      }
    }

    // ── Insert Report ────────────────────────────────────────────────────────
    const reportResult = await dbClient.query(
      `INSERT INTO reports
        (user_id, zone_id, description, waste_type, priority, status,
         ai_severity, ai_priority, ai_description, location)
       VALUES ($1, $2, $3, $4, $5, 'reported', $6, $7, $8, $9)
       RETURNING id`,
      [
        userId,
        zone_id || 1,
        description,
        finalWasteType,
        priority || 'low',
        aiData?.severity?.severity    || 5,
        aiData?.severity?.priority    || 'Medium',
        aiData?.validation?.description || null,
        location || null,
      ]
    );

    const reportId = reportResult.rows[0].id;
    let photoUrl = null;
    let totalPointsEarned = 0;
    let photoPointsEarned = 0;

    // ── Save Photo + AI metadata ─────────────────────────────────────────────
    if (req.file) {
      photoUrl = `/uploads/waste-photos/${req.file.filename}`;

      await dbClient.query(
        `INSERT INTO report_photos
          (report_id, user_id, file_path, file_url, original_name, file_size,
           waste_category, ai_waste_type, ai_bin_color, ai_bin_label,
           ai_confidence, ai_severity, ai_priority, ai_tips, is_duplicate)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          reportId, userId, req.file.path, photoUrl,
          req.file.originalname, req.file.size, finalWasteType,
          aiData?.classification?.wasteType  || null,
          aiData?.classification?.binColor   || null,
          aiData?.classification?.binLabel   || null,
          aiData?.classification?.confidence || null,
          aiData?.severity?.severity         || null,
          aiData?.severity?.priority         || null,
          aiData?.classification?.tips       || null,
          aiData?.validation?.isDuplicate    || false,
        ]
      );

      const photoPoints = await awardPoints(userId, 5, 'photo_upload', reportId, dbClient);
      if (photoPoints.awarded) { totalPointsEarned += 5; photoPointsEarned = 5; }
    }

    // ── Award Report Points ─────────────────────────────────────────────────
    let reportPointsEarned = 0;
    const reportPoints = await awardPoints(userId, 10, 'report_submit', reportId, dbClient);
    if (reportPoints.awarded) { totalPointsEarned += 10; reportPointsEarned = 10; }

    // ── Get updated total ──────────────────────────────────────────────────
    const userResult = await dbClient.query(
      'SELECT total_points FROM users WHERE id = $1', [userId]
    );

    await dbClient.query('COMMIT');

    res.json({
      success: true,
      reportId,
      photoUrl,
      pointsEarned: totalPointsEarned,
      photoPointsEarned,
      reportPointsEarned,
      newTotalPoints: userResult.rows[0]?.total_points || 0,
      message: totalPointsEarned > 0
        ? `Report submitted! You earned +${totalPointsEarned} points 🌱`
        : 'Report submitted! (Daily points limit reached)',
      aiResult: aiData ? {
        wasteType:   aiData.classification?.wasteType   || finalWasteType,
        binColor:    aiData.classification?.binColor     || 'Black',
        binLabel:    aiData.classification?.binLabel     || 'Landfill',
        confidence:  aiData.classification?.confidence   || 0,
        tips:        aiData.classification?.tips         || '',
        severity:    aiData.severity?.severity           || 5,
        priority:    aiData.severity?.priority           || 'Medium',
        isDuplicate: aiData.validation?.isDuplicate      || false,
        aiAvailable: aiData.classification?.aiAvailable  || false,
        manualOverride: !!(waste_type), // flag: user manually chose waste type
      } : null,
    });

  } catch (err) {
    await dbClient.query('ROLLBACK');
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('submitReport error:', err.message);
    res.status(500).json({ error: 'Failed to submit report. Please try again.' });
  } finally {
    dbClient.release();
  }
};

/**
 * Update report status (Coordinator / Admin action)
 */
exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status, user_id } = req.body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
    });
  }
  if (!user_id) {
    return res.status(400).json({ status: 'error', message: 'User ID is required.' });
  }

  try {
    const current = await db.query('SELECT status FROM reports WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Report not found.' });
    }
    const oldStatus = current.rows[0].status;
    if (oldStatus === status) {
      return res.status(400).json({ status: 'error', message: `Report is already in '${status}' status.` });
    }

    const updated = await db.query(
      'UPDATE reports SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    await db.query(
      'INSERT INTO report_logs (report_id, old_status, new_status, changed_by) VALUES ($1, $2, $3, $4)',
      [id, oldStatus, status, user_id]
    );

    res.json({ status: 'success', message: `Report status updated to '${status}'.`, report: updated.rows[0] });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update status.' });
  }
};