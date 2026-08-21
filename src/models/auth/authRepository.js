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
    `SELECT * FROM users
     WHERE email = ? OR phone = ?`,
    [loginId, loginId]
  );

  return rows[0];
};

const createUser = async (user) => {
  const { full_name, email, phone, password, gender,role } = user;

  const [result] = await db.query(
    `INSERT INTO users
(full_name,email,phone,password,gender,role)
VALUES (?,?,?,?,?,?)`,
    [
      full_name,
      email,
      phone,
      password,
      gender,
      role || 2,
    ]
  );

  return result.insertId;
};
const updatePassword = async (
    email,
    password
) => {

    await db.query(

        `
        UPDATE users
        SET password=?
        WHERE email=?
        `,

        [
            password,
            email
        ]

    );

};

module.exports = {
  findUserByEmail,
  findUserByPhone,
  createUser,
  updatePassword,
  findUser
};