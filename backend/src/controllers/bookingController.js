import db from '../config/db.js';
import { createBookingWithHold, calculateCancellationRefund } from '../services/bookingService.js';
import { logAudit } from '../utils/auditLogger.js';

export const createBooking = async (req, res, next) => {
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
      special_requests,
      estimated_arrival_time,
      promo_code,
      service_ids = []
    } = req.body;

    const userId = req.user ? req.user.id : null;
    const name = guest_name || req.user?.full_name;
    const email = guest_email || req.user?.email;
    const phone = guest_phone || req.user?.phone || 'N/A';

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Guest name and email are required.' });
    }
    if (!check_in || !check_out || !room_type_id) {
      return res.status(400).json({ success: false, message: 'check_in, check_out, and room_type_id are required.' });
    }

    const bookingResult = await createBookingWithHold({
      userId,
      guestName: name,
      guestEmail: email,
      guestPhone: phone,
      checkIn: check_in,
      checkOut: check_out,
      adults: parseInt(adults),
      children: parseInt(children),
      roomTypeId: parseInt(room_type_id),
      roomCount: parseInt(room_count),
      specialRequests: special_requests,
      estimatedArrivalTime: estimated_arrival_time,
      promoCode: promo_code,
      selectedServiceIds: service_ids,
      source: 'online',
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: `Hold created successfully! Please complete payment within ${bookingResult.holdMinutesRemaining} minutes.`,
      ...bookingResult
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

export const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await db.query(`
      SELECT b.*,
        rt.name as room_type_name,
        rt.code as room_type_code,
        (SELECT url FROM room_images ri WHERE ri.room_type_id = rt.id AND ri.is_primary = true LIMIT 1) as room_image,
        r.room_number,
        rev.id as review_id,
        rev.rating as review_rating
      FROM bookings b
      JOIN booking_rooms br ON b.id = br.booking_id
      JOIN room_types rt ON br.room_type_id = rt.id
      LEFT JOIN rooms r ON br.room_id = r.id
      LEFT JOIN reviews rev ON b.id = rev.booking_id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      count: result.rows.length,
      bookings: result.rows
    });
  } catch (err) {
    next(err);
  }
};

export const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let queryStr = `
      SELECT b.*,
        rt.id as room_type_id,
        rt.name as room_type_name,
        rt.code as room_type_code,
        rt.description as room_type_description,
        rt.location as room_type_location,
        r.room_number,
        r.floor as room_floor,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', be.id,
              'name', be.name,
              'quantity', be.quantity,
              'unit_price', be.unit_price,
              'total_price', be.total_price
            )
          ) FILTER (WHERE be.id IS NOT NULL), '[]'
        ) as extras,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', p.id,
              'amount', p.amount,
              'method', p.method,
              'status', p.status,
              'gateway', p.gateway,
              'gateway_ref', p.gateway_ref,
              'paid_at', p.paid_at
            )
          ) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) as payments,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', gd.id,
              'guest_name', gd.guest_name,
              'id_type', gd.id_type,
              'id_number', gd.id_number,
              'issuing_country', gd.issuing_country
            )
          ) FILTER (WHERE gd.id IS NOT NULL), '[]'
        ) as guest_documents,
        (SELECT url FROM room_images ri WHERE ri.room_type_id = rt.id AND ri.is_primary = true LIMIT 1) as room_image,
        rev.id as review_id,
        rev.rating as review_rating,
        rev.comment as review_comment
      FROM bookings b
      JOIN booking_rooms br ON b.id = br.booking_id
      JOIN room_types rt ON br.room_type_id = rt.id
      LEFT JOIN rooms r ON br.room_id = r.id
      LEFT JOIN booking_extras be ON b.id = be.booking_id
      LEFT JOIN payments p ON b.id = p.booking_id
      LEFT JOIN guest_documents gd ON b.id = gd.booking_id
      LEFT JOIN reviews rev ON b.id = rev.booking_id
      WHERE (b.id = $1::int OR b.code = $2)
    `;

    const params = [isNaN(parseInt(id)) ? 0 : parseInt(id), id];

    // Restrict access for guests (BR-35)
    if (req.user && req.user.role === 'guest') {
      queryStr += ` AND b.user_id = $3`;
      params.push(req.user.id);
    }

    queryStr += ` GROUP BY b.id, rt.id, r.id, rev.id`;

    const result = await db.query(queryStr, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Reservation not found or unauthorized.' });
    }

    res.json({
      success: true,
      booking: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

export const lookupBookingWithoutAccount = async (req, res, next) => {
  try {
    const { code, email } = req.body;
    if (!code || !email) {
      return res.status(400).json({ success: false, message: 'Booking code and email address are required.' });
    }

    const result = await db.query(`
      SELECT b.*,
        rt.name as room_type_name,
        r.room_number,
        (SELECT url FROM room_images ri WHERE ri.room_type_id = rt.id AND ri.is_primary = true LIMIT 1) as room_image
      FROM bookings b
      JOIN booking_rooms br ON b.id = br.booking_id
      JOIN room_types rt ON br.room_type_id = rt.id
      LEFT JOIN rooms r ON br.room_id = r.id
      WHERE UPPER(b.code) = UPPER($1) AND LOWER(b.guest_email) = LOWER($2)
    `, [code.trim(), email.trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No matching reservation found for the given code and email.' });
    }

    res.json({
      success: true,
      booking: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

export const cancelBooking = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { reason = 'Cancelled by guest' } = req.body;

    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
    if (bRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    const booking = bRes.rows[0];

    // Check permissions (BR-35)
    if (req.user && req.user.role === 'guest' && booking.user_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'You are only authorized to cancel your own reservation.' });
    }

    // Check status allowed to cancel (BR-26: Pending or Confirmed only)
    if (!['Pending', 'Confirmed'].includes(booking.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cannot cancel reservation in '${booking.status}' status. Checked-in and completed stays cannot be cancelled.`
      });
    }

    // Calculate refund according to BR-24 policy
    const refundDetails = await calculateCancellationRefund(booking.id);

    // Update booking status to Cancelled (BR-37 soft delete)
    await client.query(`
      UPDATE bookings 
      SET status = 'Cancelled',
          cancellation_reason = $1,
          cancelled_at = NOW(),
          hold_expires_at = NULL,
          updated_at = NOW()
      WHERE id = $2
    `, [reason, booking.id]);

    // Release any assigned physical room back to Available if was locked
    await client.query(`
      UPDATE rooms 
      SET status = 'Available', updated_at = NOW()
      WHERE id IN (SELECT room_id FROM booking_rooms WHERE booking_id = $1 AND room_id IS NOT NULL)
    `, [booking.id]);

    // Record refund record if refund amount > 0
    let refundRecord = null;
    if (refundDetails.refundAmount > 0) {
      // Find completed payment
      const pRes = await client.query(
        "SELECT id FROM payments WHERE booking_id = $1 AND status = 'completed' ORDER BY paid_at DESC LIMIT 1",
        [booking.id]
      );
      if (pRes.rows.length > 0) {
        const paymentId = pRes.rows[0].id;
        const refStatus = refundDetails.requiresManagerApproval ? 'pending_approval' : 'approved';

        const rRes = await client.query(`
          INSERT INTO refunds (payment_id, booking_id, amount, reason, status, approved_by)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          paymentId,
          booking.id,
          refundDetails.refundAmount,
          reason,
          refStatus,
          refundDetails.requiresManagerApproval ? null : (req.user ? req.user.id : null)
        ]);
        refundRecord = rRes.rows[0];
      }
    }

    await logAudit({
      userId: req.user ? req.user.id : booking.user_id,
      action: 'CANCEL_BOOKING',
      entity: 'bookings',
      entityId: booking.id,
      newValue: { reason, refundDetails, refundRecord },
      ip: req.ip
    });

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Reservation has been successfully cancelled.',
      refundDetails,
      refundRecord
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const addExtraService = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { service_id, name, unit_price, quantity = 1, notes } = req.body;

    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1 OR code = $2 FOR UPDATE', [
      isNaN(parseInt(id)) ? 0 : parseInt(id),
      id
    ]);

    if (bRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Reservation not found.' });
    }

    const booking = bRes.rows[0];

    // Check authorization: if user is logged in, ensure ownership or staff
    if (req.user && req.user.role === 'guest' && booking.user_id && req.user.id !== booking.user_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this reservation.' });
    }

    // Must be in an active status (Pending, Confirmed, Checked-in)
    const validStatuses = ['Pending', 'Confirmed', 'Checked-in'];
    if (!validStatuses.includes(booking.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Services can only be added to active reservations. Current status: ${booking.status}`
      });
    }

    let serviceName = name;
    let pricePerUnit = parseFloat(unit_price);

    if (service_id) {
      const sRes = await client.query('SELECT * FROM services WHERE id = $1 AND is_active = true', [service_id]);
      if (sRes.rows.length > 0) {
        const s = sRes.rows[0];
        serviceName = serviceName || s.name;
        if (isNaN(pricePerUnit) || pricePerUnit <= 0) {
          pricePerUnit = parseFloat(s.price);
        }
      }
    }

    if (!serviceName || isNaN(pricePerUnit) || pricePerUnit < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Valid service name and price are required.' });
    }

    const qty = Math.max(1, parseInt(quantity) || 1);
    const totalPrice = Math.round(pricePerUnit * qty * 100) / 100;

    // Insert extra
    const insertRes = await client.query(`
      INSERT INTO booking_extras (booking_id, service_id, name, quantity, unit_price, total_price, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [booking.id, service_id || null, serviceName, qty, pricePerUnit, totalPrice, notes || null]);

    const newExtrasAmount = Math.round((parseFloat(booking.extras_amount) + totalPrice) * 100) / 100;
    const newTotalAmount = Math.round((parseFloat(booking.total_amount) + totalPrice) * 100) / 100;

    await client.query(`
      UPDATE bookings 
      SET extras_amount = $1,
          total_amount = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [newExtrasAmount, newTotalAmount, booking.id]);

    await logAudit({
      userId: req.user ? req.user.id : booking.user_id,
      action: 'ADD_GUEST_EXTRA_SERVICE',
      entity: 'booking_extras',
      entityId: insertRes.rows[0].id,
      newValue: { serviceName, quantity: qty, totalPrice, notes, bookingId: booking.id },
      ip: req.ip
    });

    await client.query('COMMIT');

    // Fetch refreshed booking
    const refreshed = await client.query('SELECT * FROM bookings WHERE id = $1', [booking.id]);
    const extrasRes = await client.query('SELECT * FROM booking_extras WHERE booking_id = $1 ORDER BY id ASC', [booking.id]);

    res.status(201).json({
      success: true,
      message: `${serviceName} added to reservation successfully!`,
      extra: insertRes.rows[0],
      booking: refreshed.rows[0],
      extras: extrasRes.rows
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};
