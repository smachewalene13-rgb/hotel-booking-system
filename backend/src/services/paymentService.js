import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

export const initiatePaymentSession = async ({
  bookingId,
  paymentMethod,
  paymentType = 'full', // 'full' or 'deposit'
  userId = null
}) => {
  const bRes = await db.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
  if (bRes.rows.length === 0) throw new Error('Booking not found.');
  const booking = bRes.rows[0];

  if (!['Pending', 'Confirmed'].includes(booking.status)) {
    throw new Error(`Cannot process payment for booking with status ${booking.status}`);
  }

  // Check hold expiry for pending booking
  if (booking.status === 'Pending' && booking.hold_expires_at && new Date(booking.hold_expires_at) < new Date()) {
    throw new Error('This booking hold has expired. Please initiate a new search and booking.');
  }

  const settingsRes = await db.query('SELECT deposit_percent FROM hotel_settings LIMIT 1');
  const depositPercent = parseFloat(settingsRes.rows[0]?.deposit_percent || 20);

  const totalAmount = parseFloat(booking.total_amount);
  const alreadyPaid = parseFloat(booking.paid_amount);
  const remainingBalance = Math.max(0, totalAmount - alreadyPaid);

  let amountToPay = remainingBalance;
  if (paymentType === 'deposit' && alreadyPaid === 0) {
    amountToPay = Math.round((totalAmount * (depositPercent / 100)) * 100) / 100;
  }

  if (amountToPay <= 0) {
    throw new Error('This reservation is already fully paid.');
  }

  // Handle Pay-at-Hotel
  if (paymentMethod === 'pay_at_hotel') {
    // Check BR-21: Pay-at-hotel bookings require registered account
    if (!booking.user_id) {
      throw new Error('Pay-at-hotel option requires a registered account. Please register or choose an online payment method.');
    }

    await db.query(`
      UPDATE bookings 
      SET status = 'Confirmed',
          hold_expires_at = NULL,
          updated_at = NOW()
      WHERE id = $1
    `, [bookingId]);

    // Insert pending payment note
    await db.query(`
      INSERT INTO payments (booking_id, amount, method, status, gateway, notes)
      VALUES ($1, $2, 'pay_at_hotel', 'pending', 'front_desk', 'Pay on arrival at check-in')
    `, [bookingId, remainingBalance]);

    return {
      status: 'confirmed_pay_at_hotel',
      message: 'Booking confirmed! Payment will be collected at front desk upon check-in.'
    };
  }

  // Generate Gateway Reference
  const gatewayRef = `${paymentMethod.toUpperCase()}_TX_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

  // Create pending payment attempt (FR-PAY-04)
  const pRes = await db.query(`
    INSERT INTO payments (booking_id, amount, method, status, gateway, gateway_ref)
    VALUES ($1, $2, $3, 'pending', $4, $5)
    RETURNING *
  `, [bookingId, amountToPay, paymentMethod, paymentMethod, gatewayRef]);

  return {
    paymentId: pRes.rows[0].id,
    bookingId: booking.id,
    bookingCode: booking.code,
    amount: amountToPay,
    currency: 'ETB',
    gateway: paymentMethod,
    gatewayRef,
    clientSecret: `sim_sec_${gatewayRef}`,
    checkoutUrl: `/checkout/simulate-gateway?ref=${gatewayRef}`
  };
};

export const verifyAndFinalizePayment = async ({
  gatewayRef,
  paymentId = null,
  status = 'completed',
  notes = '',
  ip = '127.0.0.1'
}) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Find payment record
    let pQuery = 'SELECT * FROM payments WHERE ';
    const pParams = [];
    if (paymentId) {
      pQuery += 'id = $1';
      pParams.push(paymentId);
    } else {
      pQuery += 'gateway_ref = $1';
      pParams.push(gatewayRef);
    }
    pQuery += ' FOR UPDATE';

    const pRes = await client.query(pQuery, pParams);
    if (pRes.rows.length === 0) {
      throw new Error('Payment record not found.');
    }
    const payment = pRes.rows[0];

    if (payment.status === 'completed') {
      await client.query('COMMIT');
      return { success: true, message: 'Payment was already processed.', payment };
    }

    if (status !== 'completed') {
      // Payment failed
      await client.query('UPDATE payments SET status = $1, notes = $2 WHERE id = $3', ['failed', notes || 'Payment transaction failed or was cancelled.', payment.id]);
      await client.query('COMMIT');
      return { success: false, message: 'Payment attempt was unsuccessful.' };
    }

    // 2. Mark payment completed
    const updatedPaymentRes = await client.query(`
      UPDATE payments 
      SET status = 'completed',
          paid_at = NOW(),
          notes = COALESCE($1, notes)
      WHERE id = $2
      RETURNING *
    `, [notes || 'Payment verified via gateway webhook/server validation.', payment.id]);

    const updatedPayment = updatedPaymentRes.rows[0];

    // 3. Update booking paid_amount and status to Confirmed
    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [payment.booking_id]);
    const booking = bRes.rows[0];

    const newPaidAmount = parseFloat(booking.paid_amount) + parseFloat(payment.amount);
    const newStatus = booking.status === 'Pending' ? 'Confirmed' : booking.status;

    await client.query(`
      UPDATE bookings 
      SET paid_amount = $1,
          status = $2,
          hold_expires_at = NULL,
          updated_at = NOW()
      WHERE id = $3
    `, [newPaidAmount, newStatus, booking.id]);

    await logAudit({
      userId: booking.user_id,
      action: 'PAYMENT_COMPLETED',
      entity: 'payments',
      entityId: payment.id,
      newValue: { amount: payment.amount, method: payment.method, newPaidAmount, status: newStatus },
      ip
    });

    await client.query('COMMIT');

    return {
      success: true,
      payment: updatedPayment,
      bookingStatus: newStatus,
      paidAmount: newPaidAmount,
      bookingCode: booking.code
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
