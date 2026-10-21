const express = require("express");
const adminController = require("./adminController");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/requireAdmin");

const router = express.Router();

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

module.exports = router;
