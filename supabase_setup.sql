-- STEP 1: CREATE USERS TABLE (SUPABASE)
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

-- STEP 2: INSERT ADMIN USER
-- NOTE: Please change your password after initial setup.
INSERT INTO admins (email, password)
VALUES ('admin@znn.com', 'ZNN@123')
ON CONFLICT (email) DO NOTHING;
