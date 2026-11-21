const pricingService = require("./pricingService");

/**
 * POST /api/pricing/estimate
 * Fare estimation for parcel or passenger services.
 */
exports.estimateFare = async (req, res) => {
  try {
    const data = pricingService.estimateFare(req.body || {});

    // Strip internal formula diagnostics from public response
    const { _formula, ...publicData } = data;

    return res.status(200).json({
      responseCode: "00",
      success: true,
      message: "Fare estimated successfully",
      data: publicData,
    });
  } catch (error) {
    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: error.message || "Unable to estimate fare",
    });
  }
};
