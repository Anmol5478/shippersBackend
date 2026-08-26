const rideService = require("./rideService");

/**
 * Search rides
 */
exports.searchRides = async (req, res) => {
  try {
    const rides = await rideService.searchRides(req.query);

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
    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create a new ride
 */
exports.createRide = async (req, res) => {
  try {
    const ride = await rideService.createRide(req.body);

    return res.status(201).json({
      responseCode: "00",
      success: true,
      message: "Journey added successfully",
      data: ride,
    });
  } catch (error) {
    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: error.message,
    });
  }
};