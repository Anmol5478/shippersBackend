const bcrypt = require("bcrypt");
const crypto = require("crypto");

const authRepository = require("../auth/authRepository");
const forgotPasswordRepository = require("./forgotPasswordRepository");
const otpService = require("./otpServices");

const forgotPassword = async (email) => {
  if (!email) {
    throw new Error("Email is required");
  }

  const user = await authRepository.findUserByEmail(email);

  if (!user) {
    throw new Error("Email not registered");
  }

  /*
   * Generate a secure random token.
   *
   * This original token goes into the reset link.
   */
  const resetToken = crypto
    .randomBytes(32)
    .toString("hex");

  /*
   * Hash the token before storing it in the database.
   *
   * The actual reset token is never stored directly.
   */
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  /*
   * Reset link expires in 15 minutes.
   */
  const expiry = new Date(
    Date.now() + 15 * 60 * 1000
  );

  /*
   * Save the HASHED token in the existing otp table.
   */
  await forgotPasswordRepository.saveResetToken(
    email,
    hashedToken,
    expiry
  );

  /*
   * Create the frontend reset password link.
   *
   * Example:
   * http://localhost:5173/reset-password?token=abc123...
   */
  const resetLink =
    `${process.env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(
      resetToken
    )}`;

  /*
   * Send reset password email.
   */
  await otpService.sendPasswordResetLink(
    email,
    resetLink
  );

  return true;
};

const resetPassword = async (
  token,
  newPassword
) => {
  if (!token || !newPassword) {
    throw new Error(
      "Reset token and new password are required"
    );
  }

  /*
   * Password validation:
   * - Minimum 8 characters
   * - One uppercase letter
   * - One lowercase letter
   * - One number
   * - One special character
   */
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  if (!passwordRegex.test(newPassword)) {
    throw new Error(
      "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character"
    );
  }

  /*
   * Hash the token received from the reset link.
   */
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  /*
   * Find the valid unused token.
   */
  const record =
    await forgotPasswordRepository.getResetToken(
      hashedToken
    );

  if (!record) {
    throw new Error(
      "This password reset link is invalid or has expired"
    );
  }

  /*
   * Hash the new password.
   */
  const hashedPassword = await bcrypt.hash(
    newPassword,
    10
  );

  /*
   * Update the user's password.
   */
  await authRepository.updatePassword(
    record.email,
    hashedPassword
  );

  /*
   * Make the reset link single-use.
   */
  await forgotPasswordRepository.markTokenAsUsed(
    record.id
  );

  return true;
};

module.exports = {
  forgotPassword,
  resetPassword,
};