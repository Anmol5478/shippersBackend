const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const db = require("./config/db");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

const authRoutes = require("./models/auth/authRoutes");
const cityRoutes = require("./models/cities/cityRoutes");
const forgotPasswordRoutes = require(
  "./models/forgotpassword/forgotPasswordRoutes"
);
const rideRoutes = require("./models/rides/rideRoutes");
const PORT = process.env.PORT || 8000;

app.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT DATABASE() AS databaseName"
    );

    res.json({
      success: true,
      database: rows[0].databaseName,
      message: "Connected successfully",
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/auth", forgotPasswordRoutes);
app.use("/api/rides", rideRoutes);


app.use(
  "/swagger",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);
app.get("/ping-server-9x7k", (req, res) => {
  res.status(200).json({
    success: true,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});