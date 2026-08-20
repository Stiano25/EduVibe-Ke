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
  seedQuestionsFromTemplates,
  homeRungs,
  targetRung,
  templatesForSession,
  rungOf,
  templateCoverageReport,
  RUNG_ORDER
} from '../utils/templateLadders.js';
import { QUIZ_SOURCE_TEMPLATES, QUIZ_SOURCE_FIXED_POOL } from '../utils/quizSessionSize.js';
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
assert(
  inverseAttached.length === 0,
  'unmatched inverse-relationship outcome attaches no subtraction templates'
);
assert(
  resolveContentSource(subtractionCtx, [INVERSE_OUTCOME]) === QUIZ_SOURCE_FIXED_POOL,
  'unmatched inverse-relationship outcome routes to the bank, not a default rung'
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
  !SUBTRACTION_LADDER.some((t) => rungOf(t) === 'two_digit_minus_two_digit_no_borrow'),
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
  reports[rungOf(family)] = validateFamily(family, rungOf(family));
}
reports[rungOf(extra)] = validateFamily(extra, rungOf(extra) + ' (Grade 2, not on G1 ladder)');

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
assert(seeds.length === 1, `singles home attaches 1 seed, got ${seeds.length}`);
assert(templates.every((t) => rungOf(t) === 'single_digit_minus_single_digit'), 'singles outcome stays on singles rung');
assert(seeds.every((q) => q.params?.operation === 'subtract'), 'seeds carry subtract');
assert(seeds.every((q) => q.answerFormula === 'a - b'), 'seeds grade a - b');

const TAKING_AWAY_OUTCOME = "model subtraction as 'taking away' using concrete objects";
const takingAwayAttached = laddersForOutcomes(subtractionCtx, [TAKING_AWAY_OUTCOME]);
const takingAwayHomes = homeRungs('subtraction', [TAKING_AWAY_OUTCOME], [], '1');
assert(
  [...takingAwayHomes].join() === 'single_digit_minus_single_digit',
  `Taking Away home rung is singles, got ${[...takingAwayHomes]}`
);
assert(
  takingAwayAttached.every((t) => rungOf(t) === 'single_digit_minus_single_digit'),
  'Taking Away must not attach tens or 2-digit rungs'
);
assert(
  takingAwayAttached.length === 1 && takingAwayAttached[0].id === 'sub-singles-numeric',
  'Taking Away attached set is the singles seed only'
);
assert(
  targetRung({
    family: 'subtraction',
    homeRungs: takingAwayHomes,
    mastery: { status: 'mastered', bktPKnow: 1 }
  }) === 'single_digit_minus_single_digit',
  'mastered Taking Away learner cannot escalate past singles'
);

const twoOneOutcome = 'subtract a 1-digit number from a 2-digit number without regrouping';
const twoOneAttached = laddersForOutcomes(subtractionCtx, [twoOneOutcome]);
const twoOneRungs = new Set(twoOneAttached.map((t) => rungOf(t)));
assert(twoOneRungs.has('single_digit_minus_single_digit'), '2-digit−1-digit lesson keeps singles for drop');
assert(twoOneRungs.has('two_digit_minus_one_digit_no_borrow'), '2-digit−1-digit home attached');
assert(
  !twoOneRungs.has('two_digit_minus_two_digit_no_borrow'),
  'G1 2-digit−1-digit lesson does not attach the Grade 2 2-digit−2-digit rung'
);

