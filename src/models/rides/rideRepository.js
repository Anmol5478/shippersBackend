const db = require("../../config/db");

/**
 * Search available active rides
 */
const searchRides = async ({ from, to, minWeight, maxWeight, date }) => {
  let query = `
    SELECT
      r.id, r.user_id, u.full_name AS traveller_name, u.phone AS traveller_phone,
      r.transport_type, r.transport_mode, r.service_type,
      r.available_seats, r.price_per_seat,
      r.pickup_city, r.pickup_state, r.pickup_latitude, r.pickup_longitude,
      r.drop_city, r.drop_state, r.drop_latitude, r.drop_longitude,
      r.travel_date, r.departure_time, r.available_weight, r.price_per_kg,
      ps.id AS pickup_stop_id, ps.stop_order AS pickup_stop_order,
      ps.city AS selected_pickup_city, ps.state AS selected_pickup_state,
      ds.id AS drop_stop_id, ds.stop_order AS drop_stop_order,
      ds.city AS selected_drop_city, ds.state AS selected_drop_state,
      (
        SELECT MIN(seg.capacity_weight_kg - seg.reserved_weight_kg)
        FROM ride_segments seg
        INNER JOIN ride_stops fs ON fs.id = seg.from_stop_id
        INNER JOIN ride_stops ts ON ts.id = seg.to_stop_id
        WHERE seg.ride_id = r.id
          AND fs.stop_order >= ps.stop_order
          AND ts.stop_order <= ds.stop_order
      ) AS remaining_weight,
      r.route_index, r.route_distance_km, r.route_duration_minutes,
      r.route_polyline, r.status, r.notes, r.created_at, r.updated_at
    FROM rides r
    INNER JOIN users u ON u.user_id = r.user_id
    INNER JOIN ride_stops ps ON ps.ride_id = r.id
    INNER JOIN ride_stops ds ON ds.ride_id = r.id
    WHERE r.status = 'active'
      AND r.service_type IN ('PARCEL','BOTH')
      AND ps.stop_order < ds.stop_order
      AND (
        LOWER(ps.city) = LOWER(?)
        OR LOWER(ps.city) LIKE LOWER(?)
        OR LOWER(CONCAT(COALESCE(ps.city,''), ', ', COALESCE(ps.state,''))) LIKE LOWER(?)
      )
      AND (
        LOWER(ds.city) = LOWER(?)
        OR LOWER(ds.city) LIKE LOWER(?)
        OR LOWER(CONCAT(COALESCE(ds.city,''), ', ', COALESCE(ds.state,''))) LIKE LOWER(?)
      )
      AND (
        SELECT MIN(seg.capacity_weight_kg - seg.reserved_weight_kg)
        FROM ride_segments seg
        INNER JOIN ride_stops fs ON fs.id = seg.from_stop_id
        INNER JOIN ride_stops ts ON ts.id = seg.to_stop_id
        WHERE seg.ride_id = r.id
          AND fs.stop_order >= ps.stop_order
          AND ts.stop_order <= ds.stop_order
      ) > 0
      AND EXISTS (
        SELECT 1
        FROM ride_segments seg
        INNER JOIN ride_stops fs ON fs.id = seg.from_stop_id
        INNER JOIN ride_stops ts ON ts.id = seg.to_stop_id
        WHERE seg.ride_id = r.id
          AND fs.stop_order >= ps.stop_order
          AND ts.stop_order <= ds.stop_order
      )
  `;
  const params = [from, `%${from}%`, `%${from}%`, to, `%${to}%`, `%${to}%`];
  if (date) {
    query += " AND r.travel_date = ?";
    params.push(date);
  }
  if (minWeight !== null && minWeight !== undefined) {
    query += ` AND (
      SELECT MIN(seg.capacity_weight_kg - seg.reserved_weight_kg)
      FROM ride_segments seg
      INNER JOIN ride_stops fs ON fs.id = seg.from_stop_id
      INNER JOIN ride_stops ts ON ts.id = seg.to_stop_id
      WHERE seg.ride_id = r.id
        AND fs.stop_order >= ps.stop_order
        AND ts.stop_order <= ds.stop_order
    ) >= ?`;
    params.push(minWeight);
  }
  if (maxWeight !== null && maxWeight !== undefined) {
    query += ` AND (
      SELECT MIN(seg.capacity_weight_kg - seg.reserved_weight_kg)
      FROM ride_segments seg
      INNER JOIN ride_stops fs ON fs.id = seg.from_stop_id
      INNER JOIN ride_stops ts ON ts.id = seg.to_stop_id
      WHERE seg.ride_id = r.id
        AND fs.stop_order >= ps.stop_order
        AND ts.stop_order <= ds.stop_order
    ) <= ?`;
    params.push(maxWeight);
  }
  query += ` ORDER BY r.travel_date ASC, r.departure_time ASC, ps.stop_order ASC`;
  const [rows] = await db.query(query, params);
  return rows;
};


