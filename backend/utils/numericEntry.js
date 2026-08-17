/**
 * Numeric free-entry on the Grade 1 addition template engine.
 * Expected value uses answerFormula against params — same scalar channel as drag.
 * Layout is presentation only: vertical (default) vs horizontal (twin probe).
 */
import {
  compileFormula,
  enumerateAdditionPairs,
  normalizeAdditionConstraints,
  normalizeAdditionTemplateQuestion,
  validateAdditionTemplate
} from './additionTemplate.js';
import {
  DEFAULT_ADDITION_LAYOUT,
  HORIZONTAL_ADDITION_PATTERN,
  VERTICAL_ADDITION_INSTRUCTION,
  renderHorizontalAdditionStem,
  resolveAdditionLayout,
  resolveScaffoldCarry
} from './additionLayout.js';
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
  questionText = HORIZONTAL_ADDITION_PATTERN,
  skillFocus = 'Addition',
  bloomLevel = 'apply',
  learningOutcomeIndex = 1,
  objectKind = null,
  layout = DEFAULT_ADDITION_LAYOUT
} = {}) => {
  const pair = { a: asInt(a, 4), b: asInt(b, 6) };
  const resolvedLayout = resolveAdditionLayout(layout);
  const text =
    resolvedLayout === 'vertical'
      ? VERTICAL_ADDITION_INSTRUCTION
      : renderHorizontalAdditionStem(pair.a, pair.b, questionText || HORIZONTAL_ADDITION_PATTERN);
  const kind = objectKind || inferObjectKind(questionText);
  return {
    id: `numeric-${pair.a}-${pair.b}`,
    question: text,
    questionText:
      resolvedLayout === 'vertical'
        ? VERTICAL_ADDITION_INSTRUCTION
        : questionText || HORIZONTAL_ADDITION_PATTERN,
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
      layout: resolvedLayout,
      scaffoldCarry: resolveScaffoldCarry(null, { layout: resolvedLayout }),
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
  const original = base.params || {};
  const layout = resolveAdditionLayout(original.layout);
  const shared = {
    skillFocus: base.skillFocus,
    bloomLevel: base.bloomLevel,
    learningOutcomeIndex: base.learningOutcomeIndex,
    objectKind: original.objectKind
  };

  // Vertical original → same {a,b} shown horizontally (format transfer, not a new sum).
  if (layout === 'vertical' && Number.isInteger(Number(original.a)) && Number.isInteger(Number(original.b))) {
    return {
      ok: true,
      question: {
        ...makeNumericEntryQuestion({
          ...shared,
          a: Number(original.a),
          b: Number(original.b),
          layout: 'horizontal',
          questionText: HORIZONTAL_ADDITION_PATTERN
        }),
        id: base.id,
        learningOutcomeKey: base.learningOutcomeKey,
        answerFormula: String(base.answerFormula || 'a + b'),
        constraints: normalizeAdditionConstraints(base.constraints)
      }
    };
  }

  const asTemplate = {
    ...base,
    template: true,
    interactionType: 'numeric_entry',
    questionText: base.questionText || HORIZONTAL_ADDITION_PATTERN,
    constraints: normalizeAdditionConstraints(base.constraints),
    answerFormula: String(base.answerFormula || 'a + b'),
    distractorFormulas: []
  };
  const normalized = normalizeAdditionTemplateQuestion(asTemplate);
  const source = normalized.valid ? normalized.question : asTemplate;
  const validation = validateAdditionTemplate(source, { requireDistractors: false });
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
        ...shared,
        a: pair.a,
        b: pair.b,
        layout: 'horizontal',
        questionText: HORIZONTAL_ADDITION_PATTERN
      }),
      id: base.id,
      learningOutcomeKey: base.learningOutcomeKey,
      answerFormula: String(base.answerFormula || 'a + b')
    }
  };
};

export { compileFormula };
