const express = require("express");
const { placeOrder } = require("../controllers/orderController");
const {bookConsultation}=require("../controllers/orderController")
const router = express.Router();

router.post("/place-order", placeOrder);
router.post("/booking-consultation", bookConsultation)

module.exports = router;
