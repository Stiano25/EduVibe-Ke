-- Adaptive quiz session review payload on lesson_progress
-- Run in Supabase SQL Editor

ALTER TABLE lesson_progress
ADD COLUMN IF NOT EXISTS session_review JSONB DEFAULT NULL;

COMMENT ON COLUMN lesson_progress.session_review IS
  'Adaptive quiz session log: answered[], score, completedAt — used for review mode';
