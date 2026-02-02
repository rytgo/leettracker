-- SUBMISSIONS TABLE MIGRATION
-- Run this in Supabase SQL Editor

-- Create submissions table to store all accepted problems per day
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    problem_title TEXT NOT NULL,
    problem_slug TEXT NOT NULL,
    solved_at TIMESTAMP WITH TIME ZONE NOT NULL,
    submission_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_submissions_user_date ON submissions(user_id, date);

-- Unique constraint: one entry per user per problem per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_unique 
ON submissions(user_id, date, problem_slug);

-- Enable RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on submissions" ON submissions
    FOR ALL USING (true) WITH CHECK (true);
