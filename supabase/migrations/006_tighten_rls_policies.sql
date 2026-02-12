-- Tighten RLS policies on rooms and submissions
-- Replaces the overly permissive "allow ALL" policies with read-only public access
--
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Fix rooms table policy
-- ============================================
DROP POLICY "Allow all operations on rooms" ON rooms;

CREATE POLICY "Allow public read access on rooms"
    ON rooms FOR SELECT USING (true);

-- ============================================
-- STEP 2: Fix submissions table policy
-- ============================================
DROP POLICY "Allow all operations on submissions" ON submissions;

CREATE POLICY "Allow public read access on submissions"
    ON submissions FOR SELECT USING (true);
