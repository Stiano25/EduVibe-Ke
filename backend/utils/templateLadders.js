/**
 * Reviewed template ladders for templatable Grade 1 skills.
 * Generation confirms these exist; sessions instantiate live twists from them.
 * Do not JSON-store outcomeMatch — strip it before persisting on a lesson.
 */
import { randomUUID } from 'node:crypto';
import { isGradeOneAdditionContext, enumerateAdditionPairs } from './additionTemplate.js';
import {
  makeCountIntoBoxQuestion,
  objectPoolForTarget,
  enumerateCountTargets
} from './countIntoBox.js';
import {
  makeNumericEntryQuestion,
  makeHowManyNumericQuestion
} from './numericEntry.js';
import { VERTICAL_ADDITION_INSTRUCTION } from './additionLayout.js';
import { DEFAULT_OBJECT_KIND } from './objectKinds.js';
import { outcomeKey } from './outcomeKey.js';
import { QUIZ_SOURCE_TEMPLATES, QUIZ_SOURCE_FIXED_POOL } from './quizSessionSize.js';

export { isGradeOneAdditionContext };

const stripSequencePrefix = (name = '') =>
  String(name || '')
    .toLowerCase()
    .replace(/^\d+(\.\d+)?\s*/, '')
    .trim();

export const isGradeOneNumberConceptContext = (ctx = {}) => {
  const subject = String(ctx.subject?.name || ctx.subjectName || '').toLowerCase();
  const subStrand = stripSequencePrefix(ctx.subStrand?.name || ctx.subStrandName || '');
  return String(ctx.grade) === '1' && subject === 'mathematics' && subStrand === 'number concept';
};

