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
 * /api/rides/search-available:
 *   post:
 *     summary: Search available rides using JSON filters
 *     tags: [Rides]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [from, to]
 *             properties:
 *               from: { type: string, example: Ghaziabad }
 *               to: { type: string, example: Delhi }
 *               weight: { type: string, example: "1-3" }
 *               date: { type: string, format: date }
 *     responses:
 *       200: { description: Available rides fetched }
 */
router.post("/search-available", rideController.searchRides);

/**
 * @swagger
 * /api/rides/list-by-user:
 *   post:
 *     summary: List rides published by a user
 *     tags: [Rides]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string, example: D0001 }
 *     responses:
 *       200: { description: User rides fetched }
 */
router.post("/list-by-user", rideController.getUserRides);

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


/**
 * @swagger
 * /api/rides/bookings/{bookingId}/status:
 *   patch:
 *     summary: Driver accepts or rejects a booking
 *     description: |
 *       Accepts or rejects a pending booking received on a ride.
 *       Only the driver/user who published the ride can perform this action.
 *       The driver ID is taken from the authenticated JWT; it must not be sent
 *       by the client.
 *     tags:
 *       - Rides
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 12
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - CONFIRMED
 *                   - REJECTED
 *                   - APPROVED
 *                 example: CONFIRMED
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *       400:
 *         description: Invalid booking status or booking is not pending
 *       401:
 *         description: Unauthorized
 */
router.patch(
  "/bookings/:bookingId/status",
  authenticate,
  rideController.updateBookingStatus
);

module.exports = router;