const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const db = require("./config/db");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const authRoutes = require("./models/auth/authRoutes");
const cityRoutes = require("./models/cities/cityRoutes");
const forgotPasswordRoutes = require("./models/forgotpassword/forgotPasswordRoutes");
const kycRoutes = require("./models/kyc/kycRoutes");
const rideRoutes = require("./models/rides/rideRoutes");
const profileRoutes = require("./models/profile/profileRoutes");
const bookingRoutes = require("./models/bookings/bookingRoutes");
const enterpriseRoutes = require("./models/enterprise/enterpriseRoutes");
const walletRoutes = require("./models/wallet/walletRoutes");
const adminRoutes = require("./models/admin/adminRoutes");
const notificationRoutes = require("./models/notifications/notificationRoutes");

app.post("/health/database", async (_req, res) => {
  try {
    const [rows] = await db.query("SELECT DATABASE() AS databaseName");
    res.json({ success: true, database: rows[0].databaseName, message: "Connected successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/auth", forgotPasswordRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/enterprise", enterpriseRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/health/ping-server-9x7k", (_req, res) =>
  res.status(200).json({ success: true })
);
app.post("/health/ping-server-9x7k", (_req, res) => res.status(200).json({ success: true }));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
