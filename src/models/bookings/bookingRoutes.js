const express = require("express");
const multer = require("multer");
const router = express.Router();
const bookingController = require("./bookingController");
const authenticate = require("../../middleware/authenticate");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/** @swagger
 * tags:
 *   name: Bookings
 *   description: Parcel bookings and pickup/delivery verification
 */

/** @swagger
 * /api/bookings/create-booking:
 *   post:
 *     summary: Create a parcel booking (does not generate OTPs)
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ride_id, package_weight_kg, sender_name, sender_phone]
 *             properties:
 *               ride_id: { type: integer, example: 25 }
 *               package_weight_kg: { type: number, example: 2.5 }
 *               package_category: { type: string, example: CLOTHES }
 *               package_description: { type: string }
 *               package_count: { type: integer, example: 1 }
 *               sender_name: { type: string }
 *               sender_phone: { type: string }
 *               pickup_address: { type: string }
 *               drop_address: { type: string }
 *               notes: { type: string }
 *               payment_method: { type: string, enum: [CASH, UPI, ONLINE] }
 *               payment_collection_point: { type: string, enum: [PICKUP, DROP] }
 *     responses:
 *       201: { description: Booking created; no OTP generated }
 *       400: { description: Invalid booking request }
 */
router.post("/create-booking", authenticate, bookingController.createBooking);

/** @swagger
 * /api/bookings/list-my-bookings:
 *   post:
 *     summary: List bookings created by the authenticated sender
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sender bookings, including OTPs only after proof upload }
 */
router.post("/list-my-bookings", authenticate, bookingController.getUserBookings);

/** @swagger
 * /api/bookings/list-received-bookings:
 *   post:
 *     summary: List bookings assigned to the authenticated driver
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Driver bookings; OTP values are never returned }
 */
router.post("/list-received-bookings", authenticate, bookingController.getTravellerBookings);

/** @swagger
 * /api/bookings/fetch-booking-details:
 *   post:
 *     summary: Fetch one booking by ID
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [booking_id]
 *             properties:
 *               booking_id: { type: integer, example: 12 }
 *     responses:
 *       200: { description: Booking details; OTP is shown only to the sender }
 *       403: { description: User is not a participant in this booking }
 */
router.post("/fetch-booking-details", authenticate, bookingController.getBooking);

/** @swagger
 * /api/bookings/{bookingId}/cancel:
 *   patch:
 *     summary: Cancel a booking as its sender
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Booking cancelled }
 */
router.patch("/:bookingId/cancel", authenticate, bookingController.cancelBooking);

/** @swagger
 * /api/bookings/{bookingId}/pickup-proof:
 *   post:
 *     summary: Driver uploads pickup image; pickup OTP is generated only after upload
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [proofImage]
 *             properties:
 *               proofImage: { type: string, format: binary }
 *     responses:
 *       200: { description: Image uploaded; OTP is not included in response }
 */
router.post("/:bookingId/pickup-proof", authenticate, upload.single("proofImage"), bookingController.uploadPickupProof);

/** @swagger
 * /api/bookings/{bookingId}/delivery-proof:
 *   post:
 *     summary: Driver uploads delivery image; delivery OTP is generated only after upload
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [proofImage]
 *             properties:
 *               proofImage: { type: string, format: binary }
 *     responses:
 *       200: { description: Image uploaded; OTP is not included in response }
 */
router.post("/:bookingId/delivery-proof", authenticate, upload.single("proofImage"), bookingController.uploadDeliveryProof);

/** @swagger
 * /api/bookings/verify-pickup-otp:
 *   post:
 *     summary: Verify pickup OTP and enable ride start
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [booking_id, otp]
 *             properties:
 *               booking_id: { type: integer }
 *               otp: { type: string, example: "123456" }
 *     responses:
 *       200: { description: Pickup verified; ride may start }
 */
router.post("/verify-pickup-otp", authenticate, bookingController.verifyPickupOtp);

/** @swagger
 * /api/bookings/verify-delivery-otp:
 *   post:
 *     summary: Verify delivery OTP and complete delivery
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [booking_id, otp]
 *             properties:
 *               booking_id: { type: integer }
 *               otp: { type: string, example: "123456" }
 *     responses:
 *       200: { description: Delivery verified and completed }
 */
router.post("/verify-delivery-otp", authenticate, bookingController.verifyDeliveryOtp);

module.exports = router;
