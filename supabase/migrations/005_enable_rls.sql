-- RLS Security Migration
-- Enables Row-Level Security on users and daily_results tables
-- Public (anon key) can only READ, server-side (service role key) can do everything
--
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- ============================================
-- STEP 1: Enable RLS on users table
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read users (needed for the dashboard)
CREATE POLICY "Allow public read access on users"
    ON users FOR SELECT USING (true);

-- ============================================
-- STEP 2: Enable RLS on daily_results table
-- ============================================
ALTER TABLE daily_results ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read daily_results (needed for streaks/history)
CREATE POLICY "Allow public read access on daily_results"
    ON daily_results FOR SELECT USING (true);
