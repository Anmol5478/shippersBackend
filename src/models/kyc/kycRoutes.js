const express = require("express");
const multer = require("multer");

const kycController = require("./kycController");
const authenticate = require("../../middleware/authenticate");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

/**
 * @swagger
 * tags:
 *   name: KYC
 *   description: Driver KYC and identity verification APIs
 */

/**
 * @swagger
 * /api/kyc/upload:
 *   post:
 *     summary: Upload a KYC document
 *     description: |
 *       Upload Aadhaar front, Aadhaar back, PAN card, or selfie.
 *       The authenticated user's user_id is taken from the JWT.
 *       The uploaded image is converted to WebP on the backend
 *       before being stored in Cloudflare R2.
 *     tags:
 *       - KYC
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - documentType
 *               - file
 *             properties:
 *               documentType:
 *                 type: string
 *                 enum:
 *                   - aadhaar_front
 *                   - aadhaar_back
 *                   - pan
 *                   - selfie
 *                 description: Type of KYC document being uploaded
 *                 example: aadhaar_front
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: KYC document image. Maximum size 10 MB.
 *     responses:
 *       200:
 *         description: KYC document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: KYC document uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     documentType:
 *                       type: string
 *                       example: aadhaar_front
 *                     documentKey:
 *                       type: string
 *                       example: kyc/A1437/aadhaar_front/1758291234567.webp
 *                     kycStatus:
 *                       type: string
 *                       enum:
 *                         - NOT_SUBMITTED
 *                         - PENDING
 *                         - VERIFIED
 *                         - REJECTED
 *                       example: PENDING
 *       400:
 *         description: Invalid document or upload request
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.post(
  "/upload",
  authenticate,
  upload.single("file"),
  kycController.uploadDocument
);

/**
 * @swagger
 * /api/kyc/status:
 *   get:
 *     summary: Get current user's KYC status
 *     description: Returns the authenticated user's KYC status and indicates which required documents have been uploaded.
 *     tags:
 *       - KYC
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     kyc:
 *                       type: string
 *                       enum:
 *                         - Y
 *                         - N
 *                       example: N
 *                     status:
 *                       type: string
 *                       enum:
 *                         - NOT_SUBMITTED
 *                         - PENDING
 *                         - VERIFIED
 *                         - REJECTED
 *                       example: PENDING
 *                     rejectionReason:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     documents:
 *                       type: object
 *                       properties:
 *                         aadhaar_front:
 *                           type: boolean
 *                           example: true
 *                         aadhaar_back:
 *                           type: boolean
 *                           example: true
 *                         pan:
 *                           type: boolean
 *                           example: true
 *                         selfie:
 *                           type: boolean
 *                           example: false
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/status",
  authenticate,
  kycController.getStatus
);

module.exports = router;