/**
 * Part 9: Layer 2 cross-strand edges — proposal, review queue, remediation log.
 *
 * Does not query users (no emails). User ids are truncated.
 *
 * Usage (from backend/):
 *   node scripts/verify-layer2-prerequisites.js
 */
import '../config/loadEnv.js';
import { getDbClient } from '../config/supabase.js';
import { CurriculumOutcome, PrerequisiteEdge } from '../models/CurriculumGraph.js';
import {
  LAYER2_EDGE_TYPE,
  LAYER2_PENDING,
  LAYER2_SOURCE,
  listCandidateOutcomes,
  listLayer2Edges,
  maybeQueueLayer2Proposal,
  parseProposals,
  processEdgeProposalJob,
  recordRemediationFollowup,
  reviewLayer2Edge,
  tryRouteViaApprovedLayer2Edge
} from '../admin/services/layer2PrerequisiteService.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const truncate = (id) => (id ? `${String(id).slice(0, 8)}…` : 'none');

const runOfflineParse = () => {
  const a = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  const b = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
  const parsed = parseProposals(
    JSON.stringify({
      proposals: [
        { prerequisiteOutcomeId: a, confidence: 0.9, reason: 'Need counting before money.' },
        { prerequisiteOutcomeId: 'not-in-list', confidence: 0.8, reason: 'invented' },
        { prerequisiteOutcomeId: b, confidence: 2, reason: 'Need addition before money.' }
      ]
    }),
    new Set([a, b])
  );
  assert(parsed.length === 2, 'drops IDs that are not in the candidate list');
  assert(parsed[1].confidence === 1, 'confidence is clamped to 0-1');
  console.log('offline parse: ok');
};

const pickFailedOutcome = async () => {
  const all = await CurriculumOutcome.listAll();
  const openLayer2 = [
    ...(await PrerequisiteEdge.listByStatus(LAYER2_PENDING, { edgeType: LAYER2_EDGE_TYPE, limit: 200 })),
    ...(await PrerequisiteEdge.listByStatus('active', { edgeType: LAYER2_EDGE_TYPE, limit: 200 }))
  ];
  const withEdges = new Set(openLayer2.map((e) => e.outcomeId));
  const older = all.filter((row) => {
    const n = parseInt(row.grade, 10);
    return Number.isFinite(n) && n >= 3;
  });
  const open = older.filter((row) => !withEdges.has(row.id));
  const pool = open.length ? open : older.length ? older : all;
  const ranked = [...pool].sort((a, b) => String(b.outcomeText).length - String(a.outcomeText).length);
  return ranked[0] || all[0];
};

const pickUserId = async () => {
  const db = getDbClient();
  const { data, error } = await db.from('skill_attempts').select('user_id').limit(1);
  if (error) throw error;
  if (data?.[0]?.user_id) return data[0].user_id;
  const { data: progress, error: pErr } = await db.from('lesson_progress').select('user_id').limit(1);
  if (pErr) throw pErr;
  return progress?.[0]?.user_id || null;
};

