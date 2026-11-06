const express = require("express");
const adminController = require("./adminController");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/requireAdmin");
const notificationAdminController = require("./adminNotificationController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Administrator-only management endpoints
 *
 * /api/admin/dashboard:
 *   post:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dashboard statistics returned }
 *       401: { description: Authentication required }
 *       403: { description: Administrator access required }
 * /api/admin/users:
 *   post:
 *     summary: List and filter users
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role: { type: integer }
 *               search: { type: string }
 *               blocked: { type: boolean }
 *               page: { type: integer, minimum: 1, default: 1 }
 *               limit: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: Users returned }
 *       403: { description: Administrator access required }
 * /api/admin/users/detail:
 *   post:
 *     summary: Get a user by user ID
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string, example: USR0001 }
 *     responses:
 *       200: { description: User details returned }
 *       404: { description: User not found }
 * /api/admin/users/block:
 *   post:
 *     summary: Block a user
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string }
 *     responses:
 *       200: { description: User blocked }
 *       400: { description: Invalid request }
 * /api/admin/users/unblock:
 *   post:
 *     summary: Unblock a user
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string }
 *     responses:
 *       200: { description: User unblocked }
 *       400: { description: Invalid request }
 * /api/admin/users/role:
 *   post:
 *     summary: Change a user's role
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, role]
 *             properties:
 *               user_id: { type: string }
 *               role: { type: integer }
 *     responses:
 *       200: { description: User role changed }
 *       400: { description: Invalid request }
 * /api/admin/kyc:
 *   post:
 *     summary: List KYC records
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [NOT_SUBMITTED, PENDING, VERIFIED, REJECTED] }
 *               page: { type: integer, minimum: 1, default: 1 }
 *               limit: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: KYC records returned }
 *       403: { description: Administrator access required }
 * /api/admin/kyc/detail:
 *   post:
 *     summary: Get a user's KYC record
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string }
 *     responses:
 *       200: { description: KYC record returned }
 *       404: { description: KYC record not found }
 * /api/admin/kyc/approve:
 *   post:
 *     summary: Approve a user's KYC
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string }
 *     responses:
 *       200: { description: KYC approved }
 *       400: { description: Invalid request }
 * /api/admin/kyc/reject:
 *   post:
 *     summary: Reject a user's KYC
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, reason]
 *             properties:
 *               user_id: { type: string }
 *               reason: { type: string }
 *     responses:
 *       200: { description: KYC rejected }
 *       400: { description: Invalid request }
 * /api/admin/rides:
 *   post:
 *     summary: List rides
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string }
 *               proof_status: { type: string }
 *               page: { type: integer, minimum: 1, default: 1 }
 *               limit: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: Rides returned }
 *       403: { description: Administrator access required }
 * /api/admin/rides/detail:
 *   post:
 *     summary: Get ride details
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ride_id]
 *             properties:
 *               ride_id: { type: integer }
 *     responses:
 *       200: { description: Ride details returned }
 *       404: { description: Ride not found }
 * /api/admin/rides/proof/approve:
 *   post:
 *     summary: Approve ride travel proof
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ride_id]
 *             properties:
 *               ride_id: { type: integer }
 *     responses:
 *       200: { description: Travel proof approved }
 *       400: { description: Invalid request }
 * /api/admin/rides/proof/reject:
 *   post:
 *     summary: Reject ride travel proof
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ride_id, reason]
 *             properties:
 *               ride_id: { type: integer }
 *               reason: { type: string }
 *     responses:
 *       200: { description: Travel proof rejected }
 *       400: { description: Invalid request }
 * /api/admin/bookings:
 *   post:
 *     summary: List bookings
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string }
 *               page: { type: integer, minimum: 1, default: 1 }
 *               limit: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: Bookings returned }
 *       403: { description: Administrator access required }
 * /api/admin/bookings/detail:
 *   post:
 *     summary: Get booking details
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [booking_id]
 *             properties:
 *               booking_id: { type: integer }
 *     responses:
 *       200: { description: Booking details returned }
 *       404: { description: Booking not found }
 * /api/admin/pnr/check:
 *   post:
 *     summary: Check a railway PNR
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pnr]
 *             properties:
 *               pnr: { type: string, example: ABC1234567 }
 *     responses:
 *       200: { description: PNR check result returned }
 *       400: { description: Invalid PNR }
 * /api/admin/password-resets:
 *   post:
 *     summary: List password reset requests
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               search: { type: string }
 *               status: { type: string }
 *               page: { type: integer, minimum: 1, default: 1 }
 *               limit: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: Password reset requests returned }
 *       403: { description: Administrator access required }
 * /api/admin/password-resets/resend:
 *   post:
 *     summary: Resend a password reset email
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Password reset email sent }
 *       400: { description: Invalid request }

 *
 * /api/admin/notifications/audience-counts:
 *   get:
 *     summary: Get eligible notification audience counts
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Audience counts returned }
 *       403: { description: Administrator access required }
 * /api/admin/notifications/campaigns:
 *   get:
 *     summary: List admin notification campaigns
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *     responses:
 *       200: { description: Campaign history returned }
 *       403: { description: Administrator access required }
 * /api/admin/notifications/send:
 *   post:
 *     summary: Send a notification campaign
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message, audience]
 *             properties:
 *               title: { type: string, minLength: 3, maxLength: 100 }
 *               message: { type: string, minLength: 3, maxLength: 1000 }
 *               audience:
 *                 type: string
 *                 enum: [all, drivers, customers, enterprise]
 *               notification_type:
 *                 type: string
 *                 enum: [announcement, promotion]
 *                 default: announcement
 *     responses:
 *       201: { description: Campaign created and notification inbox entries saved }
 *       400: { description: Invalid campaign request }
 *       403: { description: Administrator access required }
 */
router.use(authenticate, requireAdmin);

router.post("/dashboard", adminController.getDashboard);

router.post("/users", adminController.listUsers);
router.post("/users/detail", adminController.getUser);
router.post("/users/block", adminController.blockUser);
router.post("/users/unblock", adminController.unblockUser);
router.post("/users/role", adminController.changeUserRole);

router.post("/kyc", adminController.listKyc);
router.post("/kyc/detail", adminController.getKyc);
router.post("/kyc/approve", adminController.approveKyc);
router.post("/kyc/reject", adminController.rejectKyc);

router.post("/rides", adminController.listRides);
router.post("/rides/detail", adminController.getRide);
router.post("/rides/proof/approve", adminController.approveRideProof);
router.post("/rides/proof/reject", adminController.rejectRideProof);

router.post("/bookings", adminController.listBookings);
router.post("/bookings/detail", adminController.getBooking);

router.post("/pnr/check", adminController.checkPnr);

router.post("/password-resets", adminController.listPasswordResets);
router.post("/password-resets/resend", adminController.resendPasswordReset);

router.get("/notifications/audience-counts", notificationAdminController.audienceCounts);
router.get("/notifications/campaigns", notificationAdminController.listCampaigns);
router.post("/notifications/send", notificationAdminController.sendCampaign);

module.exports = router;
