import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../config/db.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import { logAudit } from '../utils/auditLogger.js';

// In-memory token store for password reset simulation
const resetTokens = new Map();

export const register = async (req, res, next) => {
  try {
    const { full_name, email, phone, password, role = 'guest' } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' });
    }

    // Password rule: >= 8 characters, at least one letter and one number (BR-34)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain both letters and numbers.'
      });
    }

    // Check existing email
    const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    // Only allow guest registration directly unless admin token is used
    const assignedRole = ['guest'].includes(role) ? role : 'guest';

    const result = await db.query(`
      INSERT INTO users (full_name, email, phone, password_hash, role, status, email_verified)
      VALUES ($1, LOWER($2), $3, $4, $5, 'active', true)
      RETURNING id, full_name, email, phone, role, status, email_verified, created_at
    `, [full_name.trim(), email.trim(), phone || null, password_hash, assignedRole]);

    const user = result.rows[0];
    const tokens = generateTokens(user);

    await logAudit({
      userId: user.id,
      action: 'USER_REGISTER',
      entity: 'users',
      entityId: user.id,
      newValue: { email: user.email, role: user.role },
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to The Grand Horizon.',
      user,
      ...tokens
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const userRes = await db.query(
      'SELECT id, full_name, email, phone, password_hash, role, status, failed_logins, locked_until FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = userRes.rows[0];

    // Check account lock (FR-AUTH-07)
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(403).json({
        success: false,
        message: `Account is temporarily locked due to repeated failed login attempts. Please retry in ${waitMinutes} minute(s).`
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact hotel support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const failed = (user.failed_logins || 0) + 1;
      let lockedUntil = null;
      if (failed >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60000); // Lock for 15 mins
      }
      await db.query(
        'UPDATE users SET failed_logins = $1, locked_until = $2 WHERE id = $3',
        [failed, lockedUntil, user.id]
      );

      return res.status(401).json({
        success: false,
        message: failed >= 5
          ? 'Too many failed login attempts. Account temporarily locked for 15 minutes.'
          : `Invalid email or password. Attempt ${failed} of 5 before temporary lock.`
      });
    }

    // Successful login: reset failed login count
    await db.query(
      'UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1',
      [user.id]
    );

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status
    };

    const tokens = generateTokens(safeUser);

    await logAudit({
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'users',
      entityId: user.id,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Login successful.',
      user: safeUser,
      ...tokens
    });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const userRes = await db.query(
      'SELECT id, full_name, email, phone, role, status FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rows.length === 0 || userRes.rows[0].status !== 'active') {
      return res.status(401).json({ success: false, message: 'User account not active.' });
    }

    const user = userRes.rows[0];
    const tokens = generateTokens(user);

    res.json({
      success: true,
      ...tokens
    });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { full_name, phone } = req.body;
    const userId = req.user.id;

    const result = await db.query(`
      UPDATE users 
      SET full_name = COALESCE($1, full_name),
          phone = COALESCE($2, phone),
          updated_at = NOW()
      WHERE id = $3
      RETURNING id, full_name, email, phone, role, status
    `, [full_name?.trim(), phone?.trim(), userId]);

    await logAudit({
      userId,
      action: 'UPDATE_PROFILE',
      entity: 'users',
      entityId: userId,
      newValue: { full_name, phone },
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(new_password)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long and contain letters and numbers.'
      });
    }

    const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const isMatch = await bcrypt.compare(current_password, userRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);

    await logAudit({
      userId,
      action: 'CHANGE_PASSWORD',
      entity: 'users',
      entityId: userId,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const userRes = await db.query('SELECT id, full_name, email FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (userRes.rows.length === 0) {
      // Return success anyway to avoid user enumeration
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been dispatched.'
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    resetTokens.set(token, {
      userId: userRes.rows[0].id,
      expires: Date.now() + 60 * 60 * 1000 // 1 hour
    });

    console.log(`[EMAIL DISPATCH] Password reset link for ${email}: http://localhost:5173/reset-password?token=${token}`);

    res.json({
      success: true,
      message: 'Password reset instructions dispatched. For local demo, use token.',
      demoToken: token
    });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }

    const session = resetTokens.get(token);
    if (!session || session.expires < Date.now()) {
      return res.status(400).json({ success: false, message: 'Reset token is invalid or has expired.' });
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(new_password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain letters and numbers.'
      });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, session.userId]);
    resetTokens.delete(token);

    res.json({
      success: true,
      message: 'Password has been successfully reset. You may now log in.'
    });
  } catch (err) {
    next(err);
  }
};