const ADDITION_LADDER = [
  {
    id: 'add-singles-easy-numeric',
    family: 'addition',
    outcomeFamily: 'singles_to_10',
    outcomeMatch: /2-single digit|two single.?digit|sum of 10|putting objects together|'\+' and '='|addition sentences/i,
    difficulty: 'easy',
    interactionType: 'numeric_entry',
    skillFocus: 'Add two single-digit numbers up to 10',
    bloomLevel: 'apply',
    modality: 'practice',
    questionText: '{a} + {b}',
    answerFormula: 'a + b',
    constraints: { a: [1, 5], b: [1, 5], sumMax: 10, operation: 'addition' },
    seed: { a: 2, b: 3 }
  },
  {
    id: 'add-singles-mid-numeric',
    family: 'addition',
    outcomeFamily: 'singles_to_10',
    outcomeMatch: /2-single digit|two single.?digit|sum of 10|putting objects together|'\+' and '='|addition sentences/i,
    difficulty: 'intermediate',
    interactionType: 'numeric_entry',
    skillFocus: 'Add two single-digit numbers up to 10',
    bloomLevel: 'apply',
    modality: 'practice',
    questionText: '{a} + {b}',
    answerFormula: 'a + b',
    constraints: { a: [1, 9], b: [1, 9], sumMax: 10, operation: 'addition' },
    seed: { a: 4, b: 6 }
  },
  {
    id: 'add-singles-easy-drag',
    family: 'addition',
    outcomeFamily: 'singles_to_10',
    outcomeMatch: /2-single digit|two single.?digit|sum of 10|putting objects together|model addition/i,
    difficulty: 'easy',
    interactionType: 'drag_to_target',
    skillFocus: 'Model addition as putting objects together',
    bloomLevel: 'apply',
    modality: 'visual',
    questionText: 'How many is {a} plus {b}?',
    answerFormula: 'a + b',
    constraints: { a: [1, 5], b: [1, 5], sumMax: 10, operation: 'addition' },
    seed: { a: 2, b: 3 }
  },
  {
    id: 'add-twodigit-mid-numeric',
    family: 'addition',
    outcomeFamily: 'two_digit_one_digit',
    outcomeMatch: /2-digit number to a 1-digit|two-digit.*one-digit|without regrouping/i,
    difficulty: 'intermediate',
    interactionType: 'numeric_entry',
    skillFocus: 'Add a 2-digit number and a 1-digit number without regrouping',
    bloomLevel: 'apply',
    modality: 'practice',
    questionText: '{a} + {b}',
    answerFormula: 'a + b',
    constraints: {
      a: [10, 99],
      b: [1, 9],
      sumMax: 100,
      noRegrouping: true,
      operation: 'addition'
    },
    seed: { a: 12, b: 4 }
  },
  {
    id: 'add-twodigit-mid-steps',
    family: 'addition',
    outcomeFamily: 'two_digit_one_digit',
    outcomeMatch: /2-digit number to a 1-digit|two-digit.*one-digit|without regrouping/i,
    difficulty: 'intermediate',
    interactionType: 'numeric_entry',
    skillFocus: 'Add a 2-digit number and a 1-digit number without regrouping',
    bloomLevel: 'apply',
    modality: 'text_steps',
    questionText: '{a} + {b}',
    answerFormula: 'a + b',
    constraints: {
      a: [10, 99],
      b: [1, 9],
      sumMax: 100,
      noRegrouping: true,
      operation: 'addition'
    },
    seed: { a: 23, b: 4 }
  },
  {
    id: 'add-twodigit-adv-numeric',
    family: 'addition',
    outcomeFamily: 'two_digit_one_digit',
    outcomeMatch: /2-digit number to a 1-digit|two-digit.*one-digit|without regrouping/i,
    difficulty: 'advanced',
    interactionType: 'numeric_entry',
    skillFocus: 'Add a 2-digit number and a 1-digit number without regrouping',
    bloomLevel: 'apply',
    modality: 'practice',
    questionText: '{a} + {b}',
    answerFormula: 'a + b',
    constraints: {
      a: [20, 99],
      b: [1, 9],
      sumMax: 100,
      noRegrouping: true,
      operation: 'addition'
    },
    seed: { a: 31, b: 5 }
  },
  {
    id: 'add-tens-mid-numeric',
    family: 'addition',
    outcomeFamily: 'multiples_of_ten',
    outcomeMatch: /multiples of 10/i,
    difficulty: 'intermediate',
    interactionType: 'numeric_entry',
    skillFocus: 'Add multiples of 10 up to 100',
    bloomLevel: 'apply',
    modality: 'practice',
    questionText: '{a} + {b}',
    answerFormula: 'a + b',
    constraints: {
      a: [10, 90],
      b: [10, 90],
      aStep: 10,
      bStep: 10,
      sumMax: 100,
      operation: 'addition'
    },
    seed: { a: 20, b: 30 }
  }
];

