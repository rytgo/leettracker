-- ROOM SYSTEM MIGRATION
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Create rooms table
-- ============================================
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    pin TEXT DEFAULT NULL,  -- Optional PIN for edit protection
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: Add room_id to users table
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE CASCADE;

-- ============================================
-- STEP 3: Fix unique constraint
-- Allow same LeetCode user to be tracked in multiple rooms
-- ============================================
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_leetcode_username_key;
ALTER TABLE users ADD CONSTRAINT users_room_username_unique UNIQUE (room_id, leetcode_username);

-- ============================================
-- STEP 4: Create indexes for faster lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_room_id ON users(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);

-- ============================================
-- STEP 5: Enable RLS on rooms table
-- ============================================
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on rooms" ON rooms
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- STEP 6: Clean up orphaned users (no room)
-- ============================================
DELETE FROM daily_results WHERE user_id IN (SELECT id FROM users WHERE room_id IS NULL);
DELETE FROM users WHERE room_id IS NULL;
