const admin = require("firebase-admin");
const path = require("path");

// Load service account key
// IMPORTANT: User must place serviceAccountKey.json in this directory
const serviceAccountPath = path.join(__dirname, "znn-admin-firebase-adminsdk-fbsvc-f1f3ac152c.json");

try {
  if (!admin.apps.length) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Admin SDK Initialized");
  } else {
    console.log("✅ Firebase Admin SDK already initialized (reuse)");
  }
} catch (error) {
  console.error("❌ Firebase Admin SDK Initialization FAILED:", error.message);
  console.error("❌ Full error:", error);
  console.error("👉 Ensure service account JSON exists at:", serviceAccountPath);
}

module.exports = admin;
