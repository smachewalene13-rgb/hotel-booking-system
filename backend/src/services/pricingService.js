import db from '../config/db.js';

export const calculateStayPricing = async ({
  roomTypeId,
  checkIn,
  checkOut,
  roomCount = 1,
  promoCode = null,
  selectedServiceIds = []
}) => {
  // 1. Get Room Type
  const rtRes = await db.query(
    'SELECT id, name, code, base_price FROM room_types WHERE id = $1 AND is_active = true',
    [roomTypeId]
  );
  if (rtRes.rows.length === 0) {
    throw new Error('Room type not found or inactive.');
  }
  const roomType = rtRes.rows[0];
  const basePrice = parseFloat(roomType.base_price);

  // 2. Get Hotel Settings for Tax, Service Charge, Currency
  const settingsRes = await db.query('SELECT * FROM hotel_settings LIMIT 1');
  const settings = settingsRes.rows[0] || {
    tax_percent: 15.00,
    service_percent: 10.00,
    currency: 'ETB',
    currency_symbol: 'ETB ',
    deposit_percent: 20.00
  };

  const taxPercent = parseFloat(settings.tax_percent);
  const servicePercent = parseFloat(settings.service_percent);
  const depositPercent = parseFloat(settings.deposit_percent);

  // 3. Get Rate Rules for this room type that overlap the date range
  const rateRulesRes = await db.query(`
    SELECT * FROM rate_rules 
    WHERE room_type_id = $1 
      AND is_active = true 
      AND start_date <= $2 
      AND end_date >= $3
  `, [roomTypeId, checkOut, checkIn]);
  const rateRules = rateRulesRes.rows;

  // 4. Calculate Nightly Rates Breakdown
  const startDate = new Date(checkIn);
  const endDate = new Date(checkOut);
  const nights = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));

  if (nights < 1) {
    throw new Error('Check-out date must be at least 1 night after check-in date.');
  }

  const nightlyBreakdown = [];
  let roomSubtotalPerRoom = 0;

  for (let i = 0; i < nights; i++) {
    const currentNight = new Date(startDate);
    currentNight.setDate(startDate.getDate() + i);
    const dateStr = currentNight.toISOString().split('T')[0];
    const dayOfWeek = currentNight.getDay(); // 0 is Sunday, 6 is Saturday

    // Check rate rules: priority: exact date override with day_of_week match or specific override, else base rate
    let nightPrice = basePrice;
    let ruleApplied = null;

    for (const rule of rateRules) {
      const rStart = new Date(rule.start_date);
      const rEnd = new Date(rule.end_date);
      if (currentNight >= rStart && currentNight <= rEnd) {
        if (rule.day_of_week === null || rule.day_of_week === dayOfWeek) {
          nightPrice = parseFloat(rule.price);
          ruleApplied = rule.name;
          break; // First matching rule
        }
      }
    }

    nightlyBreakdown.push({
      date: dateStr,
      price: nightPrice,
      ruleApplied
    });
    roomSubtotalPerRoom += nightPrice;
  }

  const roomSubtotal = roomSubtotalPerRoom * roomCount;

  // 5. Calculate Extra Services
  let extrasTotal = 0;
  const extraServicesBreakdown = [];

  if (selectedServiceIds && selectedServiceIds.length > 0) {
    const servicesRes = await db.query(
      'SELECT id, name, price, pricing_type FROM services WHERE id = ANY($1::int[]) AND is_active = true',
      [selectedServiceIds]
    );

    for (const s of servicesRes.rows) {
      const sPrice = parseFloat(s.price);
      let calculatedPrice = sPrice;

      if (s.pricing_type === 'per_night') {
        calculatedPrice = sPrice * nights;
      } else if (s.pricing_type === 'per_booking') {
        calculatedPrice = sPrice;
      }

      extrasTotal += calculatedPrice;
      extraServicesBreakdown.push({
        id: s.id,
        name: s.name,
        unitPrice: sPrice,
        pricingType: s.pricing_type,
        totalPrice: calculatedPrice
      });
    }
  }

  // 6. Promotions / Discount Calculation (BR-17)
  let discountAmount = 0;
  let promoApplied = null;

  if (promoCode) {
    let cleanCode = promoCode.trim().toUpperCase();
    if (cleanCode.startsWith('WELLCOME')) {
      cleanCode = cleanCode.replace(/^WELLCOME/, 'WELCOME');
    }

    const promoRes = await db.query(`
      SELECT * FROM promotions 
      WHERE (UPPER(code) = $1 OR UPPER(code) = $2) 
        AND is_active = true 
        AND start_date <= $3 
        AND end_date >= $3
        AND used_count < usage_limit
        AND min_nights <= $4
    `, [promoCode.trim().toUpperCase(), cleanCode, checkIn, nights]);

    if (promoRes.rows.length > 0) {
      const promo = promoRes.rows[0];
      const promoValue = parseFloat(promo.value);
      if (promo.type === 'percentage') {
        discountAmount = Math.round((roomSubtotal * (promoValue / 100)) * 100) / 100;
      } else {
        discountAmount = Math.min(roomSubtotal, promoValue);
      }
      promoApplied = {
        id: promo.id,
        code: promo.code,
        type: promo.type,
        value: promoValue,
        discountAmount
      };
    }
  }

  // 7. Taxes and Service Charge (BR-15 applied on room subtotal)
  const taxableBase = Math.max(0, roomSubtotal - discountAmount);
  const taxAmount = Math.round((taxableBase * (taxPercent / 100)) * 100) / 100;
  const serviceCharge = Math.round((taxableBase * (servicePercent / 100)) * 100) / 100;

  const totalAmount = Math.max(0, taxableBase + extrasTotal + taxAmount + serviceCharge);
  const requiredDeposit = Math.round((totalAmount * (depositPercent / 100)) * 100) / 100;

  return {
    roomTypeId: roomType.id,
    roomTypeName: roomType.name,
    nights,
    roomCount,
    nightlyBreakdown,
    roomSubtotal,
    extrasTotal,
    extraServicesBreakdown,
    promoApplied,
    discountAmount,
    taxPercent,
    taxAmount,
    servicePercent,
    serviceCharge,
    totalAmount,
    depositPercent,
    requiredDeposit,
    currency: settings.currency,
    currencySymbol: settings.currency_symbol
  };
};
