/**
 * Template-backed sessions: mainTarget is 10–12 from session need, not seed count.
 * Live twists, retries, twins, drag pool cap, vertical "Add."
 *
 *   node scripts/verify-template-backed-session.js
 */
import {
  createAdaptiveSession,
  advanceAdaptiveSession
} from '../learner/services/adaptiveQuizService.js';
import {
  laddersForOutcomes,
  seedQuestionsFromTemplates,
  resolveContentSource,
  isGradeOneNumberConceptContext,
  templatesForSession,
  homeRungs,
  targetRung,
  rungOf
} from '../utils/templateLadders.js';
import { isGradeOneAdditionContext } from '../utils/additionTemplate.js';
import { objectPoolForTarget } from '../utils/countIntoBox.js';
import { VERTICAL_ADDITION_INSTRUCTION } from '../utils/additionLayout.js';
import { SESSION_MAIN_MIN, QUIZ_SOURCE_TEMPLATES } from '../utils/quizSessionSize.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const additionCtx = {
  grade: '1',
  subject: { name: 'Mathematics' },
  subStrand: { name: '1.3 Addition' }
};
assert(isGradeOneAdditionContext(additionCtx), 'addition context');
assert(!isGradeOneNumberConceptContext(additionCtx), 'addition is not number concept');

const outcomes = [
  'add 2-single digit numbers up to a sum of 10',
  'add a 2-digit number to a 1-digit number without regrouping, horizontally and vertically with sum not exceeding 100'
];
assert(resolveContentSource(additionCtx, outcomes) === QUIZ_SOURCE_TEMPLATES, 'addition is template-backed');

const templates = laddersForOutcomes(additionCtx, outcomes);
assert(templates.length >= 4, `expected a handful of templates, got ${templates.length}`);
assert(
  !templates.some((t) => rungOf(t) === 'multiples_of_ten'),
  'two-outcome addition lesson (singles+2-digit) must not attach the tens lesson'
);
const tiers = new Set(templates.map((t) => t.difficulty));
assert(tiers.size >= 2, 'templates span more than one difficulty tier');

const seeds = seedQuestionsFromTemplates(templates);
assert(seeds.length === templates.length, 'one seed per template');
assert(seeds.length < SESSION_MAIN_MIN, 'seed count is not a 30-item (or even 10-item) pool');

const lesson = {
  id: 'template-backed-verify',
  grade: '1',
  learningObjectives: outcomes,
  quiz: {
    source: QUIZ_SOURCE_TEMPLATES,
    templates,
    questions: seeds,
    passingScore: 65
  }
};

let state = createAdaptiveSession({
  lesson,
  masteryRows: [
    {
      learningOutcomeKey: seeds[0].learningOutcomeKey,
      status: 'developing',
      bktPKnow: 0.2
    }
  ]
});
assert(state.session.mainTarget === SESSION_MAIN_MIN, `mainTarget ${state.session.mainTarget} should be ${SESSION_MAIN_MIN}`);
assert(state.question, 'first live item');
assert(state.session.twistedQuestions[state.question.id], 'live item stored on session, not only in seed pool');

const firstNumeric = state.question.interactionType === 'numeric_entry';
if (firstNumeric) {
  assert(state.question.question === VERTICAL_ADDITION_INSTRUCTION || state.question.layout === 'vertical', 'vertical Add.');
}

const answerCurrent = (s, { correct, responseTimeMs }) => {
  const live =
    s.session.twistedQuestions[s.question.id] ||
    lesson.quiz.questions.find((q) => q.id === s.question.id);
  assert(live, `missing live payload ${s.question.id}`);
  if (live.interactionType === 'drag_to_target') {
    const expected = Number(live.params.target ?? live.params.a + live.params.b);
    assert(objectPoolForTarget(expected) >= expected, 'drag pool covers target');
    assert(objectPoolForTarget(expected) <= 20, 'drag pool cap 20');
    return advanceAdaptiveSession({
      session: s.session,
      lesson,
      placedCount: correct ? expected : 1,
      selectedOptionIndex: correct ? expected : 1,
      responseTimeMs
    });
  }
  if (live.interactionType === 'numeric_entry') {
    const expected =
      live.answerFormula === 'target'
        ? Number(live.params.target)
        : Number(live.params.a) + Number(live.params.b);
    return advanceAdaptiveSession({
      session: s.session,
      lesson,
      submittedValue: correct ? expected : expected + 1,
      selectedOptionIndex: correct ? expected : expected + 1,
      responseTimeMs
    });
  }
  throw new Error(`unexpected interaction ${live.interactionType}`);
};

