const express = require("express");

const router = express.Router();

const forgotPasswordController = require(
  "./forgotPasswordController"
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send password reset link to email
 *     tags:
 *       - Forgot Password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: anmol@gmail.com
 *     responses:
 *       200:
 *         description: Password reset link sent successfully
 *       400:
 *         description: Bad Request
 */
router.post(
  "/forgot-password",
  forgotPasswordController.forgotPassword
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using reset link token
 *     tags:
 *       - Forgot Password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: 123abc456def
 *               newPassword:
 *                 type: string
 *                 example: NewPassword@123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired reset link
 */
router.post(
  "/reset-password",
  forgotPasswordController.resetPassword
);

module.exports = router;