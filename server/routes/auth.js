const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); // Used if we want to hash, but for now we use plane text from .env for simplicity as it is a single-user system

router.post("/login", async (req, res) => {
  const { password } = req.body;

  if (password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1d" });
    return res.json({ success: true, token });
  }

  res.status(401).json({ success: false, error: "Invalid password" });
});

module.exports = router;
