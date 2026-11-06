const express = require("express");
const multer = require("multer");
const enterpriseController = require("./enterpriseController");
const authenticate = require("../../middleware/authenticate");

const router = express.Router();
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
