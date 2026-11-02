import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

export const releaseExpiredHolds = async () => {
  try {
    const expiredRes = await db.query(`
      UPDATE bookings
      SET status = 'Expired',
          updated_at = NOW()
      WHERE status = 'Pending' 
        AND hold_expires_at IS NOT NULL 
        AND hold_expires_at < NOW()
      RETURNING id, code
    `);

    if (expiredRes.rowCount > 0) {
      console.log(`[JOB] Released ${expiredRes.rowCount} expired booking hold(s):`, expiredRes.rows.map(b => b.code));
      for (const row of expiredRes.rows) {
        await logAudit({
          action: 'HOLD_EXPIRED_RELEASED',
          entity: 'bookings',
          entityId: row.id,
          newValue: { code: row.code, status: 'Expired' }
        });
      }
    }
  } catch (err) {
    console.error('[JOB ERROR] releaseExpiredHolds failed:', err.message);
  }
};

export const checkNoShows = async () => {
  try {
    // Check bookings that were due today, are still in 'Confirmed' status, and current time > cutoff time
    const settingsRes = await db.query('SELECT no_show_cutoff_time FROM hotel_settings LIMIT 1');
    const cutoffStr = settingsRes.rows[0]?.no_show_cutoff_time || '18:00';
    const [cutHour, cutMin] = cutoffStr.split(':').map(Number);

    const now = new Date();
    const cutDate = new Date();
    cutDate.setHours(cutHour, cutMin, 0, 0);

    if (now > cutDate) {
      const noShowRes = await db.query(`
        UPDATE bookings
        SET status = 'No-Show',
            updated_at = NOW()
        WHERE status = 'Confirmed'
          AND check_in = CURRENT_DATE
        RETURNING id, code, guest_name
      `);

      if (noShowRes.rowCount > 0) {
        console.log(`[JOB] Flagged ${noShowRes.rowCount} booking(s) as No-Show:`, noShowRes.rows.map(b => b.code));
      }
    }
  } catch (err) {
    console.error('[JOB ERROR] checkNoShows failed:', err.message);
  }
};

export const startBackgroundJobs = () => {
  console.log('⏰ Starting background jobs (hold release every 60s, no-show check every 10m)...');
  // Run hold expiration check every 60 seconds
  setInterval(releaseExpiredHolds, 60 * 1000);
  // Run immediately on boot
  releaseExpiredHolds();

  // Run no-show check every 10 minutes
  setInterval(checkNoShows, 10 * 60 * 1000);
};
