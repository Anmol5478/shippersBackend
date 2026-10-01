const express = require("express");
const multer = require("multer");

const router = express.Router();

const rideController = require("./rideController");
const authenticate = require("../../middleware/authenticate");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/**
 * @swagger
 * /api/rides/search:
 *   get:
 *     summary: Search available rides
 *     tags:
 *       - Rides
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: weight
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Rides fetched successfully
 */
router.get("/search", rideController.searchRides);

/**
 * @swagger
 * /api/rides/user/{userId}:
 *   get:
 *     summary: Get rides published by a user
 *     tags:
 *       - Rides
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User rides fetched successfully
 */
router.get("/user/:userId", rideController.getUserRides);

/**
 * @swagger
 * /api/rides/calculate-routes:
 *   post:
 *     summary: Calculate alternative routes
 *     tags:
 *       - Rides
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickup
 *               - drop
 *             properties:
 *               pickup:
 *                 type: object
 *                 required:
 *                   - latitude
 *                   - longitude
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               drop:
 *                 type: object
 *                 required:
 *                   - latitude
 *                   - longitude
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *     responses:
 *       200:
 *         description: Routes calculated successfully
 */
router.post(
  "/calculate-routes",
  authenticate,
  rideController.calculateRoutes
);

/**
 * @swagger
 * /api/rides:
 *   post:
 *     summary: Publish a new journey
 *     description: |
 *       Creates a new ride with travel proof documents.
 *       user_id is taken from the JWT — never send it in the body.
 *       Content-Type must be multipart/form-data.
 *     tags:
 *       - Rides
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - transport_type
 *               - transport_mode
 *               - pickup_city
 *               - drop_city
 *               - pickup_latitude
 *               - pickup_longitude
 *               - drop_latitude
 *               - drop_longitude
 *               - travel_date
 *               - departure_time
 *               - available_weight
 *               - price_per_kg
 *               - route_index
 *               - route_distance_km
 *               - route_duration_minutes
 *               - route_polyline
 *             properties:
 *               transport_type:
 *                 type: string
 *                 enum: [PUBLIC_TRANSPORT, PRIVATE_VEHICLE]
 *               transport_mode:
 *                 type: string
 *               pickup_city:
 *                 type: string
 *               pickup_state:
 *                 type: string
 *               pickup_latitude:
 *                 type: number
 *               pickup_longitude:
 *                 type: number
 *               drop_city:
 *                 type: string
 *               drop_state:
 *                 type: string
 *               drop_latitude:
 *                 type: number
 *               drop_longitude:
 *                 type: number
 *               travel_date:
 *                 type: string
 *                 format: date
 *               departure_time:
 *                 type: string
 *               available_weight:
 *                 type: number
 *               price_per_kg:
 *                 type: number
 *               route_index:
 *                 type: integer
 *               route_distance_km:
 *                 type: number
 *               route_duration_minutes:
 *                 type: number
 *               route_polyline:
 *                 type: string
 *               notes:
 *                 type: string
 *               pnr_number:
 *                 type: string
 *               vehicle_number:
 *                 type: string
 *               ticket:
 *                 type: string
 *                 format: binary
 *               dl:
 *                 type: string
 *                 format: binary
 *               rc:
 *                 type: string
 *                 format: binary
 *               vehicle_photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Journey published successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Missing or invalid JWT
 */
router.post(
  "/",
  authenticate,
  upload.fields([
    { name: "ticket", maxCount: 1 },
    { name: "vehicle_photo", maxCount: 1 },
    { name: "dl", maxCount: 1 },
    { name: "rc", maxCount: 1 },
  ]),
  rideController.createRide
);

module.exports = router;