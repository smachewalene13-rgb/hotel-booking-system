import db from '../config/db.js';

export const logAudit = async ({ userId = null, action, entity, entityId = null, oldValue = null, newValue = null, ip = null }) => {
  try {
    await db.query(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, old_value, new_value, ip)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      userId,
      action,
      entity,
      entityId ? String(entityId) : null,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      ip || '127.0.0.1'
    ]);
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
};
