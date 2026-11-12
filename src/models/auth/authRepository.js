const db = require("../../config/db");

const findUserByEmail = async (email) => {
  const [rows] = await db.query(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );

  return rows[0];
};

const findUserByPhone = async (phone) => {
  const [rows] = await db.query(
    "SELECT * FROM users WHERE phone = ?",
    [phone]
  );

  return rows[0];
};

const findUser = async (loginId) => {
  const [rows] = await db.query(
    `
      SELECT *
      FROM users
      WHERE email = ? OR phone = ?
    `,
    [loginId, loginId]
  );

  return rows[0];
};

/* =================================
   FIND USER KYC
================================= */

const findKycByUserId = async (userId) => {
  const [rows] = await db.execute(
    `
      SELECT
        id,
        user_id,
        aadhaar_front_document_key,
        aadhaar_back_document_key,
        pan_document_key,
        selfie_document_key,
        kyc_status,
        rejection_reason,
        approved_by,
        created_at,
        updated_at
      FROM user_kyc
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

/* ================================
   GENERATE USER ID
================================ */

const generateCustomUserId = async (connection) => {
  await connection.execute(
    `
      INSERT INTO user_id_sequences (id, last_value)
      VALUES (1, LAST_INSERT_ID(1))
      ON DUPLICATE KEY UPDATE
      last_value = LAST_INSERT_ID(last_value + 1)
    `
  );

  const [rows] = await connection.execute(
    "SELECT LAST_INSERT_ID() AS nextNumber"
  );

  const nextNumber = Number(rows[0].nextNumber);

  return {
    user_id: `USR${String(nextNumber).padStart(4, "0")}`,
    fk_user_id: nextNumber,
  };
};

/* ================================
   CREATE USER
================================ */

const createUser = async (user) => {
  const connection = await db.getConnection();

  try {
    const {
      full_name,
      email,
      phone,
      password,
      gender,
      role,
    } = user;

    const generatedId =
      await generateCustomUserId(connection);

    const { user_id, fk_user_id } = generatedId;

    const [result] = await connection.execute(
      `
        INSERT INTO users (
          fk_user_id,
          user_id,
          full_name,
          email,
          phone,
          password,
          gender,
          role
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        fk_user_id,
        user_id,
        full_name,
        email,
        phone,
        password,
        gender,
        Number(role),
      ]
    );

    return {
      id: result.insertId,
      fk_user_id,
      user_id,
    };

  } finally {
    connection.release();
  }
};

const updatePassword = async (email, password) => {
  await db.query(
    `
      UPDATE users
      SET password = ?
      WHERE email = ?
    `,
    [password, email]
  );
};const getKycSummaryByUserId = async (userId) => {
  const [rows] = await db.execute(
    `
      SELECT
        kyc_status,
        aadhaar_front_document_key,
        aadhaar_back_document_key,
        pan_document_key,
        selfie_document_key
      FROM user_kyc
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

module.exports = {
  findUserByEmail,
  findUserByPhone,
  findUser,
  findKycByUserId,
  generateCustomUserId,
  createUser,
  updatePassword,
  getKycSummaryByUserId,
};