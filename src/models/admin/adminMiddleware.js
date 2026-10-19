const authenticate = require("../../middleware/authMiddleware");

const getAdminRole = () => Number(process.env.ADMIN_ROLE || 3);

/**
 * Admin-only authorization. The JWT must be valid and its role must match
 * ADMIN_ROLE (defaults to 3 to match the existing Shippers web app convention).
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || Number(req.user.role) !== getAdminRole()) {
    return res.status(403).json({
      success: false,
      message: "Administrator access required",
    });
  }

  return next();
};

module.exports = { authenticate, requireAdmin, getAdminRole };
