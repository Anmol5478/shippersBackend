const db = require("../config/db");

/**
 * Throws if the user is blocked (is_blocked = 1).
 * Safe if column is missing: treats as not blocked.
 */
const assertUserNotBlocked = async (userId) => {
  if (!userId) {
    throw new Error("Authenticated user is required");
  }

  try {
    const [rows] = await db.query(
      "SELECT COALESCE(is_blocked, 0) AS is_blocked FROM users WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (!rows[0]) {
      throw new Error("User not found");
    }

    if (Number(rows[0].is_blocked) === 1) {
      throw new Error(
        "Your account has been suspended. You cannot book or publish rides. Contact support."
      );
    }
  } catch (err) {
    // Unknown column → migration not applied yet; allow action
    if (err.message && /Unknown column|is_blocked/i.test(err.message) && !/suspended/i.test(err.message)) {
      return;
    }
    throw err;
  }
};

module.exports = {
  assertUserNotBlocked,
};
