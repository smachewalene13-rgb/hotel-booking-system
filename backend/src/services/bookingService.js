import db from '../config/db.js';
import { calculateStayPricing } from './pricingService.js';
import { logAudit } from '../utils/auditLogger.js';

// Generates human-readable booking code: HB-2026-XXXXXX
export const generateBookingCode = async () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `HB-${year}-${rand}`;
};

export const createBookingWithHold = async ({
  userId = null,
  guestName,
  guestEmail,
  guestPhone,
  checkIn,
  checkOut,
  adults = 1,
  children = 0,
  roomTypeId,
  roomCount = 1,
  specialRequests = '',
  estimatedArrivalTime = '',
  promoCode = null,
  selectedServiceIds = [],
  source = 'online',
  ip = '127.0.0.1'
}) => {
  const client = await db.getClient();

  try {
    // Start atomic transaction with row locking (BR-05, FR-BOOK-11)
    await client.query('BEGIN');

    // 1. Lock the room_type row FOR UPDATE
    const rtRes = await client.query(
      'SELECT id, name, max_adults, max_children, is_active FROM room_types WHERE id = $1 FOR UPDATE',
      [roomTypeId]
    );

    if (rtRes.rows.length === 0 || !rtRes.rows[0].is_active) {
      throw new Error('Room type is unavailable or not found.');
    }
    const roomType = rtRes.rows[0];

    // Capacity checks (BR-10)
    if (adults > roomType.max_adults * roomCount) {
      throw new Error(`Exceeds maximum adult capacity of ${roomType.max_adults * roomCount} for ${roomCount} room(s).`);
    }
    if ((parseInt(adults) + parseInt(children)) > (roomType.max_adults + roomType.max_children) * roomCount) {
      throw new Error('Exceeds total maximum occupancy capacity for the chosen rooms.');
    }

    // 2. Lock and count total active physical rooms of this type
    const physicalRoomsRes = await client.query(
      'SELECT id, room_number, status FROM rooms WHERE room_type_id = $1 AND is_active = true FOR UPDATE',
      [roomTypeId]
    );
    const physicalRooms = physicalRoomsRes.rows;
    const totalPhysical = physicalRooms.length;

    if (totalPhysical < roomCount) {
      throw new Error('Not enough total rooms exist for this room type.');
    }

    // 3. Check overlapping bookings with FOR UPDATE lock
    const overlappingRes = await client.query(`
      SELECT br.room_id, b.id as booking_id, b.check_in, b.check_out, b.status
      FROM booking_rooms br
      JOIN bookings b ON br.booking_id = b.id
      WHERE br.room_type_id = $1
        AND b.check_in < $2 
        AND b.check_out > $3
        AND (
          b.status IN ('Confirmed', 'Checked-in')
          OR (b.status = 'Pending' AND b.hold_expires_at > NOW())
        )
      FOR UPDATE OF b
    `, [roomTypeId, checkOut, checkIn]);
    const overlapping = overlappingRes.rows;

    // Check blocks
    const blocksRes = await client.query(`
      SELECT room_id, start_date, end_date
      FROM room_blocks
      WHERE room_id = ANY($1::int[])
        AND start_date < $2
        AND end_date > $3
    `, [physicalRooms.map(r => r.id), checkOut, checkIn]);
    const blocks = blocksRes.rows;

    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const nights = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));

    if (nights < 1) {
      throw new Error('Minimum stay is 1 night.');
    }

    // Verify inventory on every single night
    const outOfOrderRoomIds = physicalRooms
      .filter(r => ['Maintenance', 'Out of Service'].includes(r.status))
      .map(r => r.id);

    for (let d = 0; d < nights; d++) {
      const nightDate = new Date(startDate);
      nightDate.setDate(startDate.getDate() + d);
      const nightNext = new Date(nightDate);
      nightNext.setDate(nightDate.getDate() + 1);

      let unavailable = outOfOrderRoomIds.length;

      const blockedOnNight = blocks.filter(b => {
        const bStart = new Date(b.start_date);
        const bEnd = new Date(b.end_date);
        return bStart < nightNext && bEnd > nightDate;
      });
      const uniqueBlocked = new Set(blockedOnNight.map(b => b.room_id));
      for (const id of uniqueBlocked) {
        if (!outOfOrderRoomIds.includes(id)) unavailable++;
      }

      const bookedOnNight = overlapping.filter(b => {
        const bIn = new Date(b.check_in);
        const bOut = new Date(b.check_out);
        return bIn < nightNext && bOut > nightDate;
      });
      unavailable += bookedOnNight.length;

      const freeRooms = totalPhysical - unavailable;
      if (freeRooms < roomCount) {
        throw new Error(`Rooms of this type became unavailable on ${nightDate.toISOString().split('T')[0]}. Please select other dates.`);
      }
    }

    // 4. Calculate locked Pricing Breakdown
    const pricing = await calculateStayPricing({
      roomTypeId,
      checkIn,
      checkOut,
      roomCount,
      promoCode,
      selectedServiceIds
    });

    // 5. Get hold minutes from hotel settings (default 15)
    const settingsRes = await client.query('SELECT hold_minutes FROM hotel_settings LIMIT 1');
    const holdMinutes = settingsRes.rows[0]?.hold_minutes || 15;
    const holdExpiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

    // 6. Generate Booking Code
    let bookingCode;
    let codeExists = true;
    while (codeExists) {
      bookingCode = await generateBookingCode();
      const existing = await client.query('SELECT id FROM bookings WHERE code = $1', [bookingCode]);
      if (existing.rows.length === 0) codeExists = false;
    }

    // 7. Insert Booking record
    const insertBookingRes = await client.query(`
      INSERT INTO bookings (
        code, user_id, guest_name, guest_email, guest_phone,
        check_in, check_out, adults, children, status,
        subtotal, tax_amount, service_charge, extras_amount, discount_amount, total_amount, paid_amount,
        promo_id, hold_expires_at, special_requests, estimated_arrival_time, source
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, 'Pending',
        $10, $11, $12, $13, $14, $15, 0.00,
        $16, $17, $18, $19, $20
      ) RETURNING *
    `, [
      bookingCode,
      userId,
      guestName,
      guestEmail,
      guestPhone,
      checkIn,
      checkOut,
      adults,
      children,
      pricing.roomSubtotal,
      pricing.taxAmount,
      pricing.serviceCharge,
      pricing.extrasTotal,
      pricing.discountAmount,
      pricing.totalAmount,
      pricing.promoApplied?.id || null,
      holdExpiresAt,
      specialRequests || null,
      estimatedArrivalTime || null,
      source
    ]);

    const booking = insertBookingRes.rows[0];

    // 8. Insert Booking Rooms
    for (let r = 0; r < roomCount; r++) {
      await client.query(`
        INSERT INTO booking_rooms (booking_id, room_type_id, room_id, nightly_price_snapshot, stay_range)
        VALUES ($1, $2, NULL, $3, daterange($4::date, $5::date))
      `, [
        booking.id,
        roomTypeId,
        pricing.roomSubtotal / (nights * roomCount),
        checkIn,
        checkOut
      ]);
    }

    // 9. Insert Extra Services
    for (const service of pricing.extraServicesBreakdown) {
      await client.query(`
        INSERT INTO booking_extras (booking_id, service_id, name, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, 1, $4, $5)
      `, [booking.id, service.id, service.name, service.unitPrice, service.totalPrice]);
    }

    // 10. Update promotion used count if applied
    if (pricing.promoApplied) {
      await client.query(
        'UPDATE promotions SET used_count = used_count + 1 WHERE id = $1',
        [pricing.promoApplied.id]
      );
    }

    await logAudit({
      userId,
      action: 'CREATE_BOOKING_HOLD',
      entity: 'bookings',
      entityId: booking.id,
      newValue: { code: booking.code, total: booking.total_amount, holdExpiresAt },
      ip
    });

    await client.query('COMMIT');

    return {
      booking,
      pricing,
      holdExpiresAt,
      holdMinutesRemaining: holdMinutes
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const calculateCancellationRefund = async (bookingId) => {
  const bRes = await db.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
  if (bRes.rows.length === 0) throw new Error('Booking not found.');
  const booking = bRes.rows[0];

  const settingsRes = await db.query('SELECT * FROM hotel_settings LIMIT 1');
  const settings = settingsRes.rows[0] || {
    cancellation_free_hours: 48,
    cancellation_partial_hours: 24,
    cancellation_partial_rate: 50.00
  };

  const freeHours = settings.cancellation_free_hours;
  const partialHours = settings.cancellation_partial_hours;
  const partialRate = parseFloat(settings.cancellation_partial_rate);

  // Check-in datetime calculation
  const checkInDate = new Date(`${booking.check_in}T${settings.check_in_time || '14:00'}:00`);
  const now = new Date();
  const hoursUntilCheckIn = (checkInDate - now) / (1000 * 60 * 60);

  const paidAmount = parseFloat(booking.paid_amount);
  const totalAmount = parseFloat(booking.total_amount);

  let refundAmount = 0;
  let penaltyAmount = 0;
  let policyTier = '';

  if (hoursUntilCheckIn >= freeHours) {
    // 100% refund of paid amount
    refundAmount = paidAmount;
    penaltyAmount = 0;
    policyTier = `Full Free Cancellation (More than ${freeHours} hours before check-in)`;
  } else if (hoursUntilCheckIn >= partialHours) {
    // 50% refund
    refundAmount = Math.round((paidAmount * (partialRate / 100)) * 100) / 100;
    penaltyAmount = paidAmount - refundAmount;
    policyTier = `Partial Refund ${partialRate}% (${partialHours} to ${freeHours} hours before check-in)`;
  } else {
    // Within 24 hours: first night charged, remainder refunded (BR-24)
    const nights = Math.round((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24));
    const firstNightRate = nights > 0 ? (parseFloat(booking.subtotal) / nights) : totalAmount;
    penaltyAmount = Math.min(paidAmount, firstNightRate);
    refundAmount = Math.max(0, paidAmount - penaltyAmount);
    policyTier = `Late Cancellation within ${partialHours} hours: First night rate retained ($${penaltyAmount.toFixed(2)})`;
  }

  return {
    bookingId: booking.id,
    bookingCode: booking.code,
    paidAmount,
    refundAmount,
    penaltyAmount,
    policyTier,
    hoursUntilCheckIn: Math.round(hoursUntilCheckIn * 10) / 10,
    requiresManagerApproval: refundAmount > parseFloat(settings.refund_approval_threshold || 500)
  };
};
