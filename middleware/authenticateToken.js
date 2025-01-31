const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

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

module.exports = authenticateToken;