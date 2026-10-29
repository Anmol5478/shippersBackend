const db = require("../../config/db");

const saveResetToken = async (
  email,
  token,
  expiry
) => {
  // Always insert a new row so admin can see full history of requests.
  // (Requires otp.email NOT to be UNIQUE — see MIGRATION.sql)
  await db.query(
    `
    INSERT INTO otp (
      email,
      token,
      expires_at,
      is_used,
      created_at
    )
    VALUES (?, ?, ?, FALSE, NOW())
    `,
    [email, token, expiry]
  );
};

const getResetToken = async (token) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM otp
    WHERE token = ?
      AND is_used = FALSE
      AND expires_at > NOW()
    `,
    [token]
  );

  return rows[0];
};

const markTokenAsUsed = async (id) => {
  await db.query(
    `
    UPDATE otp
    SET is_used = TRUE
    WHERE id = ?
    `,
    [id]
  );
};

module.exports = {
  saveResetToken,
  getResetToken,
  markTokenAsUsed,
};