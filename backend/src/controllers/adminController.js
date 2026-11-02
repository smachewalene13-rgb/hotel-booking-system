import bcrypt from 'bcryptjs';
import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

export const getUsers = async (req, res, next) => {
  try {
    const { role, status } = req.query;
    let queryStr = 'SELECT id, full_name, email, phone, role, status, email_verified, created_at FROM users WHERE 1=1';
    const params = [];
    let pIdx = 1;

    if (role) {
      queryStr += ` AND role = $${pIdx++}`;
      params.push(role);
    }
    if (status) {
      queryStr += ` AND status = $${pIdx++}`;
      params.push(status);
    }

    queryStr += ' ORDER BY created_at DESC';
    const result = await db.query(queryStr, params);

    res.json({
      success: true,
      users: result.rows
    });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { full_name, email, phone, role, password, status = 'active' } = req.body;
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'full_name, email, password, and role are required.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.query(`
      INSERT INTO users (full_name, email, phone, role, password_hash, status, email_verified)
      VALUES ($1, LOWER($2), $3, $4, $5, $6, true)
      RETURNING id, full_name, email, phone, role, status, created_at
    `, [full_name.trim(), email.trim(), phone, role, password_hash, status]);

    await logAudit({
      userId: req.user.id,
      action: 'ADMIN_CREATE_USER',
      entity: 'users',
      entityId: result.rows[0].id,
      newValue: { email, role, full_name },
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'User account created.',
      user: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, phone, role, status, password } = req.body;

    const oldRes = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (oldRes.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });

    let hash = oldRes.rows[0].password_hash;
    if (password) {
      hash = await bcrypt.hash(password, 10);
    }

    const result = await db.query(`
      UPDATE users 
      SET full_name = COALESCE($1, full_name),
          phone = COALESCE($2, phone),
          role = COALESCE($3, role),
          status = COALESCE($4, status),
          password_hash = $5,
          updated_at = NOW()
      WHERE id = $6
      RETURNING id, full_name, email, phone, role, status
    `, [full_name, phone, role, status, hash, id]);

    await logAudit({
      userId: req.user.id,
      action: 'ADMIN_UPDATE_USER',
      entity: 'users',
      entityId: id,
      oldValue: oldRes.rows[0],
      newValue: result.rows[0],
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'User updated successfully.',
      user: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

export const deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE users SET status = 'inactive', updated_at = NOW() WHERE id = $1", [id]);

    await logAudit({
      userId: req.user.id,
      action: 'ADMIN_DEACTIVATE_USER',
      entity: 'users',
      entityId: id,
      ip: req.ip
    });

    res.json({ success: true, message: 'User account deactivated.' });
  } catch (err) {
    next(err);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const { limit = 100, action, entity } = req.query;

    let queryStr = `
      SELECT al.*, u.full_name as user_name, u.role as user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let pIdx = 1;

    if (action) {
      queryStr += ` AND al.action ILIKE $${pIdx++}`;
      params.push(`%${action}%`);
    }
    if (entity) {
      queryStr += ` AND al.entity = $${pIdx++}`;
      params.push(entity);
    }

    queryStr += ` ORDER BY al.created_at DESC LIMIT $${pIdx}`;
    params.push(parseInt(limit));

    const result = await db.query(queryStr, params);
    res.json({
      success: true,
      count: result.rowCount,
      logs: result.rows
    });
  } catch (err) {
    next(err);
  }
};

export const updateHotelSettings = async (req, res, next) => {
  try {
    const {
      name, tagline, address, phone, email,
      check_in_time, check_out_time, currency, currency_symbol,
      tax_percent, service_percent, deposit_percent, hold_minutes,
      cancellation_free_hours, cancellation_partial_hours, cancellation_partial_rate,
      no_show_cutoff_time, refund_approval_threshold
    } = req.body;

    const oldRes = await db.query('SELECT * FROM hotel_settings LIMIT 1');

    const result = await db.query(`
      UPDATE hotel_settings
      SET name = COALESCE($1, name),
          tagline = COALESCE($2, tagline),
          address = COALESCE($3, address),
          phone = COALESCE($4, phone),
          email = COALESCE($5, email),
          check_in_time = COALESCE($6, check_in_time),
          check_out_time = COALESCE($7, check_out_time),
          currency = COALESCE($8, currency),
          currency_symbol = COALESCE($9, currency_symbol),
          tax_percent = COALESCE($10, tax_percent),
          service_percent = COALESCE($11, service_percent),
          deposit_percent = COALESCE($12, deposit_percent),
          hold_minutes = COALESCE($13, hold_minutes),
          cancellation_free_hours = COALESCE($14, cancellation_free_hours),
          cancellation_partial_hours = COALESCE($15, cancellation_partial_hours),
          cancellation_partial_rate = COALESCE($16, cancellation_partial_rate),
          no_show_cutoff_time = COALESCE($17, no_show_cutoff_time),
          refund_approval_threshold = COALESCE($18, refund_approval_threshold),
          updated_at = NOW()
      WHERE id = (SELECT id FROM hotel_settings LIMIT 1)
      RETURNING *
    `, [
      name, tagline, address, phone, email,
      check_in_time, check_out_time, currency, currency_symbol,
      tax_percent, service_percent, deposit_percent, hold_minutes,
      cancellation_free_hours, cancellation_partial_hours, cancellation_partial_rate,
      no_show_cutoff_time, refund_approval_threshold
    ]);

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_HOTEL_SETTINGS',
      entity: 'hotel_settings',
      entityId: result.rows[0].id,
      oldValue: oldRes.rows[0],
      newValue: result.rows[0],
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Hotel configuration updated.',
      settings: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};
