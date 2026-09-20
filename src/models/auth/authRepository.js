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

const generateCustomUserId = async (role) => {
  let prefix;
  let padding;

  switch (Number(role)) {
    case 1:
      prefix = "D";
      padding = 4;
      break;

    case 2:
      prefix = "USR";
      padding = 4;
      break;

    case 3:
      prefix = "A";
      padding = 3;
      break;

    default:
      throw new Error("Invalid role");
  }

  const [rows] = await db.query(
    `
      SELECT fk_user_id
      FROM users
      WHERE role = ?
      ORDER BY fk_user_id DESC
      LIMIT 1
    `,
    [role]
  );

  let nextNumber = 1;

  if (rows.length > 0) {
    nextNumber = Number(rows[0].fk_user_id) + 1;
  }

  const user_id =
    `${prefix}${String(nextNumber).padStart(padding, "0")}`;

  return {
    user_id,
    fk_user_id: nextNumber,
  };
};

/* ================================
   CREATE USER
================================ */

const createUser = async (user) => {
  const {
    full_name,
    email,
    phone,
    password,
    gender,
    role,
  } = user;

  const numericRole = Number(role);

  const generatedId =
    await generateCustomUserId(numericRole);

  const user_id = generatedId.user_id;
  const fk_user_id = generatedId.fk_user_id;

  const [result] = await db.query(
    `
      INSERT INTO users
      (
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
      numericRole,
    ]
  );

  return {
    id: result.insertId,
    fk_user_id,
    user_id,
  };
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