-- Queryable log of which modality selection signal fired in adaptive pickNextMain.
-- Used to aggregate per_outcome vs global_fallback vs none rates (e.g. whether +8 → +18).
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS adaptive_modality_signal_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  question_id TEXT,
  learning_outcome_key TEXT,
  source TEXT NOT NULL
    CHECK (source IN ('per_outcome', 'global_fallback', 'none')),
  modality TEXT
    CHECK (modality IS NULL OR modality IN ('visual', 'text_steps', 'practice')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_modality_signal_log_source_created
  ON adaptive_modality_signal_log (source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_modality_signal_log_user_lesson
  ON adaptive_modality_signal_log (user_id, lesson_id);

COMMENT ON TABLE adaptive_modality_signal_log IS
  'One row per adaptive main-path question selection; source = per_outcome | global_fallback | none';
