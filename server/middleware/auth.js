const admin = require("../config/firebaseAdmin");

module.exports = async (req, res, next) => {
  // Extract token from 'Authorization: Bearer <token>' header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, error: "Access denied. No Firebase token provided." });
  }

  try {
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("❌ Firebase Auth verification FAILED:", error.message);
    return res.status(401).json({ success: false, error: "Invalid or expired Firebase token." });
  }
};
