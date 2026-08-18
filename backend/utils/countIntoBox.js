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

export const isTargetOnlyCountQuestion = (question = {}) => {
  const formula = String(question.answerFormula || '').trim();
  const hasAddends =
    Number.isInteger(Number(question.params?.a)) &&
    Number.isInteger(Number(question.params?.b));
  return (
    isCountIntoBoxQuestion(question) &&
    (formula === 'target' || (!hasAddends && Number.isInteger(Number(question.params?.target))))
  );
};

export const enumerateCountTargets = (raw = {}) => {
  const range = Array.isArray(raw.target) ? raw.target : [1, 5];
  const min = Math.max(1, asInt(range[0], 1));
  const max = Math.max(min, asInt(range[1], min));
  const out = [];
  for (let t = min; t <= max; t += 1) out.push({ target: t });
  return out;
};

export const makeCountIntoBoxQuestion = ({
  a = 2,
  b = 3,
  target: rawTarget = null,
  questionText = 'How many is {a} plus {b}?',
  skillFocus = 'Addition',
  bloomLevel = 'apply',
  learningOutcomeIndex = 1,
  objectKind: rawKind = null,
  constraints: rawConstraints = null,
  difficulty = 'easy',
  answerFormula: rawFormula = null
} = {}) => {
  const hasAddends = Number.isInteger(asInt(a, NaN)) && Number.isInteger(asInt(b, NaN));
  const targetOnly =
    rawFormula === 'target' ||
    (!hasAddends && rawTarget != null) ||
    (rawConstraints && Array.isArray(rawConstraints.target) && !hasAddends);

  if (targetOnly) {
    const target = Math.max(1, asInt(rawTarget, enumerateCountTargets(rawConstraints || {})[0]?.target || 3));
    const objectPool = objectPoolForTarget(target);
    const text = String(questionText || 'Show this many.')
      .replaceAll('{target}', String(target))
      .replaceAll('{a}', '')
      .replaceAll('{b}', '');
    const objectKind =
      rawKind || inferObjectKind(`${questionText} ${text}`) || DEFAULT_OBJECT_KIND;
    const targetRange = Array.isArray(rawConstraints?.target)
      ? rawConstraints.target
      : [target, target];
    return {
      id: `count-box-t${target}`,
      question: text.trim() || 'Show this many.',
      questionText: questionText || 'Show this many.',
      type: 'drag-to-target',
      interactionType: 'drag_to_target',
      activity: 'count_into_box',
      template: true,
      templateVersion: 1,
      options: [],
      correctAnswerIndex: 0,
      params: { target, objectPool, objectKind },
      constraints: { target: [asInt(targetRange[0], 1), asInt(targetRange[1], target)] },
      answerFormula: 'target',
      skillFocus,
      bloomLevel,
      modality: 'visual',
      difficulty,
      learningOutcomeIndex,
      explanation: 'Count the objects in the box.'
    };
  }

  const pair = { a: asInt(a, 2), b: asInt(b, 3) };
  const target = pair.a + pair.b;
  const objectPool = objectPoolForTarget(target);
  const text = String(questionText)
    .replaceAll('{a}', String(pair.a))
    .replaceAll('{b}', String(pair.b))
    .replaceAll('{target}', String(target));
  const objectKind =
    rawKind || inferObjectKind(`${questionText} ${text}`) || DEFAULT_OBJECT_KIND;
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
    constraints: normalizeAdditionConstraints(
      rawConstraints || { a: [1, 9], b: [1, 9], sumMax: 10 }
    ),
    answerFormula: rawFormula || 'a + b',
    skillFocus,
    bloomLevel,
    modality: 'visual',
    difficulty,
    learningOutcomeIndex,
    explanation: 'Count the beads in the box.'
  };
};

export const twistCountIntoBoxQuestion = (question = {}, { random = Math.random } = {}) => {
  const base = isCountIntoBoxQuestion(question)
    ? question
    : makeCountIntoBoxQuestion(question.params || {});

  if (isTargetOnlyCountQuestion(base)) {
    const original = Number(base.params?.target);
    const candidates = enumerateCountTargets(base.constraints || {}).filter(
      (row) => row.target !== original
    );
    if (!candidates.length) return { ok: false, reason: 'no alternative target' };
    const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
    const next = candidates[index];
    return {
      ok: true,
      question: {
        ...makeCountIntoBoxQuestion({
          target: next.target,
          questionText: base.questionText || 'Show this many.',
          skillFocus: base.skillFocus,
          bloomLevel: base.bloomLevel,
          learningOutcomeIndex: base.learningOutcomeIndex,
          objectKind: base.params?.objectKind,
          constraints: base.constraints,
          difficulty: base.difficulty,
          answerFormula: 'target'
        }),
        id: base.id,
        templateId: base.templateId,
        learningOutcomeKey: base.learningOutcomeKey
      }
    };
  }

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
        learningOutcomeIndex: base.learningOutcomeIndex,
        objectKind: base.params?.objectKind,
        constraints: base.constraints,
        difficulty: base.difficulty
      }),
      id: base.id,
      templateId: base.templateId,
      learningOutcomeKey: base.learningOutcomeKey
    }
  };
};