const NUMBER_CONCEPT_LADDER = [
  {
    id: 'nc-represent-easy-drag',
    family: 'number_concept',
    outcomeFamily: 'represent_numbers',
    outcomeMatch: /represent numbers 1-30|concrete objects/i,
    difficulty: 'easy',
    interactionType: 'drag_to_target',
    skillFocus: 'Represent numbers using concrete objects',
    bloomLevel: 'apply',
    modality: 'visual',
    questionText: 'Show this many.',
    answerFormula: 'target',
    constraints: { target: [1, 5] },
    seed: { target: 3 }
  },
  {
    id: 'nc-represent-mid-drag',
    family: 'number_concept',
    outcomeFamily: 'represent_numbers',
    outcomeMatch: /represent numbers 1-30|concrete objects/i,
    difficulty: 'intermediate',
    interactionType: 'drag_to_target',
    skillFocus: 'Represent numbers using concrete objects',
    bloomLevel: 'apply',
    modality: 'visual',
    questionText: 'Show this many.',
    answerFormula: 'target',
    constraints: { target: [6, 12] },
    seed: { target: 8 }
  },
  {
    id: 'nc-represent-adv-drag',
    family: 'number_concept',
    outcomeFamily: 'represent_numbers',
    outcomeMatch: /represent numbers 1-30|concrete objects/i,
    difficulty: 'advanced',
    interactionType: 'drag_to_target',
    skillFocus: 'Represent numbers using concrete objects',
    bloomLevel: 'apply',
    modality: 'visual',
    questionText: 'Show this many.',
    answerFormula: 'target',
    constraints: { target: [13, 17] },
    seed: { target: 15 }
  },
  {
    id: 'nc-represent-adv-numeric',
    family: 'number_concept',
    outcomeFamily: 'represent_numbers',
    outcomeMatch: /represent numbers 1-30|concrete objects/i,
    difficulty: 'advanced',
    interactionType: 'numeric_entry',
    skillFocus: 'Represent numbers 18–30',
    bloomLevel: 'apply',
    modality: 'practice',
    questionText: 'How many?',
    answerFormula: 'target',
    constraints: { target: [18, 30] },
    seed: { target: 20 }
  },
  {
    id: 'nc-one-count-easy-drag',
    family: 'number_concept',
    outcomeFamily: 'one_count',
    outcomeMatch: /group in all situations has only one count|only one count/i,
    difficulty: 'easy',
    interactionType: 'drag_to_target',
    skillFocus: 'A group has only one count',
    bloomLevel: 'understand',
    modality: 'visual',
    questionText: 'Count.',
    answerFormula: 'target',
    constraints: { target: [1, 5] },
    seed: { target: 4 }
  },
  {
    id: 'nc-one-count-mid-drag',
    family: 'number_concept',
    outcomeFamily: 'one_count',
    outcomeMatch: /group in all situations has only one count|only one count/i,
    difficulty: 'intermediate',
    interactionType: 'drag_to_target',
    skillFocus: 'A group has only one count',
    bloomLevel: 'understand',
    modality: 'visual',
    questionText: 'Count.',
    answerFormula: 'target',
    constraints: { target: [6, 12] },
    seed: { target: 9 }
  }
];

const FAMILY_ORDER = {
  addition: ['singles_to_10', 'two_digit_one_digit', 'multiples_of_ten'],
  number_concept: ['one_count', 'represent_numbers']
};

export const detectTemplatableSkill = (ctx = {}) => {
  if (isGradeOneAdditionContext(ctx)) return 'addition';
  if (isGradeOneNumberConceptContext(ctx)) return 'number_concept';
  return null;
};

const ladderForSkill = (skill) => {
  if (skill === 'addition') return ADDITION_LADDER;
  if (skill === 'number_concept') return NUMBER_CONCEPT_LADDER;
  return [];
};

const toStoredTemplate = (def, { learningOutcomeIndex, learningOutcomeKey, skillFocus }) => {
  const { outcomeMatch: _match, seed, ...rest } = def;
  return {
    ...rest,
    seed: seed || null,
    learningOutcomeIndex,
    learningOutcomeKey,
    skillFocus: skillFocus || def.skillFocus
  };
};

const bindDef = (def, outcomes = []) => {
  const texts = outcomes.length ? outcomes : [''];
  let idx = 1;
  let text = texts[0];
  for (let i = 0; i < texts.length; i += 1) {
    if (def.outcomeMatch.test(String(texts[i] || ''))) {
      idx = i + 1;
      text = texts[i];
      break;
    }
  }
  return toStoredTemplate(def, {
    learningOutcomeIndex: idx,
    learningOutcomeKey: outcomeKey(text || def.skillFocus || def.id),
    skillFocus: def.skillFocus || String(text || '').slice(0, 120)
  });
};

/**
 * Addition attaches the full skill ladder so a mastered learner has a harder
 * family to move into. Number Concept keeps family-filtered attachment
 * (represent vs one-count are different objectives).
 */
export const laddersForOutcomes = (ctx, outcomes = []) => {
  const skill = detectTemplatableSkill(ctx);
  if (!skill) return [];
  const defs = ladderForSkill(skill);
  if (!defs.length) return [];

  if (skill === 'addition') {
    const texts = outcomes.length ? outcomes : [''];
    return defs.map((def) => bindDef(def, texts));
  }

  if (!outcomes.length) return [];
  const matchedFamilies = new Set();
  for (const text of outcomes) {
    for (const def of defs) {
      if (def.outcomeMatch.test(String(text || ''))) matchedFamilies.add(def.outcomeFamily);
    }
  }
  if (!matchedFamilies.size) return [];
  return defs.filter((def) => matchedFamilies.has(def.outcomeFamily)).map((def) => bindDef(def, outcomes));
};

