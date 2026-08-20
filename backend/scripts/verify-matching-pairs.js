/**
 * matching_pairs + odd_one_out: normalize, shuffle, grade, Practice Score.
 */
import { normalizeQuiz } from '../admin/services/lessonGenerationService.js';
import {
  createAdaptiveSession,
  advanceAdaptiveSession
} from '../learner/services/adaptiveQuizService.js';
import {
  normalizeMatchingPairs,
  shuffleRightOrder,
  gradeMatchingPairs
} from '../utils/matchingPairs.js';
import { computePracticeScore } from '../utils/practiceScore.js';
import { resolveInteractionType } from '../utils/interactionTypes.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const profile = {
  modalityCycle: ['practice'],
  allowedDiagramTypes: ['labeled_boxes'],
  fallbackDiagramType: 'labeled_boxes'
};

const matchingRaw = {
  question: 'Match each plant part to its job.',
  interactionType: 'matching_pairs',
  left: ['Roots', 'Leaves', 'Flowers'],
  right: ['Absorb water', 'Make food', 'Make seeds'],
  correctPairs: [
    [0, 0],
    [1, 1],
    [2, 2]
  ],
  options: [],
  learningOutcomeIndex: 1,
  explanation: 'Each part has one job.'
};

const oddRaw = {
  question: 'Which one is not a plant part?',
  interactionType: 'odd_one_out',
  options: ['Root', 'Stem', 'Leaf', 'Stone'],
  correctAnswerIndex: 3,
  learningOutcomeIndex: 1,
  explanation: 'A stone is not a plant part.'
};

const normalized = normalizeQuiz(
  { questions: [matchingRaw, oddRaw] },
  ['Explain the function of roots, stem, leaves and flowers'],
  profile,
  { gradeNumber: 3, defaultNumericLayout: 'horizontal' }
);

assert(normalized.questions[0].interactionType === 'matching_pairs', 'normalize keeps matching_pairs');
assert(normalized.questions[1].interactionType === 'odd_one_out', 'normalize keeps odd_one_out');
assert(normalized.questions[0].left.length === 3, 'matching left preserved');
assert(normalized.questions[0].correctPairs.length === 3, 'matching pairs preserved');
assert(normalized.questions[1].options.length === 4, 'odd_one_out keeps 4 items');

const fromParams = normalizeMatchingPairs({
  params: {
    left: ['A', 'B'],
    right: ['1', '2'],
    correctPairs: [
      [0, 1],
      [1, 0]
    ]
  }
});
assert(fromParams.ok && fromParams.left[0] === 'A', 'matching accepts params.left');

const identityShuffle = shuffleRightOrder(3, () => 0);
assert(identityShuffle[0] !== 0 || identityShuffle[1] !== 1, 'shuffle refuses a no-op order');

const allCorrect = gradeMatchingPairs({
  correctPairs: matchingRaw.correctPairs,
  submittedPairs: [
    [0, 0],
    [1, 1],
    [2, 2]
  ],
  rightOrder: [0, 1, 2]
});
assert(allCorrect.correct && allCorrect.matched === 3, 'all pairs grade correct');

const shuffledOrder = [2, 0, 1];
const displayAllCorrect = gradeMatchingPairs({
  correctPairs: matchingRaw.correctPairs,
  submittedPairs: [
    [0, 1],
    [1, 2],
    [2, 0]
  ],
  rightOrder: shuffledOrder
});
assert(displayAllCorrect.correct, 'display-space pairs map through rightOrder');

const partial = gradeMatchingPairs({
  correctPairs: matchingRaw.correctPairs,
  submittedPairs: [
    [0, 0],
    [1, 2],
    [2, 1]
  ],
  rightOrder: [0, 1, 2]
});
assert(!partial.correct && partial.matched === 1 && partial.ratio === 1 / 3, 'partial matching is 1/3');

const lesson = {
  id: 'matching-verify-lesson',
  grade: '3',
  learningObjectives: ['Explain the function of roots, stem, leaves and flowers'],
  quiz: {
    questions: normalized.questions.map((q, i) => ({ ...q, id: q.id || `q-${i + 1}` }))
  }
};

let state = createAdaptiveSession({ lesson });
assert(
  resolveInteractionType(state.question.interactionType) === 'matching_pairs' ||
    resolveInteractionType(state.question.interactionType) === 'odd_one_out',
  'session serves a new interaction type'
);

const matchingQ = lesson.quiz.questions[0];
const oddQ = lesson.quiz.questions[1];

