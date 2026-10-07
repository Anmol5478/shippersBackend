const db = require("../../config/db");

/**
 * Search available active rides
 */
const searchRides = async ({
  from,
  to,
  minWeight,
  maxWeight,
  date,
}) => {
  let query = `
    SELECT
      rides.id,
      rides.user_id,

      users.full_name AS traveller_name,
      users.phone AS traveller_phone,

      rides.transport_type,
      rides.transport_mode,

      rides.pickup_city,
      rides.pickup_state,
      rides.pickup_latitude,
      rides.pickup_longitude,

      rides.drop_city,
      rides.drop_state,
      rides.drop_latitude,
      rides.drop_longitude,

      rides.travel_date,
      rides.departure_time,

      rides.available_weight,
      rides.price_per_kg,

      COALESCE(
        (
          SELECT SUM(b.package_weight_kg)
          FROM bookings b
          WHERE b.ride_id = rides.id
            AND b.booking_status IN (
              'PENDING',
              'CONFIRMED',
              'PICKUP_PENDING',
              'PICKED_UP',
              'IN_TRANSIT'
            )
        ),
        0
      ) AS booked_weight,

      (
        rides.available_weight -
        COALESCE(
          (
            SELECT SUM(b.package_weight_kg)
            FROM bookings b
            WHERE b.ride_id = rides.id
              AND b.booking_status IN (
                'PENDING',
                'CONFIRMED',
                'PICKUP_PENDING',
                'PICKED_UP',
                'IN_TRANSIT'
              )
          ),
          0
        )
      ) AS remaining_weight,

      rides.route_index,
      rides.route_distance_km,
      rides.route_duration_minutes,
      rides.route_polyline,

      rides.status,
      rides.notes,
      rides.created_at,
      rides.updated_at

    FROM rides

    INNER JOIN users
      ON rides.user_id = users.user_id

    WHERE rides.status = 'active'
  `;

  const params = [];

  if (from) {
    query += `
      AND LOWER(rides.pickup_city)
      = LOWER(?)
    `;

    params.push(from);
  }

  if (to) {
    query += `
      AND LOWER(rides.drop_city)
      = LOWER(?)
    `;

    params.push(to);
  }

  if (date) {
    query += `
      AND rides.travel_date = ?
    `;

    params.push(date);
  }


  // Search based on ACTUAL remaining capacity
  if (
    minWeight !== null &&
    maxWeight !== null
  ) {
    query += `
      AND (
        rides.available_weight -
        COALESCE(
          (
            SELECT SUM(
              b.package_weight_kg
            )
            FROM bookings b
            WHERE b.ride_id = rides.id
              AND b.booking_status IN (
                'PENDING',
                'CONFIRMED',
                'PICKUP_PENDING',
                'PICKED_UP',
                'IN_TRANSIT'
              )
          ),
          0
        )
      ) BETWEEN ? AND ?
    `;

    params.push(
      minWeight,
      maxWeight
    );

  } else if (
    minWeight !== null
  ) {
    query += `
      AND (
        rides.available_weight -
        COALESCE(
          (
            SELECT SUM(
              b.package_weight_kg
            )
            FROM bookings b
            WHERE b.ride_id = rides.id
              AND b.booking_status IN (
                'PENDING',
                'CONFIRMED',
                'PICKUP_PENDING',
                'PICKED_UP',
                'IN_TRANSIT'
              )
          ),
          0
        )
      ) >= ?
    `;

    params.push(minWeight);
  }


  // Never return a ride with zero capacity
  query += `
    AND (
      rides.available_weight -
      COALESCE(
        (
          SELECT SUM(
            b.package_weight_kg
          )
          FROM bookings b
          WHERE b.ride_id = rides.id
            AND b.booking_status IN (
              'PENDING',
              'CONFIRMED',
              'PICKUP_PENDING',
              'PICKED_UP',
              'IN_TRANSIT'
            )
        ),
        0
      )
    ) > 0
  `;


  query += `
    ORDER BY
      rides.travel_date ASC,
      rides.departure_time ASC
  `;


  const [rows] =
    await db.query(
      query,
      params
    );

  return rows;
};

/**
 * Get rides published by a user
 */
const getUserRides = async (user_id) => {
  const query = `
    SELECT
      rides.id,
      rides.user_id,
      rides.transport_type,
      rides.transport_mode,
      rides.pickup_city,
      rides.pickup_state,
      rides.pickup_latitude,
      rides.pickup_longitude,
      rides.drop_city,
      rides.drop_state,
      rides.drop_latitude,
      rides.drop_longitude,
      rides.travel_date,
      rides.departure_time,
      rides.available_weight,
      rides.price_per_kg,
      rides.route_index,
      rides.route_distance_km,
      rides.route_duration_minutes,
      rides.route_polyline,
      rides.status,
      rides.notes,
      rides.created_at,
      rides.updated_at
    FROM rides
    WHERE rides.user_id = ?
    ORDER BY
      rides.travel_date DESC,
      rides.departure_time DESC
  `;

  const [rows] = await db.query(query, [user_id]);
  return rows;
};

