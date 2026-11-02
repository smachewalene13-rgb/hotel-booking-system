import db from '../config/db.js';
import { checkAvailability, getRoomTypeCalendar } from '../services/availabilityService.js';
import { logAudit } from '../utils/auditLogger.js';

// --- Public Endpoints ---

export const getHotelSettings = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM hotel_settings LIMIT 1');
    res.json({
      success: true,
      settings: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

export const getRoomTypes = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT rt.*,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', a.id,
              'name', a.name,
              'icon', a.icon,
              'category', a.category
            )
          ) FILTER (WHERE a.id IS NOT NULL), '[]'
        ) as amenities,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', ri.id,
              'url', ri.url,
              'caption', ri.caption,
              'is_primary', ri.is_primary,
              'sort_order', ri.sort_order
            )
          ) FILTER (WHERE ri.id IS NOT NULL), '[]'
        ) as images,
        (SELECT COUNT(*) FROM rooms r WHERE r.room_type_id = rt.id AND r.is_active = true) as total_rooms,
        (SELECT COALESCE(AVG(rev.rating), 5.0) FROM reviews rev WHERE rev.room_type_id = rt.id AND rev.status = 'approved') as avg_rating,
        (SELECT COUNT(*) FROM reviews rev WHERE rev.room_type_id = rt.id AND rev.status = 'approved') as review_count
      FROM room_types rt
      LEFT JOIN room_type_amenities rta ON rt.id = rta.room_type_id
      LEFT JOIN amenities a ON rta.amenity_id = a.id
      LEFT JOIN room_images ri ON rt.id = ri.room_type_id
      WHERE rt.is_active = true
      GROUP BY rt.id
      ORDER BY rt.base_price ASC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      roomTypes: result.rows
    });
  } catch (err) {
    next(err);
  }
};

export const getRoomTypeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT rt.*,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', a.id,
              'name', a.name,
              'icon', a.icon,
              'category', a.category
            )
          ) FILTER (WHERE a.id IS NOT NULL), '[]'
        ) as amenities,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', ri.id,
              'url', ri.url,
              'caption', ri.caption,
              'is_primary', ri.is_primary,
              'sort_order', ri.sort_order
            )
          ) FILTER (WHERE ri.id IS NOT NULL), '[]'
        ) as images,
        (SELECT COUNT(*) FROM rooms r WHERE r.room_type_id = rt.id AND r.is_active = true) as total_rooms,
        (SELECT COALESCE(AVG(rev.rating), 5.0) FROM reviews rev WHERE rev.room_type_id = rt.id AND rev.status = 'approved') as avg_rating,
        (SELECT COUNT(*) FROM reviews rev WHERE rev.room_type_id = rt.id AND rev.status = 'approved') as review_count
      FROM room_types rt
      LEFT JOIN room_type_amenities rta ON rt.id = rta.room_type_id
      LEFT JOIN amenities a ON rta.amenity_id = a.id
      LEFT JOIN room_images ri ON rt.id = ri.room_type_id
      WHERE rt.id = $1
      GROUP BY rt.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Room type not found.' });
    }

    res.json({
      success: true,
      roomType: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

export const getAvailability = async (req, res, next) => {
  try {
    const { checkIn, checkOut, adults = 1, children = 0, rooms = 1, roomTypeId, destination } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'checkIn and checkOut query parameters are required (format: YYYY-MM-DD).'
      });
    }

    const availability = await checkAvailability({
      checkIn,
      checkOut,
      adults: parseInt(adults),
      children: parseInt(children),
      rooms: parseInt(rooms),
      roomTypeId: roomTypeId ? parseInt(roomTypeId) : null,
      destination: destination ? destination.trim() : null
    });

    res.json({
      success: true,
      ...availability
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

export const getRoomCalendar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

    const calendar = await getRoomTypeCalendar(parseInt(id), parseInt(year), parseInt(month));
    res.json({
      success: true,
      ...calendar
    });
  } catch (err) {
    next(err);
  }
};

export const getServices = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM services WHERE is_active = true ORDER BY price ASC');
    res.json({
      success: true,
      services: result.rows
    });
  } catch (err) {
    next(err);
  }
};

export const getAmenities = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM amenities ORDER BY category, name ASC');
    res.json({
      success: true,
      amenities: result.rows
    });
  } catch (err) {
    next(err);
  }
};

