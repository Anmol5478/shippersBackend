const forgotPasswordService = require("./forgotPasswordService");

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    await forgotPasswordService.forgotPassword(email);

    return res.status(200).json({
      responseCode: "00",
      success: true,
      message:
        "If an account exists with this email, a password reset link has been sent.",
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
    const { token, newPassword } = req.body;

    await forgotPasswordService.resetPassword(
      token,
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