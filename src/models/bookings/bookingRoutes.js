const express = require("express");

const router = express.Router();

const bookingController =
  require("./bookingController");

const authenticate =
  require("../../middleware/authenticate");


/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Booking management APIs
 */


/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a booking
 *     description: Create a parcel booking against an available ride.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ride_id
 *               - package_weight_kg
 *               - sender_name
 *               - sender_phone
 *             properties:
 *               ride_id:
 *                 type: integer
 *                 example: 25
 *               package_weight_kg:
 *                 type: number
 *                 format: float
 *                 example: 2.5
 *               package_category:
 *                 type: string
 *                 example: CLOTHES
 *               package_description:
 *                 type: string
 *                 example: Two shirts and one jacket
 *               package_count:
 *                 type: integer
 *                 example: 1
 *               sender_name:
 *                 type: string
 *                 example: Anmol Gupta
 *               sender_phone:
 *                 type: string
 *                 example: "9876543210"
 *               pickup_address:
 *                 type: string
 *                 example: Ghaziabad
 *               drop_address:
 *                 type: string
 *                 example: Delhi
 *               notes:
 *                 type: string
 *                 example: Please handle carefully
 *               payment_method:
 *                 type: string
 *                 enum:
 *                   - CASH
 *                   - UPI
 *                   - ONLINE
 *                 example: CASH
 *               payment_collection_point:
 *                 type: string
 *                 enum:
 *                   - PICKUP
 *                   - DROP
 *                 example: DROP
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Invalid booking request
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/",
  authenticate,
  bookingController.createBooking
);


/**
 * @swagger
 * /api/bookings/my:
 *   get:
 *     summary: Get current user's bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User bookings fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/my",
  authenticate,
  bookingController.getUserBookings
);


/**
 * @swagger
 * /api/bookings/received:
 *   get:
 *     summary: Get bookings received for traveller's rides
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Traveller bookings fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/received",
  authenticate,
  bookingController.getTravellerBookings
);


/**
 * @swagger
 * /api/bookings/{bookingId}:
 *   get:
 *     summary: Get booking details
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 12
 *     responses:
 *       200:
 *         description: Booking fetched successfully
 *       400:
 *         description: Booking not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/:bookingId",
  authenticate,
  bookingController.getBooking
);


/**
 * @swagger
 * /api/bookings/{bookingId}/cancel:
 *   patch:
 *     summary: Cancel a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 12
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       400:
 *         description: Booking cannot be cancelled
 *       401:
 *         description: Unauthorized
 */
router.patch(
  "/:bookingId/cancel",
  authenticate,
  bookingController.cancelBooking
);


/**
 * @swagger
 * /api/bookings/{bookingId}/status:
 *   patch:
 *     summary: Accept or reject a booking
 *     tags: [Bookings]
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
 *                 example: CONFIRMED
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *       400:
 *         description: Invalid booking status
 *       401:
 *         description: Unauthorized
 */
router.patch(
  "/:bookingId/status",
  authenticate,
  bookingController.updateBookingStatus
);


module.exports = router;