import {
  enumerateAdditionPairs,
  normalizeAdditionTemplateQuestion,
  twistAdditionQuestion,
  validateAdditionTemplate
} from '../utils/additionTemplate.js';
import { expectedScalarForQuestion } from '../utils/expectedScalar.js';
import { normalizeQuiz } from '../admin/services/lessonGenerationService.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const template = {
  id: 'addition-template-test',
  template: true,
  questionText: 'Amina has {a} counters and gets {b} more. How many counters now?',
  params: { a: 4, b: 5 },
  constraints: {
    a: [1, 9],
    b: [1, 9],
    sumMax: 10,
    operation: 'addition'
  },
  answerFormula: 'a + b',
  distractorFormulas: [
    { id: 'low', formula: 'a + b - 1', misconception: 'counted one too few' },
    { id: 'high', formula: 'a + b + 1', misconception: 'counted one too many' },
    { id: 'extra', formula: 'a + b + 2', misconception: 'recounted two objects' }
  ],
  learningOutcomeIndex: 3,
  learningOutcomeKey: 'addition-sum-10',
  skillFocus: 'add two single digit numbers up to 10',
  bloomLevel: 'apply',
  modality: 'practice',
  difficulty: 'easy'
};

const validation = validateAdditionTemplate(template);
assert(validation.valid, `template must validate: ${validation.reason || ''}`);
assert(enumerateAdditionPairs(template.constraints).length > 2, 'template needs varied pairs');

const stored = normalizeQuiz(
  { questions: [template] },
  ['add 2-single digit numbers up to a sum of 10'],
  {},
  { additionTemplates: true }
).questions[0];
for (const field of [
  'questionText',
  'template',
  'params',
  'constraints',
  'answerFormula',
  'distractorFormulas'
]) {
  assert(stored[field] !== undefined, `normalizeQuiz dropped template field ${field}`);
}
assert(stored.interactionType === 'numeric_entry', 'Grade 1 addition templates normalize to numeric_entry');
assert(stored.options.length === 0, 'numeric_entry has no option list');
assert(expectedScalarForQuestion(stored) === 9, 'normalized template answer is wrong');

const seen = new Set();
for (let i = 0; i < 500; i += 1) {
  const result = twistAdditionQuestion(template);
  assert(result.ok, `twist ${i + 1} failed: ${result.reason || ''}`);
  const q = result.question;
  assert(q.params.a !== template.params.a || q.params.b !== template.params.b, 'twist reused original pair');
  assert(q.params.a + q.params.b <= 10, 'twist exceeded curriculum sumMax');
  assert(Number(q.options[q.correctAnswerIndex]) === q.params.a + q.params.b, 'incorrect answer formula');
  assert(q.options.every((option) => Number(option) >= 0), 'negative distractor');
  assert(new Set(q.options).size === q.options.length, 'duplicate distractor');
  assert(q.question.includes(String(q.params.a)) && q.question.includes(String(q.params.b)), 'stem not rendered');
  seen.add(`${q.params.a},${q.params.b}`);
}

const repaired = normalizeAdditionTemplateQuestion({
  ...template,
  distractorFormulas: [
    { id: 'same', formula: 'a + b', misconception: 'duplicate' },
    { id: 'negative', formula: 'a - b', misconception: 'negative sometimes' },
    { id: 'collision', formula: 'a * b', misconception: 'collision sometimes' }
  ]
});
assert(repaired.valid && repaired.repairedDistractors, 'invalid AI distractors must be repaired');

const parameterized = normalizeAdditionTemplateQuestion({
  ...template,
  question: 'What is $61 + 7$?',
  questionText: 'What is $61 + 7$?',
  params: { a: 61, b: 7 },
  constraints: { a: [10, 99], b: [1, 9], sumMax: 100, operation: 'addition' }
});
assert(parameterized.valid, 'rendered AI questionText should be parameterized from params');
assert(
  parameterized.question.questionText === 'What is ${a} + {b}$?',
  'rendered values were not replaced with placeholders'
);

console.log('verify-addition-twist: OK', {
  iterations: 500,
  uniqueTwistedPairs: seen.size,
  fullDomainPairs: validation.pairs.length,
  invalidAiDistractorsRepaired: repaired.repairedDistractors,
  renderedQuestionParameterized: parameterized.question.questionText
});
