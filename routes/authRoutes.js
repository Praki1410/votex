const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Email Signup and Login
router.post("/signup-email", authController.signupEmail);
router.post("/login-email", authController.loginEmail);

// Phone Login (OTP)
router.post("/login-phone", authController.loginPhone);
router.post("/verify-otp", authController.verifyOtp);

// Password Reset
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

module.exports = router;