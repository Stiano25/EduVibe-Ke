/**
 * Grade 3 Addition templates: outcome match, regrouping constraints,
 * exhaustive pair domain, isolation from Subtraction / Multiplication / Division.
 *
 * Usage (from backend/): node scripts/verify-grade3-addition.js
 */
import { compileFormula, enumerateAdditionPairs, additionRegroupCount } from '../utils/additionTemplate.js';
import {
  ADDITION_LADDER,
  GRADE3_ADDITION_LADDER,
  instantiateTemplate,
  detectTemplatableSkill,
  laddersForOutcomes,
  resolveContentSource,
  seedQuestionsFromTemplates,
  homeRungs,
  targetRung,
  rungOf,
  RUNG_ORDER
} from '../utils/templateLadders.js';
import { QUIZ_SOURCE_TEMPLATES, QUIZ_SOURCE_FIXED_POOL } from '../utils/quizSessionSize.js';
import { expectedScalarForQuestion } from '../utils/expectedScalar.js';
import { VERTICAL_ADDITION_INSTRUCTION } from '../utils/additionLayout.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const G3_ADD_CTX = {
  grade: '3',
  subject: { name: 'Mathematics' },
  subStrand: { name: '1.4 Addition' }
};
const G3_SUB_CTX = {
  grade: '3',
  subject: { name: 'Mathematics' },
  subStrand: { name: '1.5 Subtraction' }
};
const G3_MUL_CTX = {
  grade: '3',
  subject: { name: 'Mathematics' },
  subStrand: { name: '1.6 Multiplication' }
};
const G3_DIV_CTX = {
  grade: '3',
  subject: { name: 'Mathematics' },
  subStrand: { name: '1.7 Division' }
};

const OUTCOMES = {
  threePlusTwoNo:
    'add a 3-digit number to up to a 2-digit number without regrouping with sum not exceeding 1000',
  threePlusTwoYes:
    'add a 3-digit number to up to a 2-digit number with single regrouping with sum not exceeding 1000',
  threePlusThreeNo: 'add two 3-digit numbers without regrouping',
  threePlusThreeYes:
    'add two 3-digit numbers with single regrouping with sum not exceeding 1000',
  threeAddend: 'add three single digit numbers with sum up to 27',
  missingNumber: 'work out missing numbers in patterns involving addition up to 1000'
};

assert(GRADE3_ADDITION_LADDER.length === 4, 'four Grade 3 addition rungs');
assert(
  detectTemplatableSkill(G3_ADD_CTX) === 'addition',
  'Grade 3 Addition is registered'
);

assert(
  RUNG_ORDER.addition.indexOf('three_plus_two_no_regroup') <
    RUNG_ORDER.addition.indexOf('three_plus_two_single_regroup'),
  '3+2 no-regroup is easier than 3+2 with regroup'
);
assert(
  RUNG_ORDER.addition.indexOf('three_plus_two_single_regroup') <
    RUNG_ORDER.addition.indexOf('three_plus_three_no_regroup'),
  '3+2 (any) comes before 3+3 — fewer addend digits first, matching KICD order'
);
assert(
  RUNG_ORDER.addition.indexOf('three_plus_three_no_regroup') <
    RUNG_ORDER.addition.indexOf('three_plus_three_single_regroup'),
  '3+3 no-regroup is easier than 3+3 with regroup'
);

const g1AddCtx = {
  grade: '1',
  subject: { name: 'Mathematics' },
  subStrand: { name: '1.3 Addition' }
};
const g1TwoDigit = laddersForOutcomes(g1AddCtx, [
  'add a 2-digit number to a 1-digit number without regrouping, horizontally and vertically with sum not exceeding 100'
]);
assert(
  !g1TwoDigit.some((t) => String(t.id).startsWith('add-g3-')),
  'Grade 1 Addition lessons do not attach Grade 3 rungs'
);
assert(g1TwoDigit.length === ADDITION_LADDER.filter((t) =>
  ['singles_to_10', 'two_digit_one_digit'].includes(rungOf(t))
).length, 'Grade 1 2-digit lesson still attaches only G1 rungs 0..home');

console.log('\n=== 3.3 OTHER OPERATIONS UNTOUCHED ===');
for (const [label, ctx] of [
  ['G3 Subtraction', G3_SUB_CTX],
  ['G3 Multiplication', G3_MUL_CTX],
  ['G3 Division', G3_DIV_CTX]
]) {
  assert(detectTemplatableSkill(ctx) === null, `${label} is not templatable`);
  assert(
    resolveContentSource(ctx, ['anything']) === QUIZ_SOURCE_FIXED_POOL,
    `${label} still falls through to the bank`
  );
  console.log(label, 'bank path');
}

assert(
  laddersForOutcomes(G3_ADD_CTX, [OUTCOMES.threeAddend]).length === 0,
  'three-addend addition is excluded from this pass'
);
assert(
  resolveContentSource(G3_ADD_CTX, [OUTCOMES.threeAddend]) === QUIZ_SOURCE_FIXED_POOL,
  'three-addend addition falls through to the bank'
);
assert(
  laddersForOutcomes(G3_ADD_CTX, [OUTCOMES.missingNumber]).length === 0,
  'missing-number patterns are excluded from this pass'
);
assert(
  resolveContentSource(G3_ADD_CTX, [OUTCOMES.missingNumber]) === QUIZ_SOURCE_FIXED_POOL,
  'missing-number patterns fall through to the bank'
);
assert(
  resolveContentSource(G3_ADD_CTX, [
    'create number patterns involving addition up to 1000'
  ]) === QUIZ_SOURCE_FIXED_POOL,
  'create-pattern outcome falls through to the bank'
);

