-- Learner model: profiles, skill attempts, mastery
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS learner_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  preferred_modality TEXT NOT NULL DEFAULT 'mixed'
    CHECK (preferred_modality IN ('visual', 'text_steps', 'practice', 'mixed')),
  scaffold_tolerance INTEGER NOT NULL DEFAULT 2,
  modality_prompt_seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skill_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  learning_outcome_key TEXT NOT NULL,
  skill_focus TEXT,
  grade_level TEXT,
  bloom_level TEXT CHECK (bloom_level IN ('recall', 'understand', 'apply', 'reason')),
  correct BOOLEAN NOT NULL,
  selected_option_index INTEGER,
  misconception_key TEXT,
  modality_shown TEXT CHECK (modality_shown IN ('visual', 'text_steps', 'practice', 'mixed')),
  attempt_in_skill_streak INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_attempts_user ON skill_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_attempts_user_outcome ON skill_attempts(user_id, learning_outcome_key);
CREATE INDEX IF NOT EXISTS idx_skill_attempts_lesson ON skill_attempts(lesson_id);

CREATE TABLE IF NOT EXISTS skill_mastery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learning_outcome_key TEXT NOT NULL,
  skill_focus TEXT,
  status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (status IN ('unknown', 'struggling', 'scaffolding', 'developing', 'mastered')),
  consecutive_fails_at_level INTEGER NOT NULL DEFAULT 0,
  current_grade_level TEXT,
  last_success_grade TEXT,
  preferred_modality_observed TEXT
    CHECK (preferred_modality_observed IS NULL OR preferred_modality_observed IN ('visual', 'text_steps', 'practice', 'mixed')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_outcome UNIQUE (user_id, learning_outcome_key)
);

CREATE INDEX IF NOT EXISTS idx_skill_mastery_user ON skill_mastery(user_id);

DROP TRIGGER IF EXISTS update_learner_profiles_updated_at ON learner_profiles;
CREATE TRIGGER update_learner_profiles_updated_at BEFORE UPDATE ON learner_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_skill_mastery_updated_at ON skill_mastery;
CREATE TRIGGER update_skill_mastery_updated_at BEFORE UPDATE ON skill_mastery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
