const db = require("../../config/db");

/**
 * Search available active rides with traveller details
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

    INNER JOIN users
      ON rides.user_id = users.user_id

    WHERE rides.status = 'active'
  `;

  const params = [];

  // =========================
  // FROM CITY
  // =========================

  if (from) {
    query += `
      AND LOWER(rides.pickup_city) = LOWER(?)
    `;

    params.push(from);
  }

  // =========================
  // TO CITY
  // =========================

  if (to) {
    query += `
      AND LOWER(rides.drop_city) = LOWER(?)
    `;

    params.push(to);
  }

  // =========================
  // TRAVEL DATE
  // =========================

  if (date) {
    query += `
      AND rides.travel_date = ?
    `;

    params.push(date);
  }

  // =========================
  // WEIGHT RANGE
  // =========================

  if (
    minWeight !== null &&
    maxWeight !== null
  ) {
    query += `
      AND rides.available_weight BETWEEN ? AND ?
    `;

    params.push(
      minWeight,
      maxWeight
    );
  }

  // =========================
  // MINIMUM WEIGHT
  // =========================

  else if (minWeight !== null) {
    query += `
      AND rides.available_weight >= ?
    `;

    params.push(minWeight);
  }

  // =========================
  // SORTING
  // =========================

  query += `
    ORDER BY
      rides.travel_date ASC,
      rides.departure_time ASC
  `;

  const [rows] = await db.query(
    query,
    params
  );

  return rows;
};

/**
 * Get all rides published by a specific user
 */
const getUserRides = async (user_id) => {
  const query = `
    SELECT
      id,
      user_id,

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

      status,
      notes,

      created_at,
      updated_at

    FROM rides

    WHERE user_id = ?

    ORDER BY
      travel_date DESC,
      departure_time DESC
  `;

  const [rows] = await db.query(
    query,
    [user_id]
  );

  return rows;
};

/**
 * Create a new ride
 */
const createRide = async ({
  user_id,

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

  notes,
}) => {
  const query = `
    INSERT INTO rides (
      user_id,

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
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?
    )
  `;

  const params = [
    user_id,

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

    notes,
  ];

  const [result] = await db.query(
    query,
    params
  );

  return {
    id: result.insertId,

    user_id,

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

    status: "active",

    notes,
  };
};

module.exports = {
  searchRides,
  getUserRides,
  createRide,
};