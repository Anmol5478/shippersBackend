const kycService = require("./kycService");

const uploadDocument = async (req, res) => {
  try {
    const { documentType } = req.body;

    /*
     * IMPORTANT:
     * Don't take userId from req.body.
     *
     * We will get the authenticated user's
     * ID from the JWT.
     */
    const userId = req.user.user_id;

    const result =
      await kycService.uploadKycDocument({
        userId,
        documentType,
        file: req.file,
      });

    return res.status(200).json({
      success: true,
      message:
        "KYC document uploaded successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "KYC upload error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getStatus = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result =
      await kycService.getKycStatus(userId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "KYC status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to get KYC status",
    });
  }
};

module.exports = {
  uploadDocument,
  getStatus,
};