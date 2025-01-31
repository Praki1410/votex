const mongoose = require("mongoose");

const UserEmailSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  resetToken: { type: String, default: null },
  resetTokenExpiration: { type: Date, default: null },
});

module.exports = mongoose.model("UserEmail", UserEmailSchema);