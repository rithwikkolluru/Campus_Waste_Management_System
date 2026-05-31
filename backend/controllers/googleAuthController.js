const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const pool = require('../config/db').pool;

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleStudentLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Find or create student in database
    let result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    let user;
    if (result.rows.length === 0) {
      // First time login — create account automatically
      const insertResult = await pool.query(
        `INSERT INTO users (email, name, profile_picture, google_id, role, created_at)
         VALUES ($1, $2, $3, $4, 'student', NOW())
         RETURNING id, email, name, profile_picture, role, total_points`,
        [email, name, picture, googleId]
      );
      user = insertResult.rows[0];
      console.log('New student registered via Google:', email);
    } else {
      user = result.rows[0];
      // Update name and picture in case they changed
      await pool.query(
        'UPDATE users SET profile_picture = $1, name = $2, google_id = $3 WHERE id = $4',
        [picture, name, googleId, user.id]
      );
    }

    // Generate JWT — same format as your existing auth
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name || name,
        email: user.email,
        role: 'student',
        picture: user.profile_picture || picture,
        total_points: user.total_points || 0,
      }
    });

  } catch (error) {
    console.error('Google auth error:', error.message);
    if (error.message.includes('Token used too late')) {
      return res.status(401).json({ error: 'Login expired. Please try again.' });
    }
    res.status(401).json({ error: 'Google login failed. Please try again.' });
  }
};

module.exports = { googleStudentLogin };
