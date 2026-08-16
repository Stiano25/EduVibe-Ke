/**
 * Part 2: interactionType plumbing. No new interaction is shipped — only that
 * the field exists, serializes, and unknown values fall back to multiple_choice.
 */
import {
  INTERACTION_TYPES,
  resolveInteractionType
} from '../utils/interactionTypes.js';
import {
  createAdaptiveSession,
  advanceAdaptiveSession,
  buildReviewView
} from '../learner/services/adaptiveQuizService.js';
import { normalizeQuiz } from '../admin/services/lessonGenerationService.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(
  INTERACTION_TYPES.includes('multiple_choice') && INTERACTION_TYPES.includes('drag_to_target'),
  'MCQ and drag_to_target are registered'
);
assert(resolveInteractionType(undefined) === 'multiple_choice', 'missing → multiple_choice');
assert(resolveInteractionType('multiple-choice') === 'multiple_choice', 'legacy type hyphen maps');
assert(resolveInteractionType('MULTIPLE_CHOICE') === 'multiple_choice', 'canonical value maps');
assert(resolveInteractionType('drag_to_target') === 'drag_to_target', 'drag_to_target maps');
assert(
  resolveInteractionType('not_a_real_type') === 'multiple_choice',
  'unknown types fall back to multiple_choice'
);

const profile = {
  modalityCycle: ['practice'],
  allowedDiagramTypes: ['number_line'],
  fallbackDiagramType: 'number_line'
};

const normalized = normalizeQuiz(
  {
    questions: [
      {
        question: 'What is 2 + 2?',
        options: ['3', '4', '5'],
        correctAnswerIndex: 1,
        learningOutcomeIndex: 1,
        type: 'multiple-choice'
      }
    ]
  },
  ['Add'],
  profile
);
assert(normalized.questions[0].interactionType === 'multiple_choice', 'normalize stamps interactionType');
assert(normalized.questions[0].type === 'multiple-choice', 'legacy type field unchanged');

const lesson = {
  id: 'interaction-type-lesson',
  grade: '1',
  learningObjectives: ['Add'],
  quiz: {
    questions: normalized.questions.map((q, i) => ({ ...q, id: q.id || `q-${i + 1}` }))
  }
};

let state = createAdaptiveSession({ lesson });
assert(state.question.interactionType === 'multiple_choice', 'live publicQuestion has interactionType');
assert(state.question.type === 'multiple-choice', 'live payload still carries legacy type');
const liveInteractionType = state.question.interactionType;
const liveLegacyType = state.question.type;

const order = state.session.optionOrders[state.question.id];
const correctOriginal = Number(lesson.quiz.questions[0].correctAnswerIndex);
const selectedDisplay = Array.isArray(order) ? order.indexOf(correctOriginal) : correctOriginal;

state = advanceAdaptiveSession({
  session: state.session,
  lesson,
  selectedOptionIndex: selectedDisplay >= 0 ? selectedDisplay : 0,
  responseTimeMs: 2000
});
assert(state.lastAnswer, 'lastAnswer still present for MCQ flash');
assert(state.meta.done, 'single-item bank completes');
assert(state.review, 'review payload present');

const review = buildReviewView(lesson, state.review);
assert(review.items.length === 1, 'review has the answered item');
assert(
  review.items[0].interactionType === 'multiple_choice',
  'review serializer threads interactionType'
);

console.log(
  JSON.stringify(
    {
      verification: 'interactionType architecture OK',
      registered: [...INTERACTION_TYPES],
      howToAddASecondType: [
        'Append the new string to INTERACTION_TYPES in backend/utils/interactionTypes.js and frontend/src/lib/interactionTypes.ts',
        'Add SiblingLive.tsx and SiblingReview.tsx next to MultipleChoiceLive/Review — do not edit those two files',
        'Register the siblings in LIVE_INTERACTIONS and REVIEW_INTERACTIONS in interactionRegistry.tsx'
      ],
      live: {
        interactionType: liveInteractionType,
        legacyType: liveLegacyType
      },
      review: { interactionType: review.items[0].interactionType, correct: review.items[0].correct }
    },
    null,
    2
  )
);
