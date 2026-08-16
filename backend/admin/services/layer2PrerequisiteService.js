import { generateContent } from '../../providers/contentProvider.js';
import { getDbClient } from '../../config/supabase.js';
import { CurriculumOutcome, PrerequisiteEdge } from '../../models/CurriculumGraph.js';
import { Strand } from '../../models/Strand.js';
import { Subject } from '../../models/Subject.js';
import { Lesson } from '../../models/Lesson.js';
import { oneOrNull } from '../../utils/dbResult.js';

export const LAYER2_SOURCE = 'fail_streak_llm';
export const LAYER2_EDGE_TYPE = 'cross_strand';
export const LAYER2_PENDING = 'pending_review';

const JOBS = 'prerequisite_edge_jobs';
const EVENTS = 'prerequisite_remediation_events';
const CANDIDATE_CAP = 40;

const gradeNumber = (grade) => {
  if (grade === 'K' || grade === 'k') return 0;
  const n = parseInt(grade, 10);
  return Number.isFinite(n) ? n : null;
};

const extractJsonText = (text = '') => {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = (fenced ? fenced[1] : raw).trim();
  const startObj = candidate.indexOf('{');
  const startArr = candidate.indexOf('[');
  let start = -1;
  if (startObj >= 0 && startArr >= 0) start = Math.min(startObj, startArr);
  else start = Math.max(startObj, startArr);
  if (start > 0) candidate = candidate.slice(start);
  return candidate;
};

const mapJob = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    outcomeId: row.outcome_id,
    learningOutcomeKey: row.learning_outcome_key,
    grade: row.grade,
    consecutiveFails: row.consecutive_fails,
    status: row.status,
    error: row.error,
    proposedCount: row.proposed_count,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at
  };
};

const mapEvent = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    edgeId: row.edge_id,
    userId: row.user_id,
    failedOutcomeId: row.failed_outcome_id,
    prerequisiteOutcomeId: row.prerequisite_outcome_id,
    learningOutcomeKey: row.learning_outcome_key,
    routedLessonId: row.routed_lesson_id,
    consecutiveFailsAtRoute: row.consecutive_fails_at_route,
    routedAt: row.routed_at,
    followupAttemptedAt: row.followup_attempted_at,
    followupCorrect: row.followup_correct,
    improved: row.improved
  };
};

const resolveFailedOutcome = async (learningOutcomeKey, grade) => {
  if (!learningOutcomeKey) return null;
  const graded = await CurriculumOutcome.findByOutcomeKey(learningOutcomeKey, { grade });
  if (graded.length) return graded[0];
  const any = await CurriculumOutcome.findByOutcomeKey(learningOutcomeKey);
  return any[0] || null;
};

const hasOpenLayer2Edge = async (outcomeId) => {
  const existing = await PrerequisiteEdge.listByOutcome(outcomeId, {
    edgeType: LAYER2_EDGE_TYPE,
    statuses: [LAYER2_PENDING, 'active']
  });
  return existing.length > 0;
};

/**
 * 9.1 — enqueue only. Never awaits the LLM.
 *
 * Layer 1 (curriculum_sequence) edges do not suppress this: those are
 * consecutive same-strand links. Layer 2 is the cross-strand gap, so we skip
 * only when a pending_review or active cross_strand edge already exists, or a
 * job is already queued/running for this outcome.
 */
export const maybeQueueLayer2Proposal = async ({
  userId,
  learningOutcomeKey,
  grade = null,
  consecutiveFails = 0,
  processAsync = true
} = {}) => {
  const outcome = await resolveFailedOutcome(learningOutcomeKey, grade);
  if (!outcome) {
    return { queued: false, reason: 'outcome_not_in_graph' };
  }
  if (await hasOpenLayer2Edge(outcome.id)) {
    return { queued: false, reason: 'layer2_edge_exists', outcomeId: outcome.id };
  }

  const insert = {
    user_id: userId,
    outcome_id: outcome.id,
    learning_outcome_key: learningOutcomeKey,
    grade: grade || outcome.grade || null,
    consecutive_fails: consecutiveFails,
    status: 'queued'
  };

  const { data, error } = await getDbClient().from(JOBS).insert(insert).select().single();
  if (error) {
    if (error.code === '23505') {
      return { queued: false, reason: 'job_already_open', outcomeId: outcome.id };
    }
    throw error;
  }

  const job = mapJob(data);
  console.log(
    `Layer 2: queued job ${job.id.slice(0, 8)} for outcome ${outcome.id.slice(0, 8)} (streak=${consecutiveFails})`
  );

  if (processAsync) {
    setImmediate(() => {
      processEdgeProposalJob(job.id).catch((err) => {
        console.warn('Layer 2 job failed:', err.message || err);
      });
    });
  }

  return { queued: true, jobId: job.id, outcomeId: outcome.id };
};

