-- Part 1 of the Grade 1 format pass: hold Layer 2 edges for founder re-review
-- without deleting them. Used when a fail-streak may be reading-load rather
-- than a genuine maths gap.

ALTER TABLE prerequisite_edges
  ADD COLUMN IF NOT EXISTS flagged_for_reread BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_prereq_edges_flagged_reread
  ON prerequisite_edges (flagged_for_reread)
  WHERE flagged_for_reread = TRUE;
