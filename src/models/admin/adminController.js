const authService = require("../auth/authService");
const adminService = require("./adminService");
const { getAdminRole } = require("./adminMiddleware");

const sendError = (res, error, fallback) => {
  // Avoid returning SQL or internal error details to API clients.
  console.error(fallback, error);
  return res.status(500).json({
    success: false,
    message: fallback,
  });
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Reuse the same password hashing and JWT issuance as normal Shippers login.
    const data = await authService.login({ email, password });

    if (Number(data.user?.role) !== getAdminRole()) {
      return res.status(403).json({
        success: false,
        message: "Administrator access required",
      });
    }

    return res.status(200).json({
      responseCode: "00",
      success: true,
      message: "Admin login successful",
      data,
    });
  } catch (_error) {
    // Do not disclose whether an email exists.
    return res.status(401).json({
      responseCode: "01",
      success: false,
      message: "Invalid email or password",
    });
  }
};

exports.me = (req, res) => {
  return res.json({
    success: true,
    data: {
      id: req.user.id,
      user_id: req.user.user_id,
      email: req.user.email,
      role: Number(req.user.role),
    },
  });
};

exports.dashboard = async (_req, res) => {
  try {
    const data = await adminService.getDashboardStats();
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error, "Unable to load dashboard statistics");
  }
};

exports.users = async (req, res) => {
  try {
    const data = await adminService.listUsers({
      ...req.query,
      search: typeof req.query.search === "string" ? req.query.search.trim() : "",
    });
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error, "Unable to load users");
  }
};

exports.rides = async (req, res) => {
  try {
    const data = await adminService.listRides(req.query);
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error, "Unable to load rides");
  }
};

exports.bookings = async (req, res) => {
  try {
    const data = await adminService.listBookings(req.query);
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error, "Unable to load bookings");
  }
};

exports.kycApplications = async (req, res) => {
  try {
    const data = await adminService.listKycApplications(req.query);
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error, "Unable to load KYC applications");
  }
};
