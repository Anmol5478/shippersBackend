const express = require("express");
const router = express.Router();
const authenticate = require("../../middleware/authenticate");
const controller = require("./passengerBookingController");

/**
 * @swagger
 * tags:
 *   name: Passenger Bookings
 *   description: Passenger seat reservations across ride segments
 */

/**
 * @swagger
 * /api/passenger-bookings:
 *   post:
 *     summary: Reserve passenger seats between two stops
 *     tags: [Passenger Bookings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ride_id, pickup_stop_id, drop_stop_id, passenger_name, passenger_phone]
 *             properties:
 *               ride_id: { type: integer }
 *               pickup_stop_id: { type: integer }
 *               drop_stop_id: { type: integer }
 *               seat_count: { type: integer, default: 1, maximum: 8 }
 *               passenger_name: { type: string }
 *               passenger_phone: { type: string }
 *               payment_method: { type: string, enum: [CASH, UPI, ONLINE] }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Seats reserved }
 *       409: { description: Seat capacity unavailable }
 */
router.post("/", authenticate, controller.create);

/**
 * @swagger
 * /api/passenger-bookings/mine:
 *   get:
 *     summary: List my passenger bookings
 *     tags: [Passenger Bookings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Passenger bookings }
 */
router.get("/mine", authenticate, controller.mine);

/**
 * @swagger
 * /api/passenger-bookings/received:
 *   get:
 *     summary: List passenger bookings received on my rides
 *     tags: [Passenger Bookings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Received passenger bookings }
 */
router.get("/received", authenticate, controller.received);

/**
 * @swagger
 * /api/passenger-bookings/{bookingId}/cancel:
 *   patch:
 *     summary: Cancel a pending or confirmed passenger booking
 *     tags: [Passenger Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Booking cancelled and seats released }
 */
router.patch("/:bookingId/cancel", authenticate, controller.cancel);

/**
 * @swagger
 * /api/passenger-bookings/{bookingId}/status:
 *   patch:
 *     summary: Ride owner confirms or rejects a passenger booking
 *     tags: [Passenger Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [CONFIRMED, REJECTED] }
 *     responses:
 *       200: { description: Booking status updated }
 */
router.patch("/:bookingId/status", authenticate, controller.updateStatus);

/**
 * @swagger
 * /api/passenger-bookings/{bookingId}/pay-advance:
 *   post:
 *     summary: Pay mandatory 20% advance to allow booking confirmation
 *     tags: [Passenger Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payment_method: { type: string, enum: [WALLET, UPI, ONLINE, CASH], default: WALLET }
 *     responses:
 *       200: { description: Advance paid; booking still PENDING until driver confirms }
 *       409: { description: Already paid or insufficient wallet balance }
 */
router.post("/:bookingId/pay-advance", authenticate, controller.payAdvance);

module.exports = router;