const loadTaxonomyMaps = async () => {
  const [strands, subjects] = await Promise.all([Strand.findAll(), Subject.findAll()]);
  const strandById = new Map(strands.map((s) => [s.id, s]));
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  return { strandById, subjectById };
};

const decorateOutcome = (outcome, maps) => {
  const strand = maps.strandById.get(outcome.strandId);
  const subject = maps.subjectById.get(outcome.subjectId);
  return {
    ...outcome,
    strandName: strand?.name || null,
    subjectName: subject?.name || null
  };
};

export const listCandidateOutcomes = async (failedOutcome, { cap = CANDIDATE_CAP } = {}) => {
  const failedGradeN = gradeNumber(failedOutcome.grade);
  const all = await CurriculumOutcome.listAll();
  const maps = await loadTaxonomyMaps();
  const earlier = all
    .filter((row) => row.id !== failedOutcome.id)
    .filter((row) => row.strandId && row.strandId !== failedOutcome.strandId)
    .filter((row) => {
      const n = gradeNumber(row.grade);
      if (failedGradeN == null || n == null) return true;
      return n <= failedGradeN;
    })
    .sort((a, b) => (gradeNumber(b.grade) ?? 0) - (gradeNumber(a.grade) ?? 0))
    .slice(0, cap)
    .map((row) => decorateOutcome(row, maps));
  return earlier;
};

const buildProposalPrompt = (failed, candidates) => {
  const candidateBlock = candidates
    .map(
      (c) =>
        `- id=${c.id} | Grade ${c.grade} | ${c.subjectName || '?'} / ${c.strandName || '?'} | ${c.outcomeText}`
    )
    .join('\n');

  return `You propose prerequisite links for a Kenyan CBC learning app.

A learner is stuck on this outcome (they have failed it repeatedly):
id=${failed.id}
Grade ${failed.grade} | ${failed.subjectName || '?'} / ${failed.strandName || '?'}
${failed.outcomeText}

Candidate EARLIER outcomes (real IDs — you MUST pick from this list only). They are from other strands, same or lower grade — not the curriculum-adjacent ones already in Layer 1:
${candidateBlock}

Propose 1 to 3 GENUINE cross-strand prerequisites. A genuine prerequisite is something the learner must already be able to do before they can succeed at the failed outcome. Do not propose a vague "related topic". Do not invent IDs.

Return ONLY JSON:
{
  "proposals": [
    { "prerequisiteOutcomeId": "<uuid from the list>", "confidence": 0.0, "reason": "one or two sentences for an adult reviewer" }
  ]
}
confidence is 0-1. reason is for a human reviewer, not a child. Complete valid JSON only.`;
};