export const resolveContentSource = (ctx, outcomes = []) => {
  const rows = laddersForOutcomes(ctx, outcomes);
  return rows.length > 0 ? QUIZ_SOURCE_TEMPLATES : QUIZ_SOURCE_FIXED_POOL;
};

export const homeOutcomeFamilies = (skill, outcomes = [], storedTemplates = []) => {
  const homes = new Set();
  const defs = ladderForSkill(skill);
  for (const text of outcomes || []) {
    for (const def of defs) {
      if (def.outcomeMatch.test(String(text || ''))) homes.add(def.outcomeFamily);
    }
  }
  if (!homes.size) {
    for (const t of storedTemplates || []) {
      if (t.outcomeFamily) homes.add(t.outcomeFamily);
    }
  }
  return homes;
};

export const targetOutcomeFamily = ({
  skill,
  homeFamilies,
  mastery = null,
  failStreak = 0
} = {}) => {
  const order = FAMILY_ORDER[skill] || [];
  if (!order.length) return null;
  const homeIdxes = [...(homeFamilies || [])]
    .map((f) => order.indexOf(f))
    .filter((i) => i >= 0);
  const homeIdx = homeIdxes.length ? Math.max(...homeIdxes) : 0;
  const pKnow = Number(mastery?.bktPKnow);
  const status = mastery?.status;
  const drop =
    failStreak >= 2 ||
    status === 'scaffolding' ||
    status === 'struggling' ||
    (Number.isFinite(pKnow) && pKnow < 0.4);
  const escalate = status === 'mastered' || (Number.isFinite(pKnow) && pKnow >= 0.7);
  let idx = homeIdx;
  if (drop) idx = Math.max(0, homeIdx - 1);
  else if (escalate) idx = Math.min(order.length - 1, homeIdx + 1);
  return order[idx];
};

const baseTemplateId = (id) => String(id || '').replace(/__\d+$/, '');

/**
 * Session pool: stored templates plus any missing Addition ladder rungs.
 * Already-approved 2-template lessons can escalate without a regenerate.
 */
export const templatesForSession = (lesson) => {
  const stored = Array.isArray(lesson?.quiz?.templates) ? lesson.quiz.templates : [];
  if (!stored.length) return stored;
  const skill =
    stored[0]?.family === 'addition'
      ? 'addition'
      : stored[0]?.family === 'number_concept'
        ? 'number_concept'
        : null;
  if (skill !== 'addition') return stored;

  const ctx = {
    grade: String(lesson.grade || '1'),
    subject: { name: 'Mathematics' },
    subStrand: { name: 'Addition' }
  };
  const outcomes = lesson.learningObjectives || [];
  const full = laddersForOutcomes(ctx, outcomes);
  const byId = new Map();
  for (const t of stored) byId.set(baseTemplateId(t.id), t);
  for (const t of full) {
    const id = baseTemplateId(t.id);
    if (!byId.has(id)) byId.set(id, t);
  }
  return [...byId.values()];
};

export const skillFromTemplates = (templates = []) => {
  const family = templates[0]?.family;
  if (family === 'addition' || family === 'number_concept') return family;
  return null;
};

const paramKeyOf = (template, params = {}) => {
  if (params.target != null && params.a == null) return `${template.id}:t${params.target}`;
  return `${template.id}:${params.a},${params.b}`;
};

const pickUnusedPair = (template, excludeKeys = new Set(), random = Math.random) => {
  const pairs = enumerateAdditionPairs(template.constraints || {});
  const candidates = pairs.filter((pair) => !excludeKeys.has(paramKeyOf(template, pair)));
  const pool = candidates.length ? candidates : pairs;
  if (!pool.length) return null;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index];
};

const pickUnusedTarget = (template, excludeKeys = new Set(), random = Math.random) => {
  const targets = enumerateCountTargets(template.constraints || {});
  const candidates = targets.filter((row) => !excludeKeys.has(paramKeyOf(template, row)));
  const pool = candidates.length ? candidates : targets;
  if (!pool.length) return null;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index];
};

