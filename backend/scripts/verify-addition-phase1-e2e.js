import 'dotenv/config';
import { Lesson } from '../models/Lesson.js';
import {
  advanceAdaptiveSession,
  createAdaptiveSession
} from '../learner/services/adaptiveQuizService.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const lessonId = process.argv[2];
if (!lessonId) throw new Error('Usage: node scripts/verify-addition-phase1-e2e.js <lessonId>');

const sourceLesson = await Lesson.findById(lessonId);
assert(sourceLesson, `Lesson ${lessonId} not found`);
assert(String(sourceLesson.grade) === '1', 'Expected a Grade 1 lesson');

const templates = (sourceLesson.quiz?.questions || []).filter(
  (question) => question.template === true && question.constraints?.operation === 'addition'
);
assert(templates.length >= 4, `Expected at least four Addition templates, found ${templates.length}`);

// The vertical slice intentionally exercises only authored Addition templates.
const lesson = {
  ...sourceLesson,
  quiz: { ...sourceLesson.quiz, questions: templates }
};

const displayIndexForOriginal = (session, questionId, originalIndex) => {
  const order = session.optionOrders?.[questionId] || [];
  const index = order.indexOf(originalIndex);
  return index >= 0 ? index : originalIndex;
};

const answer = (state, { correct, responseTimeMs }) => {
  const bankQuestion =
    lesson.quiz.questions.find((question) => question.id === state.question.id) ||
    state.session.twistedQuestions?.[state.question.id];
  assert(bankQuestion, `Missing question ${state.question.id}`);
  const correctOriginal = Number(bankQuestion.correctAnswerIndex);
  const selectedOriginal = correct
    ? correctOriginal
    : bankQuestion.options.findIndex((_option, index) => index !== correctOriginal);
  return advanceAdaptiveSession({
    session: state.session,
    lesson,
    selectedOptionIndex: displayIndexForOriginal(
      state.session,
      state.question.id,
      selectedOriginal
    ),
    responseTimeMs,
    masteryRows: [],
    modalitySuccessMap: new Map()
  });
};

let state = createAdaptiveSession({ lesson });
const originalPublic = state.question;
const originalAuthored = templates.find((question) => question.id === originalPublic.id);
assert(originalAuthored, 'First question was not an authored Addition template');

state = answer(state, { correct: false, responseTimeMs: 4200 });
assert(state.session.twinPairs.length === 1, 'Incorrect answer did not schedule a twin');

let intervening = 0;
while (state.question && !state.question.isTwistedVariant) {
  state = answer(state, { correct: true, responseTimeMs: 3600 });
  intervening += 1;
  assert(intervening < 20, 'Twin was not re-served');
}
assert(intervening >= 2, 'Twin was served without two intervening questions');

const twinPublic = state.question;
const twinAuthored = state.session.twistedQuestions[twinPublic.id];
state = answer(state, { correct: true, responseTimeMs: 3300 });

let safety = 0;
while (!state.meta.done && state.question) {
  state = answer(state, { correct: true, responseTimeMs: 3500 });
  safety += 1;
  assert(safety < 50, 'Adaptive session did not terminate');
}

const pair = state.review?.twinPairs?.[0];
assert(pair?.originalResult?.correct === false, 'Original result was not logged');
assert(pair?.twistResult?.correct === true, 'Twist result was not logged');
assert(pair.originalParams.a !== pair.twistParams.a || pair.originalParams.b !== pair.twistParams.b);

console.log(
  JSON.stringify(
    {
      verification: 'Grade 1 Addition Phase 1 E2E OK',
      lesson: {
        id: sourceLesson.id,
        title: sourceLesson.title,
        status: sourceLesson.status,
        authoredQuestionCount: sourceLesson.quiz?.questions?.length || 0,
        validTemplateCount: templates.length
      },
      workedExample: {
        original: {
          id: originalAuthored.id,
          question: originalAuthored.question,
          params: pair.originalParams,
          result: pair.originalResult
        },
        twist: {
          id: twinAuthored.id,
          question: twinAuthored.question,
          params: pair.twistParams,
          options: twinAuthored.options,
          correctAnswer: twinAuthored.options[twinAuthored.correctAnswerIndex],
          result: pair.twistResult
        },
        pairId: pair.pairId,
        triggerReason: pair.triggerReason,
        interveningMainQuestions: intervening
      },
      score: state.review.score,
      baselineSampleCount: state.session.additionTemplateResponseTimes.length,
      baselineScope: 'main Grade 1 Addition template questions only',
      twinAffectsMastery: false
    },
    null,
    2
  )
);
