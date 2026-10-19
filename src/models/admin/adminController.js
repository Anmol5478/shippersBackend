const adminService = require("./adminService");

const getDashboard = async (req, res) => {
  try {
    const data = await adminService.getDashboard();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to load dashboard",
    });
  }
};

const listUsers = async (req, res) => {
  try {
    const data = await adminService.listUsers(req.body || {});
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Admin list users error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to list users",
    });
  }
};

const getUser = async (req, res) => {
  try {
    const userId = req.body?.user_id || req.params?.userId;
    const data = await adminService.getUser(userId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Admin get user error:", error);
    return res.status(404).json({
      success: false,
      message: error.message || "User not found",
    });
  }
};

const listKyc = async (req, res) => {
  try {
    const data = await adminService.listKyc(req.body || {});
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Admin list KYC error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to list KYC records",
    });
  }
};

const getKyc = async (req, res) => {
  try {
    const userId = req.body?.user_id || req.params?.userId;
    const data = await adminService.getKyc(userId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Admin get KYC error:", error);
    return res.status(404).json({
      success: false,
      message: error.message || "KYC not found",
    });
  }
};

const approveKyc = async (req, res) => {
  try {
    const userId = req.body?.user_id;
    const data = await adminService.approveKyc({
      userId,
      adminUserId: req.user?.user_id,
    });
    return res.status(200).json({
      success: true,
      message: "KYC approved successfully",
      data,
    });
  } catch (error) {
    console.error("Admin approve KYC error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to approve KYC",
    });
  }
};

const rejectKyc = async (req, res) => {
  try {
    const { user_id: userId, reason } = req.body || {};
    const data = await adminService.rejectKyc({
      userId,
      reason,
      adminUserId: req.user?.user_id,
    });
    return res.status(200).json({
      success: true,
      message: "KYC rejected",
      data,
    });
  } catch (error) {
    console.error("Admin reject KYC error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to reject KYC",
    });
  }
};

const listRides = async (req, res) => {
  try {
    const data = await adminService.listRides(req.body || {});
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Admin list rides error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to list rides",
    });
  }
};

const listBookings = async (req, res) => {
  try {
    const data = await adminService.listBookings(req.body || {});
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Admin list bookings error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to list bookings",
    });
  }
};

module.exports = {
  getDashboard,
  listUsers,
  getUser,
  listKyc,
  getKyc,
  approveKyc,
  rejectKyc,
  listRides,
  listBookings,
};
