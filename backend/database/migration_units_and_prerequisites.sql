-- Part 4: Layer 1 prerequisite graph + Unit (1:1 with sub-strand).
-- Edges are derived from seeded curriculum order — no AI.

ALTER TABLE sub_strands
  ADD COLUMN IF NOT EXISTS lessons_allocated INTEGER,
  ADD COLUMN IF NOT EXISTS sequence_number INTEGER;

CREATE INDEX IF NOT EXISTS idx_sub_strands_sequence
  ON sub_strands(strand_id, sequence_number);

CREATE TABLE IF NOT EXISTS curriculum_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_strand_id UUID NOT NULL REFERENCES sub_strands(id) ON DELETE CASCADE,
  strand_id UUID,
  subject_id UUID,
  grade TEXT,
  outcome_text TEXT NOT NULL,
  outcome_key TEXT NOT NULL,
  sort_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sub_strand_id, sort_index)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_outcomes_sub_strand
  ON curriculum_outcomes(sub_strand_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_outcomes_key
  ON curriculum_outcomes(outcome_key);

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_strand_id UUID NOT NULL UNIQUE REFERENCES sub_strands(id) ON DELETE CASCADE,
  strand_id UUID,
  subject_id UUID,
  grade TEXT,
  name TEXT NOT NULL,
  sequence_number INTEGER,
  lessons_allocated INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_units_strand_sequence
  ON units(strand_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_units_subject_grade
  ON units(subject_id, grade);

CREATE TABLE IF NOT EXISTS prerequisite_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id UUID NOT NULL REFERENCES curriculum_outcomes(id) ON DELETE CASCADE,
  prerequisite_outcome_id UUID NOT NULL REFERENCES curriculum_outcomes(id) ON DELETE CASCADE,
  confidence REAL NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'curriculum_sequence',
  edge_type TEXT NOT NULL
    CHECK (edge_type IN ('same_strand_prior_grade', 'same_grade_prior_substrand')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (outcome_id, prerequisite_outcome_id, edge_type)
);

CREATE INDEX IF NOT EXISTS idx_prereq_edges_outcome ON prerequisite_edges(outcome_id);
CREATE INDEX IF NOT EXISTS idx_prereq_edges_prereq ON prerequisite_edges(prerequisite_outcome_id);
CREATE INDEX IF NOT EXISTS idx_prereq_edges_type ON prerequisite_edges(edge_type);

ALTER TABLE curriculum_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE prerequisite_edges ENABLE ROW LEVEL SECURITY;
