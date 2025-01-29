const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserEmail = require("../models/userEmail");
const UserPhone = require("../models/userPhone");
const twilio = require("twilio");
const dotenv = require("dotenv");

dotenv.config();

const twilioClient = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const userOtp = {}; // In-memory storage for OTPs

// Generate JWT Token
const generateToken = (userId, userType) => {
  return jwt.sign({ userId, userType }, process.env.JWT_SECRET, {
    expiresIn: "365d",
  });
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

    const token = generateToken(user._id, "email");
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

module.exports = {
  signupEmail,
  loginEmail,
  loginPhone,
  verifyOtp,
  forgotPassword,
  resetPassword,
};