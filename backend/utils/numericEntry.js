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
  VERTICAL_SUBTRACTION_INSTRUCTION,
  renderHorizontalAdditionStem,
  resolveAdditionLayout,
  resolveColumnOperation,
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
  layout = DEFAULT_ADDITION_LAYOUT,
  constraints: rawConstraints = null,
  difficulty = 'easy',
  answerFormula: rawFormula = null,
  operation: rawOperation = 'add'
} = {}) => {
  const pair = { a: asInt(a, 4), b: asInt(b, 6) };
  const operation = resolveColumnOperation(rawOperation);
  const subtract = operation === 'subtract';
  if (subtract && pair.a < pair.b) {
    throw new Error(`Grade 1 subtraction requires a >= b (got ${pair.a} - ${pair.b})`);
  }
  const resolvedLayout = resolveAdditionLayout(layout);
  const verticalInstruction = subtract
    ? VERTICAL_SUBTRACTION_INSTRUCTION
    : VERTICAL_ADDITION_INSTRUCTION;
  const text =
    resolvedLayout === 'vertical'
      ? verticalInstruction
      : renderHorizontalAdditionStem(pair.a, pair.b, questionText || HORIZONTAL_ADDITION_PATTERN);
  const kind = objectKind || inferObjectKind(questionText);
  return {
    id: `numeric-${pair.a}-${pair.b}`,
    question: text,
    questionText:
      resolvedLayout === 'vertical'
        ? verticalInstruction
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
      scaffoldCarry: subtract
        ? false
        : resolveScaffoldCarry(null, { layout: resolvedLayout }),
      ...(subtract ? { operation: 'subtract' } : {}),
      ...(kind ? { objectKind: kind } : {})
    },
    constraints: normalizeAdditionConstraints(
      rawConstraints ||
        (subtract
          ? { a: [2, 9], b: [1, 8], operation: 'subtraction', positiveDiff: true }
          : { a: [1, 9], b: [1, 9], sumMax: 10 })
    ),
    answerFormula: rawFormula || (subtract ? 'a - b' : 'a + b'),
    skillFocus,
    bloomLevel,
    modality: kind ? 'visual' : 'practice',
    difficulty,
    learningOutcomeIndex,
    explanation: subtract ? 'Subtract the two numbers.' : 'Add the two numbers.'
  };
};

export const expectedNumericForQuestion = (question = {}) => expectedScalarForQuestion(question);

export const isTargetOnlyNumericQuestion = (question = {}) => {
  const formula = String(question.answerFormula || '').trim();
  const hasAddends =
    Number.isInteger(Number(question.params?.a)) &&
    Number.isInteger(Number(question.params?.b));
  return (
    isNumericEntryQuestion(question) &&
    (formula === 'target' || (!hasAddends && Number.isInteger(Number(question.params?.target))))
  );
};

export const makeHowManyNumericQuestion = ({
  target = 20,
  questionText = 'How many?',
  skillFocus = 'Number Concept',
  bloomLevel = 'apply',
  learningOutcomeIndex = 1,
  constraints: rawConstraints = null,
  difficulty = 'advanced'
} = {}) => {
  const t = Math.max(1, asInt(target, 20));
  const range = Array.isArray(rawConstraints?.target) ? rawConstraints.target : [18, 30];
  return {
    id: `how-many-${t}`,
    question: String(questionText || 'How many?').replaceAll('{target}', String(t)),
    questionText: questionText || 'How many?',
    type: 'numeric-entry',
    interactionType: 'numeric_entry',
    activity: 'numeric_entry',
    template: true,
    templateVersion: 1,
    options: [],
    correctAnswerIndex: 0,
    params: { target: t },
    constraints: { target: [asInt(range[0], 18), asInt(range[1], 30)] },
    answerFormula: 'target',
    skillFocus,
    bloomLevel,
    modality: 'practice',
    difficulty,
    learningOutcomeIndex,
    explanation: 'Write how many there are.'
  };
};

export const twistNumericEntryQuestion = (question = {}, { random = Math.random } = {}) => {
  const base = isNumericEntryQuestion(question)
    ? question
    : makeNumericEntryQuestion(question.params || {});

  if (isTargetOnlyNumericQuestion(base)) {
    const original = Number(base.params?.target);
    const range = Array.isArray(base.constraints?.target) ? base.constraints.target : [18, 30];
    const min = Math.max(1, asInt(range[0], 18));
    const max = Math.max(min, asInt(range[1], 30));
    const candidates = [];
    for (let t = min; t <= max; t += 1) {
      if (t !== original) candidates.push(t);
    }
    if (!candidates.length) return { ok: false, reason: 'no alternative target' };
    const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
    return {
      ok: true,
      question: {
        ...makeHowManyNumericQuestion({
          target: candidates[index],
          questionText: base.questionText || 'How many?',
          skillFocus: base.skillFocus,
          bloomLevel: base.bloomLevel,
          learningOutcomeIndex: base.learningOutcomeIndex,
          constraints: base.constraints,
          difficulty: base.difficulty
        }),
        id: base.id,
        templateId: base.templateId,
        learningOutcomeKey: base.learningOutcomeKey
      }
    };
  }

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
        templateId: base.templateId,
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
      templateId: base.templateId,
      learningOutcomeKey: base.learningOutcomeKey,
      answerFormula: String(base.answerFormula || 'a + b')
    }
  };
};

export { compileFormula };