export const instantiateTemplate = (
  template = {},
  { excludeParamKeys = new Set(), random = Math.random, asSeed = false } = {}
) => {
  if (!template?.id) return { ok: false, reason: 'missing template' };
  const targetOnly = String(template.answerFormula || '') === 'target';
  let params;
  if (targetOnly) {
    params = asSeed && template.seed?.target != null
      ? { target: template.seed.target }
      : pickUnusedTarget(template, excludeParamKeys, random);
  } else {
    params = asSeed && template.seed?.a != null
      ? { a: template.seed.a, b: template.seed.b }
      : pickUnusedPair(template, excludeParamKeys, random);
  }
  if (!params) return { ok: false, reason: 'no parameter values' };

  const shared = {
    skillFocus: template.skillFocus,
    bloomLevel: template.bloomLevel || 'apply',
    learningOutcomeIndex: template.learningOutcomeIndex || 1,
    difficulty: template.difficulty || 'easy',
    constraints: template.constraints
  };

  let question;
  if (template.interactionType === 'drag_to_target') {
    question = makeCountIntoBoxQuestion({
      ...shared,
      ...params,
      questionText: template.questionText,
      answerFormula: template.answerFormula,
      objectKind: DEFAULT_OBJECT_KIND
    });
    if (question.params?.target != null) {
      const pool = objectPoolForTarget(question.params.target);
      if (pool < question.params.target) {
        return { ok: false, reason: 'drag target exceeds object pool cap' };
      }
    }
  } else if (targetOnly) {
    question = makeHowManyNumericQuestion({
      ...shared,
      target: params.target,
      questionText: template.questionText || 'How many?'
    });
  } else {
    question = makeNumericEntryQuestion({
      ...shared,
      a: params.a,
      b: params.b,
      layout: 'vertical',
      questionText: VERTICAL_ADDITION_INSTRUCTION,
      answerFormula: template.answerFormula || 'a + b'
    });
    question.question = VERTICAL_ADDITION_INSTRUCTION;
    question.questionText = '{a} + {b}';
  }

  const instanceId = asSeed ? `seed-${template.id}` : `tpl-${template.id}-${randomUUID().slice(0, 8)}`;
  return {
    ok: true,
    paramKey: paramKeyOf(template, question.params || params),
    question: {
      ...question,
      id: instanceId,
      templateId: template.id,
      template: true,
      learningOutcomeKey: template.learningOutcomeKey,
      modality: template.modality || question.modality,
      isSessionInstance: !asSeed
    }
  };
};

export const seedQuestionsFromTemplates = (templates = []) =>
  (templates || [])
    .map((template) => instantiateTemplate(template, { asSeed: true }))
    .filter((result) => result.ok)
    .map((result) => result.question);

export const difficultyTierFromMastery = (mastery) => {
  const pKnow = Number(mastery?.bktPKnow);
  if (Number.isFinite(pKnow)) {
    if (pKnow < 0.4) return 'easy';
    if (pKnow < 0.7) return 'intermediate';
    return 'advanced';
  }
  const status = mastery?.status;
  if (status === 'scaffolding' || status === 'struggling') return 'easy';
  if (status === 'mastered') return 'advanced';
  return 'intermediate';
};

export const templateCoverageReport = (templates = [], outcomes = []) => {
  const realCovered = [];
  const remapped = [];
  const stillMissing = [];
  const tiers = new Set();
  for (let i = 0; i < outcomes.length; i++) {
    const idx = i + 1;
    const forOutcome = (templates || []).filter((t) => Number(t.learningOutcomeIndex) === idx);
    if (forOutcome.length === 0) stillMissing.push(idx);
    else realCovered.push(idx);
  }
  for (const t of templates || []) {
    if (t.difficulty) tiers.add(t.difficulty);
  }
  return {
    realCovered,
    remapped,
    stillMissing,
    outcomes: [...outcomes],
    templateCount: (templates || []).length,
    templateTiers: [...tiers]
  };
};