state = answerCurrent(state, { correct: false, responseTimeMs: 4000 });
assert(state.lastAnswer.correct === false, 'wrong answer recorded');

let hops = 0;
while (state.question && !state.meta.done && hops < 40) {
  const isTwin = !!state.question.isTwistedVariant;
  state = answerCurrent(state, { correct: true, responseTimeMs: isTwin ? 2800 : 2200 });
  hops += 1;
}
assert(state.meta.done, 'session completed');
assert(state.session.mainAnswered === SESSION_MAIN_MIN, 'served a full main set from twists');
assert(hops >= SESSION_MAIN_MIN, 'more than the seed count was served');

const ncCtx = {
  grade: '1',
  subject: { name: 'Mathematics' },
  subStrand: { name: '1.1 Number Concept' }
};
assert(isGradeOneNumberConceptContext(ncCtx), 'number concept context');
const ncOutcomes = ['represent numbers 1-30 using concrete objects'];
assert(resolveContentSource(ncCtx, ncOutcomes) === QUIZ_SOURCE_TEMPLATES, 'represent-numbers is templatable');
const sortOutcomes = ['sort and group objects according to different attributes within the classroom'];
assert(resolveContentSource(ncCtx, sortOutcomes) !== QUIZ_SOURCE_TEMPLATES, 'sort/group stays fixed-pool');

const scienceCtx = {
  grade: '3',
  subject: { name: 'Science' },
  subStrand: { name: 'Plants' }
};
assert(resolveContentSource(scienceCtx, ['name plant parts']) !== QUIZ_SOURCE_TEMPLATES, 'science stays fixed-pool');

const fixedLesson = {
  id: 'fixed-pool-verify',
  grade: '3',
  learningObjectives: ['Name plant parts'],
  quiz: {
    questions: Array.from({ length: 30 }, (_, i) => ({
      id: `q-${i + 1}`,
      question: `Item ${i + 1}?`,
      options: ['a', 'b', 'c'],
      correctAnswerIndex: 0,
      learningOutcomeIndex: 1,
      bloomLevel: 'understand',
      modality: 'practice'
    }))
  }
};
const fixed = createAdaptiveSession({ lesson: fixedLesson });
assert(fixed.session.mainTarget === 12, 'legacy 30-item pool still serves 10–12');
assert(fixed.question.id.startsWith('q-'), 'fixed pool serves stored ids');

const twoDigitOnly = [
  'add a 2-digit number to a 1-digit number without regrouping, horizontally and vertically with sum not exceeding 100'
];
const twoDigitTemplates = laddersForOutcomes(additionCtx, twoDigitOnly);
const twoDigitRungs = new Set(twoDigitTemplates.map((t) => rungOf(t)));
assert(twoDigitTemplates.length >= 6, `home plus easier rungs, got ${twoDigitTemplates.length}`);
assert(twoDigitRungs.has('singles_to_10'), 'singles reachable as a drop from a 2-digit lesson');
assert(twoDigitRungs.has('two_digit_one_digit'), '2-digit home rung attached');
assert(
  !twoDigitRungs.has('multiples_of_ten'),
  'tens belong to a different lesson and must not attach'
);
assert(
  twoDigitTemplates.some((t) => t.modality === 'text_steps'),
  'worked-example template exists on the 2-digit rung'
);
assert(
  twoDigitTemplates.some((t) => t.interactionType === 'drag_to_target'),
  'picture/drag template exists on the singles rung'
);

