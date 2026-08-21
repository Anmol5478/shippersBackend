const bcrypt = require("bcrypt");

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

  const otp = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  const expiry = new Date(
    Date.now() + 10 * 60 * 1000
  );

  await forgotPasswordRepository.saveOTP(
    email,
    otp,
    expiry
  );

  await otpService.sendOTP(email, otp);
};

const verifyOTP = async (email, otp) => {
  if (!email || !otp) {
    throw new Error("Email and OTP are required");
  }

  const record =
    await forgotPasswordRepository.getOTP(email);

  if (!record) {
    throw new Error("OTP not found");
  }

  if (record.is_used) {
    throw new Error("OTP already used");
  }

  if (record.otp !== otp) {
    throw new Error("Invalid OTP");
  }

  if (new Date() > new Date(record.expires_at)) {
    throw new Error("OTP expired");
  }

  return true;
};

const resetPassword = async (
  email,
  otp,
  newPassword
) => {
  if (!email || !otp || !newPassword) {
    throw new Error(
      "Email, OTP and New Password are required"
    );
  }

  await verifyOTP(email, otp);

  const hashedPassword = await bcrypt.hash(
    newPassword,
    10
  );

  await authRepository.updatePassword(
    email,
    hashedPassword
  );


  return true;
};

module.exports = {
  forgotPassword,
  verifyOTP,
  resetPassword,
};