// --- Manager & Admin Management Endpoints ---

export const createRoomType = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { name, code, description, base_price, max_adults, max_children, bed_type, size_sqm, location, amenity_ids = [], images = [] } = req.body;

    const rtRes = await client.query(`
      INSERT INTO room_types (name, code, description, base_price, max_adults, max_children, bed_type, size_sqm, location)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [name, code, description, base_price, max_adults, max_children, bed_type, size_sqm, location || 'Addis Ababa, Ethiopia']);

    const createdType = rtRes.rows[0];

    // Link amenities
    for (const amId of amenity_ids) {
      await client.query(
        'INSERT INTO room_type_amenities (room_type_id, amenity_id) VALUES ($1, $2)',
        [createdType.id, amId]
      );
    }

    // Add images
    let sort = 0;
    for (const img of images) {
      await client.query(`
        INSERT INTO room_images (room_type_id, url, caption, is_primary, sort_order)
        VALUES ($1, $2, $3, $4, $5)
      `, [createdType.id, img.url, img.caption || null, img.is_primary || false, sort++]);
    }

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_ROOM_TYPE',
      entity: 'room_types',
      entityId: createdType.id,
      newValue: req.body,
      ip: req.ip
    });

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Room type created successfully.', roomType: createdType });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const updateRoomType = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { name, code, description, base_price, max_adults, max_children, bed_type, size_sqm, location, is_active, amenity_ids, images } = req.body;

    const oldRes = await client.query('SELECT * FROM room_types WHERE id = $1', [id]);
    if (oldRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Room type not found.' });
    }

    const updatedRes = await client.query(`
      UPDATE room_types
      SET name = COALESCE($1, name),
          code = COALESCE($2, code),
          description = COALESCE($3, description),
          base_price = COALESCE($4, base_price),
          max_adults = COALESCE($5, max_adults),
          max_children = COALESCE($6, max_children),
          bed_type = COALESCE($7, bed_type),
          size_sqm = COALESCE($8, size_sqm),
          location = COALESCE($9, location),
          is_active = COALESCE($10, is_active),
          updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [name, code, description, base_price, max_adults, max_children, bed_type, size_sqm, location, is_active, id]);

    if (amenity_ids) {
      await client.query('DELETE FROM room_type_amenities WHERE room_type_id = $1', [id]);
      for (const amId of amenity_ids) {
        await client.query('INSERT INTO room_type_amenities (room_type_id, amenity_id) VALUES ($1, $2)', [id, amId]);
      }
    }

    if (images && images.length > 0) {
      await client.query('DELETE FROM room_images WHERE room_type_id = $1', [id]);
      let sort = 0;
      for (const img of images) {
        await client.query(`
          INSERT INTO room_images (room_type_id, url, caption, is_primary, sort_order)
          VALUES ($1, $2, $3, $4, $5)
        `, [id, img.url, img.caption, img.is_primary || false, sort++]);
      }
    }

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_ROOM_TYPE',
      entity: 'room_types',
      entityId: id,
      oldValue: oldRes.rows[0],
      newValue: updatedRes.rows[0],
      ip: req.ip
    });

    await client.query('COMMIT');
    res.json({ success: true, message: 'Room type updated.', roomType: updatedRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const deactivateOrDeleteRoomType = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if room type has any booking history (FR-ROOM-07, BR-37)
    const historyRes = await db.query('SELECT id FROM booking_rooms WHERE room_type_id = $1 LIMIT 1', [id]);
    if (historyRes.rows.length > 0) {
      // Must deactivate instead of delete
      await db.query('UPDATE room_types SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);
      await logAudit({
        userId: req.user.id,
        action: 'DEACTIVATE_ROOM_TYPE_DUE_TO_HISTORY',
        entity: 'room_types',
        entityId: id,
        ip: req.ip
      });
      return res.json({
        success: true,
        message: 'Room type has associated booking history; it has been deactivated rather than deleted per policy.'
      });
    }

    // Otherwise can hard delete if no rooms exist
    const roomsRes = await db.query('SELECT id FROM rooms WHERE room_type_id = $1 LIMIT 1', [id]);
    if (roomsRes.rows.length > 0) {
      await db.query('UPDATE room_types SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);
      return res.json({ success: true, message: 'Room type deactivated because active rooms exist.' });
    }

    await db.query('DELETE FROM room_types WHERE id = $1', [id]);
    res.json({ success: true, message: 'Room type deleted permanently.' });
  } catch (err) {
    next(err);
  }
};

// Physical Rooms CRUD
export const getAllRooms = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT r.*, rt.name as room_type_name, rt.code as room_type_code, rt.base_price
      FROM rooms r
      JOIN room_types rt ON r.room_type_id = rt.id
      ORDER BY r.floor ASC, r.room_number ASC
    `);

    res.json({
      success: true,
      rooms: result.rows
    });
  } catch (err) {
    next(err);
  }
};

export const createRoom = async (req, res, next) => {
  try {
    const { room_number, floor, room_type_id, status = 'Available' } = req.body;
    if (!room_number || !floor || !room_type_id) {
      return res.status(400).json({ success: false, message: 'room_number, floor, and room_type_id are required.' });
    }

    const result = await db.query(`
      INSERT INTO rooms (room_number, floor, room_type_id, status, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING *
    `, [room_number, floor, room_type_id, status]);

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_ROOM',
      entity: 'rooms',
      entityId: result.rows[0].id,
      newValue: result.rows[0],
      ip: req.ip
    });

    res.status(201).json({ success: true, message: 'Room added.', room: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { room_number, floor, room_type_id, status, is_active } = req.body;

    const oldRes = await db.query('SELECT * FROM rooms WHERE id = $1', [id]);
    if (oldRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    const result = await db.query(`
      UPDATE rooms
      SET room_number = COALESCE($1, room_number),
          floor = COALESCE($2, floor),
          room_type_id = COALESCE($3, room_type_id),
          status = COALESCE($4, status),
          is_active = COALESCE($5, is_active),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [room_number, floor, room_type_id, status, is_active, id]);

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_ROOM',
      entity: 'rooms',
      entityId: id,
      oldValue: oldRes.rows[0],
      newValue: result.rows[0],
      ip: req.ip
    });

    res.json({ success: true, message: 'Room updated.', room: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Rate Rules CRUD
export const getRateRules = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT rr.*, rt.name as room_type_name
      FROM rate_rules rr
      JOIN room_types rt ON rr.room_type_id = rt.id
      ORDER BY rr.start_date DESC
    `);
    res.json({ success: true, rateRules: result.rows });
  } catch (err) {
    next(err);
  }
};

export const createRateRule = async (req, res, next) => {
  try {
    const { room_type_id, name, start_date, end_date, price, day_of_week } = req.body;
    const result = await db.query(`
      INSERT INTO rate_rules (room_type_id, name, start_date, end_date, price, day_of_week)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [room_type_id, name, start_date, end_date, price, day_of_week ?? null]);

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_RATE_RULE',
      entity: 'rate_rules',
      entityId: result.rows[0].id,
      newValue: result.rows[0],
      ip: req.ip
    });

    res.status(201).json({ success: true, message: 'Rate rule created.', rateRule: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const deleteRateRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM rate_rules WHERE id = $1', [id]);
    res.json({ success: true, message: 'Rate rule deleted.' });
  } catch (err) {
    next(err);
  }
};

// Room Blocks CRUD
export const getRoomBlocks = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT rb.*, r.room_number, rt.name as room_type_name
      FROM room_blocks rb
      JOIN rooms r ON rb.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      ORDER BY rb.start_date DESC
    `);
    res.json({ success: true, roomBlocks: result.rows });
  } catch (err) {
    next(err);
  }
};

export const createRoomBlock = async (req, res, next) => {
  try {
    const { room_id, start_date, end_date, reason } = req.body;
    const result = await db.query(`
      INSERT INTO room_blocks (room_id, start_date, end_date, reason, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [room_id, start_date, end_date, reason, req.user.id]);

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_ROOM_BLOCK',
      entity: 'room_blocks',
      entityId: result.rows[0].id,
      newValue: result.rows[0],
      ip: req.ip
    });

    res.status(201).json({ success: true, message: 'Room blocked for specified dates.', roomBlock: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const deleteRoomBlock = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM room_blocks WHERE id = $1', [id]);
    res.json({ success: true, message: 'Room block removed.' });
  } catch (err) {
    next(err);
  }
};
