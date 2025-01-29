const UserEmail = require("../models/userEmail");
const jwt = require("jsonwebtoken");

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await UserEmail.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000; // 1 hour from now
    await user.save();

    res.status(200).json({
      message: "Password reset token generated. Please use it to reset your password.",
      resetToken,
    });
  } catch (error) {
    res.status(500).json({ message: "Error during password reset request", error: error.message });
  }
};

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
    res.status(500).json({ message: "Error during password reset", error: error.message });
  }
};

module.exports = { forgotPassword, resetPassword };
