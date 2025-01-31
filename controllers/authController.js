
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserEmail = require("../models/userEmail");
const UserPhone = require("../models/userPhone");
const twilio = require("twilio");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");

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

// In-memory storage for OTPs
const userOtp = {};

// Generate JWT Token
const generateToken = (userId, email) => {
  const token = jwt.sign({ userId, email }, process.env.JWT_SECRET, {
    expiresIn: "365d",
  });
  console.log("🔑 Token generated:", token); // Log the generated token
  return token;
};

// Email Signup
const signupEmail = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await UserEmail.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered!" });
    }

    const newUser = new UserEmail({
      name,
      email,
      password: await bcrypt.hash(password, 10),
    });

    await newUser.save();
    res.status(200).json({ message: "Signup successful!" });
  } catch (error) {
    res.status(500).json({ message: "Error during signup", error: error.message });
  }
};

// Email Login
const loginEmail = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserEmail.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password!" });
    }

    // Generate JWT Token
    const token = generateToken(user._id, user.email);
    console.log("🔑 Token sent to client:", token); // Log the token sent to the client
    res.status(200).json({ message: "Login successful!", token });
  } catch (error) {
    res.status(500).json({ message: "Error during login", error: error.message });
  }
};

// Phone Login (OTP)
const loginPhone = async (req, res) => {
  const { mobile } = req.body;

  try {
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
    userOtp[mobile] = otp; // Temporarily store the OTP in memory

    // Send the OTP to the user's mobile number using Twilio
    await twilioClient.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobile,
    });

    res.status(200).json({ message: "OTP sent to mobile.", otp });
  } catch (error) {
    res.status(500).json({ message: "Error during OTP generation or sending", error: error.message });
  }
};

// Verify OTP for Phone Login
const verifyOtp = async (req, res) => {
  const { mobile, otp } = req.body;

  try {
    const storedOtp = userOtp[mobile];
    if (!storedOtp) {
      return res.status(400).json({ message: "OTP not found or expired." });
    }

    if (storedOtp.toString() !== otp.toString()) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    delete userOtp[mobile]; // OTP verified, remove it

    // Generate JWT Token
    const token = generateToken(mobile, "phone");

    res.status(200).json({ message: "Login successful!", token });
  } catch (error) {
    console.error("Error during OTP verification:", error);
    res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};

// Forgot Password
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await UserEmail.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000; // 1 hour from now
    await user.save();

    res.status(200).json({
      message: "Password reset token generated. Please use it to reset your password.",
      resetToken, // This would be sent securely (via email)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error during password reset request", error: error.message });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;

  try {
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);

    const user = await UserEmail.findOne({ _id: decoded.userId });
    if (!user || user.resetToken !== resetToken || user.resetTokenExpiration < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error during password reset", error: error.message });
  }
};

// Send SMS Notification
const sendSmsNotification = async (mobile, message) => {
  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,  // Your Twilio phone number
      to: mobile,  // User's mobile number
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
              .email-header { font-size: 14px; font-weight: bold; color: #333; }
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

// Get Email from Token
const getEmailFromToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.error("❌ No authorization header found");
    throw new Error("Unauthorized! No token provided.");
  }

  const token = authHeader.split(" ")[1]; // Extract token from "Bearer <token>"
  if (!token) {
    console.error("❌ Token not found in authorization header");
    throw new Error("Unauthorized! Token not found in header.");
  }

  console.log("🔍 Extracted Token:", token); // Log the extracted token

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔍 Decoded Token:", decoded); // Log the decoded token

    if (!decoded.email) {
      console.error("❌ Email not found in decoded token");
      throw new Error("Invalid token. Email not found.");
    }

    return decoded.email;
  } catch (error) {
    console.error("❌ Error verifying token:", error); // Log the error
    throw new Error("Invalid token.");
  }
};

// Book Consultation
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

// Place Order
const placeOrder = async (req, res) => {
  try {
    const email = getEmailFromToken(req);

    // Send Email Notification
    await sendEmailNotification(
      email,
      "Your Order is Confirmed ✅",
      "Thank you for your order! Your order has been successfully placed."
    );

    // Send SMS Notification (you can get the mobile number from the user model or the request body)
    const mobile = req.body.mobile; // Assuming the mobile number is sent in the request body
    if (mobile) {
      await sendSmsNotification(
        mobile,
        "Your order is confirmed. Thank you for your order! Your order has been successfully placed."
      );
    }

    res.status(200).json({ message: "✅ Order placed successfully. Confirmation email and SMS sent!" });
  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.status(500).json({ message: error.message });
  }
};

// Export all functions
module.exports = {
  signupEmail,
  loginEmail,
  loginPhone,
  verifyOtp,
  forgotPassword,
  resetPassword,
  bookConsultation,
  placeOrder,
};
