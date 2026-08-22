const axios = require("axios");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const sendOTP = async (email, otp) => {
  try {
    const response = await axios.post(
      BREVO_API_URL,
      {
        sender: {
          name: "Your Company",
          email: process.env.BREVO_SENDER_EMAIL, // must be a verified sender in Brevo
        },
        to: [{ email }],
        subject: "Reset Password OTP",
        htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Password Reset</title>
</head>

<body style="margin:0;padding:40px 16px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="center">

<table role="presentation" width="440" cellpadding="0" cellspacing="0" border="0"
style="
max-width:440px;
background:#ffffff;
border-radius:14px;
overflow:hidden;
border:1px solid #eceef4;
">

  <!-- Header -->
  <tr>
    <td align="center" style="padding:28px 30px 20px;">
      <span
        style="
        color:#081B3A;
        font-size:14px;
        font-weight:700;
        letter-spacing:1.5px;
        ">
        RIDEZEY
      </span>
    </td>
  </tr>

  <!-- Content -->
  <tr>
    <td style="padding:8px 36px 32px;">

      <p
        style="
        margin:0 0 6px;
        color:#081B3A;
        font-size:17px;
        font-weight:600;
        text-align:center;
        ">
        Reset your password
      </p>

      <p
        style="
        margin:0 0 26px;
        color:#7a8296;
        font-size:14px;
        line-height:21px;
        text-align:center;
        ">
        Use this code to continue. It's valid for 10 minutes.
      </p>

      <!-- OTP -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td
                  style="
                  background:#FFF9EC;
                  border-radius:10px;
                  padding:16px 34px;
                  ">
                  <span
                    style="
                    color:#081B3A;
                    font-size:28px;
                    font-weight:700;
                    letter-spacing:8px;
                    font-family:'Courier New',monospace;
                    ">${otp}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
        <tr><td style="border-top:1px solid #f0f1f6;"></td></tr>
      </table>

      <p
        style="
        margin:20px 0 0;
        color:#9aa1b2;
        font-size:12.5px;
        line-height:19px;
        text-align:center;
        ">
        Didn't request this? You can safely ignore this email.
      </p>

    </td>
  </tr>

</table>

<p style="margin:20px 0 0;color:#aeb4c2;font-size:11.5px;text-align:center;">
  © ${new Date().getFullYear()} Ridezey
</p>

</td>
</tr>
</table>

</body>
</html>
`,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Brevo Email Error:",
      error.response?.data || error.message || error
    );
    throw new Error("Failed to send OTP email");
  }
};

module.exports = {
  sendOTP,
};