const lesson = {
  id: 'subtraction-ladder-session',
  grade: '1',
  subStrand: { name: '1.4 Subtraction' },
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

const storedTakingAwayFullLadder = laddersForOutcomes(subtractionCtx, [SUB_TENS_OUTCOME]);
assert(storedTakingAwayFullLadder.length === SUBTRACTION_LADDER.length, 'tens lesson still attaches 0..home (full G1 range)');
const takingAwayLesson = {
  id: '95b72793-58f1-4523-a52a-82ff8c361c1a',
  title: 'Taking Away Objects: What Is Left?',
  grade: '1',
  subStrand: { name: '1.4 Subtraction' },
  learningObjectives: [TAKING_AWAY_OUTCOME],
  quiz: {
    source: QUIZ_SOURCE_TEMPLATES,
    templates: storedTakingAwayFullLadder,
    questions: seedQuestionsFromTemplates(storedTakingAwayFullLadder)
  }
};
const beforeRungs = [...new Set(storedTakingAwayFullLadder.map((t) => rungOf(t)))];
const sessionPool = templatesForSession(takingAwayLesson);
const afterRungs = [...new Set(sessionPool.map((t) => rungOf(t)))];
console.log('\n=== TAKING AWAY HOME RUNG ===');
console.log('stored (before):', beforeRungs);
console.log('session pool (after):', afterRungs);
assert(beforeRungs.length === 3, 'legacy stored lesson had the full G1 subtraction ladder');
assert(
  afterRungs.join() === 'single_digit_minus_single_digit',
  `session strips harder rungs, got ${afterRungs}`
);

const rungFromTemplateId = (id) => {
  const s = String(id || '');
  if (s.includes('tens')) return 'tens';
  if (s.includes('two-one') || s.includes('two-two')) return 'two_digit';
  if (s.includes('singles')) return 'singles';
  return s;
};

const runTakingAway = (masteryRows, n = 8) => {
  const served = [];
  let s = createAdaptiveSession({ lesson: takingAwayLesson, masteryRows });
  const key = sessionPool[0]?.learningOutcomeKey;
  for (let i = 0; i < n && s.question && !s.meta.done; i += 1) {
    const live = s.session.twistedQuestions[s.question.id];
    served.push({
      templateId: live.templateId,
      rung: rungFromTemplateId(live.templateId),
      a: live.params?.a,
      b: live.params?.b
    });
    const value = Number(live.params.a) - Number(live.params.b);
    s = advanceAdaptiveSession({
      session: s.session,
      lesson: takingAwayLesson,
      submittedValue: String(value),
      responseTimeMs: 1800,
      masteryRows: masteryRows || [{ learningOutcomeKey: key, status: 'developing', bktPKnow: 0.55 }]
    });
  }
  return { served, done: s.meta?.done, progressLabel: s.meta?.progressLabel, phase: s.meta?.phase };
};

const strugglingTrace = runTakingAway(
  [{ learningOutcomeKey: sessionPool[0].learningOutcomeKey, status: 'struggling', bktPKnow: 0.2 }],
  8
);
assert(
  strugglingTrace.served.every((row) => row.rung === 'singles'),
  `struggling Taking Away stayed on singles, got ${strugglingTrace.served.map((r) => r.rung).join(',')}`
);

const masteredTrace = runTakingAway(
  [{ learningOutcomeKey: sessionPool[0].learningOutcomeKey, status: 'mastered', bktPKnow: 0.95 }],
  8
);
assert(
  masteredTrace.served.every((row) => row.rung === 'singles'),
  `mastered Taking Away must not enter tens/2-digit, got ${masteredTrace.served.map((r) => r.rung).join(',')}`
);
assert(masteredTrace.served.length >= 6, 'session still serves a full main set from the home rung');
console.log('struggling trace', strugglingTrace.served.map((r) => `${r.rung}:${r.a}-${r.b}`));
console.log('mastered trace', masteredTrace.served.map((r) => `${r.rung}:${r.a}-${r.b}`));
console.log('mastery-beyond-home UX', {
  lastProgressLabel: masteredTrace.progressLabel,
  phase: masteredTrace.phase,
  done: masteredTrace.done,
  note: 'Session ends with meta.phase=done / progressLabel Complete after mainTarget items. No copy says this lesson has no harder rung — next lesson is unit gating.'
});

console.log('\n=== GRADE 2 TWO-DIGIT MINUS TWO-DIGIT (NOW REGISTERED) ===');
const g2SubCtx = {
  grade: '2',
  subject: { name: 'Mathematics' },
  subStrand: { name: '1.5 Subtraction' }
};
const G2_TWO_TWO_OUTCOME = 'subtract up to 2-digit numbers without regrouping';
assert(
  detectTemplatableSkill(g2SubCtx) === 'subtraction',
  'Grade 2 Subtraction is now a registered template family'
);
assert(
  resolveContentSource(g2SubCtx, [G2_TWO_TWO_OUTCOME]) === QUIZ_SOURCE_TEMPLATES,
  'Grade 2 2-digit−2-digit outcome uses templates, not the bank'
);
assert(
  RUNG_ORDER.subtraction.includes('two_digit_minus_two_digit_no_borrow'),
  'RUNG_ORDER lists the Grade 2 subtraction rung so BKT can target it'
);
assert(
  RUNG_ORDER.subtraction[RUNG_ORDER.subtraction.length - 1] === 'two_digit_minus_two_digit_no_borrow',
  '2-digit−2-digit is the hardest subtraction rung (after G1 singles, 2-1, tens)'
);

const g2Homes = homeRungs('subtraction', [G2_TWO_TWO_OUTCOME], [], '2');
assert(
  g2Homes.has('two_digit_minus_two_digit_no_borrow'),
  'Grade 2 outcome homes at 2-digit−2-digit'
);
const g2Attached = laddersForOutcomes(g2SubCtx, [G2_TWO_TWO_OUTCOME]);
const g2Rungs = new Set(g2Attached.map((t) => rungOf(t)));
assert(g2Rungs.has('single_digit_minus_single_digit'), 'G2 lesson keeps singles for BKT drop');
assert(g2Rungs.has('two_digit_minus_one_digit_no_borrow'), 'G2 lesson keeps 2-1 for BKT drop');
assert(g2Rungs.has('multiples_of_ten_minus_multiples_of_ten'), 'G2 lesson keeps tens for BKT drop');
assert(g2Rungs.has('two_digit_minus_two_digit_no_borrow'), 'G2 home rung is attached');
assert(
  g2Attached.some((t) => t.id === GRADE2_TWO_DIGIT_MINUS_TWO_DIGIT.id),
  'registered Grade 2 template is on the live ladder'
);

assert(
  targetRung({
    family: 'subtraction',
    homeRungs: g2Homes,
    mastery: { status: 'mastered', bktPKnow: 0.95 }
  }) === 'two_digit_minus_two_digit_no_borrow',
  'mastered G2 learner stays on the home 2-digit−2-digit rung (nothing harder)'
);
assert(
  targetRung({
    family: 'subtraction',
    homeRungs: g2Homes,
    mastery: { status: 'struggling', bktPKnow: 0.2 }
  }) === 'multiples_of_ten_minus_multiples_of_ten',
  'struggling G2 learner drops one rung via RUNG_ORDER, not an ad-hoc branch'
);

const g2Seeds = seedQuestionsFromTemplates(
  g2Attached.filter((t) => rungOf(t) === 'two_digit_minus_two_digit_no_borrow')
);
assert(g2Seeds.length === 1, 'G2 home seed instantiates');
assert(g2Seeds[0].params.operation === 'subtract', 'G2 seed is vertical subtract');
assert(g2Seeds[0].params.a === 45 && g2Seeds[0].params.b === 21, 'G2 seed pair is 45-21');
assert(
  expectedScalarForQuestion(g2Seeds[0]) === 24,
  'G2 seed grades 45-21=24'
);

console.log('\nverify-subtraction-ladder: OK', reports);

const TAKING_AWAY_ID = '95b72793-58f1-4523-a52a-82ff8c361c1a';
const persistTakingAway = async () => {
  try {
    const { Lesson } = await import('../models/Lesson.js');
    const existing = await Lesson.findById(TAKING_AWAY_ID);
    if (!existing) {
      console.log('Taking Away lesson not in DB; skipped persist');
      return;
    }
    const rebound = laddersForOutcomes(
      {
        grade: String(existing.grade || '1'),
        subject: { name: 'Mathematics' },
        subStrand: { name: '1.4 Subtraction' }
      },
      existing.learningObjectives || [TAKING_AWAY_OUTCOME]
    );
    const reboundSeeds = seedQuestionsFromTemplates(rebound);
    const coverageReport = templateCoverageReport(rebound, existing.learningObjectives || []);
    await Lesson.update(TAKING_AWAY_ID, {
      quiz: {
        ...existing.quiz,
        source: QUIZ_SOURCE_TEMPLATES,
        templates: rebound,
        questions: reboundSeeds,
        coverageReport
      }
    });
    console.log('Persisted Taking Away templates', {
      id: TAKING_AWAY_ID,
      before: beforeRungs,
      after: rebound.map((t) => t.id)
    });
  } catch (err) {
    console.log('Taking Away persist skipped:', err.message);
  }
};

await persistTakingAway();
