const db = require("../../config/db");

const searchRides = async ({
  from,
  to,
  weight,
  date,
}) => {
  let query = `
    SELECT
      r.id,
      r.traveller_id,
      r.pickup_city,
      r.pickup_state,
      r.drop_city,
      r.drop_state,
      r.travel_date,
      r.departure_time,
      r.available_weight,
      r.status,
      r.notes,

      u.full_name,
      u.is_verified

    FROM rides r

    INNER JOIN users u
      ON r.traveller_id = u.id

    WHERE
      r.status = 'active'
      AND u.is_active = 1
  `;

  const params = [];

  if (from) {
    query += `
      AND LOWER(r.pickup_city) = LOWER(?)
    `;

    params.push(from);
  }

  if (to) {
    query += `
      AND LOWER(r.drop_city) = LOWER(?)
    `;

    params.push(to);
  }

  if (date) {
    query += `
      AND r.travel_date = ?
    `;

    params.push(date);
  }

  if (weight) {
    query += `
      AND r.available_weight >= ?
    `;

    params.push(weight);
  }

  query += `
    ORDER BY
      r.travel_date ASC,
      r.departure_time ASC
  `;

  const [rows] = await db.query(
    query,
    params
  );

  return rows;
};

module.exports = {
  searchRides,
};