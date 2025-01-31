const twilio = require("twilio");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

// Twilio Configuration
const twilioClient = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send SMS Notification
const sendSmsNotification = async (mobile, message) => {
  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,  // Aapka Twilio phone number
      to: mobile,  // User ka mobile number
    });
    console.log(`✅ SMS sent to: ${mobile}`);
  } catch (error) {
    console.error("❌ Error sending SMS:", error);
    throw new Error("Failed to send SMS notification.");
  }
};

// Send Email Notification
const sendEmailNotification = async (email, subject, message) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .email-container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
              .email-header { font-size: 24px; font-weight: bold; color: #333; }
              .email-body { font-size: 16px; color: #555; }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">${subject}</div>
              <div class="email-body">${message}</div>
            </div>
          </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to: ${email}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error("Failed to send email notification.");
  }
};

// Export functions
module.exports = {
  sendSmsNotification,
  sendEmailNotification,
};
