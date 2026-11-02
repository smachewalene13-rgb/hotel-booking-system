import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

export const validatePromoCode = async (req, res, next) => {
  try {
    const { code, check_in, nights = 1, room_subtotal = 0 } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Promo code is required.' });
    }

    let cleanCode = (code || '').trim().toUpperCase();
    // Support common spelling variations like WELLCOME -> WELCOME
    if (cleanCode.startsWith('WELLCOME')) {
      cleanCode = cleanCode.replace(/^WELLCOME/, 'WELCOME');
    }

    const promoDate = check_in || new Date().toISOString().split('T')[0];

    const result = await db.query(`
      SELECT * FROM promotions 
      WHERE (UPPER(code) = $1 OR UPPER(code) = $2) 
        AND is_active = true 
        AND start_date <= $3 
        AND end_date >= $3
    `, [code.trim().toUpperCase(), cleanCode, promoDate]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid or expired promotional voucher code. Try WELCOME10 or WELLCOME10' });
    }

    const promo = result.rows[0];

    if (promo.used_count >= promo.usage_limit) {
      return res.status(400).json({ success: false, message: 'This promo code has reached its maximum global redemption limit.' });
    }

    if (parseInt(nights) < promo.min_nights) {
      return res.status(400).json({
        success: false,
        message: `This promo requires a minimum stay of ${promo.min_nights} night(s).`
      });
    }

    const promoValue = parseFloat(promo.value);
    let discountAmount = 0;
    if (promo.type === 'percentage') {
      discountAmount = Math.round((parseFloat(room_subtotal) * (promoValue / 100)) * 100) / 100;
    } else {
      discountAmount = Math.min(parseFloat(room_subtotal), promoValue);
    }

    res.json({
      success: true,
      message: `Promo code '${promo.code}' applied successfully!`,
      promo: {
        id: promo.id,
        code: promo.code,
        description: promo.description,
        type: promo.type,
        value: promoValue,
        discountAmount
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getPromotions = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM promotions ORDER BY created_at DESC');
    res.json({ success: true, promotions: result.rows });
  } catch (err) {
    next(err);
  }
};

export const createPromotion = async (req, res, next) => {
  try {
    const { code, description, type, value, start_date, end_date, usage_limit = 100, min_nights = 1 } = req.body;
    const result = await db.query(`
      INSERT INTO promotions (code, description, type, value, start_date, end_date, usage_limit, min_nights, is_active)
      VALUES (UPPER($1), $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING *
    `, [code, description, type, value, start_date, end_date, usage_limit, min_nights]);

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_PROMOTION',
      entity: 'promotions',
      entityId: result.rows[0].id,
      newValue: result.rows[0],
      ip: req.ip
    });

    res.status(201).json({ success: true, message: 'Promotion created.', promotion: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const updatePromotion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, description, type, value, start_date, end_date, usage_limit, min_nights, is_active } = req.body;

    const result = await db.query(`
      UPDATE promotions 
      SET code = COALESCE(UPPER($1), code),
          description = COALESCE($2, description),
          type = COALESCE($3, type),
          value = COALESCE($4, value),
          start_date = COALESCE($5, start_date),
          end_date = COALESCE($6, end_date),
          usage_limit = COALESCE($7, usage_limit),
          min_nights = COALESCE($8, min_nights),
          is_active = COALESCE($9, is_active)
      WHERE id = $10
      RETURNING *
    `, [code, description, type, value, start_date, end_date, usage_limit, min_nights, is_active, id]);

    res.json({ success: true, message: 'Promotion updated.', promotion: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const deletePromotion = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM promotions WHERE id = $1', [id]);
    res.json({ success: true, message: 'Promotion deleted.' });
  } catch (err) {
    next(err);
  }
};
