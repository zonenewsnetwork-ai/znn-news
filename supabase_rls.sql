-- ==========================================
-- STEP 1: Enable RLS on all reader tables
-- ==========================================
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_tv ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 2: Create policies for public reading
-- ==========================================
CREATE POLICY "Allow public read for news" ON news FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read for live tv" ON live_tv FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read for ads" ON ads FOR SELECT TO public USING (true);

-- ==========================================
-- STEP 3: (Optional) Fix for 'views' increment
-- Execute this if you want the views to count.
-- ==========================================
CREATE OR REPLACE FUNCTION increment_views(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE news
  SET views = COALESCE(views, 0) + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
