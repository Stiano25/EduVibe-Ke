/**
 * Magnitude-sensitive visuals: generation-time caps, place_value fallback,
 * vertical-instruction QA, number-line start/end.
 *
 * Usage (from backend/): node scripts/verify-magnitude-visuals.js
 */
import { normalizeQuiz } from '../admin/services/lessonGenerationService.js';
import { inferDiagramType } from '../admin/services/diagramService.js';
import { renderNumberLine, renderPlaceValue } from '../admin/services/diagramTemplates.js';
import { isObjectQuantityContent } from '../utils/representationalContent.js';
import { isVerticalArithmeticInstruction } from '../utils/additionLayout.js';
import { clearVerticalInstructionNoQuestionFlags } from '../utils/quizQualityGates.js';
import {
  OBJECT_QUANTITY_CEILING,
  COUNTING_CIRCLES_CEILING,
  NUMBER_LINE_MAX_TICKS,
  applyMagnitudeCaps,
  fitNumberLineStep,
  numberLineTickCount,
  objectQuantityExceedsCeiling,
  prefersConcreteDiagrams,
  resolveNumberLineRange,
  sanitizePlaceValueParams
} from '../utils/magnitudeVisuals.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const mathProfile = {
  modalityCycle: ['visual', 'practice'],
  allowedDiagramTypes: [
    'number_line',
    'object_quantity',
    'counting_circles',
    'place_value',
    'labeled_boxes'
  ],
  fallbackDiagramType: 'place_value'
};

const mangoStem = 'A shop had 325 mangoes. It sold 118 mangoes. How many mangoes are left?';

const mangoNormalized = normalizeQuiz(
  {
    questions: [
      {
        question: mangoStem,
        interactionType: 'multiple_choice',
        options: ['207', '443', '118', '325'],
        correctAnswerIndex: 0,
        modality: 'visual',
        learningOutcomeIndex: 1,
        diagram: {
          diagramType: 'object_quantity',
          params: { objectKind: 'mango', groups: [325, 118], count: 5 },
          brief: 'Two groups of mangoes'
        }
      }
    ]
  },
  ['Subtract 3-digit numbers'],
  mathProfile,
  { gradeNumber: 3 }
);
const mangoQ = mangoNormalized.questions[0];
assert(mangoQ.diagram?.diagramType === 'place_value', '325 mangoes reroute to place_value at normalize time');
assert(
  !objectQuantityExceedsCeiling(mangoQ.diagram?.params || {}),
  'stored mango visual is not over-ceiling object_quantity'
);
assert(Number(mangoQ.diagram?.params?.number) === 325, 'place_value stores 325, not a clamped 20');
assert(
  !isObjectQuantityContent(mangoStem),
  'isObjectQuantityContent refuses 325 mangoes'
);

const smallMango = normalizeQuiz(
  {
    questions: [
      {
        question: 'A shop had 5 mangoes. It sold 2. How many are left?',
        interactionType: 'multiple_choice',
        options: ['3', '7', '2', '5'],
        correctAnswerIndex: 0,
        modality: 'visual',
        learningOutcomeIndex: 1
      }
    ]
  },
  ['Subtract small amounts'],
  mathProfile,
  { gradeNumber: 3 }
);
assert(
  smallMango.questions[0].diagram?.diagramType === 'object_quantity',
  '5 mangoes still uses object_quantity'
);
assert(
  !objectQuantityExceedsCeiling(smallMango.questions[0].diagram?.params || {}),
  'small mango groups stay ≤ 20'
);

const circles = applyMagnitudeCaps({
  diagramType: 'counting_circles',
  params: { count: 80 },
  text: 'Show 80 counters',
  preferPlaceValue: true
});
assert(circles.diagramType !== 'counting_circles', '80 circles are not stored as counting_circles');
assert(
  circles.diagramType === 'place_value' && Number(circles.params.number) === 80,
  '80 circles fall back to place_value 80'
);

const tinyCircles = applyMagnitudeCaps({
  diagramType: 'counting_circles',
  params: { count: 12 },
  text: 'Show 12 counters'
});
assert(tinyCircles.diagramType === 'counting_circles', '12 circles stay counting_circles');
assert(tinyCircles.params.count === 12, '12 is stored as 12, not clamped');