export const parseProposals = (text, candidateIds) => {
  let data;
  try {
    data = JSON.parse(extractJsonText(text));
  } catch {
    return [];
  }
  const raw = Array.isArray(data?.proposals) ? data.proposals : Array.isArray(data) ? data : [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const id = String(item?.prerequisiteOutcomeId || item?.prerequisite_outcome_id || '').trim();
    if (!candidateIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    const confidence = Math.min(1, Math.max(0, Number(item.confidence)));
    const reason = String(item.reason || '').trim().slice(0, 500);
    if (!reason) continue;
    out.push({
      prerequisiteOutcomeId: id,
      confidence: Number.isFinite(confidence) ? confidence : 0.5,
      reason
    });
    if (out.length >= 3) break;
  }
  return out;
};

export const processEdgeProposalJob = async (jobId) => {
  const db = getDbClient();
  const { data: jobRow, error: jobErr } = await db.from(JOBS).select('*').eq('id', jobId).maybeSingle();
  const job = oneOrNull(jobRow, jobErr, mapJob);
  if (!job) throw new Error('Layer 2 job not found');
  if (job.status !== 'queued') {
    return { skipped: true, reason: `job_status_${job.status}` };
  }

  await db
    .from(JOBS)
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', jobId);

  try {
    if (await hasOpenLayer2Edge(job.outcomeId)) {
      await db
        .from(JOBS)
        .update({
          status: 'skipped',
          error: 'layer2_edge_exists',
          finished_at: new Date().toISOString(),
          proposed_count: 0
        })
        .eq('id', jobId);
      return { skipped: true, reason: 'layer2_edge_exists' };
    }

    const failed = await CurriculumOutcome.findById(job.outcomeId);
    if (!failed) throw new Error('Failed outcome missing');
    const maps = await loadTaxonomyMaps();
    const failedDecorated = decorateOutcome(failed, maps);
    const candidates = await listCandidateOutcomes(failed);
    if (candidates.length < 1) {
      await db
        .from(JOBS)
        .update({
          status: 'skipped',
          error: 'no_candidates',
          finished_at: new Date().toISOString(),
          proposed_count: 0
        })
        .eq('id', jobId);
      return { skipped: true, reason: 'no_candidates' };
    }

    console.log(
      `Layer 2: proposing edges for "${failed.outcomeText.slice(0, 80)}" against ${candidates.length} candidates…`
    );

    const { text, inputTokens, outputTokens } = await generateContent({
      prompt: buildProposalPrompt(failedDecorated, candidates),
      maxTokens: 2048,
      label: 'layer2-edge-proposal'
    });

    const candidateIds = new Set(candidates.map((c) => c.id));
    const proposals = parseProposals(text, candidateIds);
    const inserted = [];
    for (const proposal of proposals) {
      try {
        const [row] = await PrerequisiteEdge.createMany([
          {
            outcomeId: failed.id,
            prerequisiteOutcomeId: proposal.prerequisiteOutcomeId,
            confidence: proposal.confidence,
            source: LAYER2_SOURCE,
            edgeType: LAYER2_EDGE_TYPE,
            reason: proposal.reason,
            status: LAYER2_PENDING
          }
        ]);
        if (row) inserted.push(row);
      } catch (insertErr) {
        if (insertErr?.code === '23505') continue;
        throw insertErr;
      }
    }

    await db
      .from(JOBS)
      .update({
        status: 'done',
        proposed_count: inserted.length,
        finished_at: new Date().toISOString(),
        error: inserted.length ? null : 'llm_returned_no_valid_ids'
      })
      .eq('id', jobId);

    console.log(
      `Layer 2: stored ${inserted.length} pending_review edge(s) (tokens in=${inputTokens} out=${outputTokens})`
    );
    return { inserted, jobId, inputTokens, outputTokens };
  } catch (err) {
    await db
      .from(JOBS)
      .update({
        status: 'failed',
        error: String(err.message || err).slice(0, 500),
        finished_at: new Date().toISOString()
      })
      .eq('id', jobId);
    throw err;
  }
};

const enrichEdges = async (edges) => {
  const ids = [];
  for (const edge of edges) {
    ids.push(edge.outcomeId, edge.prerequisiteOutcomeId);
  }
  const outcomes = await CurriculumOutcome.findByIds(ids);
  const maps = await loadTaxonomyMaps();
  const byId = new Map(outcomes.map((o) => [o.id, decorateOutcome(o, maps)]));
  return edges.map((edge) => ({
    ...edge,
    outcome: byId.get(edge.outcomeId) || null,
    prerequisite: byId.get(edge.prerequisiteOutcomeId) || null
  }));
};

export const listLayer2Edges = async ({ status = LAYER2_PENDING, limit = 80 } = {}) => {
  const edges = await PrerequisiteEdge.listByStatus(status, {
    edgeType: LAYER2_EDGE_TYPE,
    limit
  });
  return enrichEdges(edges);
};

export const reviewLayer2Edge = async (id, { action, reason, confidence, prerequisiteOutcomeId, rejectReason, reviewerId }) => {
  const existing = await PrerequisiteEdge.findById(id);
  if (!existing) throw new Error('Edge not found');
  if (existing.edgeType !== LAYER2_EDGE_TYPE) {
    throw new Error('Only Layer 2 (cross_strand) edges can be reviewed here');
  }

  if (action === 'approve') {
    if (existing.status === 'rejected') {
      throw new Error('Rejected edges cannot be approved — edit first');
    }
    return PrerequisiteEdge.update(id, {
      status: 'active',
      reviewedAt: new Date().toISOString(),
      reviewerId: reviewerId || null,
      rejectReason: null
    });
  }
  if (action === 'reject') {
    return PrerequisiteEdge.update(id, {
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewerId: reviewerId || null,
      rejectReason: rejectReason || existing.rejectReason || 'rejected in review'
    });
  }
  if (action === 'edit') {
    const updates = {};
    if (reason !== undefined) updates.reason = String(reason).trim().slice(0, 500);
    if (confidence !== undefined) {
      const n = Number(confidence);
      updates.confidence = Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : existing.confidence;
    }
    if (prerequisiteOutcomeId) {
      const target = await CurriculumOutcome.findById(prerequisiteOutcomeId);
      if (!target) throw new Error('prerequisiteOutcomeId is not a real curriculum outcome');
      updates.prerequisiteOutcomeId = target.id;
    }
    if (existing.status === 'rejected') updates.status = LAYER2_PENDING;
    return PrerequisiteEdge.update(id, updates);
  }
  throw new Error('Unknown review action');
};

const findLessonForOutcome = async (outcome) => {
  if (!outcome?.subStrandId) return null;
  const lessons = await Lesson.findBySubStrand(outcome.subStrandId);
  return lessons.find((lesson) => lesson.status === 'approved') || null;
};

/**
 * 9.5 — if an approved Layer 2 edge exists, route to a lesson that teaches the
 * prerequisite. Logs the routing. Returns null when there is nothing to route to.
 */
export const tryRouteViaApprovedLayer2Edge = async (
  userId,
  { learningOutcomeKey, gradeLevel, consecutiveFails = null } = {}
) => {
  const failed = await resolveFailedOutcome(learningOutcomeKey, gradeLevel);
  if (!failed) return null;

  const edges = await PrerequisiteEdge.listByOutcome(failed.id, {
    edgeType: LAYER2_EDGE_TYPE,
    statuses: ['active']
  });
  if (!edges.length) return null;

  const ranked = [...edges].sort((a, b) => Number(b.confidence) - Number(a.confidence));
  for (const edge of ranked) {
    const prereq = await CurriculumOutcome.findById(edge.prerequisiteOutcomeId);
    const lesson = await findLessonForOutcome(prereq);
    if (!lesson) continue;

    const { data: openRow, error: openErr } = await getDbClient()
      .from(EVENTS)
      .select('*')
      .eq('user_id', userId)
      .eq('edge_id', edge.id)
      .is('followup_attempted_at', null)
      .order('routed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const open = oneOrNull(openRow, openErr, mapEvent);

    let event = open;
    if (!event) {
      const { data, error } = await getDbClient()
        .from(EVENTS)
        .insert({
          edge_id: edge.id,
          user_id: userId,
          failed_outcome_id: failed.id,
          prerequisite_outcome_id: edge.prerequisiteOutcomeId,
          learning_outcome_key: learningOutcomeKey,
          routed_lesson_id: lesson.id,
          consecutive_fails_at_route: consecutiveFails
        })
        .select()
        .single();
      if (error) throw error;
      event = mapEvent(data);
    }

    return {
      edge,
      prerequisite: prereq,
      scaffoldLesson: lesson,
      event
    };
  }
  return null;
};

/** Fill "did remediation help" on the next attempt at the originally failed outcome. */
export const recordRemediationFollowup = async ({
  userId,
  learningOutcomeKey,
  correct,
  isTwin = false
} = {}) => {
  if (isTwin || !userId || !learningOutcomeKey) return null;
  const { data, error } = await getDbClient()
    .from(EVENTS)
    .select('*')
    .eq('user_id', userId)
    .eq('learning_outcome_key', learningOutcomeKey)
    .is('followup_attempted_at', null)
    .order('routed_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  const open = oneOrNull(data, error, mapEvent);
  if (!open) return null;

  const { data: updated, error: updErr } = await getDbClient()
    .from(EVENTS)
    .update({
      followup_attempted_at: new Date().toISOString(),
      followup_correct: !!correct,
      improved: !!correct
    })
    .eq('id', open.id)
    .select()
    .single();
  if (updErr) throw updErr;
  return mapEvent(updated);
};

export const listRemediationEvents = async ({ userId = null, edgeId = null, limit = 50 } = {}) => {
  let q = getDbClient()
    .from(EVENTS)
    .select('*')
    .order('routed_at', { ascending: false })
    .limit(Math.min(Number(limit) || 50, 200));
  if (userId) q = q.eq('user_id', userId);
  if (edgeId) q = q.eq('edge_id', edgeId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapEvent);
};
