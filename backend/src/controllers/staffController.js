import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { generateBookingCode } from '../services/bookingService.js';
import { calculateStayPricing } from '../services/pricingService.js';

// Front Desk Dashboard KPIs & Active Lists (FR-FD-01)
export const getFrontDeskDashboard = async (req, res, next) => {
  try {
    // 1. Today's Arrivals
    const arrivalsRes = await db.query(`
      SELECT b.*, br.room_type_id, rt.name as room_type_name, br.room_id, r.room_number
      FROM bookings b
      JOIN booking_rooms br ON b.id = br.booking_id
      JOIN room_types rt ON br.room_type_id = rt.id
      LEFT JOIN rooms r ON br.room_id = r.id
      WHERE b.check_in = CURRENT_DATE AND b.status = 'Confirmed'
      ORDER BY b.estimated_arrival_time ASC NULLS LAST, b.guest_name ASC
    `);

    // 2. Today's Departures
    const departuresRes = await db.query(`
      SELECT b.*, br.room_type_id, rt.name as room_type_name, br.room_id, r.room_number
      FROM bookings b
      JOIN booking_rooms br ON b.id = br.booking_id
      JOIN room_types rt ON br.room_type_id = rt.id
      LEFT JOIN rooms r ON br.room_id = r.id
      WHERE b.check_out = CURRENT_DATE AND b.status = 'Checked-in'
      ORDER BY r.room_number ASC
    `);

    // 3. In-House Guests
    const inHouseRes = await db.query(`
      SELECT b.*, br.room_type_id, rt.name as room_type_name, br.room_id, r.room_number, r.floor
      FROM bookings b
      JOIN booking_rooms br ON b.id = br.booking_id
      JOIN room_types rt ON br.room_type_id = rt.id
      LEFT JOIN rooms r ON br.room_id = r.id
      WHERE b.status = 'Checked-in'
      ORDER BY r.room_number ASC
    `);

    // 4. Room Status Summary
    const roomSummaryRes = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM rooms 
      WHERE is_active = true 
      GROUP BY status
    `);

    // 5. Today's Financials
    const financialsRes = await db.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as today_revenue,
        COUNT(*) as transactions_count
      FROM payments 
      WHERE status = 'completed' AND paid_at::date = CURRENT_DATE
    `);

    res.json({
      success: true,
      kpis: {
        arrivalsCount: arrivalsRes.rowCount,
        departuresCount: departuresRes.rowCount,
        inHouseCount: inHouseRes.rowCount,
        todayRevenue: parseFloat(financialsRes.rows[0].today_revenue)
      },
      roomStatuses: roomSummaryRes.rows,
      arrivals: arrivalsRes.rows,
      departures: departuresRes.rows,
      inHouse: inHouseRes.rows
    });
  } catch (err) {
    next(err);
  }
};

