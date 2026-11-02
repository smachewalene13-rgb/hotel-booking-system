import db from '../config/db.js';

async function addHotelsAndLocations() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Update location for the 6 existing properties
    const existingUpdates = [
      { code: 'DELUXE-OCEAN', location: 'Kuriftu Lake Waterfront, Bishoftu, Ethiopia' },
      { code: 'ROYAL-VILLA', location: 'Entoto Mountain Forest Ridge, Addis Ababa, Ethiopia' },
      { code: 'EXEC-SKYLINE', location: 'Bole Financial District, Africa Avenue, Addis Ababa, Ethiopia' },
      { code: 'PENTHOUSE', location: 'Kazanchis Business Core, Kirkos, Addis Ababa, Ethiopia' },
      { code: 'GARDEN-SUITE', location: 'Old Airport Diplomatic Enclave, Addis Ababa, Ethiopia' },
      { code: 'CLASSIC-BOUTIQUE', location: 'Historic Piassa Heritage Quarter, Addis Ababa, Ethiopia' }
    ];

    for (const item of existingUpdates) {
      await client.query(
        'UPDATE room_types SET location = $1 WHERE code = $2',
        [item.location, item.code]
      );
    }
    console.log('Updated existing 6 hotel locations.');

    // 2. Insert 4 new hotel properties (Total = 10)
    const newHotels = [
      {
        name: 'Lakeside Eco-Retreat Villa',
        code: 'LAKESIDE-VILLA',
        description: 'Set on the golden shores of Lake Langano in the Great Rift Valley. Features an expansive open-air timber deck, direct lake access, eco-solar water heating, and private birdwatching sunrise veranda.',
        base_price: 220.00,
        max_adults: 2,
        max_children: 1,
        bed_type: '1 King Bed',
        size_sqm: 65,
        featured: true,
        location: 'Lake Langano Shoreline, Great Rift Valley, Ethiopia',
        images: [
          { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80', caption: 'Private Lakeside Villa and Sunken Lounge', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80', caption: 'Golden Hour Veranda overlooking Lake Langano', is_primary: false }
        ],
        rooms: ['601', '602', '603']
      },
      {
        name: 'Highland Mountain Sanctuary',
        code: 'HIGHLAND-SANCTUARY',
        description: 'Perched on the cliff edges of the Simien Mountains with panoramic views of dramatic escarpments. Enjoy a handcrafted stone fireplace, heated wooden floors, down duvets, and telescope stargazing decks.',
        base_price: 340.00,
        max_adults: 2,
        max_children: 1,
        bed_type: '1 King Bed',
        size_sqm: 75,
        featured: true,
        location: 'Simien Mountain Escarpment, Debark, Gondar, Ethiopia',
        images: [
          { url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80', caption: 'Mountain View Cliff Suite with Stone Hearth', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1200&q=80', caption: 'Escarpment Balcony overlooking the Great African Rift', is_primary: false }
        ],
        rooms: ['701', '702']
      },
      {
        name: 'Imperial Castle Heritage Lodge',
        code: 'CASTLE-LODGE',
        description: 'Immersed in the royal history of Gondar beside the 17th-century Fasil Ghebbi royal enclosure. Elegant antique furnishings, woven Ethiopian tapestries, artisanal coffee bar, and private garden courtyard.',
        base_price: 180.00,
        max_adults: 2,
        max_children: 0,
        bed_type: '1 Queen Bed',
        size_sqm: 48,
        featured: false,
        location: 'Fasil Ghebbi Imperial Quarter, Gondar, Ethiopia',
        images: [
          { url: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80', caption: 'Heritage Suite with Carved Teakwood Accents', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80', caption: 'Imperial Courtyard and Jasmine Garden View', is_primary: false }
        ],
        rooms: ['801', '802', '803']
      },
      {
        name: 'Lalibela Rock Monolith Resort',
        code: 'LALIBELA-RESORT',
        description: 'An architectural marvel carved into the hills overlooking the sacred red-tuff rock churches. Featuring custom volcanic stone baths, private sunrise meditation terraces, and locally inspired gourmet dining.',
        base_price: 260.00,
        max_adults: 3,
        max_children: 1,
        bed_type: '2 Queen Beds',
        size_sqm: 62,
        featured: true,
        location: 'Panoramic Rock-Hewn Vista, Lalibela, Amhara, Ethiopia',
        images: [
          { url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80', caption: 'Monolithic Stone Architecture Suite', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80', caption: 'Sunrise Terrace overlooking the Biblical Valleys', is_primary: false }
        ],
        rooms: ['901', '902', '903']
      }
    ];

    for (const h of newHotels) {
      // Check if already exists
      const existing = await client.query('SELECT id FROM room_types WHERE code = $1', [h.code]);
      let typeId;
      if (existing.rows.length === 0) {
        const res = await client.query(`
          INSERT INTO room_types (name, code, description, base_price, max_adults, max_children, bed_type, size_sqm, featured, location)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `, [h.name, h.code, h.description, h.base_price, h.max_adults, h.max_children, h.bed_type, h.size_sqm, h.featured, h.location]);
        typeId = res.rows[0].id;
      } else {
        typeId = existing.rows[0].id;
        await client.query('UPDATE room_types SET location = $1 WHERE id = $2', [h.location, typeId]);
      }

      // Images
      let sort = 0;
      for (const img of h.images) {
        await client.query(`
          INSERT INTO room_images (room_type_id, url, caption, is_primary, sort_order)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [typeId, img.url, img.caption, img.is_primary, sort++]);
      }

      // Physical Rooms
      for (const rNum of h.rooms) {
        await client.query(`
          INSERT INTO rooms (room_number, floor, room_type_id, status, is_active)
          VALUES ($1, $2, $3, 'Available', true)
          ON CONFLICT (room_number) DO NOTHING
        `, [rNum, parseInt(rNum.charAt(0)), typeId]);
      }
    }

    await client.query('COMMIT');
    console.log('Successfully inserted 4 new hotels! Total hotels: 10.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding hotels:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

addHotelsAndLocations();
