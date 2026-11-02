import db from '../config/db.js';

async function addTwoMoreHotels() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const newHotels = [
      {
        name: 'Bale Mountains Alpine Cloud Lodge',
        code: 'BALE-ALPINE',
        description: 'Nestled at the edge of the mystical Harenna Cloud Forest in Bale Mountains National Park. Features panoramic floor-to-ceiling wilderness glazing, Swedish wood-burning stove, sheepskin throws, local wild forest coffee ritual, and a private wildlife stargazing deck.',
        base_price: 310.00,
        max_adults: 2,
        max_children: 1,
        bed_type: '1 King Bed',
        size_sqm: 70,
        featured: true,
        location: 'Harenna Cloud Forest Ridge, Bale Mountains National Park, Ethiopia',
        images: [
          { url: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80', caption: 'Alpine Cloud Forest Timber Lodge', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80', caption: 'Starlight Mountain Veranda and Hearth', is_primary: false }
        ],
        rooms: ['1001', '1002', '1003']
      },
      {
        name: 'Lake Tana Island Monastery Haven',
        code: 'TANA-ISLAND',
        description: 'Perched on a tranquil private peninsula along the serene shores of Lake Tana, the historic source of the Blue Nile. Handcrafted local stone and timber architecture, private boat marina, mango grove garden pavilions, and panoramic sunset infinity pool.',
        base_price: 240.00,
        max_adults: 3,
        max_children: 1,
        bed_type: '2 Queen Beds',
        size_sqm: 68,
        featured: true,
        location: 'Zeghe Peninsula Waterfront, Lake Tana, Bahir Dar, Ethiopia',
        images: [
          { url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80', caption: 'Private Peninsula Lakeside Sanctuary', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80', caption: 'Lakefront Sun Terrace and Living Pavilion', is_primary: false }
        ],
        rooms: ['1101', '1102', '1103']
      }
    ];

    for (const h of newHotels) {
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
        await client.query('UPDATE room_types SET location = $1, description = $2, base_price = $3 WHERE id = $4', [h.location, h.description, h.base_price, typeId]);
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

      // Rooms
      for (const rNum of h.rooms) {
        await client.query(`
          INSERT INTO rooms (room_number, floor, room_type_id, status, is_active)
          VALUES ($1, $2, $3, 'Available', true)
          ON CONFLICT (room_number) DO NOTHING
        `, [rNum, parseInt(rNum.slice(0, 2)) || 1, typeId]);
      }
    }

    await client.query('COMMIT');
    console.log('Successfully added 2 new hotels! Total hotels: 12.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding 2 hotels:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

addTwoMoreHotels();
