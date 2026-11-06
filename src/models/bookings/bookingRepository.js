const db = require("../../config/db");

/**
 * Get ride and lock it during booking.
 */
const getRideForBooking = async (connection, rideId) => {
  const [rows] = await connection.execute(
    `
      SELECT
        id,
        user_id,
        transport_type,
        transport_mode,
        pickup_city,
        pickup_state,
        drop_city,
        drop_state,
        travel_date,
        departure_time,
        available_weight,
        status,
        price_per_kg
      FROM rides
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [rideId]
  );

  return rows[0] || null;
};

/**
 * Calculate weight already booked for the ride.
 */
const getReservedWeight = async (connection, rideId) => {
  const [rows] = await connection.execute(
    `
      SELECT
        COALESCE(SUM(package_weight_kg), 0) AS reserved_weight
      FROM bookings
      WHERE ride_id = ?
        AND booking_status IN (
          'PENDING',
          'CONFIRMED',
          'PICKUP_PENDING',
          'PICKED_UP',
          'IN_TRANSIT'
        )
    `,
    [rideId]
  );

  return Number(rows[0]?.reserved_weight || 0);
};

/**
 * Create booking.
 */
const createBooking = async (connection, booking) => {
  const [result] = await connection.execute(
    `
      INSERT INTO bookings (
        booking_reference,
        ride_id,
        sender_id,
        driver_id,
        package_weight_kg,
        package_category,
        package_description,
        package_count,
        sender_name,
        sender_phone,
        pickup_address,
        drop_address,
        notes,
        price_per_kg,
        total_amount,
        payment_method,
        payment_collection_point,
        shipment_type,
        enterprise_profile_id,
        business_details_snapshot,
        purchase_bill_status,
        payment_status,
        booking_status,
        pickup_otp,
        delivery_otp
      )
      VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        'PENDING',
        'PENDING',
        ?, ?
      )
    `,
    [
      booking.booking_reference,
      booking.ride_id,
      booking.sender_id,
      booking.driver_id,
      booking.package_weight_kg,
      booking.package_category,
      booking.package_description,
      booking.package_count,
      booking.sender_name,
      booking.sender_phone,
      booking.pickup_address,
      booking.drop_address,
      booking.notes,
      booking.price_per_kg,
      booking.total_amount,
      booking.payment_method,
      booking.payment_collection_point,
      booking.shipment_type || "PERSONAL",
      booking.enterprise_profile_id ?? null,
      booking.business_details_snapshot ?? null,
      booking.purchase_bill_status || "NOT_REQUIRED",
      booking.pickup_otp,
      booking.delivery_otp,
    ]
  );

  return result.insertId;
};

/**
 * Get booking by ID (with ride details).
 */
const getBookingById = async (bookingId) => {
  const [rows] = await db.execute(
    `
      SELECT
        b.*,
        r.user_id AS driver_id_from_ride,
        r.transport_type,
        r.transport_mode,
        r.pickup_city,
        r.pickup_state,
        r.drop_city,
        r.drop_state,
        r.travel_date,
        r.departure_time,
        r.available_weight,
        r.price_per_kg AS ride_price_per_kg,
        r.route_distance_km,
        r.route_duration_minutes,
        r.route_polyline
      FROM bookings b
      INNER JOIN rides r ON b.ride_id = r.id
      WHERE b.id = ?
      LIMIT 1
    `,
    [bookingId]
  );

  return rows[0] || null;
};

/**
 * Get bookings created by sender (shipper).
 */
const getSenderBookings = async (senderId) => {
  const [rows] = await db.execute(
    `
      SELECT
        b.*,
        r.transport_type,
        r.transport_mode,
        r.pickup_city,
        r.pickup_state,
        r.drop_city,
        r.drop_state,
        r.travel_date,
        r.departure_time,
        r.available_weight,
        r.route_distance_km,
        r.route_duration_minutes,
        r.route_polyline
      FROM bookings b
      INNER JOIN rides r ON b.ride_id = r.id
      WHERE b.sender_id = ?
      ORDER BY b.created_at DESC
    `,
    [senderId]
  );

  return rows;
};

/**
 * Get bookings received by driver (traveller).
 */
const getDriverBookings = async (driverId) => {
  const [rows] = await db.execute(
    `
      SELECT
        b.*,
        r.transport_type,
        r.transport_mode,
        r.pickup_city,
        r.pickup_state,
        r.drop_city,
        r.drop_state,
        r.travel_date,
        r.departure_time,
        r.available_weight,
        r.route_distance_km,
        r.route_duration_minutes,
        r.route_polyline
      FROM bookings b
      INNER JOIN rides r ON b.ride_id = r.id
      WHERE b.driver_id = ?
      ORDER BY b.created_at DESC
    `,
    [driverId]
  );

  return rows;
};

/**
 * Update booking status.
 */
const updateBookingStatus = async (bookingId, status) => {
  const [result] = await db.execute(
    `
      UPDATE bookings
      SET booking_status = ?
      WHERE id = ?
    `,
    [status, bookingId]
  );

  return result.affectedRows > 0;
};

const assertBusinessPurchaseBill = async (connection, booking) => {
  if (String(booking.shipment_type || "PERSONAL").toUpperCase() !== "BUSINESS") {
    return;
  }

  if (String(booking.purchase_bill_status || "").toUpperCase() !== "UPLOADED") {
    throw new Error("A business booking requires an uploaded purchase bill before confirmation");
  }

  const [billRows] = await connection.execute(
    `
      SELECT id, uploaded_by, status
      FROM enterprise_bills
      WHERE booking_id = ?
        AND status IN ('UPLOADED', 'UNDER_REVIEW', 'APPROVED')
      ORDER BY uploaded_at DESC
      LIMIT 1
      FOR UPDATE
    `,
    [booking.id]
  );

  const activeBill = billRows[0];
  if (!activeBill) {
    throw new Error("No active purchase bill exists for this business booking");
  }

  if (String(activeBill.uploaded_by) !== String(booking.sender_id)) {
    throw new Error("The active purchase bill does not belong to this booking sender");
  }
};

/**
 * Update payment status.
 */
const updatePaymentStatus = async (bookingId, paymentStatus) => {
  const [result] = await db.execute(
    `
      UPDATE bookings
      SET payment_status = ?
      WHERE id = ?
    `,
    [paymentStatus, bookingId]
  );

  return result.affectedRows > 0;
};

module.exports = {
  getRideForBooking,
  getReservedWeight,
  createBooking,
  getBookingById,
  getSenderBookings,
  getDriverBookings,
  updateBookingStatus,
  assertBusinessPurchaseBill,
  updatePaymentStatus,
};
