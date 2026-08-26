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
      prefix = "U";
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
      SELECT user_id
      FROM users
      WHERE role = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [role]
  );

  let nextNumber = 1;

  if (rows.length > 0 && rows[0].user_id) {
    const lastUserId = rows[0].user_id;

    const lastNumber = Number(
      lastUserId.substring(1)
    );

    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(padding, "0")}`;
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
    role = 2,
  } = user;

  // Generate U0001 / D0001 / A001
  const user_id = await generateCustomUserId(role);

  const [result] = await db.query(
    `
      INSERT INTO users
      (
        user_id,
        full_name,
        email,
        phone,
        password,
        gender,
        role
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      user_id,
      full_name,
      email,
      phone,
      password,
      gender,
      role,
    ]
  );

  return {
    id: result.insertId,
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
};


module.exports = {
  findUserByEmail,
  findUserByPhone,
  findUser,
  generateCustomUserId,
  createUser,
  updatePassword,
};