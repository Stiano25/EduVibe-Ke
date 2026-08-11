import {
  advanceAdaptiveSession,
  createAdaptiveSession
} from '../learner/services/adaptiveQuizService.js';
import { normalizeAdditionTemplateQuestion } from '../utils/additionTemplate.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const makeQuestion = (index) => {
  const normalized = normalizeAdditionTemplateQuestion({
    id: `add-${index}`,
    template: true,
    questionText: 'Kamau has {a} counters and receives {b} more. How many counters now?',
    params: { a: (index % 4) + 1, b: 2 },
    constraints: { a: [1, 9], b: [1, 9], sumMax: 10, operation: 'addition' },
    answerFormula: 'a + b',
    distractorFormulas: [
      { id: 'low', formula: 'a + b - 1', misconception: 'counted one too few' },
      { id: 'high', formula: 'a + b + 1', misconception: 'counted one too many' },
      { id: 'extra', formula: 'a + b + 2', misconception: 'recounted two objects' }
    ],
    learningOutcomeIndex: 1,
    learningOutcomeKey: 'grade1-addition',
    skillFocus: 'add two single digit numbers up to 10',
    bloomLevel: 'apply',
    modality: 'practice',
    difficulty: 'easy',
    explanation: 'Put the two groups together.'
  });
  assert(normalized.valid, `fixture ${index} failed to normalize`);
  return normalized.question;
};

const lesson = {
  id: 'grade1-addition-twin-test',
  grade: '1',
  learningObjectives: ['add 2-single digit numbers up to a sum of 10'],
  quiz: { questions: Array.from({ length: 12 }, (_, index) => makeQuestion(index + 1)) }
};

const correctDisplayIndex = (session, question) => {
  const order = session.optionOrders?.[question.id] || [];
  const display = order.indexOf(0);
  return display >= 0 ? display : 0;
};

const wrongDisplayIndex = (session, question) => {
  const correct = correctDisplayIndex(session, question);
  return correct === 0 ? 1 : 0;
};

const advance = (state, selectedOptionIndex, responseTimeMs) =>
  advanceAdaptiveSession({
    session: state.session,
    lesson,
    selectedOptionIndex,
    responseTimeMs,
    masteryRows: [],
    modalitySuccessMap: new Map()
  });

// Incorrect original: twin must be deferred by two intervening main questions.
let state = createAdaptiveSession({ lesson });
const original = state.question;
state = advance(state, wrongDisplayIndex(state.session, original), 3000);
assert(state.session.twinPairs.length === 1, 'incorrect answer did not schedule a twin');
assert(state.session.twinPairs[0].triggerReason === 'incorrect', 'wrong trigger reason');
assert(!state.question?.isTwistedVariant, 'twin was served immediately after original');

let interveningMain = 0;
while (state.question && !state.question.isTwistedVariant) {
  assert(state.meta.phase === 'main', 'unexpected phase before deferred twin');
  interveningMain += 1;
  state = advance(state, correctDisplayIndex(state.session, state.question), 3000);
  assert(interveningMain < 10, 'deferred twin was never served');
}
assert(interveningMain >= 2, 'twin must have at least two intervening main questions');
assert(state.question?.twinOf === original.id, 'served twin is not linked to original');

const servedTwin = state.question;
state = advance(state, correctDisplayIndex(state.session, servedTwin), 2800);
assert(state.session.twinPairs[0].twistResult?.correct === true, 'twin result was not captured');

let safety = 0;
while (!state.meta.done && state.question) {
  state = advance(state, correctDisplayIndex(state.session, state.question), 3000);
  safety += 1;
  assert(safety < 40, 'session did not terminate');
}
assert(state.review?.twinPairs?.length === 1, 'review did not preserve twin pair summary');
assert(
  state.session.additionTemplateResponseTimes.length === state.session.mainScoreTotal,
  'timing baseline must contain main Addition templates only'
);

// Fast-correct: first two Addition-template answers establish the running baseline.
let fastState = createAdaptiveSession({ lesson });
for (const elapsed of [5000, 5000, 1000]) {
  fastState = advance(
    fastState,
    correctDisplayIndex(fastState.session, fastState.question),
    elapsed
  );
}
assert(fastState.session.twinPairs.length === 1, 'fast correct answer did not schedule a twin');
assert(
  fastState.session.twinPairs[0].triggerReason === 'fast_correct',
  'fast answer used the wrong trigger reason'
);

console.log('verify-twin-consistency: OK', {
  originalQuestionId: original.id,
  twistQuestionId: servedTwin.id,
  interveningMainQuestions: interveningMain,
  incorrectPair: state.review.twinPairs[0],
  fastTrigger: fastState.session.twinPairs[0],
  baselineScope: 'main Grade 1 Addition template questions only'
});
