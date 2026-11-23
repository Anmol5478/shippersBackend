const express = require("express");
const multer = require("multer");
const enterpriseController = require("./enterpriseController");
const authenticate = require("../../middleware/authenticate");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Enterprise
 *     description: Business profiles and shipment purchase bills
 *
 * /api/enterprise/profile:
 *   get:
 *     summary: Get the authenticated user's business profile
 *     tags: [Enterprise]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile returned, or data is null when no profile exists }
 *       401: { description: Authentication required }
 *   post:
 *     summary: Create a business profile
 *     tags: [Enterprise]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company_name, billing_email]
 *             properties:
 *               company_name: { type: string, example: Acme Logistics }
 *               billing_email: { type: string, format: email, example: billing@acme.com }
 *               gstin: { type: string, nullable: true, example: 27ABCDE1234F1Z5 }
 *               pan_number: { type: string, nullable: true, example: ABCDE1234F }
 *               contact_person: { type: string }
 *               contact_phone: { type: string, example: "9876543210" }
 *               billing_address: { type: string }
 *               billing_city: { type: string }
 *               billing_state: { type: string }
 *               billing_pincode: { type: string }
 *     responses:
 *       201: { description: Profile created }
 *       400: { description: Invalid profile details }
 *       409: { description: A profile or unique value already exists }
 *   put:
 *     summary: Update the authenticated user's business profile
 *     tags: [Enterprise]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company_name: { type: string }
 *               billing_email: { type: string, format: email }
 *               gstin: { type: string, nullable: true }
 *               pan_number: { type: string, nullable: true }
 *               contact_person: { type: string, nullable: true }
 *               contact_phone: { type: string, nullable: true }
 *               billing_address: { type: string, nullable: true }
 *               billing_city: { type: string, nullable: true }
 *               billing_state: { type: string, nullable: true }
 *               billing_pincode: { type: string, nullable: true }
 *     responses:
 *       200: { description: Profile updated }
 *       400: { description: Invalid profile details }
 *       404: { description: Profile not found }
 * /api/enterprise/profile/status:
 *   get:
 *     summary: Get business profile status
 *     tags: [Enterprise]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile status returned }
 *       401: { description: Authentication required }
 * /api/enterprise/bookings/purchase-bill:
 *   post:
 *     summary: Upload or replace a business booking purchase bill
 *     description: Booking ID is supplied as a form field when using this path. Uploads are limited to 10 MB and PDF, JPG, or PNG.
 *     tags: [Enterprise]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [booking_id, document]
 *             properties:
 *               booking_id: { type: integer, example: 104 }
 *               document: { type: string, format: binary }
 *     responses:
 *       200: { description: Purchase bill uploaded }
 *       400: { description: Invalid file or request }
 *       403: { description: User does not own the booking }
 *       409: { description: Booking state does not allow upload }
 *       413: { description: File exceeds 10 MB }
 * /api/enterprise/bookings/{bookingId}/purchase-bill:
 *   post:
 *     summary: Upload or replace a business booking purchase bill
 *     tags: [Enterprise]
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
 *             required: [document]
 *             properties:
 *               document: { type: string, format: binary }
 *     responses:
 *       200: { description: Purchase bill uploaded }
 *       400: { description: Invalid file or request }
 *       403: { description: User does not own the booking }
 *       409: { description: Booking state does not allow upload }
 *       413: { description: File exceeds 10 MB }
 * /api/enterprise/bookings/purchase-bills:
 *   get:
 *     summary: List purchase bill metadata for a booking
 *     tags: [Enterprise]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: booking_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Purchase bill metadata returned; storage keys are not exposed }
 *       403: { description: User does not own the booking }
 *       404: { description: Booking not found }
 * /api/enterprise/bookings/{bookingId}/purchase-bills:
 *   get:
 *     summary: List purchase bill metadata for a booking
 *     tags: [Enterprise]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Purchase bill metadata returned; storage keys are not exposed }
 *       403: { description: User does not own the booking }
 *       404: { description: Booking not found }
 * /api/enterprise/documents/view:
 *   get:
 *     summary: Get a short-lived URL for a purchase bill
 *     tags: [Enterprise]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: document_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Signed URL returned with a short expiry }
 *       403: { description: User does not own the booking associated with the document }
 *       404: { description: Document not found }
 * /api/enterprise/documents/{documentId}/view:
 *   get:
 *     summary: Get a short-lived URL for a purchase bill
 *     tags: [Enterprise]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Signed URL returned with a short expiry }
 *       403: { description: User does not own the booking associated with the document }
 *       404: { description: Document not found }
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
const uploadDocument = (req, res, next) => {
  upload.single("document")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        responseCode: "01",
        success: false,
        message: "Document must not exceed 10 MB",
      });
    }

    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: "Invalid multipart upload",
    });
  });
};

router.get("/profile", authenticate, enterpriseController.getProfile);
router.post("/profile", authenticate, enterpriseController.createProfile);
router.put("/profile", authenticate, enterpriseController.updateProfile);
router.get("/profile/status", authenticate, enterpriseController.getProfileStatus);

router.post("/bookings/purchase-bill", authenticate, uploadDocument, enterpriseController.uploadPurchaseBill);
router.post("/bookings/:bookingId/purchase-bill", authenticate, uploadDocument, enterpriseController.uploadPurchaseBill);
router.get("/bookings/purchase-bills", authenticate, enterpriseController.listPurchaseBills);
router.get("/bookings/:bookingId/purchase-bills", authenticate, enterpriseController.listPurchaseBills);

router.get("/documents/view", authenticate, enterpriseController.viewDocument);
router.get("/documents/:documentId/view", authenticate, enterpriseController.viewDocument);

module.exports = router;
