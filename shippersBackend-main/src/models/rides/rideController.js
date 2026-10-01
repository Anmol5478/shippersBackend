const rideService = require("./rideService");

/**
 * Search available rides.
 */
exports.searchRides = async (
  req,
  res
) => {
  try {
    const rides =
      await rideService.searchRides(
        req.query
      );

    return res.status(200).json({
      responseCode: "00",
      success: true,

      message:
        rides.length > 0
          ? "Rides found successfully"
          : "No rides found",

      data: rides,
    });
  } catch (error) {
    console.error(
      "searchRides controller error:",
      error
    );

    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get rides published by a user.
 */
exports.getUserRides = async (
  req,
  res
) => {
  try {
    const {
      userId,
    } = req.params;

    const rides =
      await rideService.getUserRides(
        userId
      );

    return res.status(200).json({
      responseCode: "00",
      success: true,

      message:
        rides.length > 0
          ? "User rides fetched successfully"
          : "No rides found for this user",

      data: rides,
    });
  } catch (error) {
    console.error(
      "getUserRides controller error:",
      error
    );

    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create / publish a ride.
 */
exports.createRide = async (
  req,
  res
) => {
  try {
    /*
     * IMPORTANT:
     * user_id comes from JWT.
     *
     * Never trust user_id sent by
     * the mobile application.
     */
    const userId =
      req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        responseCode: "01",
        success: false,
        message:
          "Authenticated user ID not found",
      });
    }

    const ride =
      await rideService.createRide({
        userId,

        body: req.body,

        files: req.files,
      });

    return res.status(201).json({
      responseCode: "00",
      success: true,
      message:
        "Journey published successfully",
      data: ride,
    });
  } catch (error) {
    console.error(
      "createRide controller error:",
      error
    );

    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: error.message,
    });
  }
};

/**
 * Calculate alternative routes.
 */
exports.calculateRoutes = async (
  req,
  res
) => {
  try {
    const routes =
      await rideService.calculateRoutes(
        req.body
      );

    return res.status(200).json({
      responseCode: "00",
      success: true,
      message:
        "Routes calculated successfully",
      data: routes,
    });
  } catch (error) {
    console.error(
      "calculateRoutes controller error:",
      error
    );

    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: error.message,
    });
  }
};