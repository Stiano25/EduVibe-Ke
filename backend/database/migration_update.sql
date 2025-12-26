-- Migration to update curriculum_designs structure
-- Run this AFTER the initial migration if tables already exist
-- This updates the schema to support per-subject curriculum designs

-- Step 1: Add subject_name column to curriculum_designs
ALTER TABLE curriculum_designs 
ADD COLUMN IF NOT EXISTS subject_name TEXT;

-- Step 2: Make disciplines optional (default to empty array)
ALTER TABLE curriculum_designs 
ALTER COLUMN disciplines SET DEFAULT '{}';

-- Step 3: Add unique constraint for grade + subject_name combination
-- This ensures one curriculum design per subject per grade
-- Drop existing constraint if it exists (PostgreSQL syntax)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_grade_subject'
  ) THEN
    ALTER TABLE curriculum_designs DROP CONSTRAINT unique_grade_subject;
  END IF;
END $$;

ALTER TABLE curriculum_designs 
ADD CONSTRAINT unique_grade_subject 
UNIQUE (grade, subject_name);

-- Step 4: Update existing curriculum designs (optional)
-- If you have existing data, you may want to extract subject names from existing names
-- This is a helper query - uncomment and modify as needed:
-- UPDATE curriculum_designs 
-- SET subject_name = TRIM(SPLIT_PART(REPLACE(name, 'Grade', ''), '_', 2))
-- WHERE subject_name IS NULL 
--   AND name LIKE 'Grade%_%_Curriculum Design';

-- Note: After running this migration, new subjects will automatically create
-- curriculum designs with the format: Grade{number}_{SubjectName}_Curriculum Design

