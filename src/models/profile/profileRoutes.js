const express = require("express");
const profileController = require("./profileController");
const authenticate = require("../../middleware/authenticate");
const router = express.Router();

/**
 * @swagger
 * /api/profile/fetch-profile:
 *   post:
 *     summary: Fetch a user's profile and statistics
 *     tags: [Profile]
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
 *               user_id:
 *                 type: string
 *                 example: U0001
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *       401:
 *         description: Authentication required
 */
router.post("/fetch-profile", authenticate, profileController.getProfile);
module.exports = router;