const storedTwo = twoDigitTemplates.filter((t) => rungOf(t) === 'two_digit_one_digit');
const approvedLike = {
  id: 'live-two-digit',
  grade: '1',
  learningObjectives: twoDigitOnly,
  quiz: {
    source: QUIZ_SOURCE_TEMPLATES,
    templates: storedTwo,
    questions: seedQuestionsFromTemplates(storedTwo),
    passingScore: 65
  }
};
const expanded = templatesForSession(approvedLike);
assert(expanded.length > storedTwo.length, 'session fills easier rungs for drop, not harder ones');
assert(
  !expanded.some((t) => rungOf(t) === 'multiples_of_ten'),
  'session must not inject the tens lesson'
);
const homes = homeRungs('addition', twoDigitOnly, storedTwo);
assert(homes.has('two_digit_one_digit') && !homes.has('singles_to_10'), 'home rung is the lesson objective');
assert(
  targetRung({
    family: 'addition',
    homeRungs: homes,
    mastery: { status: 'mastered', bktPKnow: 1 }
  }) === 'two_digit_one_digit',
  'mastered learner stays at this lesson home — does not enter the tens lesson'
);
assert(
  targetRung({
    family: 'addition',
    homeRungs: homes,
    mastery: { status: 'struggling', bktPKnow: 0.2 }
  }) === 'singles_to_10',
  'struggling learner drops one rung'
);
assert(
  targetRung({
    family: 'addition',
    homeRungs: homes,
    mastery: { status: 'developing', bktPKnow: 0.55 }
  }) === 'two_digit_one_digit',
  'developing learner stays on the lesson home rung'
);

const rungOfTemplateId = (id) => {
  const s = String(id || '');
  if (s.includes('tens')) return 'tens';
  if (s.includes('twodigit')) return 'twodigit';
  if (s.includes('singles')) return 'singles';
  return 'other';
};

const runRungSession = (masteryRows, n = 8) => {
  const rungs = [];
  const templateIds = [];
  let s = createAdaptiveSession({ lesson: approvedLike, masteryRows });
  for (let i = 0; i < n && s.question && !s.meta.done; i += 1) {
    const live = s.session.twistedQuestions[s.question.id];
    templateIds.push(live.templateId);
    rungs.push(rungOfTemplateId(live.templateId));
    const expected =
      live.interactionType === 'drag_to_target'
        ? Number(live.params.target ?? live.params.a + live.params.b)
        : live.answerFormula === 'target'
          ? Number(live.params.target)
          : Number(live.params.a) + Number(live.params.b);
    s = advanceAdaptiveSession({
      session: s.session,
      lesson: approvedLike,
      placedCount: expected,
      submittedValue: expected,
      selectedOptionIndex: expected,
      responseTimeMs: 2500,
      masteryRows
    });
  }
  return { rungs, templateIds, lastMeta: s.meta };
};

const masteredKey = storedTwo[0].learningOutcomeKey;
const masteredRun = runRungSession(
  [{ learningOutcomeKey: masteredKey, status: 'mastered', bktPKnow: 0.95 }],
  8
);
assert(
  masteredRun.rungs.every((r) => r !== 'tens'),
  `mastered 2-digit session must never serve tens, got ${masteredRun.rungs.join(',')}`
);
assert(
  masteredRun.rungs.filter((r) => r === 'twodigit').length >= 4,
  `mastered session should stay on the 2-digit home rung, got ${masteredRun.rungs.join(',')}`
);
assert(new Set(masteredRun.templateIds).size >= 1, 'mastered session serves template ids');
assert(masteredRun.lastMeta?.done === true || masteredRun.rungs.length >= 8, 'session continues until mainTarget / done');

const strugglingRun = runRungSession(
  [{ learningOutcomeKey: masteredKey, status: 'struggling', bktPKnow: 0.2 }],
  6
);
assert(
  strugglingRun.rungs.filter((r) => r === 'singles').length >= 3,
  `struggling session should mostly serve singles, got ${strugglingRun.rungs.join(',')}`
);
assert(
  strugglingRun.rungs.every((r) => r !== 'tens'),
  'struggling session also stays out of the tens lesson'
);

console.log('verify-template-backed-session: OK', {
  templates: templates.length,
  seeds: seeds.length,
  mainTarget: SESSION_MAIN_MIN,
  hops,
  ncTemplates: laddersForOutcomes(ncCtx, ncOutcomes).length
});
