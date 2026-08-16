-- Original, human-reviewed question bank (NOT knowledge_chunks).
-- knowledge_chunks holds source-document excerpts used only as style exemplars.
-- Bank rows must be original AI-authored items, never near-copies of those sources.

CREATE TABLE IF NOT EXISTS question_bank_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID,
  subject_name TEXT,
  grade TEXT,
  strand_id UUID,
  sub_strand_id UUID,
  topic TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'intermediate', 'advanced')),
  interaction_type TEXT NOT NULL DEFAULT 'multiple_choice',
  bloom_level TEXT,
  question JSONB NOT NULL DEFAULT '{}'::jsonb,
  style_source_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  qa_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  qa_issue TEXT,
  flagged_near_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  reject_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_bank_status ON question_bank_entries(status);
CREATE INDEX IF NOT EXISTS idx_question_bank_sub_strand ON question_bank_entries(sub_strand_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_grade ON question_bank_entries(grade);
CREATE INDEX IF NOT EXISTS idx_question_bank_pull
  ON question_bank_entries(sub_strand_id, grade, status, interaction_type);

-- Which lessons / learners were served which bank entries (item-calibration later).
CREATE TABLE IF NOT EXISTS question_bank_serves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_entry_id UUID NOT NULL REFERENCES question_bank_entries(id) ON DELETE CASCADE,
  lesson_id UUID,
  learner_id UUID,
  question_id TEXT,
  source TEXT NOT NULL CHECK (source IN ('lesson_generation', 'learner_attempt')),
  served_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_bank_serves_entry ON question_bank_serves(bank_entry_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_serves_lesson ON question_bank_serves(lesson_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_serves_learner ON question_bank_serves(learner_id);

ALTER TABLE question_bank_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank_serves ENABLE ROW LEVEL SECURITY;
