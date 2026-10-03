const db = require("../../config/db");

/**
 * Get ride and lock it for booking.
 *
 * FOR UPDATE prevents two users from booking
 * the same remaining capacity simultaneously.
 */
const getRideForBooking = async (connection, rideId) => {
  const [rows] = await connection.execute(
    `
      SELECT
        id,
        user_id,
        pickup_city,
        pickup_state,
        drop_city,
        drop_state,
        travel_date,
        departure_time,
        available_weight,
        price_per_kg,
        status
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
 * Calculate already reserved weight.
 *
 * PENDING and CONFIRMED bookings consume capacity.
 *
 * Cancelled / rejected bookings do not.
 */
const getReservedWeight = async (
  connection,
  rideId
) => {
  const [rows] = await connection.execute(
    `
      SELECT
        COALESCE(
          SUM(package_weight_kg),
          0
        ) AS reserved_weight
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

  return Number(
    rows[0]?.reserved_weight || 0
  );
};


/**
 * Create booking.
 */
const createBooking = async (
  connection,
  booking
) => {
  const query = `
    INSERT INTO bookings (
      booking_reference,
      ride_id,
      shipper_user_id,
      package_weight_kg,
      package_category,
      package_description,
      package_count,
      sender_name,
      sender_phone,
      pickup_address,
      drop_address,
      notes,
      estimated_amount,
      payment_method,
      payment_collection_point,
      payment_status,
      booking_status,
      pickup_otp,
      delivery_otp
    )
    VALUES (
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?,
      ?,
      ?,
      ?, ?,
      'PENDING',
      'PENDING',
      ?, ?
    )
  `;

  const params = [
    booking.booking_reference,
    booking.ride_id,
    booking.shipper_user_id,
    booking.package_weight_kg,

    booking.package_category,
    booking.package_description,
    booking.package_count,

    booking.sender_name,
    booking.sender_phone,

    booking.pickup_address,
    booking.drop_address,

    booking.notes,

    booking.estimated_amount,

    booking.payment_method,
    booking.payment_collection_point,

    booking.pickup_otp,
    booking.delivery_otp,
  ];

  const [result] =
    await connection.execute(
      query,
      params
    );

  return result.insertId;
};


/**
 * Get booking details.
 */
const getBookingById = async (bookingId) => {
  const [rows] = await db.execute(
    `
      SELECT
        b.*,

        r.user_id AS traveller_user_id,
        r.pickup_city,
        r.pickup_state,
        r.drop_city,
        r.drop_state,
        r.travel_date,
        r.departure_time,
        r.available_weight,
        r.price_per_kg,
        r.transport_type,
        r.transport_mode,

        u.full_name AS traveller_name,
        u.phone AS traveller_phone

      FROM bookings b

      INNER JOIN rides r
        ON b.ride_id = r.id

      INNER JOIN users u
        ON r.user_id = u.user_id

      WHERE b.id = ?

      LIMIT 1
    `,
    [bookingId]
  );

  return rows[0] || null;
};


/**
 * Get bookings created by shipper.
 */
const getUserBookings = async (userId) => {
  const [rows] = await db.execute(
    `
      SELECT
        b.*,

        r.user_id AS traveller_user_id,
        r.pickup_city,
        r.pickup_state,
        r.drop_city,
        r.drop_state,
        r.travel_date,
        r.departure_time,
        r.available_weight,
        r.price_per_kg,
        r.transport_type,
        r.transport_mode,

        u.full_name AS traveller_name,
        u.phone AS traveller_phone

      FROM bookings b

      INNER JOIN rides r
        ON b.ride_id = r.id

      INNER JOIN users u
        ON r.user_id = u.user_id

      WHERE b.shipper_user_id = ?

      ORDER BY b.created_at DESC
    `,
    [userId]
  );

  return rows;
};


/**
 * Get bookings received for traveller's rides.
 */
const getTravellerBookings = async (
  userId
) => {
  const [rows] = await db.execute(
    `
      SELECT
        b.*,

        r.pickup_city,
        r.pickup_state,
        r.drop_city,
        r.drop_state,
        r.travel_date,
        r.departure_time,
        r.available_weight,
        r.price_per_kg,
        r.transport_type,
        r.transport_mode,

        u.full_name AS shipper_name,
        u.phone AS shipper_phone

      FROM bookings b

      INNER JOIN rides r
        ON b.ride_id = r.id

      INNER JOIN users u
        ON b.shipper_user_id = u.user_id

      WHERE r.user_id = ?

      ORDER BY b.created_at DESC
    `,
    [userId]
  );

  return rows;
};


/**
 * Update booking status.
 */
const updateBookingStatus = async (
  bookingId,
  status
) => {
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


/**
 * Update payment.
 */
const updatePaymentStatus = async (
  bookingId,
  paymentStatus
) => {
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
  getUserBookings,
  getTravellerBookings,
  updateBookingStatus,
  updatePaymentStatus,
};