// Search all bookings for staff (FR-BOOK-09)
export const getAllStaffBookings = async (req, res, next) => {
  try {
    const { search, status, date } = req.query;

    let queryStr = `
      SELECT b.*,
        br.room_type_id,
        rt.name as room_type_name,
        r.room_number,
        (b.total_amount - b.paid_amount) as outstanding_balance
      FROM bookings b
      JOIN booking_rooms br ON b.id = br.booking_id
      JOIN room_types rt ON br.room_type_id = rt.id
      LEFT JOIN rooms r ON br.room_id = r.id
      WHERE 1=1
    `;

    const params = [];
    let pIdx = 1;

    if (search) {
      queryStr += ` AND (b.code ILIKE $${pIdx} OR b.guest_name ILIKE $${pIdx} OR b.guest_phone ILIKE $${pIdx} OR b.guest_email ILIKE $${pIdx} OR r.room_number ILIKE $${pIdx})`;
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    if (status) {
      queryStr += ` AND b.status = $${pIdx++}`;
      params.push(status);
    }

    if (date) {
      queryStr += ` AND ($${pIdx++} BETWEEN b.check_in AND b.check_out)`;
      params.push(date);
    }

    queryStr += ` ORDER BY b.check_in DESC, b.created_at DESC LIMIT 100`;

    const result = await db.query(queryStr, params);
    res.json({
      success: true,
      count: result.rowCount,
      bookings: result.rows
    });
  } catch (err) {
    next(err);
  }
};

// Staff Check-in Guest (FR-FD-02, BR-30, BR-31, BR-13)
export const checkInGuest = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { room_id, id_type, id_number, issuing_country, is_upgrade = false } = req.body;

    if (!room_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Please select a specific physical room to assign.' });
    }

    // 1. Get booking
    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
    if (bRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    const booking = bRes.rows[0];

    // Check status: must be Confirmed (BR-30)
    if (booking.status !== 'Confirmed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Check-in allowed only for 'Confirmed' bookings. Current status is ${booking.status}.` });
    }

    // 2. Check room availability and status (BR-31)
    const roomRes = await client.query('SELECT * FROM rooms WHERE id = $1 FOR UPDATE', [room_id]);
    if (roomRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Physical room not found.' });
    }
    const room = roomRes.rows[0];

    if (!['Available', 'Clean', 'Inspected'].includes(room.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Room ${room.room_number} cannot be assigned because its status is ${room.status}. Must be Available or Clean.` });
    }

    // 3. Assign room in booking_rooms
    await client.query(`
      UPDATE booking_rooms 
      SET room_id = $1 
      WHERE booking_id = $2
    `, [room_id, booking.id]);

    // 4. Update room status to Occupied
    await client.query(`
      UPDATE rooms 
      SET status = 'Occupied', updated_at = NOW() 
      WHERE id = $1
    `, [room_id]);

    // 5. Update booking status to Checked-in
    await client.query(`
      UPDATE bookings 
      SET status = 'Checked-in', updated_at = NOW() 
      WHERE id = $1
    `, [booking.id]);

    // 6. Record ID document (BR-13)
    if (id_type && id_number) {
      await client.query(`
        INSERT INTO guest_documents (booking_id, guest_name, id_type, id_number, issuing_country)
        VALUES ($1, $2, $3, $4, $5)
      `, [booking.id, booking.guest_name, id_type, id_number, issuing_country || 'Default']);
    }

    await logAudit({
      userId: req.user.id,
      action: 'CHECK_IN_GUEST',
      entity: 'bookings',
      entityId: booking.id,
      newValue: { roomNumber: room.room_number, idType: id_type, idNumber: id_number, isUpgrade: is_upgrade },
      ip: req.ip
    });

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Guest ${booking.guest_name} successfully checked into Room ${room.room_number}!`,
      roomNumber: room.room_number,
      status: 'Checked-in'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// Staff Check-out Guest (FR-FD-05, BR-22, BR-32)
export const checkOutGuest = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { manager_override = false, payment_method, notes } = req.body;

    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
    if (bRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    const booking = bRes.rows[0];

    if (booking.status !== 'Checked-in') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Only Checked-in guests can be checked out. Current status: ${booking.status}` });
    }

    // Check outstanding balance (BR-22)
    const total = parseFloat(booking.total_amount);
    const paid = parseFloat(booking.paid_amount);
    const balance = Math.round((total - paid) * 100) / 100;

    if (balance > 0) {
      if (payment_method) {
        // Collect balance payment right at check-out
        const ref = `CHECKOUT_${Date.now()}`;
        await client.query(`
          INSERT INTO payments (booking_id, amount, method, status, gateway, gateway_ref, paid_at, notes)
          VALUES ($1, $2, $3, 'completed', 'front_desk', $4, NOW(), $5)
        `, [booking.id, balance, payment_method, ref, notes || 'Settled at check-out']);

        await client.query('UPDATE bookings SET paid_amount = $1 WHERE id = $2', [total, booking.id]);
      } else if (!manager_override) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Cannot check out: Outstanding balance of $${balance.toFixed(2)} must be settled, or requires manager override approval (BR-22).`,
          outstandingBalance: balance
        });
      }
    }

    // Update booking status to Checked-out
    await client.query(`
      UPDATE bookings 
      SET status = 'Checked-out', updated_at = NOW() 
      WHERE id = $1
    `, [booking.id]);

    // Set assigned room status to Dirty (BR-32)
    const brRes = await client.query('SELECT room_id FROM booking_rooms WHERE booking_id = $1 AND room_id IS NOT NULL', [booking.id]);
    if (brRes.rows.length > 0) {
      const assignedRoomId = brRes.rows[0].room_id;
      await client.query(`
        UPDATE rooms 
        SET status = 'Dirty', updated_at = NOW() 
        WHERE id = $1
      `, [assignedRoomId]);
    }

    await logAudit({
      userId: req.user.id,
      action: 'CHECK_OUT_GUEST',
      entity: 'bookings',
      entityId: booking.id,
      newValue: { finalPaid: total, managerOverride: manager_override },
      ip: req.ip
    });

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Guest successfully checked out! Room marked as Dirty for Housekeeping inspection.`,
      status: 'Checked-out'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// Post additional charges to Guest Folio (FR-FD-04, BR-33)
export const postFolioCharge = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { service_id, name, unit_price, quantity = 1, notes } = req.body;

    if (!name || !unit_price) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Item name and unit price are required.' });
    }

    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
    if (bRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    const booking = bRes.rows[0];

    // BR-33: Extra charges can be added only to bookings in Checked-in status
    if (booking.status !== 'Checked-in') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Folio charges can only be posted to active Checked-in guests (BR-33). Current status: ${booking.status}`
      });
    }

    const totalPrice = parseFloat(unit_price) * parseInt(quantity);

    // Insert into booking_extras
    const extraRes = await client.query(`
      INSERT INTO booking_extras (booking_id, service_id, name, quantity, unit_price, total_price, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [booking.id, service_id || null, name, quantity, unit_price, totalPrice, notes || null]);

    // Recalculate booking totals
    const newExtrasAmount = parseFloat(booking.extras_amount) + totalPrice;
    const newTotalAmount = parseFloat(booking.total_amount) + totalPrice;

    await client.query(`
      UPDATE bookings 
      SET extras_amount = $1,
          total_amount = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [newExtrasAmount, newTotalAmount, booking.id]);

    await logAudit({
      userId: req.user.id,
      action: 'POST_FOLIO_CHARGE',
      entity: 'booking_extras',
      entityId: extraRes.rows[0].id,
      newValue: { chargeName: name, totalPrice, bookingId: booking.id },
      ip: req.ip
    });

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Charge of $${totalPrice.toFixed(2)} posted to folio for ${booking.guest_name}.`,
      folioItem: extraRes.rows[0],
      newTotalAmount
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// Room Move during stay (FR-FD-06)
export const moveRoom = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { new_room_id, reason } = req.body;

    if (!new_room_id || !reason) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'new_room_id and reason are required for a room move.' });
    }

    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
    if (bRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    const booking = bRes.rows[0];

    if (booking.status !== 'Checked-in') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Room move is only possible for Checked-in guests.' });
    }

    // Check new room availability
    const newRoomRes = await client.query('SELECT * FROM rooms WHERE id = $1 FOR UPDATE', [new_room_id]);
    if (newRoomRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'New room not found.' });
    }
    const newRoom = newRoomRes.rows[0];

    if (newRoom.status !== 'Available') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `New Room ${newRoom.room_number} is not Available (current status: ${newRoom.status}).` });
    }

    // Get previous room
    const brRes = await client.query('SELECT room_id FROM booking_rooms WHERE booking_id = $1', [booking.id]);
    const oldRoomId = brRes.rows[0]?.room_id;

    // Release old room to Dirty
    if (oldRoomId) {
      await client.query("UPDATE rooms SET status = 'Dirty', updated_at = NOW() WHERE id = $1", [oldRoomId]);
    }

    // Assign new room
    await client.query('UPDATE booking_rooms SET room_id = $1 WHERE booking_id = $2', [new_room_id, booking.id]);
    await client.query("UPDATE rooms SET status = 'Occupied', updated_at = NOW() WHERE id = $1", [new_room_id]);

    await logAudit({
      userId: req.user.id,
      action: 'ROOM_MOVE',
      entity: 'bookings',
      entityId: booking.id,
      newValue: { oldRoomId, newRoomId: new_room_id, newRoomNumber: newRoom.room_number, reason },
      ip: req.ip
    });

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Guest moved to Room ${newRoom.room_number}. Previous room marked as Dirty.`,
      newRoomNumber: newRoom.room_number
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// Staff creates walk-in or phone reservation (FR-BOOK-09)
export const createWalkInBooking = async (req, res, next) => {
  try {
    const {
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      adults = 1,
      children = 0,
      room_type_id,
      room_count = 1,
      source = 'walk-in',
      special_requests,
      immediate_check_in = false,
      room_id = null
    } = req.body;

    const bookingCode = await generateBookingCode();
    const pricing = await calculateStayPricing({
      roomTypeId: room_type_id,
      checkIn: check_in,
      checkOut: check_out,
      roomCount: room_count
    });

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const bRes = await client.query(`
        INSERT INTO bookings (
          code, guest_name, guest_email, guest_phone,
          check_in, check_out, adults, children,
          status, subtotal, tax_amount, service_charge, extras_amount, discount_amount, total_amount, paid_amount,
          special_requests, source
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12, 0.00, 0.00, $13, 0.00,
          $14, $15
        ) RETURNING *
      `, [
        bookingCode, guest_name, guest_email, guest_phone,
        check_in, check_out, adults, children,
        immediate_check_in ? 'Checked-in' : 'Confirmed',
        pricing.roomSubtotal, pricing.taxAmount, pricing.serviceCharge, pricing.totalAmount,
        special_requests || null, source
      ]);

      const booking = bRes.rows[0];

      await client.query(`
        INSERT INTO booking_rooms (booking_id, room_type_id, room_id, nightly_price_snapshot, stay_range)
        VALUES ($1, $2, $3, $4, daterange($5::date, $6::date))
      `, [booking.id, room_type_id, room_id || null, pricing.roomSubtotal / pricing.nights, check_in, check_out]);

      if (immediate_check_in && room_id) {
        await client.query("UPDATE rooms SET status = 'Occupied', updated_at = NOW() WHERE id = $1", [room_id]);
      }

      await logAudit({
        userId: req.user.id,
        action: 'CREATE_WALKIN_BOOKING',
        entity: 'bookings',
        entityId: booking.id,
        newValue: { code: booking.code, guest: guest_name, source, immediateCheckIn: immediate_check_in },
        ip: req.ip
      });

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Walk-in reservation created successfully.',
        booking
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};
