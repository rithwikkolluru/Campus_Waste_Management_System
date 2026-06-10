const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

const requireCoordinator = (req, res, next) => {
  if (!req.user || !['coordinator', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Coordinator access required' });
  }
  next();
};

const requireStaffOrAbove = (req, res, next) => {
  if (!req.user || !['coordinator', 'admin', 'staff'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireCoordinator, requireStaffOrAbove };
