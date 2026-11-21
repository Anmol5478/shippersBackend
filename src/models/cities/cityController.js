const db = require("../../config/db");

exports.searchCities = async (req, res) => {
  try {
    const search = req.body?.search?.trim();

    let query = `
      SELECT
        id,
        city_name,
        state,
        latitude,
        longitude
      FROM cities
      WHERE 1 = 1
    `;

    const params = [];

    if (search) {
      // Match anywhere so compound / locality-style names work when present in DB
      // e.g. "Delhi" matches "New Delhi", "South Delhi", etc.
      query += ` AND (
        LOWER(city_name) LIKE LOWER(?)
        OR LOWER(CONCAT(COALESCE(city_name, ''), ', ', COALESCE(state, ''))) LIKE LOWER(?)
      )`;
      const like = `%${search}%`;
      params.push(like, like);

      query += `
        ORDER BY
          CASE WHEN LOWER(city_name) LIKE LOWER(?) THEN 0 ELSE 1 END,
          city_name
        LIMIT 40
      `;
      params.push(`${search}%`);
    } else {
      query += `
        ORDER BY city_name
        LIMIT 40
      `;
    }

    const [cities] = await db.query(query, params);

    return res.status(200).json(cities);
  } catch (err) {
    console.error("SQL Error:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};
