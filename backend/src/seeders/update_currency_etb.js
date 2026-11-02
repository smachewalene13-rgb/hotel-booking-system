import db from '../config/db.js';

async function updateCurrency() {
  try {
    await db.query("UPDATE hotel_settings SET currency = 'ETB', currency_symbol = 'ETB '");
    const res = await db.query("SELECT currency, currency_symbol FROM hotel_settings");
    console.log("Updated settings:", res.rows);
    process.exit(0);
  } catch (err) {
    console.error("Error updating currency:", err);
    process.exit(1);
  }
}

updateCurrency();
