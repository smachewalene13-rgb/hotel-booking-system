-- Hotel Booking System Database Schema (PostgreSQL)
-- Version 1.0 (Production-grade conforming to specification)

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Drop tables in reverse order of dependencies if recreating
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS guest_documents CASCADE;
DROP TABLE IF EXISTS refunds CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS booking_extras CASCADE;
DROP TABLE IF EXISTS booking_rooms CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS room_blocks CASCADE;
DROP TABLE IF EXISTS rate_rules CASCADE;
DROP TABLE IF EXISTS room_images CASCADE;
DROP TABLE IF EXISTS room_type_amenities CASCADE;
DROP TABLE IF EXISTS amenities CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS room_types CASCADE;
DROP TABLE IF EXISTS hotel_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('guest', 'receptionist', 'housekeeping', 'manager', 'admin')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'locked')),
    email_verified BOOLEAN DEFAULT TRUE,
    failed_logins INT DEFAULT 0,
    locked_until TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Hotel Settings
CREATE TABLE hotel_settings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    tagline VARCHAR(255),
    address TEXT NOT NULL,
    city VARCHAR(100) DEFAULT 'Addis Ababa',
    country VARCHAR(100) DEFAULT 'Ethiopia',
    phone VARCHAR(50),
    email VARCHAR(100),
    check_in_time VARCHAR(10) DEFAULT '14:00',
    check_out_time VARCHAR(10) DEFAULT '12:00',
    currency VARCHAR(10) DEFAULT 'USD',
    currency_symbol VARCHAR(5) DEFAULT '$',
    tax_percent NUMERIC(5,2) DEFAULT 15.00,
    service_percent NUMERIC(5,2) DEFAULT 10.00,
    deposit_percent NUMERIC(5,2) DEFAULT 20.00,
    hold_minutes INT DEFAULT 15,
    cancellation_free_hours INT DEFAULT 48,
    cancellation_partial_hours INT DEFAULT 24,
    cancellation_partial_rate NUMERIC(5,2) DEFAULT 50.00,
    no_show_cutoff_time VARCHAR(10) DEFAULT '18:00',
    refund_approval_threshold NUMERIC(12,2) DEFAULT 500.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Room Types
CREATE TABLE room_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    base_price NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
    max_adults INT NOT NULL DEFAULT 2,
    max_children INT NOT NULL DEFAULT 1,
    bed_type VARCHAR(50) NOT NULL,
    size_sqm INT NOT NULL,
    location VARCHAR(255) DEFAULT 'Bole Sub-City, Addis Ababa, Ethiopia',
    is_active BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Rooms (Physical rooms)
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    room_number VARCHAR(20) UNIQUE NOT NULL,
    floor INT NOT NULL,
    room_type_id INT NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
    status VARCHAR(30) DEFAULT 'Available' CHECK (status IN ('Available', 'Occupied', 'Dirty', 'Cleaning', 'Maintenance', 'Out of Service')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Amenities
CREATE TABLE amenities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50) NOT NULL,
    category VARCHAR(50) DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Room Type Amenities (Many-to-Many)
CREATE TABLE room_type_amenities (
    room_type_id INT REFERENCES room_types(id) ON DELETE CASCADE,
    amenity_id INT REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (room_type_id, amenity_id)
);

-- 7. Room Images
CREATE TABLE room_images (
    id SERIAL PRIMARY KEY,
    room_type_id INT REFERENCES room_types(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    caption VARCHAR(200),
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Rate Rules (Overrides, seasonal, weekend)
CREATE TABLE rate_rules (
    id SERIAL PRIMARY KEY,
    room_type_id INT REFERENCES room_types(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    day_of_week INT NULL, -- NULL for all days, or 0 (Sun) to 6 (Sat)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Room Blocks (Maintenance / Owner blocked dates)
CREATE TABLE room_blocks (
    id SERIAL PRIMARY KEY,
    room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Promotions / Discount Codes
CREATE TABLE promotions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value NUMERIC(12,2) NOT NULL CHECK (value > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    usage_limit INT DEFAULT 100,
    used_count INT DEFAULT 0,
    min_nights INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Extra Services (Breakfast, airport transfer, etc.)
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    pricing_type VARCHAR(30) DEFAULT 'per_booking' CHECK (pricing_type IN ('per_booking', 'per_night', 'per_guest', 'per_item')),
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Bookings
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
    guest_name VARCHAR(150) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(50) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    adults INT NOT NULL DEFAULT 1,
    children INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Checked-in', 'Checked-out', 'Cancelled', 'Expired', 'No-Show')),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    service_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
    extras_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    promo_id INT NULL REFERENCES promotions(id),
    hold_expires_at TIMESTAMPTZ NULL,
    special_requests TEXT,
    estimated_arrival_time VARCHAR(20),
    source VARCHAR(30) DEFAULT 'online' CHECK (source IN ('online', 'walk-in', 'phone')),
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_dates CHECK (check_out > check_in)
);

-- 13. Booking Rooms (Assigned physical rooms & snapshots)
CREATE TABLE booking_rooms (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    room_type_id INT NOT NULL REFERENCES room_types(id),
    room_id INT NULL REFERENCES rooms(id) ON DELETE SET NULL,
    nightly_price_snapshot NUMERIC(12,2) NOT NULL,
    stay_range DATERANGE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXCLUDE constraint to ensure no overlapping room assignments (BR-01)
-- Only active when room_id IS NOT NULL and status is not cancelled/expired
ALTER TABLE booking_rooms 
ADD CONSTRAINT no_overlapping_room_assignments 
EXCLUDE USING gist (room_id WITH =, stay_range WITH &&) 
WHERE (room_id IS NOT NULL);

-- 14. Booking Extras / Folio Charges
CREATE TABLE booking_extras (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    service_id INT NULL REFERENCES services(id),
    name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Payments
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    method VARCHAR(50) NOT NULL CHECK (method IN ('credit_card', 'chapa', 'telebirr', 'stripe', 'cash', 'pos_card', 'pay_at_hotel')),
    status VARCHAR(30) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    gateway VARCHAR(50) NOT NULL DEFAULT 'mock',
    gateway_ref VARCHAR(100),
    notes TEXT,
    paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Refunds
CREATE TABLE refunds (
    id SERIAL PRIMARY KEY,
    payment_id INT NOT NULL REFERENCES payments(id),
    booking_id INT NOT NULL REFERENCES bookings(id),
    amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'approved' CHECK (status IN ('pending_approval', 'approved', 'rejected')),
    approved_by INT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Guest Identity Documents (Check-in requirement BR-13, BR-39)
CREATE TABLE guest_documents (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    guest_name VARCHAR(150) NOT NULL,
    id_type VARCHAR(50) NOT NULL CHECK (id_type IN ('Passport', 'National ID', 'Driver License')),
    id_number VARCHAR(100) NOT NULL,
    issuing_country VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Reviews
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    booking_id INT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
    room_type_id INT NOT NULL REFERENCES room_types(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(150),
    comment TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'hidden')),
    reply TEXT NULL,
    reply_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_target VARCHAR(30) NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Audit Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    old_value JSONB NULL,
    new_value JSONB NULL,
    ip VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_rooms_room_type ON rooms(room_type_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_booking_rooms_booking ON booking_rooms(booking_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