/**
 * Create ride + travel proof atomically (legacy helper).
 */
const createRideWithProof = async ({ ride, proof }) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const rideId = await insertRideOnly(connection, ride);
    await insertTravelProof(connection, rideId, proof);
    await connection.commit();

    return {
      id: rideId,
      ...ride,
      status: "active",
      proof: {
        pnr_number: proof.pnr_number || null,
        vehicle_number: proof.vehicle_number || null,
        verification_status: "PENDING",
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Insert ride only. Returns rideId.
 * Caller owns the connection transaction.
 */
const insertRideOnly = async (connection, ride) => {
  const rideQuery = `
    INSERT INTO rides (
      user_id,
      transport_type,
      transport_mode,
      pickup_city,
      pickup_state,
      pickup_latitude,
      pickup_longitude,
      drop_city,
      drop_state,
      drop_latitude,
      drop_longitude,
      travel_date,
      departure_time,
      available_weight,
      price_per_kg,
      route_index,
      route_distance_km,
      route_duration_minutes,
      route_polyline,
      notes
    )
    VALUES (
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?
    )
  `;

  const rideParams = [
    ride.user_id,
    ride.transport_type,
    ride.transport_mode,
    ride.pickup_city,
    ride.pickup_state,
    ride.pickup_latitude,
    ride.pickup_longitude,
    ride.drop_city,
    ride.drop_state,
    ride.drop_latitude,
    ride.drop_longitude,
    ride.travel_date,
    ride.departure_time,
    ride.available_weight,
    ride.price_per_kg,
    ride.route_index,
    ride.route_distance_km,
    ride.route_duration_minutes,
    ride.route_polyline,
    ride.notes,
  ];

  const [rideResult] = await connection.execute(
    rideQuery,
    rideParams
  );

  return rideResult.insertId;
};

/**
 * Insert travel proof for an existing ride (same connection).
 */
const insertTravelProof = async (connection, rideId, proof) => {
  const proofQuery = `
    INSERT INTO ride_travel_proof (
      ride_id,
      ticket_document_key,
      pnr_number,
      vehicle_number,
      vehicle_photo_key,
      dl_document_key,
      rc_document_key,
      verification_status
    )
    VALUES (
      ?, ?, ?,
      ?, ?, ?, ?,
      'PENDING'
    )
  `;

  const proofParams = [
    rideId,
    proof.ticket_document_key || null,
    proof.pnr_number || null,
    proof.vehicle_number || null,
    proof.vehicle_photo_key || null,
    proof.dl_document_key || null,
    proof.rc_document_key || null,
  ];

  await connection.execute(proofQuery, proofParams);
};

/**
 * Get ride proof.
 */
const getRideProof = async (rideId) => {
  const query = `
    SELECT
      id,
      ride_id,
      ticket_document_key,
      pnr_number,
      vehicle_number,
      vehicle_photo_key,
      dl_document_key,
      rc_document_key,
      verification_status,
      rejection_reason,
      verified_by,
      created_at,
      updated_at
    FROM ride_travel_proof
    WHERE ride_id = ?
    LIMIT 1
  `;

  const [rows] = await db.query(query, [rideId]);
  return rows[0] || null;
};

/**
 * Get a booking together with its ride owner.
 * This is intentionally kept in the rides repository because
 * booking approval/rejection is a driver/ride-owner action.
 */
const getBookingForStatusUpdate = async (bookingId) => {
  const [rows] = await db.execute(
    `
      SELECT
        b.id,
        b.ride_id,
        b.sender_id,
        b.driver_id,
        b.booking_status,
        r.user_id AS ride_owner_id
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
 * Update booking status after the ride-owner authorization
 * has already been verified by the service.
 */
const updateBookingStatus = async (bookingId, status) => {
  const [result] = await db.execute(
    `
      UPDATE bookings
      SET booking_status = ?
      WHERE id = ?
        AND booking_status = 'PENDING'
    `,
    [status, bookingId]
  );

  return result.affectedRows > 0;
};

module.exports = {
  searchRides,
  getUserRides,
  createRideWithProof,
  insertRideOnly,
  insertTravelProof,
  getRideProof,
  getBookingForStatusUpdate,
  updateBookingStatus,
};