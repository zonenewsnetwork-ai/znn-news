require("dotenv").config({ override: true });
const express = require("express");
const path = require("path");
const cors = require("cors");
const { fetchAndSaveNews } = require("./services/gnewsService");
const { fetchRSSNews } = require("./services/rssService");

// Route imports
const newsRoutes = require("./routes/news");
const liveTVRoutes = require("./routes/liveTV");
const adminRoutes = require("./routes/admin");
const adsRoutes = require("./routes/ads");
const authRoutes = require("./routes/auth");
const settingsRoutes = require("./routes/settings");
const seoRoutes = require("./routes/seo");
const generateRoutes = require("./routes/generate");

// Middleware imports
const authMiddleware = require("./middleware/auth");

const app = express();

/* MIDDLEWARE */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

/* ADMIN DASHBOARD (FIX) */
app.get("/admin", (req, res) => {
  const filePath = path.join(__dirname, "../public/admin.html");
  console.log("Serving admin from:", filePath);
  res.sendFile(filePath);
});


/* STARTUP */
console.log("🚀 Starting ZNN News Platform...");

// Health check + initial fetch
const supabase = require("./config/supabase");
(async () => {
  try {
    const { data, error } = await supabase.from("news").select("id").limit(1);
    if (error) {
      console.error("❌ Supabase table check FAILED:", error.message);
      return;
    }
    console.log("✅ Supabase Connected — tables verified");
    
    // Fetch news on startup — RSS first (unlimited), then GNews
    fetchRSSNews();
    fetchAndSaveNews();
  } catch (e) {
    console.error("❌ Supabase connection error:", e.message);
  }
})();

// RSS: Every 5 minutes (unlimited, no API limits)
setInterval(() => {
  console.log("🔄 [Auto] RSS fetch cycle...");
  fetchRSSNews();
}, 5 * 60 * 1000);

// GNews: Every 30 minutes (API limit conscious)
setInterval(() => {
  console.log("🔄 [Auto] GNews fetch cycle...");
  fetchAndSaveNews();
}, 30 * 60 * 1000);


/* ROUTES */
app.use("/api/news", newsRoutes);
app.use("/api/live", liveTVRoutes);
app.use("/api/ads", adsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/generate", generateRoutes);



// Protected Admin Routes
app.use("/api/admin", authMiddleware, adminRoutes);
app.use("/api/settings", authMiddleware, settingsRoutes);
app.use("/", seoRoutes);



/* HOME */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

/* START SERVER */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

/* GLOBAL ERROR LOGGING */
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
});