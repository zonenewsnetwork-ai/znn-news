const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

// ---- ADD CHANNEL: POST /api/live/add ----
async function handleAdd(req, res) {
  try {
    const { name, url, language } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: "Name and URL are required" });
    }

    const { data, error } = await supabase
      .from("live_tv")
      .insert([{
        name: name.trim(),
        url: url.trim(), 
        language: (language || "English").trim()
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, channel: data });

  } catch (err) {
    console.error("❌ LIVE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
}

router.post("/add", handleAdd);
router.post("/", handleAdd);

// ---- GET ALL: GET /api/live ----
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("live_tv")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("❌ GET LIVE ERROR:", err.message);
    res.json([]);
  }
});

// ---- DELETE: DELETE /api/live/:id ----
router.delete("/:id", async (req, res) => {
  try {
    const { error } = await supabase
      .from("live_tv")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

module.exports = router;