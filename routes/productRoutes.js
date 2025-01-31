const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const authenticateToken = require("../middleware/authenticateToken");

// Protected Product Route
router.get("/products", productController.getProducts);

module.exports = router;