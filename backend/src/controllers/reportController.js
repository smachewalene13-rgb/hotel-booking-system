import db from '../config/db.js';

export const getOccupancyReport = async (req, res, next) => {
  try {
    const { start_date = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], end_date = new Date().toISOString().split('T')[0] } = req.query;

    // Total active rooms in hotel
    const totalRoomsRes = await db.query('SELECT COUNT(*) as count FROM rooms WHERE is_active = true');
    const totalActiveRooms = parseInt(totalRoomsRes.rows[0].count) || 1;

    // Occupied nights by day
    const result = await db.query(`
      WITH date_series AS (
        SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS day
      )
      SELECT 
        ds.day,
        COUNT(b.id) as occupied_rooms,
        $3::int as total_rooms,
        ROUND((COUNT(b.id)::numeric / $3::numeric) * 100, 2) as occupancy_rate
      FROM date_series ds
      LEFT JOIN bookings b ON ds.day >= b.check_in 
                          AND ds.day < b.check_out 
                          AND b.status IN ('Confirmed', 'Checked-in', 'Checked-out')
      GROUP BY ds.day
      ORDER BY ds.day ASC
    `, [start_date, end_date, totalActiveRooms]);

    res.json({
      success: true,
      totalActiveRooms,
      dailyOccupancy: result.rows
    });
  } catch (err) {
    next(err);
  }
};

export const getRevenueReport = async (req, res, next) => {
  try {
    const { start_date = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], end_date = new Date().toISOString().split('T')[0] } = req.query;

    const totalRoomsRes = await db.query('SELECT COUNT(*) as count FROM rooms WHERE is_active = true');
    const totalActiveRooms = parseInt(totalRoomsRes.rows[0].count) || 1;

    // Revenue and KPIs (ADR, RevPAR)
    const dailyKpis = await db.query(`
      WITH date_series AS (
        SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS day
      ),
      daily_payments AS (
        SELECT paid_at::date as day, SUM(amount) as revenue
        FROM payments
        WHERE status = 'completed' AND paid_at::date BETWEEN $1::date AND $2::date
        GROUP BY paid_at::date
      ),
      daily_stays AS (
        SELECT ds.day, COUNT(b.id) as rooms_sold
        FROM date_series ds
        LEFT JOIN bookings b ON ds.day >= b.check_in AND ds.day < b.check_out AND b.status IN ('Confirmed', 'Checked-in', 'Checked-out')
        GROUP BY ds.day
      )
      SELECT 
        ds.day,
        COALESCE(dp.revenue, 0) as revenue,
        d_stay.rooms_sold,
        $3::int as total_available_rooms,
        CASE 
          WHEN d_stay.rooms_sold > 0 THEN ROUND((COALESCE(dp.revenue, 0) / d_stay.rooms_sold), 2)
          ELSE 0 
        END as adr,
        ROUND((COALESCE(dp.revenue, 0) / $3::numeric), 2) as revpar
      FROM date_series ds
      LEFT JOIN daily_payments dp ON ds.day = dp.day
      LEFT JOIN daily_stays d_stay ON ds.day = d_stay.day
      ORDER BY ds.day ASC
    `, [start_date, end_date, totalActiveRooms]);

    // Overall summary metrics
    const totalsRes = await db.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(DISTINCT booking_id) as total_paid_bookings
      FROM payments
      WHERE status = 'completed' AND paid_at::date BETWEEN $1::date AND $2::date
    `, [start_date, end_date]);

    res.json({
      success: true,
      summary: {
        totalRevenue: parseFloat(totalsRes.rows[0].total_revenue),
        totalBookings: parseInt(totalsRes.rows[0].total_paid_bookings)
      },
      daily: dailyKpis.rows
    });
  } catch (err) {
    next(err);
  }
};

export const getTopRoomTypes = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        rt.id,
        rt.name,
        rt.code,
        rt.base_price,
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(b.subtotal), 0) as total_revenue,
        (SELECT url FROM room_images ri WHERE ri.room_type_id = rt.id AND ri.is_primary = true LIMIT 1) as image_url
      FROM room_types rt
      LEFT JOIN booking_rooms br ON rt.id = br.room_type_id
      LEFT JOIN bookings b ON br.booking_id = b.id AND b.status IN ('Confirmed', 'Checked-in', 'Checked-out')
      GROUP BY rt.id
      ORDER BY total_revenue DESC, total_bookings DESC
    `);

    res.json({
      success: true,
      topRoomTypes: result.rows
    });
  } catch (err) {
    next(err);
  }
};

export const exportReportCsv = async (req, res, next) => {
  try {
    const { type = 'revenue', start_date = '2026-01-01', end_date = '2026-12-31' } = req.query;

    if (type === 'revenue') {
      const dataRes = await db.query(`
        SELECT paid_at::date as date, method, gateway, amount, booking_id
        FROM payments 
        WHERE status = 'completed' AND paid_at::date BETWEEN $1::date AND $2::date
        ORDER BY paid_at DESC
      `, [start_date, end_date]);

      let csv = 'Date,Booking ID,Payment Method,Gateway,Amount (USD)\n';
      dataRes.rows.forEach(r => {
        csv += `${r.date},${r.booking_id},${r.method},${r.gateway},${r.amount}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="revenue_report.csv"');
      return res.send(csv);
    }

    if (type === 'bookings') {
      const dataRes = await db.query(`
        SELECT code, guest_name, guest_email, check_in, check_out, status, total_amount, paid_amount, created_at::date as booked_on
        FROM bookings
        WHERE check_in BETWEEN $1::date AND $2::date
        ORDER BY check_in DESC
      `, [start_date, end_date]);

      let csv = 'Booking Code,Guest Name,Email,Check In,Check Out,Status,Total,Paid,Booked On\n';
      dataRes.rows.forEach(r => {
        csv += `"${r.code}","${r.guest_name}","${r.guest_email}",${r.check_in},${r.check_out},${r.status},${r.total_amount},${r.paid_amount},${r.booked_on}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="bookings_report.csv"');
      return res.send(csv);
    }

    res.status(400).json({ success: false, message: 'Invalid report type for export.' });
  } catch (err) {
    next(err);
  }
};
