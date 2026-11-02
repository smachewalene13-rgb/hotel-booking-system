import { verifyAccessToken } from '../utils/jwt.js';
import db from '../config/db.js';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }

  try {
    const userRes = await db.query(
      'SELECT id, full_name, email, phone, role, status, email_verified FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User account not found.' });
    }

    const user = userRes.rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account is deactivated or locked.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal authentication error.' });
  }
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);
  if (decoded) {
    const userRes = await db.query(
      'SELECT id, full_name, email, phone, role, status FROM users WHERE id = $1',
      [decoded.id]
    );
    if (userRes.rows.length > 0 && userRes.rows[0].status === 'active') {
      req.user = userRes.rows[0];
    }
  }
  next();
};

export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (req.user.role === 'admin') {
      return next(); // Admin has omnipotent access
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: role '${req.user.role}' lacks permissions for this endpoint.`
      });
    }

    next();
  };
};
