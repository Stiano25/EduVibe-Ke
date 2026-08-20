/**
 * Question-bank interaction-mix profiles.
 *
 * Sibling to subjectProfiles: that file owns teaching/quiz style, diagrams, and
 * modality. This file owns which interaction types a bank batch should prefer.
 * Adding a subject's mix is a new record here — not a new if-branch in
 * questionBankService.
 *
 * Lookup reuses the same match-key style as elsewhere: optional grade, subject
 * name, topic slug (sequence prefix stripped), and/or subjectProfiles key.
 * First full match wins; the last record is the catch-all default.
 */
import { getSubjectProfile } from './subjectProfiles.js';
import { OBJECT_KINDS } from '../../utils/objectKinds.js';

const objectKindList = OBJECT_KINDS.join(', ');

export const stripSequencePrefix = (name = '') =>
  String(name || '')
    .toLowerCase()
    .replace(/^\d+(\.\d+)?\s*/, '')
    .trim();

const interpolate = (text, vars) =>
  String(text || '').replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] != null ? String(vars[key]) : `{{${key}}}`
  );

const mixVars = (ctx = {}) => {
  const topic = stripSequencePrefix(ctx.subStrand?.name || '');
  const operation = topic === 'subtraction' ? 'subtract' : 'add';
  const subStrandName = String(ctx.subStrand?.name || ctx.subStrandName || '').trim();
  const outcomesHint = String(ctx.outcomesBlock || '')
    .split('\n')
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 2)
    .join('; ');
  return {
    operation,
    instruction: operation === 'subtract' ? 'Subtract.' : 'Add.',
    formula: operation === 'subtract' ? 'a - b' : 'a + b',
    objectKindList,
    subStrandName: subStrandName || 'this sub-strand',
    outcomesHint: outcomesHint || subStrandName || 'the listed outcomes'
  };
};

const topicOf = (ctx = {}) =>
  stripSequencePrefix(ctx.subStrand?.name || ctx.subStrandName || '');

const subjectOf = (ctx = {}) => String(ctx.subject?.name || ctx.subjectName || '');

const profileOf = (ctx = {}) => ctx.profile || getSubjectProfile(subjectOf(ctx));

const recordMatches = (record, ctx) => {
  const m = record.match || {};
  if (m.catchAll) return true;
  const grade = String(ctx.grade ?? '');
  if (m.grades?.length && !m.grades.map(String).includes(grade)) return false;

  if (m.profileKeys?.length) {
    const profile = profileOf(ctx);
    if (!m.profileKeys.includes(profile?.key)) return false;
  }

  if (m.subjectMatchers?.length && !m.subjectMatchers.some((re) => re.test(subjectOf(ctx)))) {
    return false;
  }

  const topic = topicOf(ctx);
  if (m.topicEquals?.length && !m.topicEquals.includes(topic)) return false;
  if (m.topicMatchers?.length && !m.topicMatchers.some((re) => re.test(topic))) return false;

  return true;
};

const renderRecord = (record, ctx) => {
  const vars = mixVars(ctx);
  const heading = interpolate(record.title, vars);
  const bullets = (record.lines || []).map((line) => `- ${interpolate(line, vars)}`);
  return [`INTERACTION MIX — ${heading}:`, ...bullets].join('\n');
};

/**
 * Ordered mix records. Topic-specific rows first, then profile-key rows, then
 * catch-all. Do not add if-branches in questionBankService — add a record here.
 */
