-- Migration to remove discipline column from subjects table
-- Run this if you already have the subjects table with discipline column

-- Remove discipline column from subjects table
ALTER TABLE subjects 
DROP COLUMN IF EXISTS discipline;

-- Note: After this migration, subjects will no longer have a discipline field
-- Each subject will have its own curriculum design automatically created




