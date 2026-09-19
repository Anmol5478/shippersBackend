const express = require("express");
const multer = require("multer");

const kycController = require("./kycController");
const authenticate = require("../../middleware/authenticate");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/**
 * @swagger
 * /api/kyc/upload:
 *   post:
 *     summary: Upload a KYC document
 *     description: Upload Aadhaar front, Aadhaar back, PAN card, or selfie. The authenticated user's ID is taken from the JWT.
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
 *                 example: aadhaar_front
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: KYC document uploaded successfully
 *       400:
 *         description: Invalid upload
 *       401:
 *         description: Authentication required
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
 *     tags:
 *       - KYC
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  "/status",
  authenticate,
  kycController.getStatus
);

module.exports = router;