export const BANK_MIXES = [
  {
    key: 'column_arithmetic',
    title: 'COLUMN ARITHMETIC (this topic only)',
    match: {
      subjectMatchers: [/math/i],
      topicEquals: ['addition', 'subtraction']
    },
    preferredInteractions: [
      { type: 'numeric_entry', min: 2, when: 'always' },
      { type: 'drag_to_target', when: 'both addends small enough (target ≤ 20)' },
      { type: 'multiple_choice', role: 'remaining' }
    ],
    diagramTreatment: {
      visualMcq: 'object_quantity picture options when the choice is a quantity of a named object; plain text for abstract comparisons and number patterns'
    },
    forbidden: [
      'vertical column layout except on two-operand add/subtract numeric_entry',
      'fraction_bars',
      'shopkeeper-story stems on column items'
    ],
    lines: [
      'At least 2 items MUST be interactionType "numeric_entry" with params:{a,b,layout:"vertical",operation:"{{operation}}"}, answerFormula:"{{formula}}", question "{{instruction}}", options []. The figure is stacked digits, a line, and the answer underneath — never a shopkeeper story.',
      'Use drag_to_target only when both addends are small enough to place as icons (target ≤ 20). Set activity:"count_into_box", params:{a,b,target,objectPool,objectKind} with objectKind from: {{objectKindList}}.',
      'Remaining items: multiple_choice. Use {diagramType:"object_quantity",params:{objectKind,count}} picture options when the choice is a quantity of a named object. Keep plain-text options for abstract comparisons and number patterns.',
      'Vertical column layout is ONLY for two-operand {{operation}}. Do not put it on word-problem MCQ.'
    ]
  },
  {
    key: 'fractions',
    title: 'FRACTIONS',
    match: {
      subjectMatchers: [/math/i],
      topicMatchers: [/fraction/]
    },
    preferredInteractions: [
      { type: 'multiple_choice', role: 'default' },
      {
        type: 'matching_pairs',
        min: 1,
        count: 'exactly 1',
        when: 'an outcome is pairing a fraction symbol with a picture of equal parts, or pairing equivalent fractions'
      },
      { type: 'numeric_entry', when: 'the answer is a single count (how many objects is half of 10)' },
      { type: 'drag_to_target', when: 'the learner literally places objects' }
    ],
    diagramTreatment: {
      partOfWhole: 'fraction_bars showing equal parts; options may be fraction strings or picture options of equal parts',
      partOfGroup: 'object_quantity picture options; total icons ≤ 20'
    },
    forbidden: ['vertical addition/subtraction column'],
    lines: [
      'Default to multiple_choice. Do NOT use a vertical addition/subtraction column.',
      'Part of a whole: include "diagram": { "diagramType":"fraction_bars", "params":{...}, "brief":"..." } showing equal parts. Options may be fraction strings ($\\frac{1}{2}$) or picture options of equal parts.',
      'Part of a group: picture options {diagramType:"object_quantity",params:{objectKind,count}} using objectKind from: {{objectKindList}}. Total icons must stay ≤ 20.',
      'Include exactly 1 matching_pairs item when an outcome is pairing a fraction symbol with a picture of equal parts, or pairing equivalent fractions. Ground pairings in this sub-strand ({{subStrandName}}): {{outcomesHint}}. Shape: left (3-4 fraction names or pictures), right (matching pictures or names), correctPairs:[[leftIndex,rightIndex],...]. Do NOT force matching onto a single-fact identification question.',
      'numeric_entry only when the answer is a single count (how many objects is half of 10) — keypad, no column. drag_to_target only if the learner literally places objects.'
    ]
  },
  {
    key: 'multiplication',
    title: 'MULTIPLICATION',
    match: {
      subjectMatchers: [/math/i],
      topicEquals: ['multiplication']
    },
    preferredInteractions: [
      { type: 'multiple_choice', role: 'default' },
      {
        type: 'matching_pairs',
        min: 1,
        count: 'exactly 1',
        when: 'an outcome is pairing a multiplication fact with its array or equal groups'
      },
      {
        type: 'odd_one_out',
        min: 1,
        count: 'exactly 1',
        when: 'an outcome is grouping/classification (which array does not show equal groups)'
      },
      { type: 'numeric_entry', when: 'the answer is a single product' }
    ],
    diagramTreatment: {
      arrays: 'object_quantity with groups:[n,n,…] for “a groups of b”, never a flat count of the product',
      unnamed: 'counting_circles only when no object is named, still grouped'
    },
    forbidden: [
      'numeric_entry with a vertical column',
      'flat object_quantity count of the product',
      'drawing more than 20 icons'
    ],
    lines: [
      'Default to multiple_choice. Do NOT use a vertical addition/subtraction column.',
      'Repeated addition / arrays: visual items MUST use object_quantity with params:{objectKind, groups:[n,n,...]} showing equal groups (e.g. groups:[4,4,4] for 3 × 4), not a flat count of the product. counting_circles only when no object is named, still as equal groups.',
      'Each group and the SUM of groups[] must stay ≤ 20 icons. For facts with product > 20 (×10, products toward 100) do NOT draw 90 icons — use matching_pairs (fact ↔ small array) or plain-text MCQ.',
      'Include exactly 1 matching_pairs item when an outcome is pairing a multiplication fact with its array or equal groups. Ground pairings in this sub-strand ({{subStrandName}}): {{outcomesHint}}. Shape: left (3-4 facts or pictures), right (matching arrays/groups), correctPairs:[[leftIndex,rightIndex],...]. Do NOT force matching onto a bare computation question.',
      'Include exactly 1 odd_one_out item when an outcome is grouping/classification (which array does not show equal groups). Shape: options of 4 items, correctAnswerIndex is the one that does not belong. Do NOT force it onto every item.',
      'numeric_entry is allowed for a single product — keypad, layout horizontal, never a vertical add/subtract column. drag_to_target only if the learner literally places objects into groups, with total ≤ 20.'
    ]
  },
  {
    key: 'division',
    title: 'DIVISION',
    match: {
      subjectMatchers: [/math/i],
      topicEquals: ['division']
    },
    preferredInteractions: [
      { type: 'multiple_choice', role: 'default' },
      {
        type: 'matching_pairs',
        min: 1,
        count: 'exactly 1',
        when: 'an outcome is pairing a division fact with an equal-sharing picture'
      },
      {
        type: 'odd_one_out',
        min: 1,
        count: 'exactly 1',
        when: 'an outcome is grouping/classification (which set is not shared equally)'
      },
      { type: 'numeric_entry', when: 'the answer is a single quotient' }
    ],
    diagramTreatment: {
      equalSharing: 'object_quantity with groups:[n,n,…] showing a total split into equal groups',
      unnamed: 'counting_circles only when no object is named, still as equal groups'
    },
    forbidden: [
      'numeric_entry with a vertical column',
      'flat object_quantity pile of the dividend',
      'drawing more than 20 icons'
    ],
    lines: [
      'Default to multiple_choice. Do NOT use a vertical addition/subtraction column.',
      'Equal sharing / grouping: visual items MUST use object_quantity with params:{objectKind, groups:[n,n,...]} showing a total split into equal groups (e.g. 12 shared into 3 groups of 4 → groups:[4,4,4]), not a flat pile. counting_circles only when no object is named, still as equal groups.',
      'Each group and the SUM of groups[] must stay ≤ 20 icons. For dividends > 20 (toward 90) do NOT draw 90 icons — use matching_pairs (division sentence ↔ equal groups) or plain-text MCQ.',
      'Include exactly 1 matching_pairs item when an outcome is pairing a division fact with an equal-sharing picture. Ground pairings in this sub-strand ({{subStrandName}}): {{outcomesHint}}. Shape: left (3-4 facts or pictures), right (matching equal-group pictures or sentences), correctPairs:[[leftIndex,rightIndex],...]. Do NOT force matching onto a bare computation question.',
      'Include exactly 1 odd_one_out item when an outcome is grouping/classification (which set is not shared equally). Shape: options of 4 items, correctAnswerIndex is the one that does not belong. Do NOT force it onto every item.',
      'numeric_entry is allowed for a single quotient — keypad, layout horizontal, never a vertical add/subtract column. drag_to_target only if the learner literally shares objects into groups, with total ≤ 20.'
    ]
  },
  {
    key: 'sciences',
    title: 'SCIENCE',
    match: { profileKeys: ['sciences'] },
    preferredInteractions: [
      { type: 'multiple_choice', role: 'default' },
      {
        type: 'matching_pairs',
        min: 1,
        count: 'exactly 1',
        when: 'an outcome is pairing (item ↔ its function, role, or category)'
      },
      {
        type: 'odd_one_out',
        min: 1,
        count: 'exactly 1',
        when: 'an outcome is grouping/classification'
      }
    ],
    diagramTreatment: {
      requiredOnVisual: true,
      parts: 'labeled_boxes',
      processes: 'process_flow',
      contrasts: 'comparison'
    },
    forbidden: [
      'numeric_entry with a vertical column',
      'drag_to_target unless the task is literally counting objects into a set'
    ],
    lines: [
      'Most items: multiple_choice. Visual items MUST include a real "diagram" (labeled_boxes for parts, process_flow for processes, comparison for contrasts).',
      'Include exactly 1 matching_pairs item when an outcome is pairing (item ↔ its function, role, or category). Ground pairings in this sub-strand ({{subStrandName}}): {{outcomesHint}}. Shape: left (3-4 names), right (matching functions/roles/categories), correctPairs:[[leftIndex,rightIndex],...]. Do NOT force matching onto a single-fact identification question.',
      'Include exactly 1 odd_one_out item when an outcome is grouping/classification. Shape: options of 4 items, correctAnswerIndex is the one that does not belong.',
      'Remaining items stay multiple_choice.',
      'Do NOT use numeric_entry with a vertical column. Do NOT use drag_to_target unless the task is literally counting objects into a set.'
    ]
  },
  {
    key: 'social_studies',
    title: 'SOCIAL STUDIES',
    match: {
      subjectMatchers: [/social/i, /history/i, /citizen/i]
    },
    preferredInteractions: [
      { type: 'multiple_choice', role: 'default' },
      {
        type: 'matching_pairs',
        min: 1,
        count: 'exactly 1',
        when: 'an outcome is pairing people, figures, or places to roles, events, or categories'
      }
    ],
    diagramTreatment: {
      requiredOnVisual: true,
      parts: 'labeled_boxes',
      processes: 'process_flow',
      contrasts: 'comparison'
    },
    forbidden: [
      'numeric_entry with a vertical column',
      'drag_to_target unless the task is literally counting objects into a set'
    ],
    lines: [
      'Default to multiple_choice. Set interactionType "multiple_choice" on those items.',
      'Include exactly 1 matching_pairs item when an outcome is pairing people, figures, or places to roles, events, or categories. Ground pairings in this sub-strand ({{subStrandName}}): {{outcomesHint}}. Shape: left (3-4 names), right (matching roles/events/places), correctPairs:[[leftIndex,rightIndex],...]. Do NOT force matching onto a single-fact identification question.',
      'Remaining items stay multiple_choice.',
      'Do NOT use numeric_entry with a vertical column — that layout is only for addition/subtraction computation.',
      'Do NOT use drag_to_target unless the task is literally counting objects into a set.',
      'Visual items MUST include a real "diagram" object (see below). Parts/functions → labeled_boxes; processes → process_flow; contrasts → comparison.',
      'Options stay plain text unless the choice itself is a figure or a countable quantity of a named object ({{objectKindList}}).'
    ]
  },
  {
    key: 'default',
    title: 'NON-ARITHMETIC (Science, measurement, place value, language, …)',
    match: { catchAll: true },
    preferredInteractions: [{ type: 'multiple_choice', role: 'default' }],
    diagramTreatment: {
      requiredOnVisual: true,
      parts: 'labeled_boxes',
      processes: 'process_flow',
      contrasts: 'comparison'
    },
    forbidden: [
      'numeric_entry with a vertical column',
      'drag_to_target unless the task is literally counting objects into a set'
    ],
    lines: [
      'Default to multiple_choice. Set interactionType "multiple_choice" on those items.',
      'Do NOT use numeric_entry with a vertical column — that layout is only for addition/subtraction computation.',
      'Do NOT use drag_to_target unless the task is literally counting objects into a set.',
      'Visual items MUST include a real "diagram" object (see below). Parts/functions → labeled_boxes; processes → process_flow; contrasts → comparison.',
      'Options stay plain text unless the choice itself is a figure or a countable quantity of a named object ({{objectKindList}}).'
    ]
  }
];

export const resolveBankMix = (ctx = {}) => {
  for (const record of BANK_MIXES) {
    if (recordMatches(record, ctx)) return record;
  }
  return BANK_MIXES[BANK_MIXES.length - 1];
};

export const renderBankInteractionMix = (ctx = {}) => renderRecord(resolveBankMix(ctx), ctx);

/** Two-operand column add/subtract only — not measurement word problems, not Science. */
export const isColumnArithmeticTopic = (ctx = {}) => resolveBankMix(ctx).key === 'column_arithmetic';

export const isFractionTopic = (ctx = {}) => resolveBankMix(ctx).key === 'fractions';

export const isMultiplicationTopic = (ctx = {}) => resolveBankMix(ctx).key === 'multiplication';

export const isDivisionTopic = (ctx = {}) => resolveBankMix(ctx).key === 'division';
