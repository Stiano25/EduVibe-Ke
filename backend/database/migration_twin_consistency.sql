-- Phase 1 twin-consistency diagnostics.
-- Twin attempts are queryable in skill_attempts; completed pair summaries also
-- live in lesson_progress.session_review.

ALTER TABLE skill_attempts
  ADD COLUMN IF NOT EXISTS response_time_ms INTEGER
    CHECK (response_time_ms IS NULL OR response_time_ms BETWEEN 0 AND 3600000),
  ADD COLUMN IF NOT EXISTS twin_pair_id TEXT,
  ADD COLUMN IF NOT EXISTS twin_role TEXT
    CHECK (twin_role IS NULL OR twin_role IN ('original', 'twist')),
  ADD COLUMN IF NOT EXISTS twin_trigger_reason TEXT
    CHECK (twin_trigger_reason IS NULL OR twin_trigger_reason IN ('incorrect', 'fast_correct')),
  ADD COLUMN IF NOT EXISTS source_question_id TEXT,
  ADD COLUMN IF NOT EXISTS question_params JSONB;

CREATE INDEX IF NOT EXISTS idx_skill_attempts_twin_pair
  ON skill_attempts(twin_pair_id)
  WHERE twin_pair_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_skill_attempts_user_lesson_created
  ON skill_attempts(user_id, lesson_id, created_at DESC);
