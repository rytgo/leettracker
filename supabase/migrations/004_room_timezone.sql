-- ROOM TIMEZONE MIGRATION
-- Run this in Supabase SQL Editor

-- Add timezone column to rooms table (default to Pacific)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';
