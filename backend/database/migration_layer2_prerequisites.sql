-- Part 9: Layer 2 cross-strand prerequisite edges.
-- LLM proposes; humans approve. Pending rows never affect unlock.

ALTER TABLE prerequisite_edges
  DROP CONSTRAINT IF EXISTS prerequisite_edges_edge_type_check;

ALTER TABLE prerequisite_edges
  ADD CONSTRAINT prerequisite_edges_edge_type_check
  CHECK (edge_type IN (
    'same_strand_prior_grade',
    'same_grade_prior_substrand',
    'cross_strand'
  ));

ALTER TABLE prerequisite_edges
  DROP CONSTRAINT IF EXISTS prerequisite_edges_status_check;

ALTER TABLE prerequisite_edges
  ADD CONSTRAINT prerequisite_edges_status_check
  CHECK (status IN ('active', 'pending_review', 'rejected'));

ALTER TABLE prerequisite_edges
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewer_id UUID,
  ADD COLUMN IF NOT EXISTS reject_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_prereq_edges_status ON prerequisite_edges(status);
CREATE INDEX IF NOT EXISTS idx_prereq_edges_source ON prerequisite_edges(source);

-- Durable queue so the learner request never waits on the LLM call.
CREATE TABLE IF NOT EXISTS prerequisite_edge_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  outcome_id UUID NOT NULL REFERENCES curriculum_outcomes(id) ON DELETE CASCADE,
  learning_outcome_key TEXT NOT NULL,
  grade TEXT,
  consecutive_fails INTEGER,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'done', 'failed', 'skipped')),
  error TEXT,
  proposed_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prereq_edge_jobs_open
  ON prerequisite_edge_jobs (outcome_id)
  WHERE status IN ('queued', 'running');

CREATE INDEX IF NOT EXISTS idx_prereq_edge_jobs_outcome
  ON prerequisite_edge_jobs (outcome_id, created_at DESC);

-- One row per routing via an approved Layer 2 edge; follow-up filled later.
CREATE TABLE IF NOT EXISTS prerequisite_remediation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_id UUID NOT NULL REFERENCES prerequisite_edges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  failed_outcome_id UUID NOT NULL REFERENCES curriculum_outcomes(id) ON DELETE CASCADE,
  prerequisite_outcome_id UUID NOT NULL REFERENCES curriculum_outcomes(id) ON DELETE CASCADE,
  learning_outcome_key TEXT NOT NULL,
  routed_lesson_id UUID,
  consecutive_fails_at_route INTEGER,
  routed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  followup_attempted_at TIMESTAMPTZ,
  followup_correct BOOLEAN,
  improved BOOLEAN
);

CREATE INDEX IF NOT EXISTS idx_prereq_remediation_open
  ON prerequisite_remediation_events (user_id, learning_outcome_key)
  WHERE followup_attempted_at IS NULL;

ALTER TABLE prerequisite_edge_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prerequisite_remediation_events ENABLE ROW LEVEL SECURITY;
