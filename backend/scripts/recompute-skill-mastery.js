/**
 * One-shot recompute of skill_mastery under the 3-of-4 mastered rule.
 *
 * Usage:
 *   node scripts/recompute-skill-mastery.js           # dry-run (default)
 *   node scripts/recompute-skill-mastery.js --apply   # write updates
 *
 * Not an automatic migration — run only after confirming no real end-users
 * (or accepting that existing "mastered" badges may change).
 */
import 'dotenv/config';
import { getDbClient } from '../config/supabase.js';
import { SkillAttempt, SkillMastery } from '../models/SkillAttempt.js';

const APPLY = process.argv.includes('--apply');

const statusFromAttempts = (attemptsOldestFirst) => {
  let status = 'unknown';
  let consecutiveFails = 0;
  let lastSuccessGrade = null;
  let preferredModalityObserved = null;
  let skillFocus = null;
  let currentGradeLevel = null;

  for (let i = 0; i < attemptsOldestFirst.length; i++) {
    const a = attemptsOldestFirst[i];
    skillFocus = a.skillFocus || skillFocus;
    currentGradeLevel = a.gradeLevel || currentGradeLevel;

    if (a.correct) {
      consecutiveFails = 0;
      lastSuccessGrade = a.gradeLevel || lastSuccessGrade;
      if (a.modalityShown && a.modalityShown !== 'mixed') {
        preferredModalityObserved = a.modalityShown;
      }
      // Window: most recent up to 4 ending at this attempt (newest-first slice)
      const newestFirst = attemptsOldestFirst.slice(0, i + 1).reverse();
      status = SkillAttempt.meetsMasteredWindow(newestFirst) ? 'mastered' : 'developing';
    } else {
      consecutiveFails += 1;
      status = consecutiveFails >= 2 ? 'scaffolding' : 'struggling';
    }
  }

  return {
    status,
    consecutiveFailsAtLevel: consecutiveFails,
    lastSuccessGrade,
    preferredModalityObserved,
    skillFocus,
    currentGradeLevel
  };
};

async function preflight() {
  const db = getDbClient();
  const { data: masteryUsers, error: e1 } = await db
    .from('skill_mastery')
    .select('user_id');
  if (e1) throw e1;
  const { data: attemptUsers, error: e2 } = await db
    .from('skill_attempts')
    .select('user_id');
  if (e2) throw e2;

  const masteryDistinct = new Set((masteryUsers || []).map((r) => r.user_id));
  const attemptDistinct = new Set((attemptUsers || []).map((r) => r.user_id));
  console.log('Preflight:');
  console.log(`  skill_mastery rows: ${(masteryUsers || []).length}, distinct users: ${masteryDistinct.size}`);
  console.log(`  skill_attempts rows: ${(attemptUsers || []).length}, distinct users: ${attemptDistinct.size}`);
  console.log(
    '  Confirm these are test/dev accounts only before --apply (mastered badges may change).'
  );
  return { masteryDistinct, attemptDistinct };
}

async function recomputeAll() {
  const db = getDbClient();
  const { data: pairs, error } = await db
    .from('skill_attempts')
    .select('user_id, learning_outcome_key');
  if (error) throw error;

  const keySet = new Set();
  for (const row of pairs || []) {
    if (row.user_id && row.learning_outcome_key) {
      keySet.add(`${row.user_id}::${row.learning_outcome_key}`);
    }
  }

  // Also include mastery rows with no attempts (leave as-is / demote unknown)
  const { data: masteryRows, error: mErr } = await db.from('skill_mastery').select('*');
  if (mErr) throw mErr;
  for (const row of masteryRows || []) {
    keySet.add(`${row.user_id}::${row.learning_outcome_key}`);
  }

  let changed = 0;
  let unchanged = 0;

  for (const compound of keySet) {
    const [userId, learningOutcomeKey] = compound.split('::');
    const attemptsNewest = await SkillAttempt.listByUserOutcome(userId, learningOutcomeKey, {
      limit: 500
    });
    const oldestFirst = [...attemptsNewest].reverse();
    const derived = statusFromAttempts(oldestFirst);
    const existing = await SkillMastery.findByUserAndOutcome(userId, learningOutcomeKey);

    if (!oldestFirst.length) {
      // No attempts — leave row alone
      unchanged += 1;
      continue;
    }

    const nextStatus = derived.status;
    if (existing?.status === nextStatus) {
      unchanged += 1;
      continue;
    }

    console.log(
      `${APPLY ? 'UPDATE' : 'WOULD'} ${userId.slice(0, 8)}… / ${learningOutcomeKey.slice(0, 12)}… ` +
        `${existing?.status || 'none'} → ${nextStatus}`
    );
    changed += 1;

    if (APPLY) {
      await db.from('skill_mastery').upsert(
        {
          user_id: userId,
          learning_outcome_key: learningOutcomeKey,
          skill_focus: derived.skillFocus || existing?.skillFocus || null,
          status: nextStatus,
          consecutive_fails_at_level: derived.consecutiveFailsAtLevel,
          current_grade_level: derived.currentGradeLevel || existing?.currentGradeLevel || null,
          last_success_grade: derived.lastSuccessGrade || existing?.lastSuccessGrade || null,
          preferred_modality_observed:
            derived.preferredModalityObserved || existing?.preferredModalityObserved || null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,learning_outcome_key' }
      );
    }
  }

  console.log(`Done. changed=${changed} unchanged=${unchanged} apply=${APPLY}`);
}

async function main() {
  await preflight();
  await recomputeAll();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
