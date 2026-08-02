-- Additive metadata columns for question-aware knowledge bank chunks.
-- Existing rows keep working: new columns are nullable / default false.
-- Does not drop or rename any existing columns.

ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS question_number TEXT,
  ADD COLUMN IF NOT EXISTS question_text TEXT,
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS sub_topic TEXT,
  ADD COLUMN IF NOT EXISTS question_type TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT,
  ADD COLUMN IF NOT EXISTS grade_level INTEGER,
  ADD COLUMN IF NOT EXISTS is_full_question BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_topic ON knowledge_chunks (topic);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_question_type ON knowledge_chunks (question_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_grade_subject ON knowledge_chunks (grade_level, subject_name);
