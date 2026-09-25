const express = require("express");

const router = express.Router();

const profileController =require("./profileController");

/**
 * @swagger
 * /api/profile/{user_id}:
 *   get:
 *     summary: Get user profile
 *     description: Fetch complete profile information using the user's unique user ID.
 *     tags:
 *       - Profile
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         description: Unique user ID of the user
 *         schema:
 *           type: string
 *         example: U0001
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: string
 *                   example: "00"
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile fetched successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid request
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:user_id",
  profileController.getProfile
);



module.exports = router;