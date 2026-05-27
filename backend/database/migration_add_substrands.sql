-- Migration to add sub-strands table and update lessons table
-- Run this if you already have the database tables

-- Add sub_strands table
CREATE TABLE IF NOT EXISTS sub_strands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  strand_id UUID REFERENCES strands(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  learning_outcomes TEXT[] NOT NULL DEFAULT '{}',
  key_inquiry_questions TEXT[] NOT NULL DEFAULT '{}',
  is_ai_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add theme column to strands if it doesn't exist
ALTER TABLE strands 
ADD COLUMN IF NOT EXISTS theme TEXT;

-- Remove curriculum_design_id from strands (if exists)
ALTER TABLE strands 
DROP COLUMN IF EXISTS curriculum_design_id;

-- Add sub_strand_id to lessons table
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS sub_strand_id UUID REFERENCES sub_strands(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sub_strands_strand ON sub_strands(strand_id);
CREATE INDEX IF NOT EXISTS idx_sub_strands_subject ON sub_strands(subject_id);
CREATE INDEX IF NOT EXISTS idx_lessons_sub_strand ON lessons(sub_strand_id);

-- Update lessons to set is_ai_generated default to true
ALTER TABLE lessons 
ALTER COLUMN is_ai_generated SET DEFAULT true;







