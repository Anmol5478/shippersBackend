const forgotPasswordService = require("./forgotPasswordService");

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    await forgotPasswordService.forgotPassword(email);

    return res.status(200).json({
      responseCode: "00",
      success: true,
      message: "OTP sent successfully",
    });
  } catch (err) {
    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: err.message,
    });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    await forgotPasswordService.verifyOTP(email, otp);

    return res.status(200).json({
      responseCode: "00",
      success: true,
      message: "OTP verified successfully",
    });
  } catch (err) {
    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: err.message,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    await forgotPasswordService.resetPassword(
      email,
      otp,
      newPassword
    );

    return res.status(200).json({
      responseCode: "00",
      success: true,
      message: "Password reset successfully",
    });
  } catch (err) {
    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: err.message,
    });
  }
};