const main = async () => {
  runOfflineParse();

  const userId = await pickUserId();
  assert(userId, 'need a learner user_id from skill_attempts or lesson_progress');

  const grade1 = (await CurriculumOutcome.listAll()).find((row) => String(row.grade) === '1');
  if (grade1) {
    const suppressed = await maybeQueueLayer2Proposal({
      userId,
      learningOutcomeKey: grade1.outcomeKey,
      grade: '1',
      consecutiveFails: 2,
      processAsync: false
    });
    console.log('Grade 1 suppress:', suppressed);
    assert(
      suppressed.queued === false && suppressed.reason === 'grade1_format_untrusted',
      'Grade 1 Layer 2 proposals must be suppressed'
    );
  }

  const failed = await pickFailedOutcome();
  assert(failed, 'no curriculum_outcomes to propose against');
  const candidates = await listCandidateOutcomes(failed);
  assert(candidates.length > 0, 'need cross-strand candidate outcomes');

  console.log('trigger outcome', {
    id: truncate(failed.id),
    grade: failed.grade,
    text: failed.outcomeText,
    candidates: candidates.length,
    user: truncate(userId)
  });

  const queued = await maybeQueueLayer2Proposal({
    userId,
    learningOutcomeKey: failed.outcomeKey,
    grade: failed.grade,
    consecutiveFails: 2,
    processAsync: false
  });
  console.log('queue (first):', queued);
  assert(queued.queued === true, `expected a queued job, got ${queued.reason}`);

  const skippedOpen = await maybeQueueLayer2Proposal({
    userId,
    learningOutcomeKey: failed.outcomeKey,
    grade: failed.grade,
    consecutiveFails: 2,
    processAsync: false
  });
  console.log('queue (duplicate while open):', skippedOpen);
  assert(skippedOpen.queued === false, 'open job must not double-queue');

  console.log('Layer 2: calling LLM for edge proposals (this can take a minute)…');
  const processed = await processEdgeProposalJob(queued.jobId);
  console.log('job result:', {
    inserted: processed.inserted?.length || 0,
    skipped: processed.skipped || false,
    reason: processed.reason || null,
    tokensIn: processed.inputTokens,
    tokensOut: processed.outputTokens
  });
  assert(!processed.skipped, `job skipped: ${processed.reason}`);
  assert((processed.inserted || []).length >= 1, 'LLM must propose at least one valid pending edge');

  for (const edge of processed.inserted) {
    assert(edge.status === LAYER2_PENDING, 'proposed edges must be pending_review, never auto-approved');
    assert(edge.edgeType === LAYER2_EDGE_TYPE, 'Layer 2 type is cross_strand');
    assert(edge.source === LAYER2_SOURCE, 'source is fail_streak_llm');
    assert(edge.outcomeId === failed.id, 'edge points at the failed outcome');
    console.log('proposed', {
      id: truncate(edge.id),
      status: edge.status,
      confidence: edge.confidence,
      reason: edge.reason
    });
  }

  const pendingQueue = await listLayer2Edges({ status: LAYER2_PENDING, limit: 80 });
  assert(
    pendingQueue.some((e) => e.id === processed.inserted[0].id),
    'review queue lists the pending edge'
  );

  const first = processed.inserted[0];
  const edited = await reviewLayer2Edge(first.id, {
    action: 'edit',
    reason: `${first.reason} [edited in verify]`,
    confidence: 0.55
  });
  assert(edited.status === LAYER2_PENDING, 'edit keeps the edge pending');
  assert(edited.confidence === 0.55, 'edit updates confidence');

  const approved = await reviewLayer2Edge(first.id, { action: 'approve', reviewerId: userId });
  assert(approved.status === 'active', 'approve flips status to active');

  if (processed.inserted[1]) {
    const rejected = await reviewLayer2Edge(processed.inserted[1].id, {
      action: 'reject',
      rejectReason: 'verify: not a genuine prerequisite'
    });
    assert(rejected.status === 'rejected', 'reject flips status to rejected');
  } else if (candidates[1]) {
    const [extra] = await PrerequisiteEdge.createMany([
      {
        outcomeId: failed.id,
        prerequisiteOutcomeId: candidates[1].id,
        confidence: 0.4,
        source: LAYER2_SOURCE,
        edgeType: LAYER2_EDGE_TYPE,
        reason: 'verify extra candidate for reject path',
        status: LAYER2_PENDING
      }
    ]);
    const rejected = await reviewLayer2Edge(extra.id, {
      action: 'reject',
      rejectReason: 'verify: not a genuine prerequisite'
    });
    assert(rejected.status === 'rejected', 'reject flips status to rejected');
  }

  const blocked = await maybeQueueLayer2Proposal({
    userId,
    learningOutcomeKey: failed.outcomeKey,
    grade: failed.grade,
    consecutiveFails: 2,
    processAsync: false
  });
  console.log('queue (after active Layer 2 edge):', blocked);
  assert(blocked.reason === 'layer2_edge_exists', 'active Layer 2 edge suppresses a new job');

  const routed = await tryRouteViaApprovedLayer2Edge(userId, {
    learningOutcomeKey: failed.outcomeKey,
    gradeLevel: failed.grade,
    consecutiveFails: 2
  });
  console.log('route via approved edge:', routed
    ? {
        lesson: routed.scaffoldLesson?.title || null,
        lessonId: truncate(routed.scaffoldLesson?.id),
        eventId: truncate(routed.event?.id),
        prereq: routed.prerequisite?.outcomeText
      }
    : 'no approved lesson on the prerequisite unit (follow-up still tested below)');

  let eventId = routed?.event?.id || null;
  if (!eventId) {
    const db = getDbClient();
    const { data, error } = await db
      .from('prerequisite_remediation_events')
      .insert({
        edge_id: approved.id,
        user_id: userId,
        failed_outcome_id: failed.id,
        prerequisite_outcome_id: approved.prerequisiteOutcomeId,
        learning_outcome_key: failed.outcomeKey,
        routed_lesson_id: null,
        consecutive_fails_at_route: 2
      })
      .select()
      .single();
    if (error) throw error;
    eventId = data.id;
  }

  const helped = await recordRemediationFollowup({
    userId,
    learningOutcomeKey: failed.outcomeKey,
    correct: true,
    isTwin: false
  });
  assert(helped?.id === eventId, 'follow-up attaches to the open remediation event');
  assert(helped.followupCorrect === true, 'next attempt correctness is stored');
  assert(helped.improved === true, 'improved is true when the next attempt is correct');

  const noSecond = await recordRemediationFollowup({
    userId,
    learningOutcomeKey: failed.outcomeKey,
    correct: false,
    isTwin: false
  });
  assert(!noSecond, 'a closed event is not overwritten by a later attempt');

  console.log('verify-layer2-prerequisites: OK');
  console.log('admin queue: Exam bank page → Cross-strand prerequisites (pending/active/rejected)');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
