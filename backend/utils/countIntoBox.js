/**
 * Count-into-box (drag-to-target) on the Grade 1 addition template engine.
 * Target and objectPool are parametrized; expected count uses answerFormula.
 */
import {
  enumerateAdditionPairs,
  normalizeAdditionConstraints,
  normalizeAdditionTemplateQuestion,
  validateAdditionTemplate
} from './additionTemplate.js';
import { expectedScalarForQuestion } from './expectedScalar.js';
import { inferObjectKind, DEFAULT_OBJECT_KIND } from './objectKinds.js';

const asInt = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) ? n : fallback;
};

export const isCountIntoBoxQuestion = (question = {}) =>
  question?.activity === 'count_into_box' ||
  question?.interactionType === 'drag_to_target';

export const objectPoolForTarget = (target) => {
  const t = Math.max(1, asInt(target, 1));
  return Math.min(20, Math.max(t + 3, 6));
};

export const expectedCountForQuestion = (question = {}) => expectedScalarForQuestion(question);

export const makeCountIntoBoxQuestion = ({
  a = 2,
  b = 3,
  questionText = 'How many is {a} plus {b}?',
  skillFocus = 'Addition',
  bloomLevel = 'apply',
  learningOutcomeIndex = 1
} = {}) => {
  const pair = { a: asInt(a, 2), b: asInt(b, 3) };
  const target = pair.a + pair.b;
  const objectPool = objectPoolForTarget(target);
  const text = String(questionText)
    .replaceAll('{a}', String(pair.a))
    .replaceAll('{b}', String(pair.b))
    .replaceAll('{target}', String(target));
  const objectKind =
    inferObjectKind(`${questionText} ${text}`) || DEFAULT_OBJECT_KIND;
  return {
    id: `count-box-${pair.a}-${pair.b}`,
    question: text,
    questionText,
    type: 'drag-to-target',
    interactionType: 'drag_to_target',
    activity: 'count_into_box',
    template: true,
    templateVersion: 1,
    options: [],
    correctAnswerIndex: 0,
    params: { a: pair.a, b: pair.b, target, objectPool, objectKind },
    constraints: normalizeAdditionConstraints({ a: [1, 9], b: [1, 9], sumMax: 10 }),
    answerFormula: 'a + b',
    skillFocus,
    bloomLevel,
    modality: 'visual',
    difficulty: 'easy',
    learningOutcomeIndex,
    explanation: 'Count the beads in the box.'
  };
};

export const twistCountIntoBoxQuestion = (question = {}, { random = Math.random } = {}) => {
  const base = isCountIntoBoxQuestion(question)
    ? question
    : makeCountIntoBoxQuestion(question.params || {});
  const asTemplate = {
    ...base,
    template: true,
    questionText: base.questionText || 'How many is {a} plus {b}?',
    constraints: normalizeAdditionConstraints(base.constraints),
    answerFormula: String(base.answerFormula || 'a + b'),
    distractorFormulas: [
      { id: 'a', formula: 'a', misconception: 'first number only' },
      { id: 'b', formula: 'b', misconception: 'second number only' },
      { id: 'off', formula: 'a + b + 1', misconception: 'counted one extra' }
    ]
  };
  const normalized = normalizeAdditionTemplateQuestion(asTemplate);
  const source = normalized.valid ? normalized.question : asTemplate;
  const validation = validateAdditionTemplate(source);
  if (!validation.valid) {
    const pairs = enumerateAdditionPairs(source.constraints);
    const original = source.params || {};
    const next = pairs.find((p) => p.a !== Number(original.a) || p.b !== Number(original.b));
    if (!next) return { ok: false, reason: 'no alternative pair' };
    return { ok: true, question: makeCountIntoBoxQuestion({ ...base, ...next }) };
  }
  const original = source.params || {};
  const candidates = validation.pairs.filter(
    (pair) => pair.a !== Number(original.a) || pair.b !== Number(original.b)
  );
  if (!candidates.length) return { ok: false, reason: 'no alternative pair' };
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  const pair = candidates[index];
  return {
    ok: true,
    question: {
      ...makeCountIntoBoxQuestion({
        ...base,
        a: pair.a,
        b: pair.b,
        questionText: base.questionText || source.questionText,
        skillFocus: base.skillFocus,
        bloomLevel: base.bloomLevel,
        learningOutcomeIndex: base.learningOutcomeIndex
      }),
      id: base.id,
      learningOutcomeKey: base.learningOutcomeKey
    }
  };
};