const ropeFit = fitNumberLineStep({ min: 0, max: 251, step: 1 });
assert(ropeFit.ok === true, '0–251 can keep a number_line by raising step');
assert(ropeFit.step >= 50, '0–251 uses skip-count 50 or 100, not unit ticks');
assert(ropeFit.ticks <= NUMBER_LINE_MAX_TICKS, 'fitted rope line stays at ≤20 ticks');

const ropeStored = applyMagnitudeCaps({
  diagramType: 'number_line',
  params: { min: 0, max: 251, step: 1, start: 0, end: 250, highlight: 250 },
  text: 'A rope is 250 cm long. A child cuts off 135 cm.'
});
assert(ropeStored.diagramType === 'number_line', 'rope keeps number_line after step fit');
assert(numberLineTickCount(ropeStored.params.min, ropeStored.params.max, ropeStored.params.step) <= 20, 'stored rope ticks ≤ 20');
assert(ropeStored.params.step > 1, 'stored rope is not step=1 unit ticks');

const impossibleLine = applyMagnitudeCaps({
  diagramType: 'number_line',
  params: { min: 0, max: 5000, step: 1 },
  text: 'Jump from 0 to 5000',
  preferPlaceValue: true
});
assert(impossibleLine.diagramType !== 'number_line', 'a 5000-unit span is not stored as a number_line');

const columnMango = normalizeQuiz(
  {
    questions: [
      {
        question: 'Subtract.',
        interactionType: 'numeric_entry',
        params: { a: 325, b: 118, layout: 'vertical', operation: 'subtract' },
        answerFormula: 'a - b',
        options: [],
        modality: 'visual',
        learningOutcomeIndex: 1,
        diagram: {
          diagramType: 'object_quantity',
          params: { groups: [325, 118], objectKind: 'mango' }
        }
      }
    ]
  },
  ['Subtract 3-digit numbers'],
  mathProfile,
  { gradeNumber: 3, defaultNumericLayout: 'vertical' }
);
assert(
  !columnMango.questions[0].diagram || columnMango.questions[0].diagram.diagramType !== 'object_quantity',
  'vertical column item does not keep 325 mango icons'
);

assert(prefersConcreteDiagrams(3) === true, 'Grade 3 still prefers concrete when quantities unknown');
assert(prefersConcreteDiagrams(3, [5, 8]) === true, 'Grade 3 still prefers objects at 5 and 8');
assert(prefersConcreteDiagrams(3, [325, 118]) === false, 'Grade 3 defers once quantities exceed 20');
assert(prefersConcreteDiagrams(7, [5]) === false, 'Grade 7 is not in the concrete-count band');

assert(
  inferDiagramType('A shop had 325 mangoes', 'subtract', { youngGrade: true }) === 'place_value',
  'inferDiagramType sends 325 mangoes to place_value, not object_quantity'
);
assert(
  inferDiagramType('five bananas altogether', 'count', { youngGrade: true }) === 'object_quantity',
  'small named-object counts still infer object_quantity'
);

const rangeBug = resolveNumberLineRange({
  start: 342,
  end: 367,
  min: 0,
  max: 10,
  step: 1,
  highlight: 5
});
assert(rangeBug.min === 342 && rangeBug.max === 367, 'renderer range prefers authored start/end over default 0–10');

const g3AddLine = applyMagnitudeCaps({
  diagramType: 'number_line',
  params: { start: 342, end: 367, min: 0, max: 10, step: 1, highlight: 5 },
  text: 'A number line starting at 342 and ending at 367',
  preferPlaceValue: true
});
assert(g3AddLine.diagramType === 'number_line', '342→367 stays a number_line after step fit');
assert(g3AddLine.params.min === 342 && g3AddLine.params.max === 367, 'stored range is 342–367, not 0–10');
assert(g3AddLine.params.step >= 5, '342–367 uses skip-count so ticks stay ≤20');

const svg = renderNumberLine({
  start: 342,
  end: 367,
  min: 0,
  max: 10,
  step: 5,
  highlight: 342
});
assert(svg.includes('342') && svg.includes('367'), 'SVG number line draws 342 and 367, not a 0–10 shell');
assert(!/>10</.test(svg) || svg.includes('342'), 'SVG is the authored span');

const dirty = sanitizePlaceValueParams(
  { ones: 7, tens: 5, label: '57', number: 245, headers: ['H', 'T', 'O'] },
  'Place value chart showing 57 as 5 tens and 7 ones'
);
assert(dirty.number === 57, 'stale place_value default 245 is replaced by 57 from tens/ones');

