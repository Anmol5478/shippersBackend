const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {}, // Required for TiDB Cloud
  waitForConnections: true,
  connectionLimit: 10,
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ DB Connection Failed:", err.message);
    return;
  }

  console.log("✅ Connected to TiDB successfully!");
  connection.release();
});

module.exports = db.promise();