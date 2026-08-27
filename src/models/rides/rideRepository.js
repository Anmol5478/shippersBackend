const db = require("../../config/db");

/**
 * Search available rides with traveller details
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

      rides.drop_city,
      rides.drop_state,

      rides.travel_date,
      rides.departure_time,

      rides.available_weight,
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
  // WEIGHT 5+
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