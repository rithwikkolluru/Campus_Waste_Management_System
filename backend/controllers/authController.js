const db     = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'eco_campus_super_secret_key_123';
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_RETRIES = 3;

// Helper to generate a 4-digit OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

/**
 * Request OTP (Login/Register via Phone)
 */
exports.requestOtp = async (req, res) => {
  const { phone } = req.body;

  if (!phone || phone.length < 5) {
    return res.status(400).json({ status: 'error', message: 'Valid phone number is required.' });
  }

  try {
    const otp = generateOTP();
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Check if user exists
    const result = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    
    if (result.rows.length === 0) {
      // Create user with student role, phone, and OTP
      await db.query(
        'INSERT INTO users (phone, role, otp, otp_expiry, otp_retries) VALUES ($1, $2, $3, $4, 0)',
        [phone, 'student', otp, expiry]
      );
    } else {
      // Update existing user's OTP
      await db.query(
        'UPDATE users SET otp = $1, otp_expiry = $2, otp_retries = 0 WHERE phone = $3',
        [otp, expiry, phone]
      );
    }

    // In a real application, you would send the SMS via Twilio or similar here.
    console.log(`[SMS MOCK] Sent OTP ${otp} to phone ${phone}`);

    res.json({
      status: 'success',
      message: `OTP sent to ${phone} successfully.`,
      // For demo purposes, we send it in the response so it's easy to test without SMS:
      otp_hint: otp 
    });
  } catch (err) {
    console.error('Error during OTP request:', err);
    res.status(500).json({ status: 'error', message: 'Failed to request OTP.' });
  }
};

/**
 * Verify OTP and generate JWT
 */
exports.verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    const user = result.rows[0];

    // Check retries
    if (user.otp_retries >= MAX_OTP_RETRIES) {
      return res.status(401).json({ status: 'error', message: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Check expiry
    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(401).json({ status: 'error', message: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    if (user.otp !== otp) {
      await db.query('UPDATE users SET otp_retries = otp_retries + 1 WHERE phone = $1', [phone]);
      return res.status(401).json({ status: 'error', message: 'Invalid OTP.' });
    }

    // Success - Clear OTP and generate JWT
    await db.query('UPDATE users SET otp = NULL, otp_expiry = NULL, otp_retries = 0 WHERE phone = $1', [phone]);

    // Token expires in 24 hours per constraints
    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      status: 'success',
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        total_points: user.total_points
      },
    });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ status: 'error', message: 'Failed to verify OTP.' });
  }
};

/**
 * Sign In to user account (Admin / Coordinator)
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user
    const result = await db.query('SELECT * FROM users WHERE email = $1 AND role IN ($2, $3)', [email, 'admin', 'coordinator']);
    if (result.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password. Access restricted to Staff.' });
    }

    const user = result.rows[0];

    // Verify password (Mock check or proper bcrypt depending on DB state)
    // If DB is fresh, there are no hashed passwords. 
    // For demo purposes, let's allow 'demo1234' on all emails if there's no password set, OR check bcrypt.
    let isMatch = false;
    if (!user.password && password === 'demo1234') {
        isMatch = true;
    } else if (user.password) {
        isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      status: 'success',
      token,
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error('Error during email login:', err);
    res.status(500).json({ status: 'error', message: 'Login failed.' });
  }
};

/**
 * Get user stats (Gamification Dashboard)
 */
exports.getStats = async (req, res) => {
  const { id } = req.params; // pass user id in params
  try {
    const userRes = await db.query('SELECT total_points FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) return res.status(404).json({ status: 'error', message: 'User not found' });
    
    const totalPoints = userRes.rows[0].total_points;

    const dailyPointsRes = await db.query(`
      SELECT COALESCE(SUM(points), 0) as daily_total
      FROM points_logs
      WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
    `, [id]);
    const dailyTotal = parseInt(dailyPointsRes.rows[0].daily_total);

    const monthlyPointsRes = await db.query(`
      SELECT COALESCE(SUM(points), 0) as monthly_total
      FROM points_logs
      WHERE user_id = $1 AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [id]);
    const monthlyTotal = parseInt(monthlyPointsRes.rows[0].monthly_total);

    res.json({
      status: 'success',
      stats: {
        total_points: totalPoints,
        daily_points: dailyTotal,
        monthly_points: monthlyTotal,
        max_daily: 50,
        max_monthly: 500,
        remaining_daily: Math.max(0, 50 - dailyTotal),
        remaining_monthly: Math.max(0, 500 - monthlyTotal)
      }
    });

  } catch (err) {
    console.error('Error getting stats:', err);
    res.status(500).json({ status: 'error', message: 'Failed to get stats.' });
  }
};
