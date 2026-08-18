/**
 * Vertical column addition (Grade 1 default) + horizontal twin probe.
 * Usage (from backend/): node scripts/verify-column-addition.js
 */
import {
  createAdaptiveSession,
  advanceAdaptiveSession
} from '../learner/services/adaptiveQuizService.js';
import {
  DEFAULT_ADDITION_LAYOUT,
  VERTICAL_ADDITION_INSTRUCTION,
  columnWorking,
  hasIntegerAddends,
  needsRegrouping,
  placeValueRows,
  applyColumnDigit,
  digitChoicesForSum,
  expectedSumDigitCount,
  resolveAdditionLayout,
  resolveScaffoldCarry,
  verticalAdditionInstruction
} from '../utils/additionLayout.js';
import { additionWorkedSteps } from '../utils/additionWorkedExample.js';
import { expectedScalarForQuestion } from '../utils/expectedScalar.js';
import {
  makeNumericEntryQuestion,
  twistNumericEntryQuestion
} from '../utils/numericEntry.js';
import { normalizeQuiz } from '../admin/services/lessonGenerationService.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(resolveAdditionLayout(undefined) === 'vertical', 'unset layout defaults vertical');
assert(resolveAdditionLayout('HORIZONTAL') === 'horizontal', 'layout alias');
assert(verticalAdditionInstruction('What is 32 + 6?') === VERTICAL_ADDITION_INSTRUCTION, 'strip equation stem');
assert(verticalAdditionInstruction('Add.') === 'Add.', 'keep short instruction');

const rows = placeValueRows(32, 6);
assert(rows.cols === 2, 'place-value width');
assert(rows.a.join('') === '32', '32 right-aligned');
assert(rows.b.join('') === ' 6', '6 ones-aligned, tens blank not zero');

assert(applyColumnDigit('', '8') === '8', 'first key is ones');
assert(applyColumnDigit('8', '3') === '38', 'second key fills tens, ones stay 8');
assert(applyColumnDigit('38', 'back') === '8', 'backspace undoes tens, keeps ones');
assert(placeValueRows(32, 6, '8').sum.join('') === ' 8', 'typed ones sits in the ones column');
assert(placeValueRows(32, 6, '38').sum.join('') === '38', 'then tens fills to the left');
assert(expectedSumDigitCount(32, 6) === 2, '32+6 is two digits — auto-submit after tens');
assert(expectedSumDigitCount(5, 3) === 1, '5+3 is one digit — auto-submit after ones');

const easyPad = digitChoicesForSum(32, 6, 'easy');
const advPad = digitChoicesForSum(32, 6, 'advanced');
assert(easyPad.includes(3) && easyPad.includes(8), 'pad always includes the answer digits');
assert(easyPad.length === 4, 'easy pad is answer digits plus two distractors');
assert(advPad.length > easyPad.length, 'harder tiers add more distractor chips');
assert(digitChoicesForSum(5, 3, 'easy').includes(8), 'single-digit sum still offers 8');

assert(needsRegrouping(28, 5) === true, '28+5 regroups');
assert(needsRegrouping(32, 6) === false, '32+6 does not regroup');
assert(columnWorking(28, 5).onesCarry === 1, 'ones carry is 1');
assert(columnWorking(32, 6).onesCarry === 0, 'no ones carry');
assert(resolveScaffoldCarry(undefined, { layout: 'vertical' }) === true, 'vertical gets carry boxes');
assert(resolveScaffoldCarry(false, { layout: 'vertical' }) === false, 'explicit off');

const regroupSteps = additionWorkedSteps(28, 5);
assert(regroupSteps.length === 4, 'four worked steps');
assert(regroupSteps[0].reveal === 'addends', 'first step is align');
assert(regroupSteps[2].text.includes('Carry 1'), 'regroup names the carry');
assert(regroupSteps[3].text.includes('33'), 'last step is the total');
assert(!regroupSteps[0].text.includes('33'), 'align step does not leak the total');

const noCarrySteps = additionWorkedSteps(32, 6);
assert(noCarrySteps[2].text.includes('Nothing to carry'), 'no-regroup step');

const vertical = makeNumericEntryQuestion({ a: 32, b: 6 });
assert(vertical.params.layout === DEFAULT_ADDITION_LAYOUT, 'make defaults vertical');
assert(vertical.question === VERTICAL_ADDITION_INSTRUCTION, 'vertical stem is Add.');
assert(expectedScalarForQuestion(vertical) === 38, '32+6');

const probe = twistNumericEntryQuestion(vertical);
assert(probe.ok, 'vertical twist ok');
assert(probe.question.params.a === 32 && probe.question.params.b === 6, 'twin keeps the same pair');
assert(probe.question.params.layout === 'horizontal', 'twin is horizontal');
assert(probe.question.question === 'What is 32 + 6?', 'horizontal stem shows the equation');

const numberTwist = twistNumericEntryQuestion(
  makeNumericEntryQuestion({ a: 4, b: 6, layout: 'horizontal' }),
  { random: () => 0.9 }
);
assert(numberTwist.ok, 'horizontal still number-twists');
assert(
  numberTwist.question.params.a !== 4 || numberTwist.question.params.b !== 6,
  'horizontal twin changes pair'
);
assert(numberTwist.question.params.layout === 'horizontal', 'number-twist stays horizontal');

