/**
 * Practice Score is display-only. First-try score must stay 1/4 (25%) on this
 * mixed walk; Practice Score must be 56% (1 + 0.75 + 0.5 + 0) / 4.
 *
 * Usage (from backend/): node scripts/verify-practice-score.js
 */
import {
  isDigitTransposition,
  optionAsInteger,
  PRACTICE_CREDIT,
  computePracticeScore
} from '../utils/practiceScore.js';
import { makeNumericEntryQuestion } from '../utils/numericEntry.js';
import {
  createAdaptiveSession,
  advanceAdaptiveSession
} from '../learner/services/adaptiveQuizService.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(isDigitTransposition(85, 58) === true, '58 ↔ 85');
assert(isDigitTransposition(58, 58) === false, 'identical is not a near-miss');
assert(isDigitTransposition(7, 7) === false, 'single digit identical');
assert(isDigitTransposition(7, 8) === false, 'single digit cannot transpose');
assert(isDigitTransposition(112, 121) === true, '112 ↔ 121');
assert(isDigitTransposition(12, 21) === true, '12 ↔ 21');
assert(isDigitTransposition(19, 20) === false, '19 vs 20 is not a permutation');
assert(isDigitTransposition(null, 58) === false, 'null submitted');
assert(optionAsInteger('48') === 48, 'plain option');
assert(optionAsInteger('$58$') === 58, 'latex-wrapped option');
assert(PRACTICE_CREDIT.NEAR_MISS === 0.75, 'default near-miss weight');
assert(PRACTICE_CREDIT.RETRY === 0.5, 'default retry weight');
console.log('Transposition helper: ok');

const makeQ = (a, b, id) => ({
  ...makeNumericEntryQuestion({
    a,
    b,
    skillFocus: 'Addition',
    bloomLevel: 'apply',
    learningOutcomeIndex: 1,
    layout: 'horizontal'
  }),
  id,
  learningOutcomeKey: 'g2-add',
  template: false
});

const lesson = {
  id: 'practice-score-verify',
  grade: '2',
  title: 'Practice Score mixed walk',
  learningObjectives: ['Addition'],
  quiz: {
    title: 'Mixed',
    passingScore: 60,
    source: 'fixed_pool',
    questions: [
      makeQ(23, 4, 'q-first-try'),
      makeQ(50, 8, 'q-near-miss'),
      makeQ(12, 7, 'q-retry'),
      makeQ(31, 6, 'q-miss')
    ]
  }
};

const submit = (state, value) =>
  advanceAdaptiveSession({
    session: state.session,
    lesson,
    submittedValue: value,
    responseTimeMs: 1800,
    masteryRows: [],
    modalitySuccessMap: new Map()
  });

const mainAnswers = {
  'q-first-try': 27,
  'q-near-miss': 85,
  'q-retry': 20,
  'q-miss': 10
};
const retryAnswers = {
  'q-near-miss': 58,
  'q-retry': 19,
  'q-miss': 10
};

let state = createAdaptiveSession({ lesson });
assert(state.meta.mainTarget === 4, `mainTarget 4, got ${state.meta.mainTarget}`);

while (state.meta.phase === 'main' && state.question) {
  const id = state.question.id;
  assert(mainAnswers[id] != null, `unexpected main id ${id}`);
  state = submit(state, mainAnswers[id]);
}

assert(state.meta.phase === 'retry', `phase after mains should be retry, got ${state.meta.phase}`);

while (!state.meta.done && state.question) {
  const original = state.session.currentRetryFor || state.question.id;
  const value = retryAnswers[original] ?? retryAnswers[state.question.id];
  assert(value != null, `no retry answer for ${original} / ${state.question.id}`);
  state = submit(state, value);
}

assert(state.meta.done === true, 'session done');
const firstTry = state.review.score;
const practice = state.review.practiceScore;

console.log('Side-by-side scores:');
console.log(`  Internal first-try: ${firstTry.correct}/${firstTry.total} = ${firstTry.percentage}%`);
console.log(`  Practice Score:     creditSum ${practice.creditSum} / ${practice.total} = ${practice.percentage}%`);
console.log('  Per-item tiers:', practice.items.map((i) => `${i.questionId}:${i.tier}(${i.credit})`).join(', '));

assert(firstTry.correct === 1 && firstTry.total === 4 && firstTry.percentage === 25, 'first-try 25%');
assert(practice.percentage === 56, `practice 56%, got ${practice.percentage}`);
assert(practice.items.find((i) => i.questionId === 'q-first-try')?.tier === 'first_try', 'first-try tier');
assert(practice.items.find((i) => i.questionId === 'q-near-miss')?.tier === 'near_miss', 'near-miss kept after retry');
assert(practice.items.find((i) => i.questionId === 'q-retry')?.tier === 'retry', 'retry tier');
assert(practice.items.find((i) => i.questionId === 'q-miss')?.tier === 'miss', 'miss tier');

const recomputed = computePracticeScore(state.session, lesson);
assert(recomputed.percentage === practice.percentage, 'recompute matches payload');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const isolationFiles = [
  'utils/bkt.js',
  'utils/lessonUnlock.js',
  'utils/templateLadders.js',
  'learner/controllers/adaptiveController.js'
];
for (const rel of isolationFiles) {
  const src = readFileSync(join(root, rel), 'utf8');
  if (rel.endsWith('adaptiveController.js')) {
    assert(
      /progress:\s*pct/.test(src) && !/progress:\s*.*practiceScore/.test(src),
      'lesson_progress.progress is first-try pct, not practiceScore'
    );
    assert(
      !/from ['"].*practiceScore/.test(src),
      'adaptiveController does not import practiceScore'
    );
  } else {
    assert(!src.includes('practiceScore'), `${rel} must not mention practiceScore`);
  }
}

console.log('Isolation: practiceScore not imported by BKT / unlock / ladders / progress write');
console.log('verify-practice-score: OK');