const serveUntil = (wantId) => {
  let guard = 0;
  while (state.question?.id !== wantId && !state.meta?.done && guard < 8) {
    guard += 1;
    if (state.question?.interactionType === 'odd_one_out') {
      const order = state.session.optionOrders[state.question.id] || [];
      const display = Array.isArray(order) ? order.indexOf(Number(oddQ.correctAnswerIndex)) : oddQ.correctAnswerIndex;
      state = advanceAdaptiveSession({
        session: state.session,
        lesson,
        selectedOptionIndex: display >= 0 ? display : 0,
        responseTimeMs: 1200
      });
    } else {
      const order = state.session.matchingRightOrders[state.question.id];
      const submittedPairs = matchingQ.correctPairs.map(([left, right]) => [left, order.indexOf(right)]);
      state = advanceAdaptiveSession({
        session: state.session,
        lesson,
        submittedPairs,
        responseTimeMs: 1800
      });
    }
  }
};

if (state.question.id !== matchingQ.id && state.question.id !== oddQ.id) {
  throw new Error('session did not serve matching or odd-one-out');
}

if (state.question.id !== matchingQ.id) serveUntil(matchingQ.id);
assert(state.question.id === matchingQ.id, 'matching question is live');
assert(!state.question.correctPairs, 'live payload hides correctPairs');
assert(Array.isArray(state.question.right) && state.question.right.length === 3, 'live right is shuffled list');

const rightOrder = state.session.matchingRightOrders[matchingQ.id];
const partialDisplay = [
  [0, rightOrder.indexOf(0)],
  [1, rightOrder.indexOf(2)],
  [2, rightOrder.indexOf(1)]
];
state = advanceAdaptiveSession({
  session: state.session,
  lesson,
  submittedPairs: partialDisplay,
  responseTimeMs: 2400
});
assert(state.lastAnswer.correct === false, 'partial matching is not first-try correct');
assert(state.lastAnswer.matchedPairs === 1, 'partial matching reports 1 pair');
assert(state.lastAnswer.totalPairs === 3, 'partial matching reports 3 pairs');

if (state.question?.id === oddQ.id) {
  const order = state.session.optionOrders[oddQ.id] || [];
  const display = Array.isArray(order) ? order.indexOf(Number(oddQ.correctAnswerIndex)) : oddQ.correctAnswerIndex;
  state = advanceAdaptiveSession({
    session: state.session,
    lesson,
    selectedOptionIndex: display >= 0 ? display : 0,
    responseTimeMs: 900
  });
  assert(state.lastAnswer.correct === true, 'odd_one_out uses MCQ index grading');
}

const practice = computePracticeScore(state.session, lesson);
const matchingItem = practice.items.find((item) => item.questionId === matchingQ.id);
assert(matchingItem?.tier === 'partial', 'Practice Score tier is partial');
assert(matchingItem?.credit === 1 / 3, 'Practice Score credit is matched/total');

const retryOnly = computePracticeScore(
  {
    answered: [
      {
        questionId: matchingQ.id,
        phase: 'main',
        correct: false,
        matchedPairs: 0,
        totalPairs: 3
      },
      {
        questionId: 'retry-1',
        phase: 'retry',
        retryFor: matchingQ.id,
        correct: true
      }
    ]
  },
  lesson
);
assert(retryOnly.items[0].tier === 'retry' && retryOnly.items[0].credit === 0.5, 'all-wrong then retry is 0.5');

const partialThenRetry = computePracticeScore(
  {
    answered: [
      {
        questionId: matchingQ.id,
        phase: 'main',
        correct: false,
        matchedPairs: 2,
        totalPairs: 3
      },
      {
        questionId: 'retry-1',
        phase: 'retry',
        retryFor: matchingQ.id,
        correct: true
      }
    ]
  },
  lesson
);
assert(
  partialThenRetry.items[0].tier === 'partial' && partialThenRetry.items[0].credit === 2 / 3,
  'partial first try is kept; retry does not overwrite it'
);

console.log(
  JSON.stringify(
    {
      verification: 'matching_pairs + odd_one_out OK',
      liveHidesCorrectPairs: !state.question?.correctPairs,
      partialGrade: {
        matched: 1,
        total: 3,
        practiceCredit: matchingItem.credit,
        practiceTier: matchingItem.tier
      },
      retryPolicy: 'retry 0.5 only if first-try matched/total was 0'
    },
    null,
    2
  )
);
