const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify()
  .then(() => {
    console.log("✅ Gmail SMTP is ready to send emails");
  })
  .catch((error) => {
    console.error("❌ Gmail SMTP VERIFY ERROR:");
    console.error(error);
  });

const sendOTP = async (email, otp) => {
  try {
    const response = await transporter.sendMail({
      from: `"Ridezey" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Password OTP",

      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset</title>
</head>

<body style="margin:0;padding:40px 15px;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
style="
max-width:600px;
background:#ffffff;
border-radius:20px;
overflow:hidden;
box-shadow:0 15px 40px rgba(8,27,58,0.12);
">

  <!-- Header -->
  <tr>
    <td align="center"
      style="background:#081B3A;padding:45px 30px;">

      <div style="
        width:75px;
        height:75px;
        background:#FDBE15;
        border-radius:50%;
        line-height:75px;
        font-size:36px;
        margin:auto;
      ">
        🔐
      </div>

      <h1 style="
        margin:25px 0 10px;
        color:#ffffff;
        font-size:30px;
        font-weight:bold;
      ">
        Password Reset
      </h1>

      <p style="
        margin:0;
        color:#d7deea;
        font-size:16px;
      ">
        Verify your identity to continue
      </p>

    </td>
  </tr>

  <!-- Content -->
  <tr>
    <td style="padding:45px 40px;">

      <h2 style="
        margin:0;
        color:#081B3A;
        font-size:24px;
      ">
        Hello,
      </h2>

      <p style="
        margin:20px 0;
        color:#555;
        font-size:16px;
        line-height:28px;
      ">
        We received a request to reset your password.
        Use the verification code below to continue.
      </p>

      <!-- OTP -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">

            <div style="
              display:inline-block;
              background:#081B3A;
              color:#FDBE15;
              font-size:38px;
              font-weight:bold;
              letter-spacing:12px;
              padding:18px 42px;
              border-radius:14px;
              border:3px solid #FDBE15;
            ">
              ${otp}
            </div>

          </td>
        </tr>
      </table>

      <p style="
        margin:30px 0 0;
        text-align:center;
        color:#666;
        font-size:15px;
      ">
        This OTP is valid for
        <strong style="color:#081B3A;">10 minutes</strong>.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:35px;">
        <tr>
          <td style="
            background:#FFF8E5;
            border-left:5px solid #FDBE15;
            padding:18px;
            border-radius:8px;
            color:#555;
            font-size:15px;
            line-height:24px;
          ">
            <strong style="color:#081B3A;">
              Didn't request this?
            </strong>
            <br>
            If you didn't request a password reset, you can safely ignore this email.
            Your account remains secure.
          </td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td align="center"
      style="background:#081B3A;padding:25px;">

      <p style="
        margin:0;
        color:#b8c3d8;
        font-size:13px;
      ">
        © ${new Date().getFullYear()} Ridzey. All Rights Reserved.
      </p>

    </td>
  </tr>

</table>

</td>
</tr>
</table>

</body>
</html>
      `,
    });

    console.log("OTP email sent:", response.messageId);

    return response;
  } catch (error) {
    console.error("Gmail Email Error:", error);
    throw new Error("Failed to send OTP email");
  }
};

module.exports = {
  sendOTP,
};