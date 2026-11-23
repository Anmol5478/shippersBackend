const walletService = require("./walletService");

exports.getWallet = async (req, res) => {
  try {
    // prefer token user_id (safer)
    const user_id = req.user?.user_id || req.user?.id;

    if (!user_id) {
      return res.status(401).json({
        responseCode: "01",
        success: false,
        message: "Unauthorized",
      });
    }

    const data = await walletService.getWalletDetails(user_id);

    return res.status(200).json({
      responseCode: "00",
      success: true,
      message: "Wallet fetched successfully",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: "01",
      success: false,
      message: error.message || "Unable to fetch wallet",
    });
  }
};