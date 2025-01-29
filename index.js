

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

dotenv.config();

const app = express();
app.use(bodyParser.json({ limit: '10kb' })); // Limit the size of the request body

// In-memory object to temporarily store OTPs
const userOtp = {};

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // poolSize: 10, // Increase connection pool size
  })
  .then(() => {
    console.log("Connected to MongoDB successfully! 🚀");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error.message);
  });

// Models
const UserEmailSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  resetToken: { type: String, default: null },
  resetTokenExpiration: { type: Date, default: null },
});

const UserEmail = mongoose.model("UserEmail", UserEmailSchema);

const UserPhoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, unique: true, required: true },
  mobileVerified: { type: Boolean, default: false },
});

const UserPhone = mongoose.model("UserPhone", UserPhoneSchema);

const ProductSchema = new mongoose.Schema({
  productId: { type: String, required: true, index: true }, // Add index
  productName: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, required: true },
  imageUrl: { type: String, required: true },
  description: { type: String, required: true },
});

const Product = mongoose.model("Product", ProductSchema);

// Twilio Setup for Phone OTP
const twilioClient = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// JWT Helper
const generateToken = (userId, userType) => {
  return jwt.sign({ userId, userType }, process.env.JWT_SECRET, {
    expiresIn: "365d",
  });
};

// Middleware for Token Verification
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(401).json({ message: "Access denied. Token required!" });
  }

  const jwtToken = token.split(" ")[1]; // Extract token from 'Bearer <token>'
  jwt.verify(jwtToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token!" });
    }

    req.user = decoded; // Attach token payload to request
    next();
  });
};

// Routes

// Email Signup
app.post("/signup-email", async (req, res) => {
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
});

// Email Login
app.post("/login-email", async (req, res) => {
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
});

// Phone Login (OTP)
app.post("/login-phone", async (req, res) => {
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
});

// Verify OTP for Phone Login
app.post("/verify-otp", async (req, res) => {
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
});

app.post("/forgot-password", async (req, res) => {
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
});

app.post("/reset-password", async (req, res) => {
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
});


app.get("/products", async (req, res) => {
  try {
    const products = await Product.find().select("-__v").lean();

    res.status(200).json({
      message: "Product data fetched successfully",
      products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      message: "Error fetching products",
      error: error.message,
    });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
