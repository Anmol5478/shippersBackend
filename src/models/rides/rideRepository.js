const db = require("../../config/db");

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
      traveller_user_id,
      pickup_city,
      pickup_state,
      drop_city,
      drop_state,
      travel_date,
      departure_time,
      available_weight,
      status,
      notes
    FROM rides
    WHERE status = 'active'
  `;

  const params = [];

  if (from) {
    query += `
      AND LOWER(pickup_city) = LOWER(?)
    `;
    params.push(from);
  }

  if (to) {
    query += `
      AND LOWER(drop_city) = LOWER(?)
    `;
    params.push(to);
  }

  if (date) {
    query += `
      AND travel_date = ?
    `;
    params.push(date);
  }

  // Weight range: 1-3, 3-5, 5-10
  if (minWeight !== null && maxWeight !== null) {
    query += `
      AND available_weight BETWEEN ? AND ?
    `;

    params.push(minWeight, maxWeight);
  }

  // Weight: 10+
  else if (minWeight !== null) {
    query += `
      AND available_weight >= ?
    `;

    params.push(minWeight);
  }

  query += `
    ORDER BY travel_date ASC, departure_time ASC
  `;

  const [rows] = await db.query(query, params);

  return rows;
};

module.exports = {
  searchRides,
};