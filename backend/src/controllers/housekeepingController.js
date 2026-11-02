import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

export const getHousekeepingBoard = async (req, res, next) => {
  try {
    const { floor, status } = req.query;

    let queryStr = `
      SELECT r.*,
        rt.name as room_type_name,
        rt.code as room_type_code,
        (
          SELECT jsonb_build_object(
            'booking_id', b.id,
            'guest_name', b.guest_name,
            'check_out', b.check_out,
            'status', b.status
          )
          FROM booking_rooms br
          JOIN bookings b ON br.booking_id = b.id
          WHERE br.room_id = r.id AND b.status = 'Checked-in'
          LIMIT 1
        ) as current_occupant
      FROM rooms r
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE r.is_active = true
    `;

    const params = [];
    let pIdx = 1;

    if (floor) {
      queryStr += ` AND r.floor = $${pIdx++}`;
      params.push(parseInt(floor));
    }
    if (status) {
      queryStr += ` AND r.status = $${pIdx++}`;
      params.push(status);
    }

    queryStr += ` ORDER BY r.floor ASC, r.room_number ASC`;

    const result = await db.query(queryStr, params);

    // Group counts
    const statusCounts = {
      Available: 0,
      Occupied: 0,
      Dirty: 0,
      Cleaning: 0,
      Maintenance: 0,
      'Out of Service': 0
    };

    result.rows.forEach(r => {
      if (statusCounts[r.status] !== undefined) {
        statusCounts[r.status]++;
      }
    });

    res.json({
      success: true,
      totalRooms: result.rowCount,
      counts: statusCounts,
      rooms: result.rows
    });
  } catch (err) {
    next(err);
  }
};

export const updateHousekeepingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const statusMap = {
      available: 'Available',
      occupied: 'Occupied',
      dirty: 'Dirty',
      cleaning: 'Cleaning',
      maintenance: 'Maintenance',
      'out of service': 'Out of Service',
      'out_of_service': 'Out of Service'
    };
    const normalizedStatus = statusMap[(status || '').toLowerCase()] || status;

    const validStatuses = ['Available', 'Occupied', 'Dirty', 'Cleaning', 'Maintenance', 'Out of Service'];
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`
      });
    }

    const oldRes = await db.query('SELECT * FROM rooms WHERE id = $1', [id]);
    if (oldRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }
    const oldRoom = oldRes.rows[0];

    // Cannot make occupied room available without checkout
    if (oldRoom.status === 'Occupied' && normalizedStatus === 'Available') {
      return res.status(400).json({
        success: false,
        message: 'Room is currently occupied by an active guest. Check out the guest first.'
      });
    }

    const result = await db.query(`
      UPDATE rooms 
      SET status = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `, [normalizedStatus, id]);

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_ROOM_CLEANING_STATUS',
      entity: 'rooms',
      entityId: id,
      oldValue: { status: oldRoom.status },
      newValue: { status: normalizedStatus, notes },
      ip: req.ip
    });

    res.json({
      success: true,
      message: `Room ${result.rows[0].room_number} status updated to ${normalizedStatus}.`,
      room: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};
