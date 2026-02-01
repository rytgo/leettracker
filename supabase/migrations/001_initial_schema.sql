-- LeetTracker Initial Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- USERS TABLE
-- Stores the two LeetCode users we're tracking
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leetcode_username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DAILY_RESULTS TABLE
-- Stores whether each user solved a problem each day
-- One record per user per date (Pacific timezone)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL, -- Date in Pacific timezone (YYYY-MM-DD)
  did_solve BOOLEAN NOT NULL DEFAULT FALSE,
  solved_at TIMESTAMPTZ, -- When they solved (UTC timestamp)
  problem_title TEXT,
  problem_slug TEXT,
  submission_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one record per user per date
  UNIQUE(user_id, date)
);

-- Index for fast lookups by user and date
CREATE INDEX IF NOT EXISTS idx_daily_results_user_date ON daily_results(user_id, date DESC);

-- ============================================
-- INSERT INITIAL USERS
-- Replace with your actual LeetCode usernames
-- ============================================
INSERT INTO users (leetcode_username, display_name) VALUES
  ('rytgo', 'Ryan'),  -- Replace 'user1' with first LeetCode username
  ('uyph1899', 'Uyen')     -- Replace 'user2' with second LeetCode username
ON CONFLICT (leetcode_username) DO NOTHING;

-- ============================================
-- UPDATED_AT TRIGGER
-- Automatically update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_results_updated_at
  BEFORE UPDATE ON daily_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ENABLE ROW LEVEL SECURITY (Optional)
-- For now, disable RLS since we have no auth
-- If you want to enable it later:
-- ============================================
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_results ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
-- CREATE POLICY "Allow public read access" ON users FOR SELECT USING (true);
-- CREATE POLICY "Allow public read access" ON daily_results FOR SELECT USING (true);

-- ============================================
-- VERIFICATION QUERIES (for testing)
-- ============================================

-- Check users table
-- SELECT * FROM users;

-- Check daily_results table
-- SELECT * FROM daily_results ORDER BY date DESC;

-- View results with user names
-- SELECT 
--   u.display_name,
--   dr.date,
--   dr.did_solve,
--   dr.solved_at AT TIME ZONE 'America/Los_Angeles' as solved_at_pt,
--   dr.problem_title
-- FROM daily_results dr
-- JOIN users u ON u.id = dr.user_id
-- ORDER BY dr.date DESC, u.display_name;
