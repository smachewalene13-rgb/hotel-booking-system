import db from '../config/db.js';
import { initiatePaymentSession, verifyAndFinalizePayment } from '../services/paymentService.js';
import { logAudit } from '../utils/auditLogger.js';

export const initiatePayment = async (req, res, next) => {
  try {
    const { booking_id, method, payment_type = 'full' } = req.body;

    if (!booking_id || !method) {
      return res.status(400).json({ success: false, message: 'booking_id and method are required.' });
    }

    const session = await initiatePaymentSession({
      bookingId: booking_id,
      paymentMethod: method,
      paymentType: payment_type,
      userId: req.user?.id
    });

    res.json({
      success: true,
      ...session
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

export const handleWebhook = async (req, res, next) => {
  try {
    const { gateway_ref, status = 'completed', notes } = req.body;

    if (!gateway_ref) {
      return res.status(400).json({ success: false, message: 'gateway_ref is required.' });
    }

    const result = await verifyAndFinalizePayment({
      gatewayRef: gateway_ref,
      status,
      notes: notes || 'Gateway webhook verified successfully.',
      ip: req.ip
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

export const simulatePaymentSuccess = async (req, res, next) => {
  try {
    const { booking_id, method = 'credit_card', amount } = req.body;

    const bRes = await db.query('SELECT * FROM bookings WHERE id = $1', [booking_id]);
    if (bRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    const booking = bRes.rows[0];

    const payAmount = amount || (parseFloat(booking.total_amount) - parseFloat(booking.paid_amount));
    const gatewayRef = `SIM_${method.toUpperCase()}_${Date.now()}`;

    // Create payment record and mark completed
    const pRes = await db.query(`
      INSERT INTO payments (booking_id, amount, method, status, gateway, gateway_ref, paid_at, notes)
      VALUES ($1, $2, $3, 'completed', $4, $5, NOW(), 'Simulated instant transaction verified')
      RETURNING *
    `, [booking_id, payAmount, method, method, gatewayRef]);

    const newPaidAmount = parseFloat(booking.paid_amount) + parseFloat(payAmount);

    await db.query(`
      UPDATE bookings 
      SET paid_amount = $1,
          status = 'Confirmed',
          hold_expires_at = NULL,
          updated_at = NOW()
      WHERE id = $2
    `, [newPaidAmount, booking_id]);

    await logAudit({
      userId: req.user?.id || booking.user_id,
      action: 'PAYMENT_SIMULATED_SUCCESS',
      entity: 'payments',
      entityId: pRes.rows[0].id,
      newValue: { amount: payAmount, method, bookingId: booking_id },
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Payment completed successfully. Booking is now Confirmed!',
      payment: pRes.rows[0],
      bookingStatus: 'Confirmed'
    });
  } catch (err) {
    next(err);
  }
};

export const recordDeskPayment = async (req, res, next) => {
  try {
    const { booking_id, amount, method = 'cash', notes = '' } = req.body;

    if (!booking_id || !amount) {
      return res.status(400).json({ success: false, message: 'booking_id and amount are required.' });
    }

    const bRes = await db.query('SELECT * FROM bookings WHERE id = $1', [booking_id]);
    if (bRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found.' });
    const booking = bRes.rows[0];

    const ref = `DESK_${Date.now()}`;
    const pRes = await db.query(`
      INSERT INTO payments (booking_id, amount, method, status, gateway, gateway_ref, paid_at, notes)
      VALUES ($1, $2, $3, 'completed', 'front_desk', $4, NOW(), $5)
      RETURNING *
    `, [booking_id, amount, method, ref, notes || `Desk payment received by ${req.user.full_name}`]);

    const newPaid = parseFloat(booking.paid_amount) + parseFloat(amount);
    await db.query('UPDATE bookings SET paid_amount = $1, updated_at = NOW() WHERE id = $2', [newPaid, booking_id]);

    await logAudit({
      userId: req.user.id,
      action: 'RECORD_DESK_PAYMENT',
      entity: 'payments',
      entityId: pRes.rows[0].id,
      newValue: { bookingId: booking_id, amount, method },
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Desk payment recorded successfully.',
      payment: pRes.rows[0],
      totalPaid: newPaid
    });
  } catch (err) {
    next(err);
  }
};

export const getRefundsList = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT ref.*, b.code as booking_code, b.guest_name, u.full_name as approved_by_name
      FROM refunds ref
      JOIN bookings b ON ref.booking_id = b.id
      LEFT JOIN users u ON ref.approved_by = u.id
      ORDER BY ref.created_at DESC
    `);
    res.json({ success: true, refunds: result.rows });
  } catch (err) {
    next(err);
  }
};

export const approveRefund = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision = 'approved' } = req.body; // 'approved' or 'rejected'

    const refRes = await db.query('SELECT * FROM refunds WHERE id = $1', [id]);
    if (refRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Refund record not found.' });

    const result = await db.query(`
      UPDATE refunds
      SET status = $1,
          approved_by = $2
      WHERE id = $3
      RETURNING *
    `, [decision, req.user.id, id]);

    await logAudit({
      userId: req.user.id,
      action: 'APPROVE_REFUND',
      entity: 'refunds',
      entityId: id,
      newValue: { decision, approvedBy: req.user.full_name },
      ip: req.ip
    });

    res.json({
      success: true,
      message: `Refund ${decision} successfully.`,
      refund: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};
