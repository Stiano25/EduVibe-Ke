-- Migration to add learner-specific features
-- Run this in your Supabase SQL Editor

-- Add grade column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS grade TEXT CHECK (grade IN ('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'));

-- Add order/sequence column to lessons table for progressive unlock
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS lesson_order INTEGER DEFAULT 0;

-- Create lesson_progress table to track learner progress
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_lesson UNIQUE (user_id, lesson_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed ON lesson_progress(completed);
CREATE INDEX IF NOT EXISTS idx_lessons_substrand_order ON lessons(sub_strand_id, lesson_order);

-- Add trigger for updated_at on lesson_progress
DROP TRIGGER IF EXISTS update_lesson_progress_updated_at ON lesson_progress;
CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

