/**
 * Subtraction ladder: family isolation, borrow constraint, exhaustive pair domain.
 * Usage (from backend/): node scripts/verify-subtraction-ladder.js
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compileFormula,
  enumerateAdditionPairs,
  pairNeedsBorrow
} from '../utils/additionTemplate.js';
import {
  ADDITION_LADDER,
  SUBTRACTION_LADDER,
  GRADE2_TWO_DIGIT_MINUS_TWO_DIGIT,
  instantiateTemplate,
  detectTemplatableSkill,
  familyFromContext,
  familySlugFromSubStrand,
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
import { expectedScalarForQuestion } from '../utils/expectedScalar.js';
import { resolveColumnOperation } from '../utils/additionLayout.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const INVERSE_OUTCOME =
  'use the relationship between addition and subtraction in working out problems involving basic addition facts';
const G3_DIVISION_OUTCOME =
  'show relationship between multiplication and division using mathematical sentences up to 9×10 = 90';
const SUB_TENS_OUTCOME = 'subtract multiples of 10 up to 90';

const addSingles = ADDITION_LADDER.find((t) => t.id === 'add-singles-easy-numeric');
const addTens = ADDITION_LADDER.find((t) => t.id === 'add-tens-mid-numeric');
assert(addSingles, 'addition singles template exists');
assert(addTens, 'addition tens template exists');

console.log('\n=== 0. CROSS-FAMILY MATCH HYPOTHESIS ===');
console.log('Addition singles outcomeMatch:', addSingles.outcomeMatch.toString());
console.log('Inverse-relationship outcome:', INVERSE_OUTCOME);
console.log(
  'singles regex vs inverse outcome:',
  addSingles.outcomeMatch.test(INVERSE_OUTCOME)
);
console.log('Addition tens outcomeMatch:', addTens.outcomeMatch.toString());
console.log(
  'tens regex vs "subtract multiples of 10 up to 90":',
  addTens.outcomeMatch.test(SUB_TENS_OUTCOME)
);

assert(
  familySlugFromSubStrand('1.4 Subtraction') === 'subtraction',
  '1.4 Subtraction slugs to subtraction'
);
assert(familySlugFromSubStrand('1.7 Division') === 'division', '1.7 Division slugs to division');
assert(
  familySlugFromSubStrand('1.1 Number Concept') === 'number_concept',
  '1.1 Number Concept slugs to number_concept'
);

const subtractionCtx = {
  grade: '1',
  subject: { name: 'Mathematics' },
  subStrand: { name: '1.4 Subtraction' }
};
const additionCtx = {
  grade: '1',
  subject: { name: 'Mathematics' },
  subStrand: { name: '1.3 Addition' }
};
const divisionCtx = {
  grade: '3',
  subject: { name: 'Mathematics' },
  subStrand: { name: '1.7 Division' },
  primaryOutcome: G3_DIVISION_OUTCOME
};

assert(familyFromContext(subtractionCtx) === 'subtraction', 'family from sub-strand code');
assert(familyFromContext(additionCtx) === 'addition', 'addition family from 1.3 Addition');
assert(
  detectTemplatableSkill({
    grade: '1',
    subject: { name: 'Mathematics' },
    subStrand: { name: 'Numbers' },
    primaryOutcome: INVERSE_OUTCOME
  }) === null,
  'outcome prose never selects family'
);
assert(
  detectTemplatableSkill(divisionCtx) === null,
  'Grade 3 Division has no ladder yet — not routed via "multiplication" in the outcome'
);

const inverseAttached = laddersForOutcomes(subtractionCtx, [INVERSE_OUTCOME]);
assert(inverseAttached.length === SUBTRACTION_LADDER.length, 'subtraction lesson keeps subtraction ladder');
assert(
  inverseAttached.every((t) => t.family === 'subtraction'),
  'no addition templates attach to a subtraction sub-strand'
);
assert(
  inverseAttached.every((t) => t.answerFormula === 'a - b'),
  'attached formulas are a - b, never a + b'
);

const tensCollision = laddersForOutcomes(subtractionCtx, [SUB_TENS_OUTCOME]);
assert(
  tensCollision.every((t) => t.family === 'subtraction'),
  'multiples-of-10 subtraction outcome does not pull the addition tens template'
);
assert(
  !tensCollision.some((t) => t.id === 'add-tens-mid-numeric' || t.family === 'addition'),
  'addition tens template stays out'
);

assert(
  laddersForOutcomes(additionCtx, [INVERSE_OUTCOME]).every((t) => t.family === 'addition'),
  'addition sub-strand never attaches subtraction templates either'
);

const curriculum = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../data/grade1-3-mathematics-curriculum.json'), 'utf8')
);
const OP = /\b(add(?:ition)?|subtract(?:ion)?|multipl(?:y|ication)|divid(?:e|es|ing)|division)\b/gi;
const cross = [];
for (const g of curriculum.grades || []) {
  for (const strand of g.strands || []) {
    for (const ss of strand.subStrands || []) {
      const family = familySlugFromSubStrand(ss.subStrand);
      for (const outcome of ss.specificLearningOutcomes || []) {
        const hits = new Set(
          [...String(outcome).toLowerCase().matchAll(OP)].map((m) => {
            const w = m[1];
            if (w.startsWith('add')) return 'addition';
            if (w.startsWith('subtract')) return 'subtraction';
            if (w.startsWith('multipl')) return 'multiplication';
            return 'division';
          })
        );
        if (hits.size >= 2) {
          cross.push({
            grade: g.grade,
            subStrand: ss.subStrand,
            family,
            outcome,
            mentioned: [...hits]
          });
        }
      }
    }
  }
}
console.log('\nCross-operation outcomes in G1–3 curriculum:', cross.length);
for (const row of cross) {
  const ctx = {
    grade: String(row.grade),
    subject: { name: 'Mathematics' },
    subStrand: { name: row.subStrand }
  };
  const attached = laddersForOutcomes(ctx, [row.outcome]);
  const leak = attached.filter((t) => t.family && t.family !== row.family);
  assert(
    leak.length === 0,
    `family leak on ${row.subStrand}: ${leak.map((t) => t.id).join(',')}`
  );
  console.log(
    `  G${row.grade} ${row.subStrand} family=${row.family} mentioned=${row.mentioned.join('+')} attached=${attached.length} (${attached[0]?.family || 'none'})`
  );
}

assert(SUBTRACTION_LADDER.length === 3, 'Grade 1 ladder has three families (2-digit−2-digit removed)');
assert(
  !SUBTRACTION_LADDER.some((t) => t.outcomeFamily === 'two_digit_minus_two_digit_no_borrow'),
  '2-digit minus 2-digit is not on the Grade 1 ladder'
);

console.log('\n=== 1+3. EXHAUSTIVE PAIR DOMAIN ===');
const g1Families = SUBTRACTION_LADDER;
const extra = GRADE2_TWO_DIGIT_MINUS_TWO_DIGIT;

const validateFamily = (family, label) => {
  assert(family.question === 'Subtract.', `${label} question is Subtract.`);
  assert(family.answerFormula === 'a - b', `${label} formula is a - b`);
  assert(family.params?.operation === 'subtract', `${label} params.operation is subtract`);
  const unconstrained = enumerateAdditionPairs({
    ...family.constraints,
    noBorrowing: false
  });
  const pairs = enumerateAdditionPairs(family.constraints);
  const answerFn = compileFormula(family.answerFormula);
  let pass = 0;
  for (const pair of pairs) {
    const value = answerFn(pair);
    assert(Number.isInteger(value) && value >= 0, `${label} ${pair.a}-${pair.b}=${value}`);
    if (family.constraints.noBorrowing) {
      assert(!pairNeedsBorrow(pair.a, pair.b), `${label} ${pair.a}-${pair.b} borrows`);
    }
    pass += 1;
  }
  const inst = instantiateTemplate(family, { asSeed: true });
  assert(inst.ok, `${label} seed instantiate: ${inst.reason}`);
  assert(inst.question.params.operation === 'subtract', `${label} seed operation`);
  assert(
    expectedScalarForQuestion(inst.question) === answerFn(inst.question.params),
    `${label} seed grades a-b`
  );
  console.log(label, {
    unconstrained: unconstrained.length,
    domain: pairs.length,
    passed: `${pass}/${pairs.length}`
  });
  assert(pass === pairs.length, `${label} exhaustive pass`);
  return { unconstrained: unconstrained.length, domain: pairs.length, pass };
};

const reports = {};
for (const family of g1Families) {
  reports[family.outcomeFamily] = validateFamily(family, family.outcomeFamily);
}
reports[extra.outcomeFamily] = validateFamily(extra, extra.outcomeFamily + ' (Grade 2, not on G1 ladder)');

assert(
  pairNeedsBorrow(42, 18) === true,
  '42-18 requires ones borrow (2 < 8)'
);
assert(
  !enumerateAdditionPairs(extra.constraints).some((p) => p.a === 42 && p.b === 18),
  '42-18 is excluded from the 2-digit−2-digit domain'
);
assert(
  enumerateAdditionPairs(extra.constraints).some((p) => p.a === 45 && p.b === 21),
  '45-21 remains valid (ones 5 >= 1)'
);

assert(isGradeOneSubtractionContext(subtractionCtx) === true, 'G1 1.4 Subtraction detected');
assert(detectTemplatableSkill(subtractionCtx) === 'subtraction', 'sub-strand routes subtraction');
assert(detectTemplatableSkill(additionCtx) === 'addition', 'Addition is still addition');
assert(
  resolveContentSource(subtractionCtx, ['subtract single digit numbers']) === QUIZ_SOURCE_TEMPLATES,
  'subtraction is template-backed'
);

const templates = laddersForOutcomes(subtractionCtx, ['subtract single digit numbers']);
const seeds = seedQuestionsFromTemplates(templates);
assert(seeds.length === 3, `G1 seeds = 3, got ${seeds.length}`);
assert(seeds.every((q) => q.params?.operation === 'subtract'), 'seeds carry subtract');
assert(seeds.every((q) => q.answerFormula === 'a - b'), 'seeds grade a - b');

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
assert(resolveColumnOperation(state.question.operation) === 'subtract', 'renderer op is subtract');
const expected = state.question.addends.a - state.question.addends.b;
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

console.log('\nverify-subtraction-ladder: OK', reports);
