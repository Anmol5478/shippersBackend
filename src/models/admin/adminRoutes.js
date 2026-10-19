const express = require("express");
const router = express.Router();

const controller = require("./adminController");
const { authenticate, requireAdmin } = require("./adminMiddleware");

// Admin login is public, but only an account with the configured admin role
// receives a token from this route.
router.post("/login", controller.login);

// All routes below this point require a valid JWT and administrator role.
router.use(authenticate, requireAdmin);

router.get("/me", controller.me);
router.get("/dashboard", controller.dashboard);
router.get("/users", controller.users);
router.get("/rides", controller.rides);
router.get("/bookings", controller.bookings);
router.get("/kyc", controller.kycApplications);

module.exports = router;
