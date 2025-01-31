const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const placeorder=require("./routes/orderRoutes")


dotenv.config();

const app = express();
app.use(bodyParser.json());

// Connect to MongoDB
connectDB();

// Routes
app.use("/auth", authRoutes);
app.use("/", productRoutes);
app.use("/order",placeorder)

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
