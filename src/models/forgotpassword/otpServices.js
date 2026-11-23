const axios = require("axios");

const BREVO_API_URL =
  "https://api.brevo.com/v3/smtp/email";

const sendPasswordResetLink = async (
  email,
  resetLink
) => {
  try {
    const response = await axios.post(
      BREVO_API_URL,
      {
        sender: {
          name: "Ridezey",
          email: process.env.BREVO_SENDER_EMAIL,
        },

        to: [
          {
            email,
          },
        ],

        subject: "Reset your Ridezey password",

        htmlContent: `
<!DOCTYPE html>
<html lang="en">

<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Reset Your Password</title>
</head>

<body
style="
margin:0;
padding:0;
background:#f0f2f7;
font-family:Arial,Helvetica,sans-serif;
"
>

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
border="0"
style="
width:100%;
background:#f0f2f7;
"
>

<tr>

<td
align="center"
style="
padding:50px 16px;
"
>

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
border="0"
style="
max-width:700px;
background:#ffffff;
border-radius:20px;
overflow:hidden;
border:1px solid #e7e9f0;
"
>

<!-- HEADER -->

<tr>

<td
align="center"
style="
background:#081B3A;
padding:48px 30px;
border-bottom:4px solid #FDBE15;
"
>

<p
style="
margin:0 0 12px;
color:#FDBE15;
font-size:12px;
font-weight:700;
letter-spacing:4px;
text-transform:uppercase;
"
>
RIDEZEY
</p>

<h1
style="
margin:0;
color:#ffffff;
font-size:30px;
font-weight:600;
"
>
Reset Your Password
</h1>

</td>

</tr>


<!-- CONTENT -->

<tr>

<td
style="
padding:50px 45px;
"
>

<p
style="
margin:0 0 15px;
color:#081B3A;
font-size:18px;
font-weight:600;
"
>
Password reset request
</p>

<p
style="
margin:0;
color:#667085;
font-size:15px;
line-height:25px;
"
>
We received a request to reset the password for your
Ridezey account.
Click the button below to securely create a new password.
</p>


<!-- RESET BUTTON -->

<table
role="presentation"
cellpadding="0"
cellspacing="0"
border="0"
style="
margin:35px 0;
"
>

<tr>

<td
align="center"
style="
background:#FDBE15;
border-radius:10px;
"
>

<a
href="${resetLink}"
style="
display:inline-block;
padding:16px 34px;
color:#081B3A;
text-decoration:none;
font-size:15px;
font-weight:700;
border-radius:10px;
"
>

Reset Password →

</a>

</td>

</tr>

</table>


<p
style="
margin:0;
color:#8a91a3;
font-size:14px;
line-height:22px;
"
>

This secure password reset link will expire in

<strong
style="
color:#081B3A;
"
>

15 minutes

</strong>.

</p>


<!-- DIVIDER -->

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
border="0"
style="
margin:35px 0;
"
>

<tr>

<td
style="
border-top:1px solid #e7e9f0;
"
>

</td>

</tr>

</table>


<p
style="
margin:0;
color:#8a91a3;
font-size:13px;
line-height:22px;
"
>

If you didn't request a password reset,
you can safely ignore this email.
Your password will remain unchanged.

</p>

</td>

</tr>


<!-- FOOTER -->

<tr>

<td
align="center"
style="
padding:22px;
background:#fafbfd;
border-top:1px solid #eef0f5;
"
>

<p
style="
margin:0;
color:#a3a9ba;
font-size:12px;
"
>

© ${new Date().getFullYear()} Ridezey.
All rights reserved.

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
      },

      {
        headers: {
          "api-key":
            process.env.BREVO_API_KEY,

          "Content-Type":
            "application/json",

          Accept:
            "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Brevo Email Error:",
      error.response?.data ||
      error.message ||
      error
    );

    throw new Error(
      "Failed to send password reset email"
    );
  }
};

module.exports = {
  sendPasswordResetLink,
};