const profile = {
  modalityCycle: ['practice'],
  allowedDiagramTypes: ['object_quantity', 'number_line'],
  fallbackDiagramType: 'object_quantity'
};
const normalized = normalizeQuiz(
  {
    questions: [
      {
        template: true,
        questionText: 'What is {a} + {b}?',
        params: { a: 14, b: 3 },
        constraints: {
          a: [10, 99],
          b: [1, 9],
          sumMax: 100,
          noRegrouping: true,
          operation: 'addition'
        },
        answerFormula: 'a + b',
        learningOutcomeIndex: 1
      }
    ]
  },
  ['Add a 2-digit number to a 1-digit number without regrouping'],
  profile,
  { additionTemplates: true, gradeNumber: 1 }
).questions[0];
assert(normalized.interactionType === 'numeric_entry', 'normalize → numeric_entry');
assert(normalized.params.layout === 'vertical', 'normalize defaults vertical');
assert(normalized.question === VERTICAL_ADDITION_INSTRUCTION, 'normalize stem is Add.');
assert(hasIntegerAddends(normalized.params), 'addends stored');

const questions = Array.from({ length: 12 }, (_, i) =>
  makeNumericEntryQuestion({
    a: 10 + i,
    b: 2,
    layout: 'vertical'
  })
).map((q, i) => ({ ...q, id: `q-${i + 1}`, learningOutcomeKey: 'add' }));

const lesson = {
  id: 'column-verify',
  grade: '1',
  title: 'Add',
  quiz: { passingScore: 60, questions },
  learningObjectives: ['Add']
};

let state = createAdaptiveSession({ lesson });
assert(state.question.interactionType === 'numeric_entry', 'live type');
assert(state.question.params == null, 'full params not leaked');
assert(state.question.answerFormula == null, 'formula not leaked');
assert(state.question.layout === 'vertical', 'live layout vertical');
assert(
  Number.isInteger(state.question.addends?.a) && Number.isInteger(state.question.addends?.b),
  'addends sent for the column'
);
assert(state.question.question === VERTICAL_ADDITION_INSTRUCTION, 'live stem is Add.');
assert(state.question.scaffoldCarry === true, 'live vertical has carry boxes');
assert(state.question.workedSteps == null, 'practice does not leak worked example');

const originalAddends = { ...state.question.addends };
const originalId = state.question.id;

state = advanceAdaptiveSession({
  session: state.session,
  lesson,
  submittedValue: '99',
  responseTimeMs: 2500
});
assert(state.lastAnswer.correct === false, 'wrong sum');
assert(state.session.twinPairs.length === 1, 'incorrect schedules a twin');

let hops = 0;
while (state.question && !state.question.isTwistedVariant) {
  const expected = state.question.addends.a + state.question.addends.b;
  state = advanceAdaptiveSession({
    session: state.session,
    lesson,
    submittedValue: String(expected),
    responseTimeMs: 2800
  });
  hops += 1;
  assert(hops < 10, 'twin never served');
}
assert(state.question.twinOf === originalId, 'served twin of original');
assert(state.question.layout === 'horizontal', 'twin probe is horizontal');
assert(
  state.question.addends.a === originalAddends.a && state.question.addends.b === originalAddends.b,
  'twin keeps the same numbers'
);
assert(
  state.question.question === `What is ${originalAddends.a} + ${originalAddends.b}?`,
  'horizontal twin shows the equation'
);

const twinSum = originalAddends.a + originalAddends.b;
state = advanceAdaptiveSession({
  session: state.session,
  lesson,
  submittedValue: String(twinSum),
  responseTimeMs: 2600
});
assert(state.lastAnswer.correct === true, 'same sum still grades on the horizontal twin');

const unsetLayout = {
  ...makeNumericEntryQuestion({ a: 21, b: 4 }),
  id: 'legacy-1',
  learningOutcomeKey: 'add'
};
delete unsetLayout.params.layout;
const legacyLesson = {
  id: 'legacy-column',
  grade: '1',
  title: 'Add',
  quiz: { questions: [unsetLayout] },
  learningObjectives: ['Add']
};
const legacy = createAdaptiveSession({ lesson: legacyLesson });
assert(legacy.question.layout === 'vertical', 'persisted items without layout still render vertical');
assert(legacy.question.addends.a === 21, 'legacy addends sent');

const scaffoldQ = {
  ...makeNumericEntryQuestion({ a: 28, b: 5 }),
  id: 'steps-1',
  learningOutcomeKey: 'add',
  modality: 'text_steps'
};
const scaffoldLesson = {
  id: 'worked-example-verify',
  grade: '1',
  title: 'Add',
  quiz: { questions: [scaffoldQ] },
  learningObjectives: ['Add']
};
const scaffolded = createAdaptiveSession({ lesson: scaffoldLesson });
assert(Array.isArray(scaffolded.question.workedSteps), 'text_steps gets templated steps');
assert(scaffolded.question.workedSteps.length === 4, 'four tap-to-reveal steps');
assert(scaffolded.question.workedSteps[2].text.includes('Carry'), 'carry step present');
assert(scaffolded.question.answerFormula == null, 'formula still not leaked on scaffold');

console.log('verify-column-addition: OK');
