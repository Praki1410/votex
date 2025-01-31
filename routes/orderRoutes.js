const express = require("express");
const { placeOrder} = require("../controllers/authController");
const {bookConsultation}=require("../controllers/authController")
const router = express.Router();

router.post("/place-order", placeOrder);
router.post("/booking-consultation", bookConsultation)

module.exports = router;
