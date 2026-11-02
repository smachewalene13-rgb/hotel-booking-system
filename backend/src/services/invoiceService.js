import PDFDocument from 'pdfkit';
import db from '../config/db.js';

export const generateBookingInvoicePDF = async (bookingId, res) => {
  // 1. Fetch booking with extras and payments
  const bRes = await db.query(`
    SELECT b.*,
      rt.name as room_type_name,
      rt.location as room_type_location,
      r.room_number,
      s.name as hotel_name,
      s.address as hotel_address,
      s.phone as hotel_phone,
      s.email as hotel_email,
      s.currency_symbol
    FROM bookings b
    JOIN booking_rooms br ON b.id = br.booking_id
    JOIN room_types rt ON br.room_type_id = rt.id
    LEFT JOIN rooms r ON br.room_id = r.id
    CROSS JOIN hotel_settings s
    WHERE b.id = $1
    LIMIT 1
  `, [bookingId]);

  if (bRes.rows.length === 0) {
    throw new Error('Booking not found for PDF invoice.');
  }

  const booking = bRes.rows[0];

  const extrasRes = await db.query('SELECT * FROM booking_extras WHERE booking_id = $1', [bookingId]);
  const extras = extrasRes.rows;

  const paymentsRes = await db.query("SELECT * FROM payments WHERE booking_id = $1 AND status = 'completed'", [bookingId]);
  const payments = paymentsRes.rows;

  const sym = booking.currency_symbol || 'ETB ';

  // 2. Initialize PDF Document
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Stream output directly to express response
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Invoice_${booking.code}.pdf"`);
  doc.pipe(res);

  // --- Header ---
  doc
    .fontSize(22)
    .font('Helvetica-Bold')
    .text(booking.hotel_name || 'The Grand Horizon Luxury Resort & Spa', { align: 'left' })
    .fontSize(10)
    .font('Helvetica')
    .text(booking.hotel_address, { align: 'left' })
    .text(`Tel: ${booking.hotel_phone} | Email: ${booking.hotel_email}`, { align: 'left' })
    .moveDown();

  doc
    .strokeColor('#e2e8f0')
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();

  doc.moveDown(1.5);

  // --- Invoice & Guest Details ---
  const detailsY = doc.y;

  // Left Column: Guest info
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('GUEST INVOICE / FOLIO', 50, detailsY)
    .fontSize(10)
    .font('Helvetica')
    .moveDown(0.3)
    .text(`Guest: ${booking.guest_name}`)
    .text(`Email: ${booking.guest_email}`)
    .text(`Phone: ${booking.guest_phone}`)
    .text(`Room: ${booking.room_number ? `Room ${booking.room_number}` : 'Standard Assignment'}`)
    .text(`Location: ${booking.room_type_location || booking.hotel_address}`);

  // Right Column: Booking info
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(`Confirmation: ${booking.code}`, 340, detailsY)
    .font('Helvetica')
    .moveDown(0.3)
    .text(`Check-In: ${booking.check_in}`)
    .text(`Check-Out: ${booking.check_out}`)
    .text(`Guests: ${booking.adults} Adults, ${booking.children} Children`)
    .text(`Status: ${booking.status.toUpperCase()}`);

  doc.moveDown(2.5);

  // --- Table Header ---
  const tableTop = doc.y;
  doc
    .rect(50, tableTop, 495, 24)
    .fill('#1e293b');

  doc
    .fillColor('#ffffff')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('DESCRIPTION', 60, tableTop + 7)
    .text('QTY', 330, tableTop + 7)
    .text('UNIT PRICE', 390, tableTop + 7)
    .text('TOTAL', 480, tableTop + 7);

  let currentY = tableTop + 30;
  doc.fillColor('#1e293b').font('Helvetica');

  // Room charge line item
  const nights = Math.max(1, Math.round((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24)));
  doc
    .text(`${booking.room_type_name} (${nights} night stay)`, 60, currentY)
    .text(`${nights}`, 330, currentY)
    .text(`${sym}${(parseFloat(booking.subtotal) / nights).toFixed(2)}`, 390, currentY)
    .text(`${sym}${parseFloat(booking.subtotal).toFixed(2)}`, 480, currentY);

  currentY += 20;

  // Extras / Folio items
  for (const item of extras) {
    doc
      .text(item.name, 60, currentY)
      .text(`${item.quantity}`, 330, currentY)
      .text(`${sym}${parseFloat(item.unit_price).toFixed(2)}`, 390, currentY)
      .text(`${sym}${parseFloat(item.total_price).toFixed(2)}`, 480, currentY);
    currentY += 20;
  }

  // Divider
  doc
    .strokeColor('#e2e8f0')
    .moveTo(50, currentY + 5)
    .lineTo(545, currentY + 5)
    .stroke();

  currentY += 15;

  // --- Summary Breakdown ---
  const summaryX = 350;
  const valueX = 480;

  const printSummaryRow = (label, value, isBold = false) => {
    doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(label, summaryX, currentY);
    doc.text(value, valueX, currentY);
    currentY += 16;
  };

  printSummaryRow('Room Subtotal:', `${sym}${parseFloat(booking.subtotal).toFixed(2)}`);
  if (parseFloat(booking.extras_amount) > 0) {
    printSummaryRow('Extras / Services:', `${sym}${parseFloat(booking.extras_amount).toFixed(2)}`);
  }
  if (parseFloat(booking.discount_amount) > 0) {
    printSummaryRow('Promo Discount:', `-${sym}${parseFloat(booking.discount_amount).toFixed(2)}`);
  }
  printSummaryRow('Service Charge (10%):', `${sym}${parseFloat(booking.service_charge).toFixed(2)}`);
  printSummaryRow('VAT (15%):', `${sym}${parseFloat(booking.tax_amount).toFixed(2)}`);

  doc
    .strokeColor('#cbd5e1')
    .moveTo(summaryX, currentY)
    .lineTo(545, currentY)
    .stroke();
  currentY += 6;

  printSummaryRow('Total Charges:', `${sym}${parseFloat(booking.total_amount).toFixed(2)}`, true);
  printSummaryRow('Paid to Date:', `${sym}${parseFloat(booking.paid_amount).toFixed(2)}`);

  const balance = Math.max(0, parseFloat(booking.total_amount) - parseFloat(booking.paid_amount));
  printSummaryRow('Balance Due:', `${sym}${balance.toFixed(2)}`, true);

  // --- Payment History Section ---
  if (payments.length > 0) {
    currentY += 20;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('PAYMENT HISTORY', 50, currentY);
    currentY += 15;

    for (const p of payments) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(`Paid: ${sym}${parseFloat(p.amount).toFixed(2)} via ${p.method.toUpperCase()} (Ref: ${p.gateway_ref || p.gateway}) on ${new Date(p.paid_at).toLocaleDateString()}`, 50, currentY);
      currentY += 14;
    }
  }

  // --- Footer ---
  doc
    .fontSize(9)
    .font('Helvetica-Oblique')
    .fillColor('#64748b')
    .text('Thank you for choosing The Grand Horizon. We look forward to serving you again.', 50, 750, { align: 'center', width: 495 });

  doc.end();
};
