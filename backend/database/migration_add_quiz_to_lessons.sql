-- Add quiz column to lessons table
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS quiz JSONB DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN lessons.quiz IS 'Quiz object with questions, passing score, and time limit for interactive quiz lessons';

