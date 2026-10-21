const express = require("express");
const adminController = require("./adminController");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/requireAdmin");

const router = express.Router();

<<<<<<< HEAD
router.use(authenticate, requireAdmin);

router.post("/dashboard", adminController.getDashboard);

router.post("/users", adminController.listUsers);
router.post("/users/detail", adminController.getUser);
router.post("/users/block", adminController.blockUser);
router.post("/users/unblock", adminController.unblockUser);

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
=======
// All admin routes require a valid JWT + admin role (3)
router.use(authenticate, requireAdmin);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only management APIs
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   post:
 *     summary: Dashboard stats
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.post("/dashboard", adminController.getDashboard);

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: List users (optional role / search / pagination)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role: { type: integer, description: "1=Driver, 2=Customer, 3=Admin" }
 *               search: { type: string }
 *               page: { type: integer }
 *               limit: { type: integer }
 */
router.post("/users", adminController.listUsers);

/**
 * @swagger
 * /api/admin/users/detail:
 *   post:
 *     summary: Get user detail by user_id
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string, example: D0001 }
 */
router.post("/users/detail", adminController.getUser);

/**
 * @swagger
 * /api/admin/kyc:
 *   post:
 *     summary: List KYC submissions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [PENDING, VERIFIED, REJECTED] }
 *               page: { type: integer }
 *               limit: { type: integer }
 */
router.post("/kyc", adminController.listKyc);

/**
 * @swagger
 * /api/admin/kyc/detail:
 *   post:
 *     summary: Get KYC detail for a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string }
 */
router.post("/kyc/detail", adminController.getKyc);

/**
 * @swagger
 * /api/admin/kyc/approve:
 *   post:
 *     summary: Approve a KYC submission
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string }
 */
router.post("/kyc/approve", adminController.approveKyc);

/**
 * @swagger
 * /api/admin/kyc/reject:
 *   post:
 *     summary: Reject a KYC submission
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
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
 */
router.post("/kyc/reject", adminController.rejectKyc);

/**
 * @swagger
 * /api/admin/rides:
 *   post:
 *     summary: List all rides
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string }
 *               page: { type: integer }
 *               limit: { type: integer }
 */
router.post("/rides", adminController.listRides);

/**
 * @swagger
 * /api/admin/bookings:
 *   post:
 *     summary: List all bookings
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string }
 *               page: { type: integer }
 *               limit: { type: integer }
 */
router.post("/bookings", adminController.listBookings);
>>>>>>> d5497284ba77961a5c3e6015b603744450561203

module.exports = router;