/**
 * Fetch the cheapest upcoming rides across all routes for the homepage.
 * Capacity is calculated from the minimum remaining capacity across every
 * segment, so a ride is shown only when its full published route still has room.
 */
const getCheapestRides = async ({ serviceType = "PARCEL", limit = 6 }) => {
  const service = String(serviceType).toUpperCase();
  const safeLimit = Math.min(12, Math.max(1, Number.parseInt(limit, 10) || 6));

  const isParcel = service === "PARCEL";
  const priceColumn = isParcel ? "r.price_per_kg" : "r.price_per_seat";
  const remainingColumn = isParcel ? "capacity.remaining_weight" : "capacity.remaining_seats";
  const allowedServices = isParcel ? "('PARCEL', 'BOTH')" : "('PASSENGER', 'BOTH')";

  const query = `
    SELECT
      r.id,
      r.user_id,
      u.full_name AS traveller_name,
      r.transport_type,
      r.transport_mode,
      r.service_type,
      r.pickup_city,
      r.pickup_state,
      r.drop_city,
      r.drop_state,
      r.travel_date,
      r.departure_time,
      r.available_weight,
      r.price_per_kg,
      r.available_seats,
      r.price_per_seat,
      COALESCE(capacity.remaining_weight, 0) AS remaining_weight,
      COALESCE(capacity.remaining_seats, 0) AS remaining_seats,
      r.route_distance_km,
      r.route_duration_minutes,
      r.route_polyline,
      r.status,
      r.notes
    FROM rides r
    INNER JOIN users u ON u.user_id = r.user_id
    INNER JOIN (
      SELECT
        ride_id,
        MIN(capacity_weight_kg - reserved_weight_kg) AS remaining_weight,
        MIN(capacity_seats - reserved_seats) AS remaining_seats
      FROM ride_segments
      GROUP BY ride_id
    ) capacity ON capacity.ride_id = r.id
    WHERE r.status = 'active'
      AND r.service_type IN ${allowedServices}
      AND ${priceColumn} IS NOT NULL
      AND ${remainingColumn} > 0
      AND TIMESTAMP(r.travel_date, r.departure_time) >=
          DATE_ADD(UTC_TIMESTAMP(), INTERVAL 330 MINUTE)
    ORDER BY ${priceColumn} ASC, r.travel_date ASC, r.departure_time ASC, r.id DESC
    LIMIT ${safeLimit}
  `;

  const [rows] = await db.query(query);
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
      rides.service_type,
      rides.available_seats,
      rides.price_per_seat,
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
  for (const ride of rows) {
    const [stops] = await db.query(
      `SELECT id, stop_order, stop_type, city, state, address,
              latitude, longitude, planned_arrival_at, planned_departure_at
       FROM ride_stops WHERE ride_id = ? ORDER BY stop_order`,
      [ride.id]
    );
    const [segments] = await db.query(
      `SELECT id, segment_order, from_stop_id, to_stop_id,
              capacity_weight_kg, reserved_weight_kg, capacity_seats, reserved_seats
       FROM ride_segments WHERE ride_id = ? ORDER BY segment_order`,
      [ride.id]
    );
    ride.stops = stops;
    ride.segments = segments;
  }
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
  // Prefer full_address columns when migration is applied; fall back otherwise.
  const classicParams = [
    ride.user_id,
    ride.transport_type,
    ride.transport_mode,
    ride.service_type || "PARCEL",
    ride.available_seats || 0,
    ride.price_per_seat ?? null,
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

  try {
    const [rideResult] = await connection.execute(
      `
        INSERT INTO rides (
          user_id, transport_type, transport_mode, service_type,
          available_seats, price_per_seat,
          pickup_city, pickup_state, pickup_latitude, pickup_longitude,
          pickup_full_address,
          drop_city, drop_state, drop_latitude, drop_longitude,
          drop_full_address,
          travel_date, departure_time,
          available_weight, price_per_kg,
          route_index, route_distance_km, route_duration_minutes, route_polyline,
          notes
        )
        VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?,
          ?, ?, ?, ?,
          ?
        )
      `,
      [
        ride.user_id,
        ride.transport_type,
        ride.transport_mode,
        ride.service_type || "PARCEL",
        ride.available_seats || 0,
        ride.price_per_seat ?? null,
        ride.pickup_city,
        ride.pickup_state,
        ride.pickup_latitude,
        ride.pickup_longitude,
        ride.pickup_address || ride.pickup_full_address || null,
        ride.drop_city,
        ride.drop_state,
        ride.drop_latitude,
        ride.drop_longitude,
        ride.drop_address || ride.drop_full_address || null,
        ride.travel_date,
        ride.departure_time,
        ride.available_weight,
        ride.price_per_kg,
        ride.route_index,
        ride.route_distance_km,
        ride.route_duration_minutes,
        ride.route_polyline,
        ride.notes,
      ]
    );
    return rideResult.insertId;
  } catch (err) {
    if (err && (err.code === "ER_BAD_FIELD_ERROR" || /Unknown column/i.test(String(err.message)))) {
      const [rideResult] = await connection.execute(
        `
          INSERT INTO rides (
            user_id, transport_type, transport_mode, service_type,
            available_seats, price_per_seat,
            pickup_city, pickup_state, pickup_latitude, pickup_longitude,
            drop_city, drop_state, drop_latitude, drop_longitude,
            travel_date, departure_time,
            available_weight, price_per_kg,
            route_index, route_distance_km, route_duration_minutes, route_polyline,
            notes
          )
          VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            ?, ?,
            ?, ?, ?, ?,
            ?
          )
        `,
        classicParams
      );
      return rideResult.insertId;
    }
    throw err;
  }
};


/**
 * Create ordered stops and adjacent ride segments for a newly published ride.
 * The caller owns the transaction. Existing rides are not rewritten here.
 */
const insertRideStopsAndSegments = async (connection, rideId, ride, intermediateStops = []) => {
  const stops = [
    {
      stop_order: 1,
      stop_type: "START",
      city: ride.pickup_city,
      state: ride.pickup_state,
      latitude: ride.pickup_latitude,
      longitude: ride.pickup_longitude,
      address: ride.pickup_address || null,
      planned_departure_at: `${ride.travel_date} ${ride.departure_time}`,
    },
    ...intermediateStops.map((stop, index) => ({
      stop_order: index + 2,
      stop_type: "INTERMEDIATE",
      city: stop.city,
      state: stop.state || null,
      latitude: stop.latitude ?? null,
      longitude: stop.longitude ?? null,
      address: stop.address || null,
      planned_arrival_at: stop.planned_arrival_at || null,
      planned_departure_at: stop.planned_departure_at || null,
    })),
    {
      stop_order: intermediateStops.length + 2,
      stop_type: "END",
      city: ride.drop_city,
      state: ride.drop_state,
      latitude: ride.drop_latitude,
      longitude: ride.drop_longitude,
      address: ride.drop_address || null,
    },
  ];

  const stopIds = [];
  for (const stop of stops) {
    const [result] = await connection.execute(
      `INSERT INTO ride_stops
        (ride_id, stop_order, stop_type, city, state, address,
         latitude, longitude, planned_arrival_at, planned_departure_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rideId, stop.stop_order, stop.stop_type, stop.city, stop.state,
        stop.address, stop.latitude, stop.longitude,
        stop.planned_arrival_at || null, stop.planned_departure_at || null,
      ]
    );
    stopIds.push(result.insertId);
  }

  const isParcel = ["PARCEL", "BOTH"].includes(ride.service_type || "PARCEL");
  const isPassenger = ["PASSENGER", "BOTH"].includes(ride.service_type || "PARCEL");

  for (let index = 0; index < stopIds.length - 1; index += 1) {
    await connection.execute(
      `INSERT INTO ride_segments
        (ride_id, segment_order, from_stop_id, to_stop_id,
         capacity_weight_kg, reserved_weight_kg, capacity_seats, reserved_seats)
       VALUES (?, ?, ?, ?, ?, 0, ?, 0)`,
      [
        rideId,
        index + 1,
        stopIds[index],
        stopIds[index + 1],
        isParcel ? Number(ride.available_weight || 0) : 0,
        isPassenger ? Number(ride.available_seats || 0) : 0,
      ]
    );
  }

  return { stops: stops.map((stop, index) => ({ ...stop, id: stopIds[index] })), segment_count: stopIds.length - 1 };
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


const searchPassengerRides = async ({ from, to, date, seats = 1 }) => {
  const [rows] = await db.query(
    `SELECT
       r.id, r.user_id, u.full_name AS traveller_name, u.phone AS traveller_phone,
       r.transport_type, r.transport_mode, r.service_type,
       r.travel_date, r.departure_time, r.price_per_seat,
       ps.id AS pickup_stop_id, ps.stop_order AS pickup_stop_order,
       ps.city AS pickup_city, ps.state AS pickup_state,
       ds.id AS drop_stop_id, ds.stop_order AS drop_stop_order,
       ds.city AS drop_city, ds.state AS drop_state,
       (
         SELECT MIN(seg.capacity_seats - seg.reserved_seats)
         FROM ride_segments seg
         INNER JOIN ride_stops fs ON fs.id = seg.from_stop_id
         INNER JOIN ride_stops ts ON ts.id = seg.to_stop_id
         WHERE seg.ride_id = r.id
           AND fs.stop_order >= ps.stop_order
           AND ts.stop_order <= ds.stop_order
       ) AS available_seats,
       r.route_distance_km, r.route_duration_minutes, r.route_polyline,
       r.status, r.notes
     FROM rides r
     INNER JOIN users u ON u.user_id = r.user_id
     INNER JOIN ride_stops ps ON ps.ride_id = r.id
     INNER JOIN ride_stops ds ON ds.ride_id = r.id
     WHERE r.status = 'active'
       AND r.service_type IN ('PASSENGER','BOTH')
       AND ps.stop_order < ds.stop_order
       AND (
         LOWER(ps.city) = LOWER(?)
         OR LOWER(ps.city) LIKE LOWER(?)
         OR LOWER(CONCAT(COALESCE(ps.city,''), ', ', COALESCE(ps.state,''))) LIKE LOWER(?)
       )
       AND (
         LOWER(ds.city) = LOWER(?)
         OR LOWER(ds.city) LIKE LOWER(?)
         OR LOWER(CONCAT(COALESCE(ds.city,''), ', ', COALESCE(ds.state,''))) LIKE LOWER(?)
       )
       AND (? IS NULL OR r.travel_date = ?)
       AND (
         SELECT MIN(seg.capacity_seats - seg.reserved_seats)
         FROM ride_segments seg
         INNER JOIN ride_stops fs ON fs.id = seg.from_stop_id
         INNER JOIN ride_stops ts ON ts.id = seg.to_stop_id
         WHERE seg.ride_id = r.id
           AND fs.stop_order >= ps.stop_order
           AND ts.stop_order <= ds.stop_order
       ) >= ?
     ORDER BY r.travel_date, r.departure_time, ps.stop_order`,
    [
      from, `%${from}%`, `%${from}%`,
      to, `%${to}%`, `%${to}%`,
      date || null, date || null, seats,
    ]
  );
  return rows;
};

module.exports = {
  searchRides,
  searchPassengerRides,
  getCheapestRides,
  getUserRides,
  createRideWithProof,
  insertRideOnly,
  insertRideStopsAndSegments,
  insertTravelProof,
  getRideProof,
  getBookingForStatusUpdate,
  updateBookingStatus,
};