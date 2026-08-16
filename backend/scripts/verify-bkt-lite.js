/**
 * Part 5: BKT-lite math + live comparison against the 3-of-4 heuristic.
 *
 * Does not query users (no emails). User ids are truncated.
 * Writes bkt_* columns only — never changes heuristic status.
 *
 * Usage (from backend/):
 *   node scripts/verify-bkt-lite.js
 */
import 'dotenv/config';
import { getDbClient } from '../config/supabase.js';
import { SkillAttempt, SkillMastery, BktSkillParams } from '../models/SkillAttempt.js';
import {
  BKT_DEFAULTS,
  replayBkt,
  updateAfterObservation,
  updateAfterTwinPair
} from '../utils/bkt.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const nearly = (a, b, eps = 1e-4) => Math.abs(a - b) < eps;

const runMath = () => {
  const { pL0, pT, pS, pG } = BKT_DEFAULTS;
  assert(pL0 === 0.3 && pT === 0.3 && pS === 0.1 && pG === 0.2, '5.2 defaults');

  const afterCorrect = updateAfterObservation(0.3, true);
  const afterWrong = updateAfterObservation(0.3, false);
  assert(afterCorrect > 0.3, 'a correct attempt raises p(Know)');
  assert(afterWrong < afterCorrect, 'a wrong attempt is weaker evidence of knowing');

  const twinBothRight = updateAfterTwinPair(0.3, true, true);
  const twoSingles = updateAfterObservation(updateAfterObservation(0.3, true), true);
  assert(twinBothRight > afterCorrect, 'twin both-correct is stronger than one attempt');
  assert(
    Math.abs(twinBothRight - twoSingles) < 0.05,
    'one consistent twin pair ≈ two isolated corrects (sharper likelihood, one P(T))'
  );

  const twinSplit = updateAfterTwinPair(0.3, true, false);
  const twinBothWrong = updateAfterTwinPair(0.3, false, false);
  assert(twinSplit < twinBothRight, 'inconsistent twin is weaker than both-correct');
  assert(twinBothWrong < twinSplit, 'both-wrong twin is the strongest not-knowing pair');

  const unpairedOriginal = replayBkt([
    { id: 'o', correct: true, twinPairId: 'pair-1', twinRole: 'original' }
  ]);
  assert(unpairedOriginal.observations === 1, 'incomplete pair counts as one single');
  assert(nearly(unpairedOriginal.pKnow, afterCorrect), 'unpaired original = single update');

  const completePair = replayBkt([
    { id: 'o', correct: true, twinPairId: 'pair-1', twinRole: 'original' },
    { id: 't', correct: false, twinPairId: 'pair-1', twinRole: 'twist' }
  ]);
  assert(completePair.observations === 1, 'complete twin pair is one observation');
  assert(nearly(completePair.pKnow, twinSplit), 'replay uses pair likelihood, not two singles');

  const mixed = replayBkt([
    { id: 'a', correct: true },
    { id: 'o', correct: true, twinPairId: 'pair-2', twinRole: 'original' },
    { id: 't', correct: true, twinPairId: 'pair-2', twinRole: 'twist' }
  ]);
  assert(mixed.observations === 2, 'single + complete pair = two observations');

  console.log('BKT math: ok');
};

const paginateSelect = async (db, table, columns) => {
  const page = 1000;
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .range(from, from + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < page) break;
    from += page;
  }
  return rows;
};

const disagreement = (status, pKnow, n) => {
  if (pKnow == null || n < 1) return null;
  if (status === 'mastered' && pKnow < 0.55) {
    return `heuristic mastered but BKT p(Know)=${pKnow.toFixed(2)}`;
  }
  if ((status === 'struggling' || status === 'scaffolding') && pKnow > 0.7) {
    return `heuristic ${status} but BKT p(Know)=${pKnow.toFixed(2)}`;
  }
  if (status === 'developing' && n >= 4 && pKnow > 0.85) {
    return `heuristic developing but BKT p(Know)=${pKnow.toFixed(2)} (n=${n})`;
  }
  if (status === 'developing' && n >= 4 && pKnow < 0.25) {
    return `heuristic developing but BKT p(Know)=${pKnow.toFixed(2)} (n=${n})`;
  }
  return null;
};

