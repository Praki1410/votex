const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

// Configure Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Function to Send Email Notifications
 */
// const sendEmailNotification = async (email, subject, message) => {
//   try {
//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: subject,
//       text: message,
//     };

//     await transporter.sendMail(mailOptions);
//     console.log(`✅ Email sent to: ${email}`);
//   } catch (error) {
//     console.error("❌ Error sending email:", error);
//     throw new Error("Failed to send email notification.");
//   }
// };



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
              body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f7f7f7;
                color: #333;
              }
              .email-container {
                background-color: #ffffff;
                border-radius: 12px;
                padding: 40px;
                box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
                max-width: 650px;
                margin: 40px auto;
                font-size: 16px;
                line-height: 1.5;
                border: 1px solid #e0e0e0;
                transition: box-shadow 0.3s ease-in-out;
              }
              .email-container:hover {
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
              }
              .email-header {
                color: #2d3e50;
                text-align: center;
                font-size: 30px;
                font-weight: bold;
                margin-bottom: 20px;
                letter-spacing: 1px;
                background: linear-gradient(to right, #4CAF50, #81C784);
                padding: 10px 0;
                color: #fff;
                border-radius: 5px;
                animation: fadeIn 1s ease-in;
              }
              .email-body {
                color: #555;
                text-align: left;
                font-size: 16px;
                line-height: 1.6;
                margin-top: 20px;
              }
              .cta-button {
                display: inline-block;
                background-color: #4CAF50;
                color: #ffffff;
                padding: 12px 20px;
                font-size: 16px;
                text-decoration: none;
                border-radius: 6px;
                text-align: center;
                margin-top: 20px;
                transition: background-color 0.3s ease, transform 0.3s ease;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
              }
              .cta-button:hover {
                background-color: #45a049;
                transform: translateY(-3px);
              }
              .cta-button:active {
                transform: translateY(1px);
              }
              .email-footer {
                margin-top: 40px;
                text-align: center;
                color: #888;
                font-size: 14px;
              }
              .email-footer a {
                color: #4CAF50;
                text-decoration: none;
                font-weight: bold;
                transition: color 0.3s ease;
              }
              .email-footer a:hover {
                color: #45a049;
              }
              @keyframes fadeIn {
                from {
                  opacity: 0;
                }
                to {
                  opacity: 1;
                }
              }
              @keyframes slideIn {
                from {
                  transform: translateX(-100%);
                }
                to {
                  transform: translateX(0);
                }
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">✅ ${subject}</div>
              <div class="email-body">
                <p>${message}</p>
            
              </div>
              <div class="email-footer">
                <p>Thank you for your trust in our services.<br>Best Regards,</p>
                <p><strong>Vetrox Veterinary Soluation</strong></p>
              </div>
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


/**
 * Function to Decode Token and Retrieve Email
 */
const getEmailFromToken = (req) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) throw new Error("Unauthorized! No token provided.");

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log("🔍 Decoded Token:", decoded);

  if (!decoded.email) throw new Error("Invalid token. Email not found.");

  return decoded.email;
};

/**
 * API: Book Consultation
 */
const bookConsultation = async (req, res) => {
  try {
    const email = getEmailFromToken(req);
    await sendEmailNotification(
      email,
      "Your Consulting Booking is Confirmed ✅",
      "Thank you for booking a consultation! Your appointment has been successfully scheduled."
    );
    res.status(200).json({ message: "✅ Consultation booked successfully. Confirmation email sent!" });
  } catch (error) {
    console.error("❌ Error booking consultation:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * API: Place Order
 */
const placeOrder = async (req, res) => {
  try {
    const email = getEmailFromToken(req);
    await sendEmailNotification(
      email,
      "Your Order is Confirmed ✅",
      "Thank you for your order! Your order has been successfully placed."
    );
    res.status(200).json({ message: "✅ Order placed successfully. Confirmation email sent!" });
  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { bookConsultation, placeOrder };
