const mongoose = require("mongoose");

const UserPhoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, unique: true, required: true },
  mobileVerified: { type: Boolean, default: false },
});

module.exports = mongoose.model("UserPhone", UserPhoneSchema);
