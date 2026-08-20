const db = require("../../config/db");

exports.searchCities = async (req, res) => {
  try {
    const search = req.query.search?.trim();

    if (!search) {
      return res.json([]);
    }

    const [cities] = await db.query(
      `
      SELECT
        id,
        city_name,
        state
      FROM cities
      WHERE city_name LIKE ?
      AND is_active = 1
      ORDER BY city_name
      LIMIT 10
      `,
      [`${search}%`]
    );

    res.status(200).json(cities);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};