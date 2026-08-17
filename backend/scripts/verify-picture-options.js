/**
 * Picture options stay objects through shuffle; grading is still by index.
 * Usage (from backend/): node scripts/verify-picture-options.js
 */
import {
  shuffleQuestionOptions,
  createAdaptiveSession,
  advanceAdaptiveSession
} from '../learner/services/adaptiveQuizService.js';
import { coercePictureOptions, optionsHaveVisuals } from '../utils/representationalContent.js';
import { isVisualOption } from '../utils/quizOptions.js';
import { renderObjectQuantity, renderCube, renderRectangle } from '../admin/services/diagramTemplates.js';
import { inferDiagramType } from '../admin/services/diagramService.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const dots = coercePictureOptions(['●●●', '●●●●●', '●●'], 'How many balls?');
assert(dots.every(isVisualOption), 'unicode dots become picture options');
assert(dots[1].params.count === 5, 'five dots → count 5');
assert(dots[1].params.objectKind === 'ball', 'kind from stem');

const abstract = coercePictureOptions(['10', '30'], 'Which number is bigger, 10 or 30?');
assert(!optionsHaveVisuals(abstract), 'abstract compare stays text');

const q = {
  question: 'Which shows 5 balls?',
  options: [
    { diagramType: 'object_quantity', params: { objectKind: 'ball', count: 3 } },
    { diagramType: 'object_quantity', params: { objectKind: 'ball', count: 5 } },
    { diagramType: 'object_quantity', params: { objectKind: 'ball', count: 6 } }
  ],
  correctAnswerIndex: 1,
  optionExplanations: ['too few', 'five balls', 'too many']
};
const shuffled = shuffleQuestionOptions(q);
assert(shuffled.options.every(isVisualOption), 'shuffle keeps visual refs');
assert(
  shuffled.options[shuffled.correctAnswerIndex].params.count === 5,
  'correct visual still has count 5 after shuffle'
);

const lesson = {
  id: 'picture-opt-verify',
  grade: '1',
  quiz: { questions: [{ ...q, id: 'q-1', interactionType: 'multiple_choice', learningOutcomeKey: 'count' }] },
  learningObjectives: ['Count']
};
let state = createAdaptiveSession({ lesson });
const order = state.session.optionOrders[state.question.id];
const displayCorrect = order.indexOf(1);
state = advanceAdaptiveSession({
  session: state.session,
  lesson,
  selectedOptionIndex: displayCorrect,
  responseTimeMs: 1500
});
assert(state.lastAnswer.correct === true, 'index grading unchanged for picture options');

assert(
  inferDiagramType('five bananas altogether', 'count', { youngGrade: true }) === 'object_quantity',
  'named objects → object_quantity not labeled_boxes'
);
assert(
  inferDiagramType('parts of a plant', 'science', { youngGrade: true }) === 'labeled_boxes',
  'parts-of still labeled_boxes'
);

const balls = renderObjectQuantity({ objectKind: 'ball', count: 4 });
assert(balls.includes('<circle'), 'balls draw circles');
assert(!balls.includes('Total ='), 'quiz object_quantity does not print the count');

const cube = renderCube({ side: 6, unit: 'cm' });
assert(cube.includes('polygon'), 'cube is a real outline');
assert(cube.includes('6 cm'), 'dimension on the cube');

const rect = renderRectangle({ width: 8, height: 3, unit: 'cm' });
assert(rect.includes('<rect'), 'rectangle outline');
assert(rect.includes('8 cm') && rect.includes('3 cm'), 'edge labels');

console.log('verify-picture-options: OK');
