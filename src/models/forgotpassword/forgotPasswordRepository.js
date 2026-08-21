const db = require("../../config/db");

const saveOTP = async (email, otp, expiry) => {
  await db.query(
    `
    INSERT INTO otp (
      email,
      otp,
      expires_at,
      is_used,
      created_at
    )
    VALUES (?, ?, ?, FALSE, NOW())

    ON DUPLICATE KEY UPDATE
      otp = VALUES(otp),
      expires_at = VALUES(expires_at),
      is_used = FALSE,
      created_at = NOW()
    `,
    [email, otp, expiry]
  );
};

const getOTP = async (email) => {

    const [rows] = await db.query(
        `
        SELECT *
        FROM otp
        WHERE email=?
        `,
        [email]
    );

    return rows[0];
};


module.exports = {

    saveOTP,
    getOTP,


};