const dirty333 = sanitizePlaceValueParams(
  { ones: 3, tens: 3, hundreds: 3, number: 245, headers: ['H', 'T', 'O'] },
  'difference 333'
);
assert(dirty333.number === 333, 'stale 245 is replaced by 333 from hundreds/tens/ones');

const pvSvg = renderPlaceValue({ number: 325, headers: ['H', 'T', 'O'], label: '325' });
assert(pvSvg.includes('>3<') && pvSvg.includes('>2<') && pvSvg.includes('>5<'), 'place_value SVG shows 325 digits');

const vertical = {
  question: 'Subtract.',
  interactionType: 'numeric_entry',
  params: { a: 738, b: 415, layout: 'vertical', operation: 'subtract' }
};
assert(isVerticalArithmeticInstruction(vertical), '738−415 Subtract. is a vertical instruction');
const flagged = {
  ...vertical,
  qa_flagged: true,
  qa_issue: 'does not ask a question'
};
clearVerticalInstructionNoQuestionFlags([flagged]);
assert(flagged.qa_flagged === false, 'QA clears false-positive no-question on Subtract.');
assert(!flagged.qa_issue, 'cleared column item has no leftover QA issue');

const stillBroken = {
  question: 'A girl has 61 shillings, finds 7 more.',
  interactionType: 'multiple_choice',
  options: ['68', '54'],
  correctAnswerIndex: 0,
  qa_flagged: true,
  qa_issue: 'does not ask a question'
};
clearVerticalInstructionNoQuestionFlags([stillBroken]);
assert(stillBroken.qa_flagged === true, 'bare-statement MCQ keeps the no-question flag');

const columnKeepsOtherFlags = {
  ...vertical,
  qa_flagged: true,
  qa_issue: 'does not ask a question; factual error in the difference'
};
clearVerticalInstructionNoQuestionFlags([columnKeepsOtherFlags]);
assert(columnKeepsOtherFlags.qa_flagged === true, 'column item keeps unrelated QA flags');
assert(
  /factual error/i.test(columnKeepsOtherFlags.qa_issue),
  'only the no-question fragment is stripped'
);

const alreadyClampedMango = applyMagnitudeCaps({
  diagramType: 'object_quantity',
  params: { objectKind: 'mango', groups: [20, 20], count: 5 },
  text: 'A shopkeeper has 250 mangoes. He sells 135 mangoes. How many mangoes are left?',
  preferPlaceValue: true
});
assert(
  alreadyClampedMango.diagramType === 'place_value',
  'previously clamped 20+20 mango icons still reroute when the stem is 250−135'
);
assert(Number(alreadyClampedMango.params.number) === 250, 'fallback uses the real stem number 250');
assert(COUNTING_CIRCLES_CEILING === 40, 'counting_circles generation ceiling is 40');

const nineGroupsOfTen = applyMagnitudeCaps({
  diagramType: 'object_quantity',
  params: { objectKind: 'bead', groups: [10, 10, 10, 10, 10, 10, 10, 10, 10] },
  text: '9 groups of 10 beads',
  preferPlaceValue: true
});
assert(
  nineGroupsOfTen.diagramType !== 'object_quantity',
  '9×10 array of 90 icons reroutes even though each group is 10'
);
assert(
  objectQuantityExceedsCeiling({ groups: [10, 10, 10, 10, 10, 10, 10, 10, 10] }),
  'sum of groups[] counts toward the object_quantity ceiling'
);
assert(
  !objectQuantityExceedsCeiling({ groups: [4, 4, 4] }),
  '3 groups of 4 (12 icons) stays under the ceiling'
);

console.log('verify-magnitude-visuals: OK', {
  mangoReroute: mangoQ.diagram?.diagramType,
  mangoNumber: mangoQ.diagram?.params?.number,
  smallMango: smallMango.questions[0].diagram?.diagramType,
  ropeStep: ropeStored.params.step,
  ropeTicks: numberLineTickCount(ropeStored.params.min, ropeStored.params.max, ropeStored.params.step),
  g3AddRange: `${g3AddLine.params.min}–${g3AddLine.params.max} step ${g3AddLine.params.step}`,
  placeValue57: dirty.number,
  placeValue333: dirty333.number
});
