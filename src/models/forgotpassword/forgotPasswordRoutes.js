const express = require("express");
const router = express.Router();

const forgotPasswordController = require("./forgotPasswordController");

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send OTP for Forgot Password
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
 *         description: OTP sent successfully
 *       400:
 *         description: Bad Request
 */
router.post(
  "/forgot-password",
  forgotPasswordController.forgotPassword
);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify Forgot Password OTP
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
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 example: anmol@gmail.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid OTP
 */
router.post(
  "/verify-otp",
  forgotPasswordController.verifyOTP
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset Password
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
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 example: anmol@gmail.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 example: NewPassword@123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Bad Request
 */
router.post(
  "/reset-password",
  forgotPasswordController.resetPassword
);

module.exports = router;