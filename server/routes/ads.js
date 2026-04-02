const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

/* ---------- GET: All Ads (Admin) ---------- */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ success: true, ads: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------- GET: Active Ads (Frontend) ---------- */
router.get("/active", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .eq("status", true);

    if (error) throw error;
    res.json({ success: true, ads: data });
  } catch (err) {
    res.status(500).json({ success: false, ads: [] });
  }
});

/* ---------- POST: Add New Ad ---------- */
router.post("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("ads")
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, ad: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------- PUT: Update Ad ---------- */
router.put("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("ads")
      .update(req.body)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, ad: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------- DELETE: Delete Ad ---------- */
router.delete("/:id", async (req, res) => {
  try {
    const { error } = await supabase
      .from("ads")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

