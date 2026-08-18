/**
 * Phase 2: subtraction ladder families instantiate without wiring detectTemplatableSkill.
 * Usage (from backend/): node scripts/verify-subtraction-ladder.js
 */
import { compileFormula } from '../utils/additionTemplate.js';
import { enumerateAdditionPairs } from '../utils/additionTemplate.js';
import {
  SUBTRACTION_LADDER,
  instantiateTemplate,
  detectTemplatableSkill,
  isGradeOneSubtractionContext,
  laddersForOutcomes,
  resolveContentSource,
  seedQuestionsFromTemplates
} from '../utils/templateLadders.js';
import { QUIZ_SOURCE_TEMPLATES } from '../utils/quizSessionSize.js';
import {
  createAdaptiveSession,
  advanceAdaptiveSession
} from '../learner/services/adaptiveQuizService.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(SUBTRACTION_LADDER.length === 4, 'four subtraction families');

const expectedFamilies = [
  'single_digit_minus_single_digit',
  'multiples_of_ten_minus_multiples_of_ten',
  'two_digit_minus_one_digit_no_borrow',
  'two_digit_minus_two_digit_no_borrow'
];
assert(
  expectedFamilies.every((id) => SUBTRACTION_LADDER.some((t) => t.outcomeFamily === id)),
  'family ids match the spec'
);

const subtractionCtx = {
  grade: '1',
  subject: { name: 'Mathematics' },
  subStrand: { name: 'Subtraction' }
};

console.log('\n=== PHASE 2 SUBTRACTION LADDER ===');
for (const family of SUBTRACTION_LADDER) {
  assert(family.question === 'Subtract.', `${family.id} question is Subtract.`);
  assert(family.answerFormula === 'a - b', `${family.id} formula is a - b`);
  assert(family.params?.operation === 'subtract', `${family.id} params.operation is subtract`);
  assert(family.params?.layout === 'vertical', `${family.id} layout is vertical`);
  assert(family.interactionType === 'numeric_entry', `${family.id} is numeric_entry`);

  const pairs = enumerateAdditionPairs(family.constraints);
  assert(pairs.length >= 3, `${family.id} has variants (got ${pairs.length})`);
  const answerFn = compileFormula(family.answerFormula);
  for (const pair of pairs.slice(0, 12)) {
    const value = answerFn(pair);
    assert(Number.isInteger(value) && value >= 0, `${family.id} ${pair.a}-${pair.b} = ${value}`);
    if (family.outcomeFamily.includes('no_borrow')) {
      assert(
        pair.a % 10 >= pair.b % 10,
        `${family.id} ${pair.a}-${pair.b} must not borrow`
      );
    }
  }

  const variants = [];
  const seen = new Set();
  for (let i = 0; i < 6; i += 1) {
    const result = instantiateTemplate(family, { random: () => (i + 1) / 8 });
    assert(result.ok, `${family.id} instantiate: ${result.reason || 'ok'}`);
    const q = result.question;
    assert(q.params.operation === 'subtract', `${family.id} instance has params.operation subtract`);
    assert(q.question === 'Subtract.', `${family.id} instance question is Subtract.`);
    assert(q.answerFormula === 'a - b', `${family.id} instance formula`);
    const value = compileFormula(q.answerFormula)(q.params);
    assert(Number.isInteger(value) && value >= 0, `${family.id} instance ${q.params.a}-${q.params.b}=${value}`);
    seen.add(`${q.params.a}-${q.params.b}`);
    variants.push({ a: q.params.a, b: q.params.b, result: value });
  }
  console.log(family.outcomeFamily, { pairCount: pairs.length, samples: variants.slice(0, 3) });
}

assert(
  detectTemplatableSkill(subtractionCtx) === 'subtraction',
  'sub-strand Subtraction routes to the subtraction ladder'
);
assert(
  detectTemplatableSkill({
    grade: '1',
    subject: { name: 'Mathematics' },
    subStrand: { name: 'Numbers' },
    primaryOutcome: 'subtract single digit numbers'
  }) === 'subtraction',
  'outcome text containing subtract also routes'
);
assert(
  isGradeOneSubtractionContext(subtractionCtx) === true,
  'Grade 1 Subtraction context detected'
);
assert(
  detectTemplatableSkill({
    grade: '1',
    subject: { name: 'Mathematics' },
    subStrand: { name: 'Addition' }
  }) === 'addition',
  'Addition is still addition, not subtraction'
);
assert(
  resolveContentSource(subtractionCtx, ['subtract single digit numbers']) === QUIZ_SOURCE_TEMPLATES,
  'subtraction is template-backed when the ladder exists'
);
assert(
  laddersForOutcomes(subtractionCtx, ['subtract single digit numbers']).length === 4,
  'full subtraction ladder attaches'
);

const templates = laddersForOutcomes(subtractionCtx, ['subtract single digit numbers']);
const seeds = seedQuestionsFromTemplates(templates);
assert(seeds.every((q) => q.params?.operation === 'subtract'), 'seeds carry operation subtract');
const lesson = {
  id: 'subtraction-ladder-session',
  grade: '1',
  learningObjectives: ['subtract single digit numbers'],
  quiz: {
    source: QUIZ_SOURCE_TEMPLATES,
    templates,
    questions: seeds
  }
};
let state = createAdaptiveSession({ lesson });
assert(state.question.operation === 'subtract', 'live payload operation is subtract');
assert(state.question.question === 'Subtract.', 'live stem is Subtract.');
const expected = state.question.addends.a - state.question.addends.b;
assert(expected >= 0, 'live pair is non-negative');
const right = advanceAdaptiveSession({
  session: state.session,
  lesson,
  submittedValue: String(expected),
  responseTimeMs: 1600
});
assert(right.lastAnswer.correct === true, 'grades a - b correctly');
console.log('live subtraction grade', {
  a: state.question.addends.a,
  b: state.question.addends.b,
  submitted: expected,
  correct: right.lastAnswer.correct,
  expectedValue: right.lastAnswer.expectedValue
});

console.log('verify-subtraction-ladder: OK');
