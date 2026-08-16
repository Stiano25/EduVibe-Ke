/**
 * Part 7: count-into-box grading + live interactionType, no LLM.
 * Timer contract: AdaptiveQuizPanel / DragToTargetLive use useVisibleResponseTimer
 * on the activity root (same as MCQ).
 *
 * Usage (from backend/):
 *   node scripts/verify-count-into-box.js
 */
import {
  createAdaptiveSession,
  advanceAdaptiveSession
} from '../learner/services/adaptiveQuizService.js';
import {
  expectedCountForQuestion,
  makeCountIntoBoxQuestion,
  objectPoolForTarget,
  twistCountIntoBoxQuestion
} from '../utils/countIntoBox.js';
import { resolveInteractionType } from '../utils/interactionTypes.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

// Live diagram types are defined in the frontend module; duplicate the list here
// so this script does not need a TS loader.
const LIVE = ['counting_circles', 'labeled_boxes', 'number_line', 'fraction_bars'];
assert(LIVE.length === 4, 'four live diagram types');

const q = makeCountIntoBoxQuestion({ a: 2, b: 3 });
assert(q.interactionType === 'drag_to_target', 'interactionType');
assert(q.activity === 'count_into_box', 'activity');
assert(q.params.target === 5, 'target = a+b');
assert(q.params.objectPool === objectPoolForTarget(5), 'pool larger than target');
assert(expectedCountForQuestion(q) === 5, 'expected from formula');
assert(q.params.objectPool > q.params.target, 'extra beads in the pool');
assert(resolveInteractionType(q.interactionType) === 'drag_to_target', 'resolve');

const twisted = twistCountIntoBoxQuestion(q, { random: () => 0.9 });
assert(twisted.ok, 'twist ok');
assert(twisted.question.interactionType === 'drag_to_target', 'twist keeps drag');
assert(
  twisted.question.params.a !== 2 || twisted.question.params.b !== 3,
  'twist changes pair'
);
assert(
  expectedCountForQuestion(twisted.question) ===
    twisted.question.params.a + twisted.question.params.b,
  'twisted expected matches a+b'
);

const lesson = {
  id: 'count-box-verify',
  grade: '1',
  title: 'Count into box',
  quiz: {
    passingScore: 60,
    questions: [{ ...q, id: 'q-1', learningOutcomeKey: 'add-count' }]
  },
  learningObjectives: ['Add two numbers']
};

let state = createAdaptiveSession({ lesson });
assert(state.question.interactionType === 'drag_to_target', 'live payload is drag');
assert(state.question.objectPool === q.params.objectPool, 'objectPool sent');
assert(state.question.target == null, 'target is not sent live');

const wrong = advanceAdaptiveSession({
  session: state.session,
  lesson,
  placedCount: 1,
  selectedOptionIndex: 1,
  responseTimeMs: 1800
});
assert(wrong.lastAnswer.correct === false, 'wrong count fails');
assert(wrong.lastAnswer.placedCount === 1, 'placed recorded');
assert(wrong.lastAnswer.expectedCount === 5, 'expected recorded after submit');

state = createAdaptiveSession({ lesson });
const right = advanceAdaptiveSession({
  session: state.session,
  lesson,
  placedCount: 5,
  selectedOptionIndex: 5,
  responseTimeMs: 2200
});
assert(right.lastAnswer.correct === true, 'matching count passes');
assert(right.lastAnswer.placedCount === 5, 'placed 5');

console.log('verify-count-into-box: ok');
console.log(
  `  stem="${q.question}" target=${q.params.target} pool=${q.params.objectPool} words=${q.question.trim().split(/\s+/).length}`
);
