const db = require("../../config/db");

/* ================================
   GET USER PROFILE
================================ */

const getUserProfile = async (user_id) => {
  const query = `
    SELECT
      user_id,
      full_name,
      email,
      phone,
      gender,
      role,
      is_verified,
      profile_image
    FROM users
    WHERE user_id = ?
    LIMIT 1
  `;

  const [rows] = await db.query(
    query,
    [user_id]
  );

  return rows[0] || null;
};


/* ================================
   UPDATE PROFILE IMAGE
================================ */

const updateProfileImage = async (
  user_id,
  profile_image
) => {
  const query = `
    UPDATE users
    SET profile_image = ?
    WHERE user_id = ?
  `;

  const [result] = await db.query(
    query,
    [
      profile_image,
      user_id,
    ]
  );

  if (result.affectedRows === 0) {
    throw new Error("User not found");
  }

  return {
    user_id,
    profile_image,
  };
};


/* ================================
   PROFILE STATS
   Keep your existing stats function
================================ */

const getProfileStats = async (user_id) => {
  const ridesQuery = `
    SELECT COUNT(*) AS published_journeys
    FROM rides
    WHERE user_id = ?
  `;

  const [rideRows] = await db.query(
    ridesQuery,
    [user_id]
  );

  return {
    active_parcels: 0,
    published_journeys:
      rideRows[0]?.published_journeys || 0,
    wallet_balance: 0,
    total_earnings: 0,
  };
};


module.exports = {
  getUserProfile,
  updateProfileImage,

  // Keep this only if it already exists
  getProfileStats,
};