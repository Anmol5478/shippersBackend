const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOTP = async (email, otp) => {
  try {
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Reset Password OTP",
      html: `
        <h2>Password Reset Request</h2>

        <p>Your OTP is:</p>

        <h1>${otp}</h1>

        <p>This OTP will expire in <strong>10 minutes</strong>.</p>

        <p>If you did not request a password reset, you can safely ignore this email.</p>
      `,
    });

    return response;
  } catch (error) {
    console.error("Resend Email Error:", error);
    throw new Error("Failed to send OTP email");
  }
};

module.exports = {
  sendOTP,
};