const backfillAndCompare = async () => {
  const db = getDbClient();
  const attemptRows = await paginateSelect(db, 'skill_attempts', 'user_id, learning_outcome_key');
  const masteryRows = await paginateSelect(
    db,
    'skill_mastery',
    'user_id, learning_outcome_key, status, bkt_p_know, bkt_n_observations'
  );

  const keySet = new Set();
  for (const row of attemptRows) {
    if (row.user_id && row.learning_outcome_key) {
      keySet.add(`${row.user_id}::${row.learning_outcome_key}`);
    }
  }
  for (const row of masteryRows) {
    if (row.user_id && row.learning_outcome_key) {
      keySet.add(`${row.user_id}::${row.learning_outcome_key}`);
    }
  }

  console.log(
    `Live: ${attemptRows.length} attempts, ${masteryRows.length} mastery rows, ${keySet.size} learner/skill pairs`
  );

  const flags = [];
  const samples = [];
  let wrote = 0;

  for (const compound of keySet) {
    const sep = compound.indexOf('::');
    const userId = compound.slice(0, sep);
    const learningOutcomeKey = compound.slice(sep + 2);
    const attempts = await SkillAttempt.listByUserOutcomeAll(userId, learningOutcomeKey);
    if (!attempts.length) continue;

    const before = await SkillMastery.findByUserAndOutcome(userId, learningOutcomeKey);
    const heuristicStatus = before?.status || 'unknown';
    const updated = await SkillMastery.recomputeBkt({
      userId,
      learningOutcomeKey,
      skillFocus: attempts[attempts.length - 1]?.skillFocus || null,
      gradeLevel: attempts[attempts.length - 1]?.gradeLevel || null
    });
    wrote += 1;

    if (updated.status !== heuristicStatus && heuristicStatus !== 'unknown') {
      flags.push(
        `STATUS CHANGED ${userId.slice(0, 8)} / ${learningOutcomeKey.slice(0, 24)} ${heuristicStatus} → ${updated.status}`
      );
    }

    const twinAttempts = attempts.filter((a) => a.twinPairId).length;
    const row = {
      user: userId.slice(0, 8),
      outcome: learningOutcomeKey.slice(0, 40),
      fullOutcome: learningOutcomeKey,
      nAttempts: attempts.length,
      nTwins: twinAttempts,
      status: updated.status,
      pKnow: updated.bktPKnow,
      nObs: updated.bktNObservations
    };
    samples.push(row);

    const flag = disagreement(updated.status, updated.bktPKnow, updated.bktNObservations || 0);
    if (flag) {
      flags.push(`${row.user} / ${row.outcome}: ${flag}`);
    }
  }

  samples.sort((a, b) => (b.nAttempts || 0) - (a.nAttempts || 0));
  console.log(`Backfilled BKT for ${wrote} learner/skill pairs (status untouched).`);
  console.log('Top pairs by attempt count:');
  for (const s of samples.slice(0, 12)) {
    console.log(
      `  ${s.user}  ${s.outcome.padEnd(40)}  attempts=${String(s.nAttempts).padStart(3)} twins=${s.nTwins}  ` +
        `heuristic=${String(s.status).padEnd(12)}  pKnow=${s.pKnow == null ? 'n/a' : s.pKnow.toFixed(3)}  nObs=${s.nObs}`
    );
  }

  if (flags.length) {
    console.log(`Material disagreements (${flags.length}):`);
    for (const f of flags) console.log(`  FLAG  ${f}`);
  } else {
    console.log('Material disagreements: none on this dataset.');
  }

  if (samples[0]) {
    const seeded = await BktSkillParams.getOrCreate(samples[0].fullOutcome);
    assert(seeded.pL0 === 0.3, 'lazy param seed uses 5.2 defaults');
  }
};

const main = async () => {
  runMath();
  await backfillAndCompare();
  console.log('verify-bkt-lite: ok');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
