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
      query += ` AND LOWER(city_name) LIKE LOWER(?)`;
      params.push(`${search}%`);
    }

    query += `
      ORDER BY city_name;
    `;

    const [cities] = await db.query(query, params);

    return res.status(200).json(cities);
  } catch (err) {
    console.error("SQL Error:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};