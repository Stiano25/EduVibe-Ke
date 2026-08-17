/**
 * Numeric free-entry on the Grade 1 addition template engine.
 * Expected value uses answerFormula against params — same scalar channel as drag.
 */
import {
  compileFormula,
  enumerateAdditionPairs,
  normalizeAdditionConstraints,
  normalizeAdditionTemplateQuestion,
  validateAdditionTemplate
} from './additionTemplate.js';
import { expectedScalarForQuestion } from './expectedScalar.js';
import { inferObjectKind } from './objectKinds.js';

const asInt = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) ? n : fallback;
};

export const isNumericEntryQuestion = (question = {}) =>
  question?.interactionType === 'numeric_entry' ||
  question?.type === 'numeric-entry' ||
  question?.activity === 'numeric_entry';

export const makeNumericEntryQuestion = ({
  a = 4,
  b = 6,
  questionText = 'What is {a} + {b}?',
  skillFocus = 'Addition',
  bloomLevel = 'apply',
  learningOutcomeIndex = 1,
  objectKind = null
} = {}) => {
  const pair = { a: asInt(a, 4), b: asInt(b, 6) };
  const text = String(questionText)
    .replaceAll('{a}', String(pair.a))
    .replaceAll('{b}', String(pair.b));
  const kind = objectKind || inferObjectKind(questionText);
  return {
    id: `numeric-${pair.a}-${pair.b}`,
    question: text,
    questionText,
    type: 'numeric-entry',
    interactionType: 'numeric_entry',
    activity: 'numeric_entry',
    template: true,
    templateVersion: 1,
    options: [],
    correctAnswerIndex: 0,
    params: {
      a: pair.a,
      b: pair.b,
      ...(kind ? { objectKind: kind } : {})
    },
    constraints: normalizeAdditionConstraints({ a: [1, 9], b: [1, 9], sumMax: 10 }),
    answerFormula: 'a + b',
    skillFocus,
    bloomLevel,
    modality: kind ? 'visual' : 'practice',
    difficulty: 'easy',
    learningOutcomeIndex,
    explanation: 'Add the two numbers.'
  };
};

export const expectedNumericForQuestion = (question = {}) => expectedScalarForQuestion(question);

export const twistNumericEntryQuestion = (question = {}, { random = Math.random } = {}) => {
  const base = isNumericEntryQuestion(question)
    ? question
    : makeNumericEntryQuestion(question.params || {});
  const asTemplate = {
    ...base,
    template: true,
    interactionType: 'numeric_entry',
    questionText: base.questionText || 'What is {a} + {b}?',
    constraints: normalizeAdditionConstraints(base.constraints),
    answerFormula: String(base.answerFormula || 'a + b'),
    distractorFormulas: []
  };
  const normalized = normalizeAdditionTemplateQuestion(asTemplate);
  const source = normalized.valid ? normalized.question : asTemplate;
  const validation = validateAdditionTemplate(source, { requireDistractors: false });
  const original = source.params || {};
  const pairs = validation.valid
    ? validation.pairs
    : enumerateAdditionPairs(source.constraints);
  const candidates = pairs.filter(
    (pair) => pair.a !== Number(original.a) || pair.b !== Number(original.b)
  );
  if (!candidates.length) return { ok: false, reason: 'no alternative pair' };
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  const pair = candidates[index];
  return {
    ok: true,
    question: {
      ...makeNumericEntryQuestion({
        ...base,
        a: pair.a,
        b: pair.b,
        questionText: base.questionText || source.questionText,
        skillFocus: base.skillFocus,
        bloomLevel: base.bloomLevel,
        learningOutcomeIndex: base.learningOutcomeIndex,
        objectKind: base.params?.objectKind
      }),
      id: base.id,
      learningOutcomeKey: base.learningOutcomeKey,
      answerFormula: String(base.answerFormula || 'a + b')
    }
  };
};

export { compileFormula };
