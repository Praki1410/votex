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
 * Function to Send Order Confirmation Email
 */
const sendOrderConfirmationEmail = async (email) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Order is Confirmed ✅",
      text: "Thank you for your order! Your order has been successfully placed.",
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order confirmation email sent to: ${email}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error("Failed to send confirmation email.");
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
 * API: Place Order
 */
const placeOrder = async (req, res) => {
  try {
    const email = getEmailFromToken(req);
    await sendOrderConfirmationEmail(email);
    res.status(200).json({ message: "✅ Order placed successfully. Confirmation email sent!" });
  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.status(500).json({ message: error.message });
  }
};






module.exports = { placeOrder };
