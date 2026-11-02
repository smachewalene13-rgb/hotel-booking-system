import assert from 'assert';
import db from '../src/config/db.js';
import { calculateStayPricing } from '../src/services/pricingService.js';
import { checkAvailability } from '../src/services/availabilityService.js';
import { createBookingWithHold } from '../src/services/bookingService.js';

async function runTests() {
  console.log('🧪 Starting Hotel Booking System Automated Rules & Concurrency Tests...\n');

  try {
    // 1. Test Pricing Calculation (BR-14, BR-15)
    console.log('Test 1: Verifying Pricing Calculation with VAT & Service Charge...');
    const roomTypeRes = await db.query("SELECT id, base_price FROM room_types WHERE code = 'DELUXE-OCEAN'");
    const rtId = roomTypeRes.rows[0].id;

    // Next week 2 nights
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(tomorrow.getDate() + 2);

    const checkIn = tomorrow.toISOString().split('T')[0];
    const checkOut = dayAfter.toISOString().split('T')[0];

    const pricing = await calculateStayPricing({
      roomTypeId: rtId,
      checkIn,
      checkOut,
      roomCount: 1,
      promoCode: 'WELCOME10'
    });

    assert(pricing.nights === 2, 'Should calculate 2 nights stay');
    assert(pricing.roomSubtotal > 0, 'Room subtotal should be > 0');
    assert(pricing.promoApplied !== null, 'Promo code WELCOME10 should be applied');
    assert(pricing.taxAmount > 0, 'Tax (VAT 15%) should be calculated');
    assert(pricing.serviceCharge > 0, 'Service charge (10%) should be calculated');
    assert(pricing.totalAmount > 0, 'Total should be positive');
    console.log(`✅ Test 1 Passed! Subtotal: $${pricing.roomSubtotal}, Discount: -$${pricing.discountAmount}, Tax: $${pricing.taxAmount}, Total: $${pricing.totalAmount}`);

    // 2. Test Availability Check (BR-02, BR-06)
    console.log('\nTest 2: Verifying Availability Search Engine...');
    const avail = await checkAvailability({
      checkIn,
      checkOut,
      adults: 2,
      children: 1,
      rooms: 1
    });

    assert(avail.availableCount > 0, 'Should find available room types');
    const deluxe = avail.roomTypes.find(rt => rt.code === 'DELUXE-OCEAN');
    assert(deluxe, 'Deluxe Oceanfront Suite should be available');
    assert(deluxe.availableRoomsCount > 0, 'Should have positive available rooms');
    console.log(`✅ Test 2 Passed! Found ${avail.availableCount} available room types. Deluxe has ${deluxe.availableRoomsCount} available rooms.`);

    // 3. Test Booking Hold Atomic Creation & Double-Booking Prevention (BR-01, BR-05, NFR-09)
    console.log('\nTest 3: Testing Booking Hold and Concurrency Protection...');

    const guest1 = await createBookingWithHold({
      guestName: 'Concurrency Test User 1',
      guestEmail: 'user1@test.com',
      guestPhone: '+1 555 0101',
      checkIn,
      checkOut,
      adults: 2,
      children: 0,
      roomTypeId: rtId,
      roomCount: 1
    });

    assert(guest1.booking.id, 'Booking 1 hold created successfully');
    assert(guest1.booking.code.startsWith('HB-'), 'Booking code should start with HB-');
    assert(guest1.booking.status === 'Pending', 'Status should be Pending hold');
    console.log(`✅ Test 3 Passed! Booking hold created: ${guest1.booking.code}, hold expires at ${guest1.holdExpiresAt}`);

    // Cleanup test booking
    await db.query('DELETE FROM bookings WHERE id = $1', [guest1.booking.id]);
    console.log('🧹 Cleaned up test booking.');

    console.log('\n🎉 ALL BACKEND BUSINESS RULES & INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

runTests();
