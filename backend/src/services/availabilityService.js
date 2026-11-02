import db from '../config/db.js';
import { calculateStayPricing } from './pricingService.js';

export const checkAvailability = async ({
  checkIn,
  checkOut,
  adults = 1,
  children = 0,
  rooms: requestedRooms = 1,
  roomTypeId = null,
  destination = null
}) => {
  const startDate = new Date(checkIn);
  const endDate = new Date(checkOut);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Validations per BR-06, BR-07
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid check-in or check-out date format.');
  }

  const checkInOnlyDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  if (checkInOnlyDate < today) {
    throw new Error('Check-in date cannot be in the past.');
  }

  if (endDate <= startDate) {
    throw new Error('Check-out date must be strictly after check-in date.');
  }

  const nights = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
  if (nights < 1) {
    throw new Error('Minimum stay is 1 night.');
  }
  if (nights > 30) {
    throw new Error('Maximum stay allowed is 30 nights.');
  }

  const maxAdvance = 365;
  const daysInAdvance = Math.round((startDate - today) / (1000 * 60 * 60 * 24));
  if (daysInAdvance > maxAdvance) {
    throw new Error(`Bookings can only be made up to ${maxAdvance} days in advance.`);
  }

  // 1. Fetch Room Types (filtered by capacity and optional roomTypeId)
  let rtQuery = `
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
      ) as images
    FROM room_types rt
    LEFT JOIN room_type_amenities rta ON rt.id = rta.room_type_id
    LEFT JOIN amenities a ON rta.amenity_id = a.id
    LEFT JOIN room_images ri ON rt.id = ri.room_type_id
    WHERE rt.is_active = true
  `;

  const rtParams = [];
  let paramIdx = 1;

  if (roomTypeId) {
    rtQuery += ` AND rt.id = $${paramIdx++}`;
    rtParams.push(roomTypeId);
  }

  if (destination && destination.trim() !== '') {
    rtQuery += ` AND (rt.location ILIKE $${paramIdx} OR rt.name ILIKE $${paramIdx} OR rt.description ILIKE $${paramIdx})`;
    rtParams.push(`%${destination.trim()}%`);
    paramIdx++;
  }

  // Adults capacity check (BR-10)
  rtQuery += ` AND (rt.max_adults * $${paramIdx++}) >= $${paramIdx++}`;
  rtParams.push(requestedRooms, adults);

  // Total capacity check (BR-10)
  rtQuery += ` AND ((rt.max_adults + rt.max_children) * $${paramIdx++}) >= $${paramIdx++}`;
  rtParams.push(requestedRooms, parseInt(adults) + parseInt(children));

  rtQuery += ` GROUP BY rt.id ORDER BY rt.base_price ASC`;

  const roomTypesRes = await db.query(rtQuery, rtParams);
  const roomTypes = roomTypesRes.rows;

  // 2. For each room type, compute available inventory per night
  const availableResults = [];

  for (const rt of roomTypes) {
    // Total physical rooms for this type that are generally active
    const roomsCountRes = await db.query(`
      SELECT id, room_number, status 
      FROM rooms 
      WHERE room_type_id = $1 AND is_active = true
    `, [rt.id]);
    const totalPhysicalRooms = roomsCountRes.rows;
    const totalActiveCount = totalPhysicalRooms.length;

    if (totalActiveCount === 0) continue;

    // Out of service or maintenance permanently:
    // (Note: BR-03 says rooms with status Maintenance or Out of Service are excluded)
    const outOfOrderRoomIds = totalPhysicalRooms
      .filter(r => ['Maintenance', 'Out of Service'].includes(r.status))
      .map(r => r.id);

    // Active overlapping bookings (Pending with valid hold, Confirmed, Checked-in)
    // stays overlap if: b.check_in < $checkOut AND b.check_out > $checkIn
    const overlappingBookingsRes = await db.query(`
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
    `, [rt.id, checkOut, checkIn]);
    const overlappingBookings = overlappingBookingsRes.rows;

    // Overlapping room blocks (maintenance / owner blocks)
    const overlappingBlocksRes = await db.query(`
      SELECT room_id, start_date, end_date 
      FROM room_blocks
      WHERE room_id = ANY($1::int[])
        AND start_date < $2
        AND end_date > $3
    `, [totalPhysicalRooms.map(r => r.id), checkOut, checkIn]);
    const overlappingBlocks = overlappingBlocksRes.rows;

    // Check each night from startDate to endDate - 1
    let minInventoryAcrossStay = totalActiveCount;

    for (let d = 0; d < nights; d++) {
      const nightDate = new Date(startDate);
      nightDate.setDate(startDate.getDate() + d);
      const nightNext = new Date(nightDate);
      nightNext.setDate(nightDate.getDate() + 1);

      // Unavailable rooms on this specific night:
      // A. Rooms out of order permanently
      let unavailableCount = outOfOrderRoomIds.length;

      // B. Rooms blocked on this night
      const blockedOnNight = overlappingBlocks.filter(block => {
        const bStart = new Date(block.start_date);
        const bEnd = new Date(block.end_date);
        return bStart < nightNext && bEnd > nightDate;
      });
      // Add blocked rooms that aren't already counted in outOfOrderRoomIds
      const uniqueBlocked = new Set(blockedOnNight.map(b => b.room_id));
      for (const id of uniqueBlocked) {
        if (!outOfOrderRoomIds.includes(id)) {
          unavailableCount++;
        }
      }

      // C. Bookings on this night
      const bookingsOnNight = overlappingBookings.filter(b => {
        const bIn = new Date(b.check_in);
        const bOut = new Date(b.check_out);
        return bIn < nightNext && bOut > nightDate;
      });

      // Count booked/held rooms for this room type
      unavailableCount += bookingsOnNight.length;

      const freeRoomsOnNight = Math.max(0, totalActiveCount - unavailableCount);
      if (freeRoomsOnNight < minInventoryAcrossStay) {
        minInventoryAcrossStay = freeRoomsOnNight;
      }
    }

    // Only include if at least requestedRooms are available (BR-02)
    if (minInventoryAcrossStay >= requestedRooms) {
      // Calculate pricing
      const pricing = await calculateStayPricing({
        roomTypeId: rt.id,
        checkIn,
        checkOut,
        roomCount: requestedRooms
      });

      availableResults.push({
        ...rt,
        availableRoomsCount: minInventoryAcrossStay,
        totalRoomsCount: totalActiveCount,
        isAvailable: true,
        pricing
      });
    }
  }

  return {
    checkIn,
    checkOut,
    nights,
    adults: parseInt(adults),
    children: parseInt(children),
    requestedRooms: parseInt(requestedRooms),
    availableCount: availableResults.length,
    roomTypes: availableResults
  };
};

export const getRoomTypeCalendar = async (roomTypeId, year, month) => {
  // Return daily availability and pricing for a whole month
  const startMonth = new Date(year, month - 1, 1);
  const endMonth = new Date(year, month, 0); // Last day of month
  const daysInMonth = endMonth.getDate();

  const calendarDays = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const curDate = new Date(year, month - 1, d);
    const nextDate = new Date(year, month - 1, d + 1);
    const dateStr = curDate.toISOString().split('T')[0];
    const nextStr = nextDate.toISOString().split('T')[0];

    try {
      const avail = await checkAvailability({
        checkIn: dateStr,
        checkOut: nextStr,
        adults: 1,
        children: 0,
        rooms: 1,
        roomTypeId
      });

      const rt = avail.roomTypes[0];
      calendarDays.push({
        date: dateStr,
        available: rt ? rt.availableRoomsCount > 0 : false,
        remaining: rt ? rt.availableRoomsCount : 0,
        price: rt ? rt.pricing.nightlyBreakdown[0].price : null
      });
    } catch (e) {
      calendarDays.push({
        date: dateStr,
        available: false,
        remaining: 0,
        price: null
      });
    }
  }

  return {
    roomTypeId,
    year,
    month,
    days: calendarDays
  };
};
