/**
 * numeric_entry grading: formula + params, leading-zero / whitespace parse.
 * Usage (from backend/): node scripts/verify-numeric-entry.js
 */
import {
  createAdaptiveSession,
  advanceAdaptiveSession
} from '../learner/services/adaptiveQuizService.js';
import { parseNumericAnswer, expectedScalarForQuestion } from '../utils/expectedScalar.js';
import {
  makeNumericEntryQuestion,
  twistNumericEntryQuestion
} from '../utils/numericEntry.js';
import { resolveInteractionType, INTERACTION_TYPES } from '../utils/interactionTypes.js';
import { normalizeQuiz } from '../admin/services/lessonGenerationService.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(INTERACTION_TYPES.includes('numeric_entry'), 'numeric_entry registered');
assert(resolveInteractionType('free_response') === 'numeric_entry', 'free_response alias');
assert(parseNumericAnswer('06') === 6, 'leading zeros');
assert(parseNumericAnswer(' 10 ') === 10, 'whitespace');
assert(parseNumericAnswer('') == null, 'empty');
assert(parseNumericAnswer('6a') == null, 'non-digits rejected');

const q = makeNumericEntryQuestion({ a: 4, b: 6, questionText: 'What is {a} + {b}?' });
assert(q.interactionType === 'numeric_entry', 'interactionType');
assert(q.options.length === 0, 'no options');
assert(q.params.layout === 'vertical', 'default layout is vertical');
assert(q.question === 'Add.', 'vertical question is Add.');
assert(expectedScalarForQuestion(q) === 10, '4+6=10');

const twisted = twistNumericEntryQuestion(q, { random: () => 0.9 });
assert(twisted.ok, 'twist ok');
assert(twisted.question.interactionType === 'numeric_entry', 'twist keeps numeric_entry');
assert(twisted.question.params.layout === 'horizontal', 'vertical original twins to horizontal');
assert(twisted.question.params.a === 4 && twisted.question.params.b === 6, 'presentation twin keeps pair');

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
        params: { a: 3, b: 5 },
        constraints: { a: [1, 9], b: [1, 9], sumMax: 10, operation: 'addition' },
        answerFormula: 'a + b',
        learningOutcomeIndex: 1
      }
    ]
  },
  ['Add'],
  profile,
  { additionTemplates: true, gradeNumber: 1 }
);
assert(normalized.questions[0].interactionType === 'numeric_entry', 'Grade 1 addition template → numeric_entry');
assert(normalized.questions[0].options.length === 0, 'normalized numeric has no options');
assert(normalized.questions[0].params.layout === 'vertical', 'normalized layout vertical');
assert(normalized.questions[0].question === 'Add.', 'normalized stem is Add.');

const lesson = {
  id: 'numeric-verify',
  grade: '1',
  title: 'Add',
  quiz: {
    passingScore: 60,
    questions: [{ ...q, id: 'q-1', learningOutcomeKey: 'add' }]
  },
  learningObjectives: ['Add']
};

let state = createAdaptiveSession({ lesson });
assert(state.question.interactionType === 'numeric_entry', 'live payload is numeric_entry');
assert(state.question.answerFormula == null, 'formula not leaked live');
assert(state.question.params == null, 'params not leaked live');
assert(state.question.layout === 'vertical', 'live layout');
assert(state.question.addends?.a === 4 && state.question.addends?.b === 6, 'addends sent live');
assert(state.question.question === 'Add.', 'live stem is Add.');

const wrong = advanceAdaptiveSession({
  session: state.session,
  lesson,
  submittedValue: '09',
  responseTimeMs: 1800
});
assert(wrong.lastAnswer.correct === false, '9 is not 10');
assert(wrong.lastAnswer.submittedValue === 9, 'parsed 09 → 9');
assert(wrong.lastAnswer.expectedValue === 10, 'expected recorded');

state = createAdaptiveSession({ lesson });
const right = advanceAdaptiveSession({
  session: state.session,
  lesson,
  submittedValue: '10',
  responseTimeMs: 2200
});
assert(right.lastAnswer.correct === true, '10 passes');
assert(right.lastAnswer.responseTimeMs === 2200, 'timer captured');

console.log('verify-numeric-entry: OK');
