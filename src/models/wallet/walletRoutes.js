const express = require("express");
const router = express.Router();
const walletController = require("./walletController");
const authenticate = require("../../middleware/authenticate"); // or authMiddleware

/**
 * @swagger
 * /api/wallet/fetch-wallet-details:
 *   post:
 *     summary: Get wallet details
 *     description: >
 *       Returns the authenticated user's wallet balance,
 *       transaction history, and linked bank accounts.
 *       Use this endpoint when the user opens the Wallet screen.
 *     tags:
 *       - Wallet
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet fetched successfully
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
 *                   example: Wallet fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance:
 *                       type: number
 *                       example: 1250.50
 *                     currency:
 *                       type: string
 *                       example: INR
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 12
 *                           type:
 *                             type: string
 *                             enum: [CREDIT, DEBIT, HOLD, RELEASE, REFUND, WITHDRAWAL]
 *                             example: CREDIT
 *                           amount:
 *                             type: number
 *                             example: 450.00
 *                           balance_after:
 *                             type: number
 *                             example: 1250.50
 *                           reference_id:
 *                             type: string
 *                             nullable: true
 *                             example: BK-8842
 *                           description:
 *                             type: string
 *                             nullable: true
 *                             example: Parcel delivery earning
 *                           status:
 *                             type: string
 *                             enum: [SUCCESS, PENDING, FAILED]
 *                             example: SUCCESS
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-10-15T10:22:00.000Z"
 *                     bank_accounts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 3
 *                           account_holder:
 *                             type: string
 *                             example: Rahul Sharma
 *                           account_number:
 *                             type: string
 *                             example: XXXXXX1234
 *                           ifsc_code:
 *                             type: string
 *                             example: HDFC0001234
 *                           bank_name:
 *                             type: string
 *                             nullable: true
 *                             example: HDFC Bank
 *                           is_primary:
 *                             type: integer
 *                             example: 1
 *                           is_verified:
 *                             type: integer
 *                             example: 1
 *       401:
 *         description: Unauthorized – missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: string
 *                   example: "01"
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: string
 *                   example: "01"
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Unable to fetch wallet
 */
router.post("/fetch-wallet-details", authenticate, walletController.getWallet);

module.exports = router;