console.log('\n=== EXHAUSTIVE PAIR DOMAIN ===');
const reports = {};
for (const def of GRADE3_ADDITION_LADDER) {
  assert(def.question === 'Add.', `${def.id} stem is Add.`);
  assert(def.answerFormula === 'a + b', `${def.id} formula is a + b`);
  assert(def.params?.operation === 'add', `${def.id} column op is add`);
  assert(Array.isArray(def.distractorFormulas) && def.distractorFormulas.length >= 3, `${def.id} has distractors`);

  const pairs = enumerateAdditionPairs(def.constraints);
  const answerFn = compileFormula(def.answerFormula);
  let pass = 0;
  for (const pair of pairs) {
    const value = answerFn(pair);
    assert(Number.isInteger(value) && value >= 0, `${def.id} ${pair.a}+${pair.b}=${value}`);
    assert(value <= 1000, `${def.id} ${pair.a}+${pair.b} exceeds 1000`);
    const carries = additionRegroupCount(pair.a, pair.b);
    if (def.constraints.noRegrouping) {
      assert(carries === 0, `${def.id} ${pair.a}+${pair.b} regroups ${carries} times`);
    }
    if (def.constraints.singleRegrouping) {
      assert(carries === 1, `${def.id} ${pair.a}+${pair.b} regroups ${carries} times, want 1`);
    }
    pass += 1;
  }
  assert(pairs.length >= 2, `${def.id} domain too small: ${pairs.length}`);
  assert(pass === pairs.length, `${def.id} exhaustive pass`);

  const inst = instantiateTemplate(def, { asSeed: true });
  assert(inst.ok, `${def.id} seed instantiate: ${inst.reason}`);
  assert(inst.question.params.operation !== 'subtract', `${def.id} seed is addition, not subtract`);
  assert(inst.question.params.layout === 'vertical', `${def.id} reuses vertical numeric_entry`);
  assert(
    inst.question.question === VERTICAL_ADDITION_INSTRUCTION || inst.question.question === 'Add.',
    `${def.id} live stem is Add.`
  );
  assert(
    expectedScalarForQuestion(inst.question) === def.seed.a + def.seed.b,
    `${def.id} seed grades a+b`
  );
  assert(
    additionRegroupCount(inst.question.params.a, inst.question.params.b) ===
      (def.constraints.singleRegrouping ? 1 : 0),
    `${def.id} seed satisfies regrouping constraint`
  );

  reports[def.rung] = { domain: pairs.length, passed: `${pass}/${pairs.length}` };
  console.log(def.rung, reports[def.rung]);
}

assert(
  !enumerateAdditionPairs(
    GRADE3_ADDITION_LADDER.find((d) => d.rung === 'three_plus_two_no_regroup').constraints
  ).some((p) => p.a === 150 && p.b === 60),
  '150+60 (tens regroup, ones do not) is excluded from the no-regroup 3+2 domain'
);
assert(
  enumerateAdditionPairs(
    GRADE3_ADDITION_LADDER.find((d) => d.rung === 'three_plus_two_single_regroup').constraints
  ).some((p) => p.a === 150 && p.b === 60),
  '150+60 is in the single-regroup 3+2 domain'
);

console.log('\n=== OUTCOME ATTACH + BKT ===');
const attach = (outcome) => laddersForOutcomes(G3_ADD_CTX, [outcome]);
assert(
  resolveContentSource(G3_ADD_CTX, [OUTCOMES.threePlusTwoNo]) === QUIZ_SOURCE_TEMPLATES,
  '3+2 no-regroup is template-backed'
);

const twoNo = attach(OUTCOMES.threePlusTwoNo);
assert(
  twoNo.every((t) => rungOf(t) === 'three_plus_two_no_regroup'),
  '3+2 no-regroup lesson does not attach harder G3 rungs'
);
assert(twoNo.length === 1, '3+2 no-regroup attaches its home template');

const twoYes = attach(OUTCOMES.threePlusTwoYes);
const twoYesRungs = new Set(twoYes.map((t) => rungOf(t)));
assert(twoYesRungs.has('three_plus_two_no_regroup'), '3+2 regroup keeps no-regroup for drop');
assert(twoYesRungs.has('three_plus_two_single_regroup'), '3+2 regroup home attached');
assert(!twoYesRungs.has('three_plus_three_no_regroup'), '3+2 regroup does not attach 3+3');

const threeYes = attach(OUTCOMES.threePlusThreeYes);
const threeYesRungs = new Set(threeYes.map((t) => rungOf(t)));
assert(threeYesRungs.size === 4, 'hardest G3 addition lesson attaches all four G3 rungs');

const threeYesHomes = homeRungs('addition', [OUTCOMES.threePlusThreeYes], [], '3');
assert(
  targetRung({
    family: 'addition',
    homeRungs: threeYesHomes,
    mastery: { status: 'struggling', bktPKnow: 0.2 }
  }) === 'three_plus_three_no_regroup',
  'struggling 3+3-regroup learner drops one rung via RUNG_ORDER'
);
assert(
  targetRung({
    family: 'addition',
    homeRungs: threeYesHomes,
    mastery: { status: 'mastered', bktPKnow: 0.95 }
  }) === 'three_plus_three_single_regroup',
  'mastered 3+3-regroup learner stays on home (nothing harder)'
);

const seeds = seedQuestionsFromTemplates(twoNo);
assert(seeds.length === 1, 'one seed for the 3+2 no-regroup lesson');
assert(seeds[0].params.a === 123 && seeds[0].params.b === 45, 'seed pair 123+45');

console.log('\nverify-grade3-addition: OK', reports);
