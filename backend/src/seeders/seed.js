import bcrypt from 'bcryptjs';
import db from '../config/db.js';

async function seed() {
  console.log('🌱 Seeding database with rich hotel properties and data...');
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Hotel Settings
    await client.query(`
      INSERT INTO hotel_settings (
        name, tagline, address, city, country, phone, email,
        check_in_time, check_out_time, currency, currency_symbol,
        tax_percent, service_percent, deposit_percent, hold_minutes,
        cancellation_free_hours, cancellation_partial_hours, cancellation_partial_rate,
        no_show_cutoff_time, refund_approval_threshold
      ) VALUES (
        'The Grand Horizon Luxury Resort & Spa',
        'Where Timeless Elegance Meets Contemporary Comfort',
        'Bole Sub-City, Ocean Drive Boulevard 404',
        'Addis Ababa',
        'Ethiopia',
        '+251 11 661 8899',
        'concierge@grandhorizonhotel.com',
        '14:00',
        '12:00',
        'USD',
        '$',
        15.00,
        10.00,
        20.00,
        15,
        48,
        24,
        50.00,
        '18:00',
        500.00
      )
    `);

    // 2. Initial Users
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const adminHash = await bcrypt.hash('Admin123!', 10);
    const managerHash = await bcrypt.hash('Manager123!', 10);
    const receptionHash = await bcrypt.hash('Reception123!', 10);
    const cleanHash = await bcrypt.hash('Clean123!', 10);
    const guestHash = await bcrypt.hash('Guest123!', 10);

    const usersRes = await client.query(`
      INSERT INTO users (full_name, email, phone, password_hash, role, status, email_verified)
      VALUES 
        ('Eleanor Vance (System Admin)', 'admin@grandhorizon.com', '+251 91 123 4567', $1, 'admin', 'active', true),
        ('Marcus Sterling (General Manager)', 'manager@grandhorizon.com', '+251 91 234 5678', $2, 'manager', 'active', true),
        ('Sarah Jenkins (Front Desk)', 'receptionist@grandhorizon.com', '+251 91 345 6789', $3, 'receptionist', 'active', true),
        ('David Miller (Housekeeping Lead)', 'housekeeping@grandhorizon.com', '+251 91 456 7890', $4, 'housekeeping', 'active', true),
        ('Sophia Laurent (Guest)', 'guest@example.com', '+1 415 555 2671', $5, 'guest', 'active', true),
        ('Alexander Wright (Guest)', 'alex@example.com', '+44 20 7946 0912', $5, 'guest', 'active', true)
      RETURNING id, full_name, email, role;
    `, [adminHash, managerHash, receptionHash, cleanHash, guestHash]);

    console.log(` Created ${usersRes.rowCount} users.`);
    const guestUser = usersRes.rows.find(u => u.email === 'guest@example.com');
    const adminUser = usersRes.rows.find(u => u.role === 'admin');

    // 3. Amenities
    const amenitiesData = [
      { name: 'High-Speed Wi-Fi 6', icon: 'wifi', category: 'Technology' },
      { name: 'Ocean & Skyline View', icon: 'eye', category: 'Views' },
      { name: 'King Size Pillow-top Bed', icon: 'bed-double', category: 'Bedroom' },
      { name: 'Infinity Pool & Spa Access', icon: 'waves', category: 'Wellness' },
      { name: '24/7 In-Room Dining', icon: 'utensils', category: 'Dining' },
      { name: 'Marble Bathroom & Rain Shower', icon: 'droplet', category: 'Bathroom' },
      { name: 'Private Balcony Terrace', icon: 'sun', category: 'Outdoor' },
      { name: '65" 4K OLED Smart TV', icon: 'tv', category: 'Entertainment' },
      { name: 'Nespresso Coffee Machine', icon: 'coffee', category: 'Dining' },
      { name: 'Stocked Artisan Mini-Bar', icon: 'wine', category: 'Dining' },
      { name: 'Dual-Zone Air Conditioning', icon: 'wind', category: 'Comfort' },
      { name: 'Ergonomic Executive Desk', icon: 'briefcase', category: 'Work' },
      { name: 'Complimentary Buffet Breakfast', icon: 'croissant', category: 'Dining' },
      { name: 'Plush Bathrobes & Slippers', icon: 'sparkles', category: 'Comfort' },
      { name: 'In-Room Electronic Safe', icon: 'shield-check', category: 'Security' },
      { name: 'Valet Parking Included', icon: 'car', category: 'Convenience' }
    ];

    const amenityMap = {};
    for (const am of amenitiesData) {
      const res = await client.query(
        'INSERT INTO amenities (name, icon, category) VALUES ($1, $2, $3) RETURNING id',
        [am.name, am.icon, am.category]
      );
      amenityMap[am.name] = res.rows[0].id;
    }

    // 4. Room Types
    const roomTypesData = [
      {
        name: 'Deluxe Oceanfront Suite',
        code: 'DELUXE-OCEAN',
        description: 'Immerse yourself in breathtaking panoramic views of the turquoise azure waters. Features an opulent plush King bed, oversized teakwood balcony, spa-inspired Italian marble bath with deep soaking tub, and custom acoustic soundproofing.',
        base_price: 280.00,
        max_adults: 2,
        max_children: 1,
        bed_type: '1 King Bed',
        size_sqm: 58,
        featured: true,
        amenities: ['High-Speed Wi-Fi 6', 'Ocean & Skyline View', 'King Size Pillow-top Bed', 'Infinity Pool & Spa Access', 'Marble Bathroom & Rain Shower', 'Private Balcony Terrace', '65" 4K OLED Smart TV', 'Nespresso Coffee Machine', 'Plush Bathrobes & Slippers', 'In-Room Electronic Safe'],
        images: [
          { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80', caption: 'Deluxe Suite Master Bedroom with Ocean Panoramas', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80', caption: 'Sunlit Living Space and Luxury Bedding', is_primary: false },
          { url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80', caption: 'Private Sunset Balcony overlooking the water', is_primary: false },
          { url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80', caption: 'Freestanding soaking tub in marble bath', is_primary: false }
        ]
      },
      {
        name: 'Royal Presidential Villa',
        code: 'ROYAL-VILLA',
        description: 'The pinnacle of luxury. A standalone private two-bedroom oasis featuring an expansive sun terrace with infinity plunge pool, personal butler pantry, grand fireplace salon, dining room for 8, and dedicated concierge access.',
        base_price: 650.00,
        max_adults: 4,
        max_children: 2,
        bed_type: '2 King Beds',
        size_sqm: 145,
        featured: true,
        amenities: ['High-Speed Wi-Fi 6', 'Ocean & Skyline View', 'King Size Pillow-top Bed', 'Infinity Pool & Spa Access', '24/7 In-Room Dining', 'Marble Bathroom & Rain Shower', 'Private Balcony Terrace', '65" 4K OLED Smart TV', 'Nespresso Coffee Machine', 'Stocked Artisan Mini-Bar', 'Complimentary Buffet Breakfast', 'Plush Bathrobes & Slippers', 'Valet Parking Included'],
        images: [
          { url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80', caption: 'Grand Presidential Suite Interior Salon', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80', caption: 'Royal Master Bed with Ambient Lighting', is_primary: false },
          { url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80', caption: 'Private Pool Terrace and Sunset Lounge', is_primary: false },
          { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', caption: 'Private Dining & Living Villa Suite', is_primary: false }
        ]
      },
      {
        name: 'Executive Skyline King',
        code: 'EXEC-SKYLINE',
        description: 'Designed for discerning business travellers and modern couples. High floor with dramatic city views, Herman Miller ergonomic workspace, high-speed connectivity, priority lounge access, and evening turndown service.',
        base_price: 195.00,
        max_adults: 2,
        max_children: 0,
        bed_type: '1 King Bed',
        size_sqm: 44,
        featured: true,
        amenities: ['High-Speed Wi-Fi 6', 'Ocean & Skyline View', 'King Size Pillow-top Bed', 'Ergonomic Executive Desk', '65" 4K OLED Smart TV', 'Nespresso Coffee Machine', 'Dual-Zone Air Conditioning', 'In-Room Electronic Safe', 'Plush Bathrobes & Slippers'],
        images: [
          { url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80', caption: 'Executive Skyline Room with Modern Desk & King Bed', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80', caption: 'Minimalist Nordic Warmth and Sunset Glow', is_primary: false },
          { url: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80', caption: 'En-suite Luxury Bath with Rain Shower', is_primary: false }
        ]
      },
      {
        name: 'Family Garden Terrace Suite',
        code: 'FAMILY-GARDEN',
        description: 'Spacious multi-zone comfort for the entire family. Features an enclosed master bedroom, secondary twin bedroom, ground-level landscaped terrace leading to private courtyard gardens, and child-safe amenities.',
        base_price: 330.00,
        max_adults: 3,
        max_children: 2,
        bed_type: '1 King + 2 Twin Beds',
        size_sqm: 78,
        featured: false,
        amenities: ['High-Speed Wi-Fi 6', 'Private Balcony Terrace', 'Complimentary Buffet Breakfast', 'Dual-Zone Air Conditioning', '65" 4K OLED Smart TV', 'Nespresso Coffee Machine', 'Infinity Pool & Spa Access', 'In-Room Electronic Safe'],
        images: [
          { url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80', caption: 'Family Master Suite with Garden Access', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80', caption: 'Twin Bed zone for children and companions', is_primary: false },
          { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80', caption: 'Outdoor Garden Terrace & Pergola', is_primary: false }
        ]
      },
      {
        name: 'Superior Double Twin',
        code: 'SUPERIOR-TWIN',
        description: 'Sophisticated comfort with two premium queen-size beds, tailored linen, acoustic wall panels, elegant writing bureau, and warm hardwood detailing. Ideal for colleagues or friends travelling together.',
        base_price: 160.00,
        max_adults: 2,
        max_children: 1,
        bed_type: '2 Double Beds',
        size_sqm: 40,
        featured: false,
        amenities: ['High-Speed Wi-Fi 6', 'Dual-Zone Air Conditioning', '65" 4K OLED Smart TV', 'In-Room Electronic Safe', 'Nespresso Coffee Machine', 'Stocked Artisan Mini-Bar'],
        images: [
          { url: 'https://images.unsplash.com/photo-1590490359683-658d3d23f972?auto=format&fit=crop&w=1200&q=80', caption: 'Superior Twin Room Layout with Natural Sunlight', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1587985064135-0366536eab42?auto=format&fit=crop&w=1200&q=80', caption: 'Artisan Wood Finishing & Reading Lamps', is_primary: false }
        ]
      },
      {
        name: 'Classic Boutique Queen',
        code: 'CLASSIC-QUEEN',
        description: 'Cozy and intimate boutique sanctuary tailored for solo travellers and weekend couples. Features a cloud-soft queen bed, ambient dimmable lighting, smart media dock, and custom botanical bath products.',
        base_price: 115.00,
        max_adults: 2,
        max_children: 0,
        bed_type: '1 Queen Bed',
        size_sqm: 30,
        featured: false,
        amenities: ['High-Speed Wi-Fi 6', 'Dual-Zone Air Conditioning', '65" 4K OLED Smart TV', 'In-Room Electronic Safe'],
        images: [
          { url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', caption: 'Classic Boutique Room with Velvet Accents', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80', caption: 'Modern Minimalist Aesthetic and Warm Woods', is_primary: false }
        ]
      }
    ];

    const typeIdMap = {};

    for (const rt of roomTypesData) {
      const res = await client.query(`
        INSERT INTO room_types (name, code, description, base_price, max_adults, max_children, bed_type, size_sqm, featured)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [rt.name, rt.code, rt.description, rt.base_price, rt.max_adults, rt.max_children, rt.bed_type, rt.size_sqm, rt.featured]);

      const typeId = res.rows[0].id;
      typeIdMap[rt.code] = typeId;

      // Link Amenities
      for (const amName of rt.amenities) {
        if (amenityMap[amName]) {
          await client.query(
            'INSERT INTO room_type_amenities (room_type_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [typeId, amenityMap[amName]]
          );
        }
      }

      // Add Images
      let sort = 0;
      for (const img of rt.images) {
        await client.query(`
          INSERT INTO room_images (room_type_id, url, caption, is_primary, sort_order)
          VALUES ($1, $2, $3, $4, $5)
        `, [typeId, img.url, img.caption, img.is_primary, sort++]);
      }
    }

    // 5. Physical Rooms (20 physical rooms across 5 floors)
    const physicalRooms = [
      // Deluxe Oceanfront (DELUXE-OCEAN) - 4 rooms
      { room_number: '201', floor: 2, type: 'DELUXE-OCEAN', status: 'Available' },
      { room_number: '202', floor: 2, type: 'DELUXE-OCEAN', status: 'Available' },
      { room_number: '301', floor: 3, type: 'DELUXE-OCEAN', status: 'Occupied' },
      { room_number: '302', floor: 3, type: 'DELUXE-OCEAN', status: 'Dirty' },
      
      // Royal Villa (ROYAL-VILLA) - 2 rooms
      { room_number: '501', floor: 5, type: 'ROYAL-VILLA', status: 'Available' },
      { room_number: '502', floor: 5, type: 'ROYAL-VILLA', status: 'Available' },

      // Executive Skyline (EXEC-SKYLINE) - 4 rooms
      { room_number: '401', floor: 4, type: 'EXEC-SKYLINE', status: 'Available' },
      { room_number: '402', floor: 4, type: 'EXEC-SKYLINE', status: 'Available' },
      { room_number: '403', floor: 4, type: 'EXEC-SKYLINE', status: 'Cleaning' },
      { room_number: '404', floor: 4, type: 'EXEC-SKYLINE', status: 'Maintenance' },

      // Family Garden (FAMILY-GARDEN) - 3 rooms
      { room_number: '101', floor: 1, type: 'FAMILY-GARDEN', status: 'Available' },
      { room_number: '102', floor: 1, type: 'FAMILY-GARDEN', status: 'Available' },
      { room_number: '103', floor: 1, type: 'FAMILY-GARDEN', status: 'Available' },

      // Superior Twin (SUPERIOR-TWIN) - 4 rooms
      { room_number: '203', floor: 2, type: 'SUPERIOR-TWIN', status: 'Available' },
      { room_number: '204', floor: 2, type: 'SUPERIOR-TWIN', status: 'Available' },
      { room_number: '303', floor: 3, type: 'SUPERIOR-TWIN', status: 'Dirty' },
      { room_number: '304', floor: 3, type: 'SUPERIOR-TWIN', status: 'Available' },

      // Classic Queen (CLASSIC-QUEEN) - 3 rooms
      { room_number: '104', floor: 1, type: 'CLASSIC-QUEEN', status: 'Available' },
      { room_number: '105', floor: 1, type: 'CLASSIC-QUEEN', status: 'Available' },
      { room_number: '205', floor: 2, type: 'CLASSIC-QUEEN', status: 'Available' }
    ];

    const roomIdMap = {};
    for (const pr of physicalRooms) {
      const res = await client.query(`
        INSERT INTO rooms (room_number, floor, room_type_id, status, is_active)
        VALUES ($1, $2, $3, $4, true)
        RETURNING id, room_number
      `, [pr.room_number, pr.floor, typeIdMap[pr.type], pr.status]);
      roomIdMap[pr.room_number] = res.rows[0].id;
    }

    // 6. Extra Services
    const servicesData = [
      { name: 'Gourmet Artisanal Breakfast Buffet', price: 28.00, pricing_type: 'per_guest', icon: 'utensils', description: 'Fresh bakery pastries, made-to-order eggs, organic juices and Ethiopian specialty coffees.' },
      { name: 'Chauffeured Luxury Airport Transfer', price: 55.00, pricing_type: 'per_booking', icon: 'car', description: 'Private Mercedes-Benz airport pickup and drop-off with chilled refreshments.' },
      { name: 'Therapeutic Full-Body Spa Massage (60 min)', price: 95.00, pricing_type: 'per_booking', icon: 'sparkles', description: 'Relaxing aromatherapy ritual with essential oils in the private spa retreat.' },
      { name: 'Rollaway Premium Extra Bed', price: 35.00, pricing_type: 'per_night', icon: 'bed', description: 'Plush orthopedic foldaway mattress with hypoallergenic bedding.' },
      { name: 'Same-Day Express Laundry & Valet Pressing', price: 25.00, pricing_type: 'per_booking', icon: 'shirt', description: 'Professional laundering, steaming, and hanger-ready garment care.' },
      { name: 'Romantic Welcome Package', price: 75.00, pricing_type: 'per_booking', icon: 'heart', description: 'Chilled bottle of French Champagne, artisanal chocolate truffles, and fresh rose arrangement.' }
    ];

    const serviceIdMap = {};
    for (const s of servicesData) {
      const res = await client.query(`
        INSERT INTO services (name, price, pricing_type, icon, description, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING id
      `, [s.name, s.price, s.pricing_type, s.icon, s.description]);
      serviceIdMap[s.name] = res.rows[0].id;
    }

    // 7. Promotions
    await client.query(`
      INSERT INTO promotions (code, description, type, value, start_date, end_date, usage_limit, used_count, min_nights, is_active)
      VALUES 
        ('WELCOME10', '10% Welcome Discount for your getaway', 'percentage', 10.00, '2025-01-01', '2030-12-31', 5000, 14, 1, true),
        ('WELLCOME10', '10% Welcome Discount for your getaway', 'percentage', 10.00, '2025-01-01', '2030-12-31', 5000, 2, 1, true),
        ('SUMMER20', '20% Seasonal Discount on your entire stay', 'percentage', 20.00, '2025-01-01', '2030-12-31', 2000, 8, 1, true),
        ('LUXURY50', '$50 Instant Credit on Luxury Suites', 'fixed', 50.00, '2025-01-01', '2030-12-31', 1000, 3, 1, true)
    `);

    // 8. Rate Rules (e.g. weekend pricing for Deluxe Ocean Suite)
    await client.query(`
      INSERT INTO rate_rules (room_type_id, name, start_date, end_date, price, day_of_week, is_active)
      VALUES 
        ($1, 'Weekend Luxury Surcharge (Fri/Sat)', '2026-01-01', '2026-12-31', 320.00, 5, true),
        ($1, 'Weekend Luxury Surcharge (Fri/Sat)', '2026-01-01', '2026-12-31', 320.00, 6, true)
    `, [typeIdMap['DELUXE-OCEAN']]);

    // 9. Initial Bookings (for realism, demoing dashboard, arrivals, folio & reviews)
    // Booking 1: Checked-in guest (Room 301, Deluxe Ocean)
    const b1Code = 'HB-2026-001001';
    const b1Res = await client.query(`
      INSERT INTO bookings (
        code, user_id, guest_name, guest_email, guest_phone,
        check_in, check_out, adults, children, status,
        subtotal, tax_amount, service_charge, extras_amount, discount_amount, total_amount, paid_amount,
        hold_expires_at, special_requests, estimated_arrival_time, source
      ) VALUES (
        $1, $2, 'Sophia Laurent', 'guest@example.com', '+1 415 555 2671',
        CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', 2, 0, 'Checked-in',
        840.00, 126.00, 84.00, 80.00, 0.00, 1130.00, 1130.00,
        NULL, 'Quiet room on upper floor preferred; celebrating anniversary.', '14:30', 'online'
      ) RETURNING id
    `, [b1Code, guestUser.id]);
    const b1Id = b1Res.rows[0].id;

    // Booking Room & Range
    await client.query(`
      INSERT INTO booking_rooms (booking_id, room_type_id, room_id, nightly_price_snapshot, stay_range)
      VALUES ($1, $2, $3, 280.00, daterange(CURRENT_DATE, (CURRENT_DATE + INTERVAL '3 days')::date))
    `, [b1Id, typeIdMap['DELUXE-OCEAN'], roomIdMap['301']]);

    // Booking extras
    await client.query(`
      INSERT INTO booking_extras (booking_id, service_id, name, quantity, unit_price, total_price, notes)
      VALUES 
        ($1, $2, 'Romantic Welcome Package', 1, 75.00, 75.00, 'Rose petals on bed'),
        ($1, NULL, 'Lobby Bar Espresso & Cocktail', 1, 5.00, 5.00, 'Charged to folio room 301')
    `, [b1Id, serviceIdMap['Romantic Welcome Package']]);

    // Payment for Booking 1
    await client.query(`
      INSERT INTO payments (booking_id, amount, method, status, gateway, gateway_ref, paid_at)
      VALUES ($1, 1130.00, 'credit_card', 'completed', 'stripe', 'ch_seed_sample_301', NOW())
    `, [b1Id]);

    // ID document for Booking 1 (BR-13)
    await client.query(`
      INSERT INTO guest_documents (booking_id, guest_name, id_type, id_number, issuing_country)
      VALUES ($1, 'Sophia Laurent', 'Passport', 'PA987654321', 'France')
    `, [b1Id]);

    // Booking 2: Confirmed arrival for today (Arrivals list!)
    const b2Code = 'HB-2026-001002';
    const b2Res = await client.query(`
      INSERT INTO bookings (
        code, user_id, guest_name, guest_email, guest_phone,
        check_in, check_out, adults, children, status,
        subtotal, tax_amount, service_charge, extras_amount, discount_amount, total_amount, paid_amount,
        hold_expires_at, special_requests, estimated_arrival_time, source
      ) VALUES (
        $1, $2, 'Alexander Wright', 'alex@example.com', '+44 20 7946 0912',
        CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', 2, 0, 'Confirmed',
        390.00, 58.50, 39.00, 55.00, 39.00, 503.50, 503.50,
        NULL, 'High speed ethernet cable requested for video conferences.', '15:00', 'online'
      ) RETURNING id
    `, [b2Code, usersRes.rows.find(u => u.email === 'alex@example.com').id]);
    const b2Id = b2Res.rows[0].id;

    await client.query(`
      INSERT INTO booking_rooms (booking_id, room_type_id, room_id, nightly_price_snapshot, stay_range)
      VALUES ($1, $2, NULL, 195.00, daterange(CURRENT_DATE, (CURRENT_DATE + INTERVAL '2 days')::date))
    `, [b2Id, typeIdMap['EXEC-SKYLINE']]);

    await client.query(`
      INSERT INTO payments (booking_id, amount, method, status, gateway, gateway_ref, paid_at)
      VALUES ($1, 503.50, 'chapa', 'completed', 'chapa', 'chapa_tx_998822', NOW())
    `, [b2Id]);

    // Booking 3: Checked-out past stay with review (BR-38)
    const b3Code = 'HB-2026-000999';
    const b3Res = await client.query(`
      INSERT INTO bookings (
        code, user_id, guest_name, guest_email, guest_phone,
        check_in, check_out, adults, children, status,
        subtotal, tax_amount, service_charge, extras_amount, discount_amount, total_amount, paid_amount,
        source
      ) VALUES (
        $1, $2, 'Elena Rostova', 'elena.rostova@example.com', '+33 61 234 5678',
        CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '2 days', 2, 0, 'Checked-out',
        840.00, 126.00, 84.00, 0.00, 0.00, 1050.00, 1050.00, 'online'
      ) RETURNING id
    `, [b3Code, guestUser.id]);
    const b3Id = b3Res.rows[0].id;

    await client.query(`
      INSERT INTO reviews (booking_id, user_id, room_type_id, rating, title, comment, status, reply, reply_at)
      VALUES ($1, $2, $3, 5, 'Unforgettable Oceanfront Luxury', 'The view from room 201 was simply celestial. The bedding is unmatched, staff were courteous, and the sunset dinner was incredible. We will certainly return!', 'approved', 'Thank you Sophia for such gracious praise. We look forward to welcoming you back soon!', NOW())
    `, [b3Id, guestUser.id, typeIdMap['DELUXE-OCEAN']]);

    // Initial Audit Log
    await client.query(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, old_value, new_value, ip)
      VALUES 
        ($1, 'SYSTEM_INITIALIZATION', 'system', '1', NULL, '{"version":"1.0","message":"Initial system seed with rooms and rates"}'::jsonb, '127.0.0.1')
    `, [adminUser.id]);

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully with hotel data, rooms, and users!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeder failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await db.pool.end();
  }
}

seed();
