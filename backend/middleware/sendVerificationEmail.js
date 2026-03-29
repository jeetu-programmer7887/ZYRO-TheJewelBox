import axios from "axios";

const sendVerificationEmail = async (email, code) => {
  try {
    const api_key = process.env.BREVO_API_KEY;
    const Brevo_url = "https://api.brevo.com/v3/smtp/email";

    const emailData = {
      sender: {
        name: process.env.ADMIN_NAME,
        email: process.env.ADMIN_EMAIL,
      },
      to: [{ email }],
      subject: "ZYRO - Verify Your Email",
      htmlContent: `
        <html>
           <body style="font-family: Arial, sans-serif;">
              <h2 style="color:#333;">Your ZYRO Verification Code</h2>
              <p>Please use the following code to verify your email:</p>
              <div style="
                font-size: 32px;
                font-weight: bold;
                margin: 20px 0;
                color: #2E4A3E;">
                ${code}
              </div>
              <p>If you didn’t request this, ignore this email.</p>
            </body>
        </html>
      `,
    };

    await axios.post(Brevo_url, emailData, {
      headers: {
        "Content-Type": "application/json",
        "api-key": api_key,
      },
      timeout: 7000,
    });

    return true;
  } catch (error) {
    console.log("Error sending email:", error.response?.data || error.message);
    return false;
  }
};

export default sendVerificationEmail;
