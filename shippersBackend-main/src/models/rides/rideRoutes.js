const express = require("express");
const multer = require("multer");

const router = express.Router();

const rideController =
  require("./rideController");

const authenticate =
  require("../../middleware/authenticate");

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
 *     description: Search active rides based on pickup city, destination city, available weight, and travel date.
 *     tags:
 *       - Rides
 *
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *         example: Ghaziabad
 *         description: Pickup city
 *
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *         example: Dehradun
 *         description: Destination city
 *
 *       - in: query
 *         name: weight
 *         required: false
 *         schema:
 *           type: string
 *         example: 1-3
 *         description: Weight range. Examples are 1-3, 3-5, or 5+
 *
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-08-30
 *         description: Travel date
 *
 *     responses:
 *       200:
 *         description: Rides fetched successfully
 */
router.get(
  "/search",
  rideController.searchRides
);

/**
 * @swagger
 * /api/rides/user/{userId}:
 *   get:
 *     summary: Get rides published by a user
 *     description: Returns all rides published by a specific user.
 *     tags:
 *       - Rides
 *
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: U0001
 *         description: User ID of the ride publisher
 *
 *     responses:
 *       200:
 *         description: User rides fetched successfully
 */
router.get(
  "/user/:userId",
  rideController.getUserRides
);

/**
 * @swagger
 * /api/rides/calculate-routes:
 *   post:
 *     summary: Calculate alternative routes
 *     description: Calculates alternative driving routes between a pickup location and a drop location using Ola Maps.
 *     tags:
 *       - Rides
 *
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *
 *             required:
 *               - pickup
 *               - drop
 *
 *             properties:
 *
 *               pickup:
 *                 type: object
 *                 required:
 *                   - latitude
 *                   - longitude
 *
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     format: double
 *                     example: 28.6139
 *
 *                   longitude:
 *                     type: number
 *                     format: double
 *                     example: 77.2090
 *
 *               drop:
 *                 type: object
 *                 required:
 *                   - latitude
 *                   - longitude
 *
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     format: double
 *                     example: 26.9124
 *
 *                   longitude:
 *                     type: number
 *                     format: double
 *                     example: 75.7873
 *
 *     responses:
 *
 *       200:
 *         description: Routes calculated successfully
 *
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *
 *               properties:
 *
 *                 responseCode:
 *                   type: string
 *                   example: "00"
 *
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 message:
 *                   type: string
 *                   example: Routes calculated successfully
 *
 *                 data:
 *                   type: array
 *
 *                   items:
 *                     type: object
 *
 *                     properties:
 *
 *                       route_index:
 *                         type: integer
 *                         example: 0
 *
 *                       distance_km:
 *                         type: number
 *                         format: double
 *                         example: 285.10
 *
 *                       duration_minutes:
 *                         type: integer
 *                         example: 305
 *
 *                       polyline:
 *                         type: string
 *                         nullable: true
 *                         example: "encoded_polyline_here"
 *
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         example: "Delhi to Jaipur"
 *
 *       400:
 *         description: Invalid request or route calculation failed
 *
 *       401:
 *         description: Unauthorized
 *
 *       500:
 *         description: Internal server error
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
 *     summary: Create a new journey
 *     description: Creates a new ride or journey with pickup/drop coordinates and selected route information.
 *     tags:
 *       - Rides
 *
 *     requestBody:
 *       required: true
 *
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *
 *             required:
 *               - user_id
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
 *
 *             properties:
 *
 *               user_id:
 *                 type: string
 *                 example: U0001
 *
 *               pickup_city:
 *                 type: string
 *                 example: Ghaziabad
 *
 *               pickup_state:
 *                 type: string
 *                 example: Uttar Pradesh
 *
 *               pickup_latitude:
 *                 type: number
 *                 format: double
 *                 example: 28.6692
 *
 *               pickup_longitude:
 *                 type: number
 *                 format: double
 *                 example: 77.4538
 *
 *               drop_city:
 *                 type: string
 *                 example: Dehradun
 *
 *               drop_state:
 *                 type: string
 *                 example: Uttarakhand
 *
 *               drop_latitude:
 *                 type: number
 *                 format: double
 *                 example: 30.3165
 *
 *               drop_longitude:
 *                 type: number
 *                 format: double
 *                 example: 78.0322
 *
 *               travel_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-09-30"
 *
 *               departure_time:
 *                 type: string
 *                 example: "09:30:00"
 *
 *               available_weight:
 *                 type: number
 *                 example: 10
 *
 *               price_per_kg:
 *                 type: number
 *                 example: 80
 *
 *               route_index:
 *                 type: integer
 *                 example: 0
 *
 *               route_distance_km:
 *                 type: number
 *                 format: double
 *                 example: 285.10
 *
 *               route_duration_minutes:
 *                 type: integer
 *                 example: 305
 *
 *               route_polyline:
 *                 type: string
 *                 example: "encoded_polyline_here"
 *
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 example: Travelling by car.
 *
 *     responses:
 *
 *       201:
 *         description: Journey created successfully
 *
 *       400:
 *         description: Invalid journey data
 */
router.post(
  "/",
  authenticate,

  upload.fields([
    {
      name: "ticket",
      maxCount: 1,
    },
    {
      name: "vehicle_photo",
      maxCount: 1,
    },
    {
      name: "dl",
      maxCount: 1,
    },
    {
      name: "rc",
      maxCount: 1,
    },
  ]),

  rideController.createRide
);

module.exports = router;