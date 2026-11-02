import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

export const submitReview = async (req, res, next) => {
  try {
    const { booking_id, rating, title, comment } = req.body;
    const userId = req.user.id;

    if (!booking_id || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'booking_id, rating (1-5), and comment are required.' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    }

    // 1. Verify booking belongs to user and is Checked-out (BR-38)
    const bRes = await db.query('SELECT * FROM bookings WHERE id = $1', [booking_id]);
    if (bRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    const booking = bRes.rows[0];

    if (booking.user_id !== userId && req.user.role === 'guest') {
      return res.status(403).json({ success: false, message: 'You can only review your own reservation.' });
    }

    if (booking.status !== 'Checked-out') {
      return res.status(400).json({
        success: false,
        message: 'Reviews may only be submitted after your stay has been completed and checked out (BR-38).'
      });
    }

    // Check if review already exists for this booking (BR-38: only once)
    const existingRev = await db.query('SELECT id FROM reviews WHERE booking_id = $1', [booking_id]);
    if (existingRev.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'You have already submitted a review for this stay.' });
    }

    // Get room type id from booking_rooms
    const brRes = await db.query('SELECT room_type_id FROM booking_rooms WHERE booking_id = $1 LIMIT 1', [booking.id]);
    const roomTypeId = brRes.rows[0]?.room_type_id;

    const result = await db.query(`
      INSERT INTO reviews (booking_id, user_id, room_type_id, rating, title, comment, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'approved')
      RETURNING *
    `, [booking.id, userId, roomTypeId, rating, title || 'Guest Review', comment]);

    await logAudit({
      userId,
      action: 'SUBMIT_REVIEW',
      entity: 'reviews',
      entityId: result.rows[0].id,
      newValue: { rating, roomTypeId, bookingId: booking.id },
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for your review! It has been posted to our guest book.',
      review: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

export const getRoomTypeReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT rev.*, u.full_name as author_name, b.check_in, b.check_out
      FROM reviews rev
      LEFT JOIN users u ON rev.user_id = u.id
      JOIN bookings b ON rev.booking_id = b.id
      WHERE rev.room_type_id = $1 AND rev.status = 'approved'
      ORDER BY rev.created_at DESC
    `, [id]);

    res.json({
      success: true,
      count: result.rowCount,
      reviews: result.rows
    });
  } catch (err) {
    next(err);
  }
};

export const getAllReviewsForAdmin = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT rev.*, u.full_name as author_name, u.email as author_email,
        rt.name as room_type_name, b.code as booking_code
      FROM reviews rev
      LEFT JOIN users u ON rev.user_id = u.id
      JOIN room_types rt ON rev.room_type_id = rt.id
      JOIN bookings b ON rev.booking_id = b.id
      ORDER BY rev.created_at DESC
    `);

    res.json({
      success: true,
      reviews: result.rows
    });
  } catch (err) {
    next(err);
  }
};

export const moderateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reply } = req.body;

    const result = await db.query(`
      UPDATE reviews
      SET status = COALESCE($1, status),
          reply = COALESCE($2, reply),
          reply_at = CASE WHEN $2 IS NOT NULL THEN NOW() ELSE reply_at END
      WHERE id = $3
      RETURNING *
    `, [status, reply, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    await logAudit({
      userId: req.user.id,
      action: 'MODERATE_REVIEW',
      entity: 'reviews',
      entityId: id,
      newValue: { status, reply },
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Review moderated successfully.',
      review: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};
