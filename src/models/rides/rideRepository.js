const db = require("../../config/db");

/**
 * Search available rides
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
      id,
      user_id,
      pickup_city,
      pickup_state,
      drop_city,
      drop_state,
      travel_date,
      departure_time,
      available_weight,
      status,
      notes,
      created_at,
      updated_at
    FROM rides
    WHERE status = 'active'
  `;

  const params = [];

  // =========================
  // FROM CITY
  // =========================

  if (from) {
    query += `
      AND LOWER(pickup_city) = LOWER(?)
    `;

    params.push(from);
  }

  // =========================
  // TO CITY
  // =========================

  if (to) {
    query += `
      AND LOWER(drop_city) = LOWER(?)
    `;

    params.push(to);
  }

  // =========================
  // TRAVEL DATE
  // =========================

  if (date) {
    query += `
      AND travel_date = ?
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
      AND available_weight BETWEEN ? AND ?
    `;

    params.push(
      minWeight,
      maxWeight
    );
  }

  // =========================
  // WEIGHT 5+
  // =========================

  else if (minWeight !== null) {
    query += `
      AND available_weight >= ?
    `;

    params.push(minWeight);
  }

  // =========================
  // SORTING
  // =========================

  query += `
    ORDER BY
      travel_date ASC,
      departure_time ASC
  `;

  const [rows] = await db.query(
    query,
    params
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
  drop_city,
  drop_state,
  travel_date,
  departure_time,
  available_weight,
  notes,
}) => {
  const query = `
    INSERT INTO rides (
      user_id,
      pickup_city,
      pickup_state,
      drop_city,
      drop_state,
      travel_date,
      departure_time,
      available_weight,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    user_id,
    pickup_city,
    pickup_state,
    drop_city,
    drop_state,
    travel_date,
    departure_time,
    available_weight,
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

    drop_city,
    drop_state,

    travel_date,

    departure_time,

    available_weight,

    status: "active",

    notes,
  };
};

module.exports = {
  searchRides,
  createRide,
};