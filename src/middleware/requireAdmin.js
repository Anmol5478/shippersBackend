/**
 * Must be used AFTER authenticate middleware.
 * Ensures the authenticated user has admin role (3).
 */
const requireAdmin = (req, res, next) => {
  try {
    const role = Number(req.user?.role);

    if (role !== 3) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
};

module.exports = requireAdmin;
