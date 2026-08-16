import { generateContent } from '../../providers/contentProvider.js';
import { SubStrand } from '../../models/SubStrand.js';
import { Strand } from '../../models/Strand.js';
import { Subject } from '../../models/Subject.js';
import { outcomeKey, normalizeOutcomeText } from '../../utils/outcomeKey.js';
import { resolveInteractionType } from '../../utils/interactionTypes.js';
import {
  isGradeOneAdditionContext,
  normalizeAdditionTemplateQuestion
} from '../../utils/additionTemplate.js';
import { DIAGRAM_TYPES, coerceLabeledBoxesParams } from './diagramTemplates.js';
import { inferDiagramType } from './diagramService.js';
import {
  retrieveLessonExemplars,
  retrieveQuizExemplars,
  formatExemplarsForPrompt,
  formatQuizExemplarsForPrompt
} from './knowledgeRetrieveService.js';
import {
  tokenOverlapRatio,
  QUIZ_EXEMPLAR_NEAR_DUP_THRESHOLD
} from '../utils/textSimilarity.js';
import { getSubjectProfile } from './subjectProfiles.js';

const BLOOM_LEVELS = new Set(['recall', 'understand', 'apply', 'reason']);
const QUESTION_MODALITIES = new Set(['visual', 'text_steps', 'practice']);
const CANONICAL_DIFFICULTIES = new Set(['easy', 'intermediate', 'advanced']);

/**
 * Grade-banded stem complexity ceilings.
 *
 * These are the concrete form of "age-appropriate". The generation prompt, the
 * reasoning band's own instructions and the QA pass all quote the same numbers,
 * so an over-long stem can be flagged against a stated standard instead of an
 * implied one. Grades 6+ keep the existing behaviour — no new ceiling.
 */
const COMPLEXITY_BANDS = [
  {
    key: 'very_young',
    maxGradeNumber: 2,
    ageGroup: 'very young children (ages 5-7)',
    constrained: true,
    maxWords: 12,
    maxSentences: 1,
    rules: [
      'ONE sentence per question stem — never two.',
      'At most 12 words in the stem.',
      'No subordinate, temporal or comparative clauses. Never join ideas with "while", "after", "before", "since", "because", "although" or "whereas".',
      'One situation only: no multi-part scenarios, no two cases to compare, no chain of events.',
      'Prefer direct concrete phrasing — "How many ... ?", "Which one ... ?", "What is ... ?".',
      'The stem must still ASK something. End it with a question mark, or with a direct instruction such as "Find the sum." Never leave it as a bare statement of a situation: "A girl has 61 shillings, finds 7 more." asks nothing and is not acceptable — write "A girl has 61 shillings and finds 7 more. How many now?" as one sentence: "A girl has 61 shillings and finds 7 more — how many?"',
      'Short does not mean ungrammatical. No comma splices, no dropped verbs, no telegraphic phrasing.',
      'Keep the options short too: a number, a word, or a very short phrase.'
    ]
  },
  {
    key: 'young',
    maxGradeNumber: 5,
    ageGroup: 'young children (ages 8-10)',
    constrained: true,
    maxWords: 20,
    maxSentences: 2,
    rules: [
      'At most 2 short sentences per question stem.',
      'At most 20 words in the stem in total.',
      'At most ONE simple connector (and, but, then). No nested or stacked clauses.',
      'One scenario only — never two cases to compare, never a multi-step story.',
      'Prefer concrete, familiar situations over abstract framing.',
      'The stem must still ASK something, and must stay grammatical — no comma splices, no dropped verbs, no telegraphic phrasing.'
    ]
  },
  {
    key: 'pre_teen',
    maxGradeNumber: 8,
    ageGroup: 'pre-teens (ages 11-13)',
    constrained: false
  },
  {
    key: 'teen',
    maxGradeNumber: Infinity,
    ageGroup: 'teens (ages 14+)',
    constrained: false
  }
];

const TEEN_BAND = COMPLEXITY_BANDS[COMPLEXITY_BANDS.length - 1];

/** Resolve the complexity ceiling for a numeric grade (K = 0). */
export const getComplexityBand = (gradeNumber) => {
  const n = Number(gradeNumber);
  if (!Number.isFinite(n)) return TEEN_BAND;
  return COMPLEXITY_BANDS.find((band) => n <= band.maxGradeNumber) || TEEN_BAND;
};

/** Grade 3 and below read concrete pictures far better than abstract flow boxes. */
export const prefersConcreteDiagrams = (gradeNumber) => {
  const n = Number(gradeNumber);
  return Number.isFinite(n) && n <= 3;
};

/** One-line shorthand for the ceiling, reused in band text and QA. */
const bandLimitsText = (band) =>
  band?.constrained ? `${band.maxSentences}-sentence / ${band.maxWords}-word` : '';

/**
 * Stem length counters. The QA model is given these numbers rather than being
 * asked to count words itself, so the ceiling check is mechanical.
 */
export const countStemWords = (stem = '') =>
  String(stem).trim().split(/\s+/).filter(Boolean).length;

export const countStemSentences = (stem = '') =>
  String(stem)
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean).length;

/** The ceiling as prompt text. Unconstrained grades get a plain reading-level line. */
const buildComplexityBlock = (grade, band, ageGroup) => {
  if (!band?.constrained) {
    return `READING LEVEL: write for ${ageGroup} (Grade ${grade}). Keep stems clear and free of padding.`;
  }
  return `GRADE COMPLEXITY CEILING — Grade ${grade}, ${ageGroup}. Applies to EVERY question in this part, at EVERY Bloom level:
${band.rules.map((rule) => `- ${rule}`).join('\n')}
This ceiling overrides any style guidance above that would make a stem longer. A stem that is too wordy for this grade is a defect, exactly like a factually wrong one.`;
};

/**
 * Map Gemini difficulty drift onto easy | intermediate | advanced before storage.
 * Logs whenever a non-canonical value is corrected.
 */
export const normalizeDifficulty = (raw, { questionId = '', context = '' } = {}) => {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (CANONICAL_DIFFICULTIES.has(s)) return s;

  let mapped = 'intermediate';
  if (s === 'medium' || s === 'mid' || s === 'moderate' || s === 'normal') {
    mapped = 'intermediate';
  } else if (s === 'hard' || s === 'difficult' || s === 'challenging') {
    mapped = 'advanced';
  } else if (s === 'beginner' || s === 'simple' || s === 'basic' || s === 'easy') {
    mapped = 'easy';
  }

  const label = context ? ` (${context})` : '';
  const qLabel = questionId ? ` [${questionId}]` : '';
  console.warn(
    `Difficulty normalized${label}${qLabel}: "${raw === undefined || raw === null || raw === '' ? '(empty)' : raw}" → "${mapped}"`
  );
  return mapped;
};

const matchObjectiveToOutcomes = (objective, outcomes) => {
  const norm = normalizeOutcomeText(objective).toLowerCase();
  if (!norm) return -1;
  const exact = outcomes.findIndex((o) => normalizeOutcomeText(o).toLowerCase() === norm);
  if (exact >= 0) return exact;
  return outcomes.findIndex((o) => {
    const t = normalizeOutcomeText(o).toLowerCase();
    return t.includes(norm) || norm.includes(t);
  });
};

const assignDefaultModality = (qi, profile) => {
  const cycle = profile?.modalityCycle || ['visual', 'text_steps', 'practice', 'practice', 'visual', 'text_steps', 'practice', 'visual', 'text_steps', 'practice'];
  return cycle[qi % cycle.length];
};

/** Clamp a diagram type to what the subject category allows. */
const clampDiagramType = (diagramType, profile) => {
  const allowed = profile?.allowedDiagramTypes;
  if (!Array.isArray(allowed) || allowed.length === 0) return diagramType;
  if (allowed.includes(diagramType)) return diagramType;
  return profile.fallbackDiagramType || allowed[0];
};

const isTeachingBriefId = (id) => {
  const s = String(id || '');
  return /^vb-\d+$/i.test(s) || s === 'vb-1' || s === 'vb-2';
};

/** Pull numbers from stem (incl. KaTeX) to seed diagram params when AI is vague. */
const numbersFromText = (text = '') =>
  [...String(text).matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0])).filter((n) => Number.isFinite(n));

const seedParamsFromStem = (diagramType, params, questionText) => {
  const p = { ...(params || {}) };
  const nums = numbersFromText(questionText);
  const frac =
    String(questionText).match(/\\frac\{(\d+)\}\{(\d+)\}/) ||
    String(questionText).match(/(\d+)\s*\/\s*(\d+)/);

  switch (diagramType) {
    case 'number_line': {
      if (nums.length >= 1) p.highlight = nums[0];
      const hi = Number(p.highlight);
      if (Number.isFinite(hi)) {
        p.min = Math.min(0, ...nums, hi);
        p.max = Math.max(10, ...nums, hi + 1);
        p.step = p.step || 1;
      }
      break;
    }
    case 'fraction_bars':
      if (frac) {
        p.shaded = Number(frac[1]);
        p.parts = Number(frac[2]);
        p.label = `${p.shaded}/${p.parts}`;
      } else if (nums.length >= 2) {
        p.shaded = nums[0];
        p.parts = Math.max(nums[1], nums[0] + 1);
        p.label = `${p.shaded}/${p.parts}`;
      }
      break;
    case 'bar_model':
      if (nums.length >= 2) {
        p.segments = [
          { value: nums[0], label: String(nums[0]) },
          { value: nums[1], label: String(nums[1]) }
        ];
      } else if (nums.length === 1) {
        p.segments = [{ value: nums[0], label: String(nums[0]) }];
      }
      break;
    case 'place_value': {
      const n = nums.find((x) => x >= 10) ?? nums[0];
      if (n != null) p.number = Math.trunc(n);
      break;
    }
    case 'coordinate_plane': {
      // Prefer fractions like -2/3 for slopes
      const slopes = [
        ...String(questionText).matchAll(/(-?\d+)\s*\/\s*(-?\d+)/g)
      ].map((m) => `${m[1]}/${m[2]}`);
      const lines = Array.isArray(p.lines) ? [...p.lines] : [];
      if (slopes.length > 0) {
        p.lines = slopes.slice(0, 2).map((m, i) => ({
          m,
          c: lines[i]?.c ?? lines[i]?.intercept ?? 0,
          label: lines[i]?.label || `m = ${m}`
        }));
      } else if (nums.length >= 1 && lines.length === 0) {
        p.lines = [{ m: nums[0], c: nums[1] ?? 0, label: `m = ${nums[0]}` }];
      }
      p.xMin = p.xMin ?? -5;
      p.xMax = p.xMax ?? 5;
      p.yMin = p.yMin ?? -5;
      p.yMax = p.yMax ?? 5;
      p.title = p.title || p.label || 'Lines on axes';
      break;
    }
    case 'counting_circles':
      if (nums.length >= 1) p.count = Math.min(Math.max(Math.trunc(nums[0]), 1), 40);
      break;
    case 'indices': {
      const pow = String(questionText).match(/(\d+)\s*\^\s*(\d+)/) ||
        String(questionText).match(/(\d+)\^\{(\d+)\}/);
      if (pow) {
        p.base = pow[1];
        p.exponent = pow[2];
      } else if (nums.length >= 2) {
        p.base = nums[0];
        p.exponent = nums[1];
      }
      break;
    }
    case 'matrix':
      if (nums.length >= 4) {
        p.values = [
          [nums[0], nums[1]],
          [nums[2], nums[3]]
        ];
        p.rows = 2;
        p.cols = 2;
      }
      break;
    default:
      break;
  }
  return p;
};

/**
 * Build a dedicated brief per visual question (never reuse teaching vb-1/vb-2).
 * Returns { questions, questionBriefs, title, passingScore, timeLimit }.
 */
export const normalizeQuiz = (
  quiz,
  outcomes,
  profile,
  { additionTemplates = false, gradeNumber = null } = {}
) => {
  if (!quiz || !Array.isArray(quiz.questions)) {
    return {
      title: 'Quiz Challenge',
      questions: [],
      passingScore: 65,
      timeLimit: 12,
      questionBriefs: []
    };
  }

  const questionBriefs = [];
  const downgradedVisuals = [];

  const questions = quiz.questions.map((rawQuestion, qi) => {
    let q = rawQuestion || {};
    if (additionTemplates && q.template === true) {
      const normalizedTemplate = normalizeAdditionTemplateQuestion(q);
      if (normalizedTemplate.valid) {
        q = normalizedTemplate.question;
        if (normalizedTemplate.repairedDistractors) {
          console.warn(`Addition template ${q.id || qi + 1}: repaired invalid distractor formulas`);
        }
      } else {
        console.warn(
          `Addition template ${q.id || qi + 1}: disabled (${normalizedTemplate.reason || 'invalid'})`
        );
        q = { ...q, template: false };
      }
    }
    const options = Array.isArray(q.options) ? q.options.map(String) : [];
    let outcomeIndex = Number(q.learningOutcomeIndex);
    if (!Number.isFinite(outcomeIndex) || outcomeIndex < 1 || outcomeIndex > outcomes.length) {
      outcomeIndex = (qi % Math.max(outcomes.length, 1)) + 1;
    }
    const outcomeText = outcomes[outcomeIndex - 1] || outcomes[0] || '';
    const correctAnswerIndex = Math.min(
      Math.max(Number(q.correctAnswerIndex) || 0, 0),
      Math.max(options.length - 1, 0)
    );

    const distractors = options
      .map((_, optIndex) => {
        if (optIndex === correctAnswerIndex) return null;
        const fromAi = (q.distractors || []).find((d) => Number(d.optionIndex) === optIndex);
        return {
          optionIndex: optIndex,
          misconception:
            fromAi?.misconception ||
            q.optionExplanations?.[optIndex] ||
            'Common mix-up for this skill'
        };
      })
      .filter(Boolean);
    const suppliedOptionExplanations = Array.isArray(q.optionExplanations)
      ? q.optionExplanations
      : [];
    const optionExplanations = options.map((_, optIndex) => {
      const supplied = String(suppliedOptionExplanations[optIndex] || '').trim();
      if (supplied) return supplied;
      if (optIndex === correctAnswerIndex) {
        return String(q.explanation || 'This is the correct answer.').trim();
      }
      return (
        distractors.find((d) => d.optionIndex === optIndex)?.misconception ||
        'This option does not match the skill.'
      );
    });

    // Admin-review-only detail, one entry per option. Deliberately separate from
    // optionExplanations/misconception, which stay terse because learners see them.
    const suppliedRationales = Array.isArray(q.reviewRationale) ? q.reviewRationale : [];
    const reviewRationale = options.map((_, optIndex) => {
      const entry = suppliedRationales.find((r) => Number(r?.optionIndex) === optIndex);
      return String(entry?.text || entry?.rationale || '').trim();
    });
    const hasReviewRationale = reviewRationale.some(Boolean);

    const qid = q.id || `q-${qi + 1}`;
    const difficulty = normalizeDifficulty(q.difficulty, {
      questionId: qid,
      context: 'normalizeQuiz'
    });

    const bloom = BLOOM_LEVELS.has(q.bloomLevel)
      ? q.bloomLevel
      : difficulty === 'advanced'
        ? 'reason'
        : difficulty === 'intermediate'
          ? 'apply'
          : 'recall';

    let modality = String(q.modality || '').trim();
    if (!QUESTION_MODALITIES.has(modality)) {
      modality = assignDefaultModality(qi, profile);
    }

    let diagramBriefId = null;
    const embeddedDiagram = q.diagram && typeof q.diagram === 'object' ? q.diagram : null;
    const authoredBrief = normalizeOutcomeText(embeddedDiagram?.brief || q.diagramBrief || '');

    if (modality === 'visual' && !authoredBrief) {
      // The model claimed a visual but never designed one. Shipping the old
      // `Figure for: <stem>` placeholder made the question overclaim a figure it
      // does not have, so demote it to a plain practice question instead.
      console.warn(`Question ${qid}: tagged visual with no diagram brief — downgraded to practice`);
      modality = 'practice';
      downgradedVisuals.push(qid);
    }

    if (modality === 'visual') {
      const embedded = embeddedDiagram;
      const skillFocus = (q.skillFocus || outcomeText || 'core skill').slice(0, 120);
      const stem = String(q.question || '');
      let diagramType = String(
        embedded?.diagramType || q.diagramType || ''
      ).trim();
      if (!DIAGRAM_TYPES.has(diagramType)) {
        diagramType = inferDiagramType(
          `${embedded?.brief || ''} ${stem} ${skillFocus}`,
          skillFocus,
          { youngGrade: prefersConcreteDiagrams(gradeNumber) }
        );
      }
      // Never use comparison boxes for graph/gradient topics
      if (
        diagramType === 'comparison' &&
        /gradient|slope|perpendicular|parallel|coordinate|y\s*=|linear/.test(
          `${stem} ${skillFocus} ${embedded?.brief || ''}`.toLowerCase()
        )
      ) {
        diagramType = 'coordinate_plane';
      }
      diagramType = clampDiagramType(diagramType, profile);
      let params =
        (embedded?.params && typeof embedded.params === 'object' && embedded.params) ||
        (q.diagramParams && typeof q.diagramParams === 'object' && q.diagramParams) ||
        null;
      params = seedParamsFromStem(
        diagramType,
        params ? { ...defaultParamsHint(diagramType), ...params } : defaultParamsHint(diagramType),
        stem
      );
      if (diagramType === 'labeled_boxes') {
        params = coerceLabeledBoxesParams(params);
      }

      // Never attach teaching vb-1/vb-2 to a quiz item
      const requestedId = String(q.diagramBriefId || embedded?.id || '').trim();
      const briefId =
        requestedId && !isTeachingBriefId(requestedId)
          ? requestedId.startsWith('qvb-')
            ? requestedId
            : `qvb-${requestedId}`
          : `qvb-${qid}`;

      questionBriefs.push({
        id: briefId,
        skillFocus,
        outcomeKey: outcomeKey(skillFocus),
        brief: authoredBrief,
        diagramType,
        params,
        scope: 'question',
        questionId: qid
      });
      diagramBriefId = briefId;
    }

    const steps = Array.isArray(q.steps)
      ? q.steps.map(String).filter(Boolean).slice(0, 6)
      : modality === 'text_steps'
        ? []
        : undefined;

    return {
      id: qid,
      question: q.question || `Question ${qi + 1}`,
      type: 'multiple-choice',
      interactionType: resolveInteractionType(q.interactionType || q.type),
      options,
      correctAnswerIndex,
      explanation: q.explanation || '',
      // The model now emits one compact distractor reason per wrong option.
      // Expand it locally into the display-space array instead of paying for
      // both distractors[] and optionExplanations[] in every generated item.
      optionExplanations,
      feedbackCorrect: q.feedbackCorrect || 'Well done!',
      feedbackIncorrect: q.feedbackIncorrect || 'Review this skill and try again.',
      difficulty,
      points: Number(q.points) || 15,
      learningOutcomeIndex: outcomeIndex,
      learningOutcomeKey: outcomeKey(outcomeText),
      skillFocus: (q.skillFocus || outcomeText || 'core skill').slice(0, 120),
      bloomLevel: bloom,
      distractors,
      ...(hasReviewRationale ? { reviewRationale } : {}),
      modality,
      diagramBriefId: modality === 'visual' ? diagramBriefId : null,
      steps: modality === 'text_steps' ? steps || [] : undefined,
      ...(q.template === true
        ? {
            template: true,
            templateVersion: Number(q.templateVersion) || 1,
            questionText: q.questionText,
            params: q.params,
            constraints: q.constraints,
            answerFormula: q.answerFormula,
            distractorFormulas: q.distractorFormulas
          }
        : {}),
      ...(q.flagged_near_duplicate ? { flagged_near_duplicate: true } : {}),
      ...(q.coverage_remapped ? { coverage_remapped: true } : {}),
      ...(q.qa_flagged ? { qa_flagged: true, qa_issue: q.qa_issue || null } : {}),
      ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(q.bankEntryId || '')
      )
        ? { bankEntryId: String(q.bankEntryId) }
        : {})
    };
  });

  if (outcomes.length > 0 && questions.length > 0) {
    const covered = new Set(questions.map((q) => q.learningOutcomeIndex));
    outcomes.forEach((_, i) => {
      const idx = i + 1;
      if (!covered.has(idx)) {
        const slot = questions[i % questions.length];
        slot.learningOutcomeIndex = idx;
        slot.learningOutcomeKey = outcomeKey(outcomes[i]);
        slot.skillFocus = outcomes[i].slice(0, 120);
        slot.coverage_remapped = true;
        covered.add(idx);
      }
    });
  }

  if (downgradedVisuals.length > 0) {
    console.warn(
      `normalizeQuiz: ${downgradedVisuals.length} question(s) downgraded visual→practice for missing diagram data [${downgradedVisuals.join(', ')}]`
    );
  }

  return {
    title: quiz.title || 'Quiz Challenge',
    questions,
    passingScore: Number(quiz.passingScore) || 65,
    timeLimit: Number(quiz.timeLimit) || 12,
    questionBriefs,
    downgradedVisuals
  };
};

const defaultParamsHint = (diagramType) => {
  switch (diagramType) {
    case 'number_line':
      return { min: 0, max: 10, step: 1, highlight: 5, label: 'Number line' };
    case 'fraction_bars':
      return { parts: 4, shaded: 1, label: '1/4' };
    case 'bar_model':
      return { label: 'Bar model', segments: [{ value: 2, label: 'A' }, { value: 3, label: 'B' }] };
    case 'place_value':
      return { number: 245, headers: ['H', 'T', 'O'], label: 'Place value' };
    case 'process_flow':
      return { title: 'Process', steps: ['Step 1', 'Step 2', 'Step 3'] };
    case 'comparison':
      return { title: 'Compare', leftLabel: 'A', rightLabel: 'B', leftItems: ['…'], rightItems: ['…'] };
    case 'coordinate_plane':
      return {
        title: 'Coordinate plane',
        xMin: -5,
        xMax: 5,
        yMin: -5,
        yMax: 5,
        lines: [
          { m: 2, c: 0, label: 'm = 2' },
          { m: '-1/2', c: 0, label: 'm = -1/2' }
        ]
      };
    case 'matrix':
      return { title: 'Matrix', rows: 2, cols: 2, values: [[1, 2], [3, 4]] };
    case 'counting_circles':
      return { title: 'Count', count: 6, columns: 5 };
    case 'indices':
      return { title: 'Indices', base: 2, exponent: 3 };
    default:
      return { title: 'Key ideas', items: [{ label: 'Idea', text: '' }] };
  }
};

const normalizeVisualBriefs = (briefs, outcomes, profile) => {
  if (!Array.isArray(briefs)) return [];
  return briefs
    .filter((b) => {
      const id = String(b?.id || '');
      // Question-scoped briefs are built in normalizeQuiz — skip here
      if (id.startsWith('qvb-') || b?.scope === 'question') return false;
      return true;
    })
    .slice(0, 2)
    .map((b, i) => {
      const brief = normalizeOutcomeText(b.brief || b.description || '');
      if (/happy kids|classroom photo|decorative|stock photo/i.test(brief)) return null;
      const skillFocus = (b.skillFocus || outcomes[i] || outcomes[0] || 'concept').slice(0, 120);
      let diagramType = String(b.diagramType || '').trim();
      if (!DIAGRAM_TYPES.has(diagramType)) {
        diagramType = inferDiagramType(brief || skillFocus, skillFocus);
      }
      if (
        diagramType === 'comparison' &&
        /gradient|slope|perpendicular|parallel|coordinate|y\s*=|linear/.test(
          `${brief} ${skillFocus}`.toLowerCase()
        )
      ) {
        diagramType = 'coordinate_plane';
      }
      diagramType = clampDiagramType(diagramType, profile);
      let params =
        b.params && typeof b.params === 'object'
          ? { ...defaultParamsHint(diagramType), ...b.params }
          : defaultParamsHint(diagramType);
      if (diagramType === 'labeled_boxes') {
        params = coerceLabeledBoxesParams(params);
      }

      return {
        id: isTeachingBriefId(b.id) ? b.id : `vb-${i + 1}`,
        skillFocus,
        outcomeKey: outcomeKey(b.outcomeKey ? b.outcomeKey : skillFocus),
        brief: brief || `${diagramType} for ${skillFocus}`,
        diagramType,
        params,
        scope: 'teaching'
      };
    })
    .filter(Boolean);
};

const normalizeContentBlocks = (blocks, visualBriefs, fallbackContent) => {
  if (Array.isArray(blocks) && blocks.length > 0) {
    return blocks
      .map((b, i) => {
        if (b.type === 'diagram') {
          const briefId = b.briefId || b.visualBriefId || visualBriefs[0]?.id;
          if (!briefId) return null;
          return { id: b.id || `cb-${i + 1}`, type: 'diagram', briefId };
        }
        const text = normalizeOutcomeText(b.text || b.content || '');
        if (!text) return null;
        return { id: b.id || `cb-${i + 1}`, type: 'text', text };
      })
      .filter(Boolean);
  }

  const synthesized = [];
  const paragraphs = String(fallbackContent || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0 && fallbackContent) {
    paragraphs.push(String(fallbackContent).trim());
  }

  let briefIdx = 0;
  paragraphs.forEach((text, i) => {
    synthesized.push({ id: `cb-t-${i + 1}`, type: 'text', text });
    if (briefIdx < visualBriefs.length && (i % 2 === 0 || i === paragraphs.length - 1)) {
      synthesized.push({
        id: `cb-d-${briefIdx + 1}`,
        type: 'diagram',
        briefId: visualBriefs[briefIdx].id
      });
      briefIdx++;
    }
  });

  while (briefIdx < visualBriefs.length) {
    synthesized.push({
      id: `cb-d-${briefIdx + 1}`,
      type: 'diagram',
      briefId: visualBriefs[briefIdx].id
    });
    briefIdx++;
  }

  return synthesized;
};

const contentFromBlocks = (blocks) =>
  (blocks || [])
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text)
    .join('\n\n');


/**
 * Adaptive bank target. Generated in CHUNKS (small JSON per call, never truncates)
 * so the adaptive engine has surplus: ~30 in bank, 10–12 served per session.
 */
const BANK_SIZE = 30;
const CHUNK_SIZE = 10;
const MIN_CHUNK_QUESTIONS = 6;

/**
 * Phase-specific output budgets. The previous blanket 8,192-token allowance
 * let quiz chunks run to the cap and then repeat the entire expensive call.
 */
/**
 * Phase-specific output budgets. The previous blanket 8,192-token allowance
 * let quiz chunks run to the cap and then repeat the entire expensive call.
 *
 * Re-measured after per-option reviewRationale was added: on real runs the
 * application chunk reached 19,388/20,000 and the coverage-gap call hit its
 * 2,200 cap exactly, truncating the JSON so the gap fill was lost. Each budget
 * below now carries roughly 40% headroom over the worst observed usage.
 */
export const GENERATION_TOKEN_LIMITS = Object.freeze({
  lessonShell: 2500,
  quizChunk: 28000,
  coverageGap: 4000,
  quizQa: 4000
});

/**
 * Where a visual question is worth asking. Replaces the old flat "at least 1
 * visual per outcome" quota, which forced a visual tag onto purely verbal
 * outcomes and produced placeholder briefs.
 */
const VISUAL_FIT_RULE =
  'Use the visual modality ONLY where that outcome\'s content is genuinely visual, spatial or concrete — counting, quantities, shapes, position, parts of a thing, a comparison a learner could actually see drawn. Do NOT tag a question visual to satisfy a quota when the content is purely verbal or abstract.';

/** Bloom-banded chunk specs — together they form the outcome × bloom × modality matrix. */
export const QUIZ_CHUNKS = [
  {
    label: 'foundation',
    bloomFocus: () =>
      'bloomLevel "recall" and "understand" ONLY. Foundation checks of the basic facts and meanings.',
    matrixRule: () =>
      `For EACH outcome include at least 1 text_steps question (with steps[]). ${VISUAL_FIT_RULE}`
  },
  {
    label: 'application',
    bloomFocus: () => 'bloomLevel "apply" ONLY. Learners use the skill on new values/situations.',
    matrixRule: () =>
      `For EACH outcome include at least 1 text_steps scaffold (steps[] showing the working). ${VISUAL_FIT_RULE}`
  },
  {
    label: 'reasoning',
    bloomFocus: (band) =>
      band?.constrained
        ? `bloomLevel "reason" ONLY. Real-life reasoning, predict-the-outcome and best-choice decisions.
The difficulty in this part must come from the IDEA being tested, never from the sentence. The ${bandLimitsText(band)} ceiling above applies to every stem here with no exception — the reasoning band is NOT an exemption from it.
At this grade "real-life reasoning" means ONE short, concrete, familiar situation. It does not mean a multi-clause scenario, two cases to compare, a chain of events, or a stem that sets up a story before asking the question.`
        : 'bloomLevel "reason" ONLY. Real-life reasoning, predict-the-outcome and best-choice decisions.',
    matrixRule: () =>
      `Mostly practice modality; include at least 1 text_steps scaffold per outcome for learners who need the reasoning broken down. ${VISUAL_FIT_RULE}`
  }
];

const normalizeStemKey = (stem = '') =>
  String(stem).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 120);

/** Small gap between successive AI calls to stay under free-tier RPM limits. */
const AI_CALL_GAP_MS = 1200;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Bank composition summary stored on quiz.bankStats — lets admins see at a
 * glance whether the outcome × bloom × modality matrix was actually satisfied.
 */
export const computeBankStats = (questions = []) => {
  const stats = { total: questions.length, byBloom: {}, byModality: {}, byOutcome: {} };
  for (const q of questions) {
    const bloom = q.bloomLevel || 'unknown';
    const mod = q.modality || 'unknown';
    const oc = String(q.learningOutcomeIndex || 0);
    stats.byBloom[bloom] = (stats.byBloom[bloom] || 0) + 1;
    stats.byModality[mod] = (stats.byModality[mod] || 0) + 1;
    if (!stats.byOutcome[oc]) {
      stats.byOutcome[oc] = { total: 0, visual: 0, text_steps: 0, practice: 0 };
    }
    stats.byOutcome[oc].total += 1;
    if (stats.byOutcome[oc][mod] !== undefined) stats.byOutcome[oc][mod] += 1;
  }
  return stats;
};

const sanitizeContent = (content = '') => {
  // Protect {{term:…}} / {{example:…}} so #*_` stripping cannot corrupt marker payloads
  const markers = [];
  const protectedText = String(content || '').replace(
    /\{\{(term|example):([^}]*)\}\}/g,
    (match) => {
      markers.push(match);
      return `\u0000EMPH${markers.length - 1}\u0000`;
    }
  );
  let cleaned = protectedText
    .replace(/[#*_`]+/g, '')
    // Keep $…$ for KaTeX; strip only bare markdown-style leftovers
    .replace(/[📐🗣🔬🌍✝️🎨🎵🔥⭐✅❌]/g, '')
    .trim();
  cleaned = cleaned.replace(/\u0000EMPH(\d+)\u0000/g, (_, i) => markers[Number(i)] || '');
  return cleaned;
};

const reportProgress = (onProgress, percent, message) => {
  if (typeof onProgress === 'function') {
    onProgress({
      percent: Math.max(0, Math.min(100, Math.round(percent))),
      message: message || 'Working...'
    });
  }
};

/** Extract a JSON object/array from model text (handles fences + truncation noise). */
const extractJsonText = (text = '') => {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = (fenced ? fenced[1] : raw).trim();
  const startObj = candidate.indexOf('{');
  const startArr = candidate.indexOf('[');
  let start = -1;
  if (startObj >= 0 && startArr >= 0) start = Math.min(startObj, startArr);
  else start = Math.max(startObj, startArr);
  if (start > 0) candidate = candidate.slice(start);
  if (start < 0) return candidate;

  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) {
        return candidate.slice(0, i + 1);
      }
    }
  }
  return candidate;
};

export const parseOneLessonJson = (text, ctx, index) => {
  try {
    const jsonText = extractJsonText(text);
    let data = JSON.parse(jsonText);
    if (Array.isArray(data)) data = data[0] || {};
    return { data, parseFailed: false };
  } catch (parseError) {
    console.error('Failed to parse AI lesson JSON:', parseError?.message || parseError);
    return {
      data: {
        title: `Lesson ${index + 1}: ${ctx.subStrand.name}`,
        description: `A lesson about ${ctx.subStrand.name}`,
        contentType: 'reading',
        difficulty: 'beginner',
        content: `${ctx.subStrand.name} - Content here...`,
        learningObjectives: ctx.sourceOutcomes.slice(0, 2),
        tags: [],
        duration: 10,
        visualBriefs: [],
        quiz: { questions: [], passingScore: 70, timeLimit: 12 }
      },
      parseFailed: true
    };
  }
};

const mergeShellAndQuiz = (shell, quizPayload) => {
  const quiz =
    quizPayload?.quiz && typeof quizPayload.quiz === 'object'
      ? quizPayload.quiz
      : quizPayload?.questions
        ? { title: 'Quiz Challenge', questions: quizPayload.questions, passingScore: 65, timeLimit: 12 }
        : { title: 'Quiz Challenge', questions: [], passingScore: 65, timeLimit: 12 };
  return {
    ...shell,
    quiz: {
      title: quiz.title || 'Quiz Challenge',
      passingScore: Number(quiz.passingScore) || 65,
      timeLimit: Number(quiz.timeLimit) || 12,
      questions: Array.isArray(quiz.questions) ? quiz.questions : []
    }
  };
};

export const loadGenerationContext = async (subStrandId) => {
  const subStrand = await SubStrand.findById(subStrandId);
  if (!subStrand) throw new Error('Sub-strand not found');

  const strand = await Strand.findById(subStrand.strandId);
  if (!strand) throw new Error('Strand not found');

  const subject = await Subject.findById(subStrand.subjectId);
  if (!subject) throw new Error('Subject not found');

  const outcomes = (subStrand.learningOutcomes || [])
    .map(normalizeOutcomeText)
    .filter(Boolean);

  const grade = subject.grade;
  const gradeNumber = grade === 'K' ? 0 : parseInt(grade, 10);
  const complexityBand = getComplexityBand(gradeNumber);
  const ageGroup = complexityBand.ageGroup;

  const outcomesBlock =
    outcomes.length > 0
      ? outcomes.map((o, i) => `${i + 1}. ${o}`).join('\n')
      : '1. Understand the core ideas of this sub-strand';

  const queryText = [subject.name, strand.name, subStrand.name, ...outcomes.slice(0, 4)].join(' ');

  const exemplarChunks = await retrieveLessonExemplars({
    grade,
    subjectName: subject.name,
    topic: subStrand.name,
    queryText,
    topK: 3
  });
  const exemplarsBlock = formatExemplarsForPrompt(exemplarChunks);

  const profile = getSubjectProfile(subject.name);
  console.log(`Subject profile: ${profile.key} (${subject.name})`);

  return {
    subStrand,
    strand,
    subject,
    outcomes,
    grade,
    gradeNumber,
    ageGroup,
    complexityBand,
    outcomesBlock,
    exemplarsBlock,
    queryText,
    profile,
    sourceOutcomes:
      outcomes.length > 0 ? outcomes : ['Understand the core ideas of this sub-strand']
  };
};

const buildLessonShellPrompt = (ctx, lessonIndex, totalLessons) => {
  const { ageGroup, grade, subject, strand, subStrand, outcomesBlock, exemplarsBlock, profile } = ctx;
  const diagramTypeList = profile.allowedDiagramTypes.join('|');
  return `You are a Kenyan CBC tutor. Write ONE short lesson SHELL (lesson ${lessonIndex} of ${totalLessons}) for ${ageGroup} (Grade ${grade}).

Do NOT include quiz questions yet. Quiz comes in a later step.

RULES:
- Use ONLY the numbered outcomes below (exact wording in learningObjectives; pick 1–2).
- No markdown headings/bullets, no emojis.
- INLINE EMPHASIS: mark key vocabulary and examples inline using {{term:word}} for
  important vocabulary and {{example:word}} for specific examples. Use sparingly —
  only genuinely important terms/examples, not every noun. Example:
  "A {{term:pronoun}} is a word that replaces a noun. For example, {{example:he}}
  and {{example:she}} are pronouns."
  This is separate from the "no markdown headings/bullets/emojis" rule —
  this inline syntax is allowed and expected where relevant.
- Keep teaching SHORT: 2–3 short text blocks + diagrams between them.
- ${profile.mathRule}

${profile.teachingStyle}

Context: ${subject.name} · ${strand.name}${strand.theme ? ` · ${strand.theme}` : ''} · ${subStrand.name}
Outcomes:
${outcomesBlock}
Inquiry: ${(subStrand.keyInquiryQuestions || []).slice(0, 3).join(' | ') || 'N/A'}
${exemplarsBlock ? `\n${exemplarsBlock}\n` : ''}

TEACHING VISUALS: exactly 2 briefs vb-1, vb-2. diagramType ONLY: ${diagramTypeList}.
Pick the right type for the topic:
${profile.diagramGuidance}
Params content MUST match the teaching text (same numbers, words, steps).
Params MUST use each type's canonical fields from the guidance above (never invent alternate keys like boxes/detail for labeled_boxes).
Example labeled_boxes params: {"title":"Parts of a Plant","items":[{"label":"Roots","text":"Absorb water and hold the plant"},{"label":"Stem","text":"Carries water and holds the plant upright"}]}

Return ONLY one JSON object (no quiz questions):
{
  "title": "...",
  "description": "one short sentence",
  "contentType": "interactive",
  "difficulty": "beginner",
  "content": "plain text join of text blocks",
  "learningObjectives": ["exact outcome"],
  "tags": ["practice"],
  "duration": 10,
  "visualBriefs": [{"id":"vb-1","skillFocus":"...","diagramType":"labeled_boxes","params":{"title":"...","items":[{"label":"...","text":"..."}]},"brief":"..."}],
  "contentBlocks": [
    {"type":"text","text":"2–4 sentences with {{term:...}} / {{example:...}} where useful"},
    {"type":"diagram","briefId":"vb-1"},
    {"type":"text","text":"Short example or activity"}
  ]
}`;
};

export const buildQuizChunkPrompt = (
  ctx,
  shell,
  lessonIndex,
  totalLessons,
  chunk,
  avoidStems = [],
  quizExemplarsBlock = '',
  targetCount = CHUNK_SIZE
) => {
  const title = shell?.title || `Lesson ${lessonIndex}`;
  const objectives = (shell?.learningObjectives || ctx.sourceOutcomes.slice(0, 2))
    .map((o, i) => `${i + 1}. ${o}`)
    .join('\n');
  const { profile } = ctx;
  const band = ctx.complexityBand || getComplexityBand(ctx.gradeNumber);
  const ageGroup = ctx.ageGroup || band.ageGroup;
  const diagramTypeList = profile.allowedDiagramTypes.join('|');
  const avoidBlock =
    avoidStems.length > 0
      ? `\nDo NOT repeat or lightly reword any of these existing questions (use different values, situations and wording):\n${avoidStems
          .slice(0, 30)
          .map((s) => `- ${s.slice(0, 80)}`)
          .join('\n')}\n`
      : '';
  const concreteDiagramLine = prefersConcreteDiagrams(ctx.gradeNumber)
    ? `\nAt this grade prefer concrete figure types a child can literally count or point at — counting_circles, labeled_boxes, number_line, fraction_bars — over abstract flow or comparison boxes.`
    : '';
  const additionTemplateBlock = isGradeOneAdditionContext(ctx)
    ? `
GRADE 1 ADDITION TEMPLATE SLICE:
- The GRADE COMPLEXITY CEILING above applies in full to every template question: the rendered
  "question" and the "questionText" pattern must both fit inside it. So a template stem is ONE
  short sentence — "Amina has {a} beads and gets {b} more. How many now?" breaks the one-sentence
  rule; write "What is {a} + {b}?" or "Amina has {a} beads and gets {b} more — how many?" instead.
  A real-life word problem at this grade is still one sentence.
- For every TWO-OPERAND addition question, set template:true and include:
  questionText with both {a} and {b}; params:{a,b}; constraints; answerFormula:"a + b";
  distractorFormulas with at least 3 {id,formula,misconception} entries.
- Keep "question" and "options" rendered with the initial params for review.
- Derive constraints from the exact outcome:
  * two single digits: a:[1,9], b:[1,9], sumMax:10
  * two-digit + one-digit without regrouping: a:[10,99], b:[1,9], sumMax:100, noRegrouping:true
  * multiples of ten: a:[10,90], b:[10,90], aStep:10, bStep:10, sumMax:100
- Always include operation:"addition". Never exceed the outcome's sum limit.
- Formula results must be non-negative integers and never duplicate the correct answer or each other
  for ANY valid pair in the constraint range. Safe examples are a+b-1, a+b+1 and a+b+2.
- Three-addend and missing-pattern questions are not supported by this Phase 1 template engine:
  set template:false and omit all template-only fields for those questions.
- Include at least 4 valid template:true questions in this chunk when the selected outcomes permit it.
`
    : '';
  return `Create PART "${chunk.label}" of the adaptive QUIZ BANK for Kenyan CBC lesson "${title}" (lesson ${lessonIndex} of ${totalLessons}, Grade ${ctx.grade}, for ${ageGroup}).

Outcomes:
${objectives}
Topic: ${ctx.subject.name} · ${ctx.strand.name} · ${ctx.subStrand.name}
Teaching summary: ${String(shell?.content || '').slice(0, 400)}

${profile.quizStyle}

${buildComplexityBlock(ctx.grade, band, ageGroup)}

THIS PART: ${chunk.bloomFocus(band)}
${chunk.matrixRule(band)}
MODALITY MIX for ${ctx.subject.name}: ${profile.modalityMixText} Treat that as the intended overall balance for the whole bank, not a target to exceed.
${avoidBlock}${quizExemplarsBlock ? `\n${quizExemplarsBlock}\n` : ''}
Return ONLY one JSON object:
{
  "quiz": {
    "questions": [ /* EXACTLY ${targetCount} items */ ]
  }
}

COMPACT QUESTION SHAPE — include ONLY:
- question, options (3-4), correctAnswerIndex
- explanation (max 16 words)
- distractors:[{"optionIndex":number,"misconception":"max 8 words"}] for wrong options
- reviewRationale:[{"optionIndex":number,"text":"..."}] for EVERY option, correct and wrong
- learningOutcomeIndex, bloomLevel, modality, difficulty
Do NOT include id, type, points, skillFocus, optionExplanations, feedbackCorrect or feedbackIncorrect; the server adds them.

reviewRationale is ADMIN-REVIEW-ONLY and is never shown to a learner, so write it for an adult
reviewer: 1-2 full sentences, 20-30 words per option. For the correct option say precisely why it
is right; for each wrong option say exactly which wrong step, rule or misunderstanding produces it.
"explanation" (16 words) and each "misconception" (8 words) are the learner-facing strings and MUST
stay that short — put the longer reasoning in reviewRationale only, never in them.

Visual questions MUST include "diagram": { "diagramType": one of ${diagramTypeList}, "params":{...}, "brief":"..." }.
- "params" must hold real, specific values for THIS question — never {} and never generic placeholders.
- "brief" must describe the actual figure to draw, in your own words. Never restate the question as the brief.
- If you cannot design a genuine figure for a question, do NOT tag it visual — use practice or text_steps.${concreteDiagramLine}
text_steps questions MUST include steps[] (max 3 short steps).
NEVER reuse vb-1/vb-2 for quiz diagrams.
Match diagram type to topic. Diagram content must match the question exactly (same numbers, words, steps).
${additionTemplateBlock}
${profile.mathRule}
Keep every learner-facing string concise. Return complete valid JSON only — do not truncate. No markdown fences.`;
};

/** Flag generated questions that are near-verbatim copies of injected exemplars. */
export const flagNearDuplicateQuestions = (questions, exemplars, contextLabel = '') => {
  if (!Array.isArray(questions) || questions.length === 0) return questions || [];
  if (!Array.isArray(exemplars) || exemplars.length === 0) return questions;

  const exemplarTexts = exemplars.map((e) => String(e.question_text || e.content || ''));
  return questions.map((q) => {
    const stem = String(q?.question || '');
    let maxRatio = 0;
    for (const ex of exemplarTexts) {
      const ratio = tokenOverlapRatio(stem, ex);
      if (ratio > maxRatio) maxRatio = ratio;
    }
    if (maxRatio >= QUIZ_EXEMPLAR_NEAR_DUP_THRESHOLD) {
      console.warn(
        `Near-duplicate quiz stem flagged${contextLabel ? ` (${contextLabel})` : ''}: ratio=${maxRatio.toFixed(3)} — "${stem.slice(0, 80)}"`
      );
      return { ...q, flagged_near_duplicate: true };
    }
    return q;
  });
};

/** Extract questions[] from a parsed chunk payload (tolerates both shapes). */
export const chunkQuestions = (payload) => {
  if (Array.isArray(payload?.quiz?.questions)) return payload.quiz.questions;
  if (Array.isArray(payload?.questions)) return payload.questions;
  return [];
};

/** 1-based learningOutcomeIndex coverage against target outcome list. */
export const checkOutcomeCoverage = (questions, targetOutcomes = []) => {
  const coveredOutcomeIndices = new Set(
    (questions || [])
      .map((q) => Number(q.learningOutcomeIndex))
      .filter((idx) => Number.isFinite(idx) && idx >= 1)
  );
  const uncovered = (targetOutcomes || [])
    .map((_, i) => i + 1)
    .filter((idx) => !coveredOutcomeIndices.has(idx));
  return { coveredOutcomeIndices, uncovered };
};

const resolveTargetOutcomes = (shell, ctx) => {
  let target = Array.isArray(shell?.learningObjectives)
    ? shell.learningObjectives
        .map((obj) => {
          const idx = matchObjectiveToOutcomes(obj, ctx.sourceOutcomes);
          return idx >= 0 ? ctx.sourceOutcomes[idx] : null;
        })
        .filter(Boolean)
    : [];
  if (target.length === 0) {
    target = ctx.sourceOutcomes.slice(0, Math.min(2, ctx.sourceOutcomes.length));
  }
  return target;
};

const buildCoverageGapPrompt = (ctx, shell, targetOutcomes, uncoveredIndices, avoidStems = []) => {
  const title = shell?.title || 'Lesson';
  const uncoveredBlock = uncoveredIndices
    .map((idx) => `${idx}. ${targetOutcomes[idx - 1] || ''}`)
    .filter((line) => line.length > 3)
    .join('\n');
  const allOutcomes = targetOutcomes.map((o, i) => `${i + 1}. ${o}`).join('\n');
  const avoidBlock =
    avoidStems.length > 0
      ? `\nDo NOT repeat or lightly reword any of these existing questions:\n${avoidStems
          .slice(0, 30)
          .map((s) => `- ${String(s).slice(0, 80)}`)
          .join('\n')}\n`
      : '';
  const count = Math.min(3, Math.max(2, uncoveredIndices.length));
  const band = ctx.complexityBand || getComplexityBand(ctx.gradeNumber);
  const ageGroup = ctx.ageGroup || band.ageGroup;
  return `Create ${count} multiple-choice quiz questions for Kenyan CBC lesson "${title}" (Grade ${ctx.grade}, for ${ageGroup}).

These learning outcomes currently have NO questions — you MUST cover them (use the exact learningOutcomeIndex shown):
${uncoveredBlock}

All lesson outcomes (for index reference):
${allOutcomes}
Topic: ${ctx.subject.name} · ${ctx.strand.name} · ${ctx.subStrand.name}

${buildComplexityBlock(ctx.grade, band, ageGroup)}
${avoidBlock}
Use bloomLevel "understand" or "apply" (mix). Use the same COMPACT shape as the main bank:
question, options(3-4), correctAnswerIndex, explanation (max 16 words), distractors[{optionIndex,misconception max 8 words}], reviewRationale[{optionIndex,text}] for EVERY option, learningOutcomeIndex (from the uncovered list), bloomLevel, modality (visual|text_steps|practice), difficulty (easy|intermediate|advanced).
reviewRationale is admin-review-only: 1-2 sentences, 20-30 words per option, saying precisely why that option is right or exactly what mistake produces it. Keep "explanation" and "misconception" as short as stated — they are learner-facing.
Only tag a question visual when its content is genuinely visual, and then include a real "diagram" object with specific params. Otherwise use practice or text_steps.
Do NOT include id, type, points, skillFocus, optionExplanations or feedback fields; the server adds them.
Return ONLY one JSON object:
{ "quiz": { "questions": [ /* exactly ${count} items */ ] } }
No markdown fences.`;
};

/** Make room so coverage questions are not sliced off when bank is already at BANK_SIZE. */
const makeRoomForCoverageQuestions = (bankQuestions, addCount) => {
  const need = Math.max(0, bankQuestions.length + addCount - BANK_SIZE);
  if (need <= 0) return;
  let removed = 0;
  while (removed < need && bankQuestions.length > 0) {
    const redundantIdx = bankQuestions.findIndex((q) => {
      const oi = Number(q.learningOutcomeIndex);
      if (!Number.isFinite(oi)) return true;
      return bankQuestions.filter((x) => Number(x.learningOutcomeIndex) === oi).length > 1;
    });
    const dropAt = redundantIdx >= 0 ? redundantIdx : 0;
    bankQuestions.splice(dropAt, 1);
    removed++;
  }
};

export const buildCoverageReport = (questions = [], outcomes = []) => {
  const realCovered = [];
  const remapped = [];
  const stillMissing = [];
  for (let i = 0; i < outcomes.length; i++) {
    const idx = i + 1;
    const forOutcome = questions.filter((q) => Number(q.learningOutcomeIndex) === idx);
    if (forOutcome.length === 0) {
      stillMissing.push(idx);
    } else if (forOutcome.some((q) => !q.coverage_remapped)) {
      realCovered.push(idx);
    } else {
      remapped.push(idx);
    }
  }
  return {
    realCovered,
    remapped,
    stillMissing,
    outcomes: [...outcomes]
  };
};

/**
 * Batched QA over the full bank. Env-gated via QUIZ_QA_ENABLED (default on).
 * Fail soft: returns questions unchanged on error / unparseable JSON.
 */
export const isQuizQaEnabled = () =>
  process.env.QUIZ_QA_ENABLED !== 'false' && process.env.QUIZ_QA_ENABLED !== '0';

export const runQuizQAPass = async (
  questions,
  { label = '', generateContentFn = null, ctx = null } = {}
) => {
  if (!Array.isArray(questions) || questions.length === 0) return questions;
  if (!isQuizQaEnabled()) return questions;

  const band = ctx?.complexityBand || getComplexityBand(ctx?.gradeNumber);
  const grade = ctx?.grade ?? 'unspecified';
  const ageGroup = ctx?.ageGroup || band.ageGroup;
  const subjectName = ctx?.subject?.name || 'unspecified';

  const complexityCheck = band.constrained
    ? `5. Is the question too complex for Grade ${grade}? At this grade the ceiling is:
${band.rules.map((rule) => `   - ${rule}`).join('\n')}
   Each question below carries "w" (word count of the stem) and "s" (sentence count), already counted for you.
   A stem with w > ${band.maxWords}, or s > ${band.maxSentences}, or one of the clause structures listed above, EXCEEDS the ceiling.
6. Has the stem been over-compressed? Flag it as "does not ask a question" if it is a bare statement or a comma splice that never actually asks anything, e.g. "A girl has 61 shillings, finds 7 more."`
    : `5. Is the question text unnecessarily wordy or convoluted for ${ageGroup}? Each question carries "w" (stem word count) and "s" (sentence count).`;

  const complexityInstruction = band.constrained
    ? `DO fail a question that is too complex for Grade ${grade}: over ${band.maxWords} words, over ${band.maxSentences} sentence${band.maxSentences === 1 ? '' : 's'}, a forbidden clause structure, a multi-part scenario, two cases to compare, or vocabulary above the grade. Start the issue text with "too complex for grade" and then give the specific reason, e.g. "too complex for grade: 26 words, 3 sentences".`
    : `DO fail a question that is genuinely too wordy or convoluted for ${ageGroup}. Start the issue text with "too complex for grade" and give the specific reason.`;

  const qaPrompt = `
You are QA-checking a set of multiple-choice questions for a children's CBC learning app.

GRADE: ${grade} (${ageGroup}). SUBJECT: ${subjectName}.

For each question below, check:
1. Does it have EXACTLY ONE unambiguously correct answer given the options provided?
2. Are the distractors (wrong options) plausible but clearly incorrect — not accidentally also defensible as correct?
3. Is the question text clear and age-appropriate for Grade ${grade}, with no ambiguous wording?
4. Is there any factual error in the question or the marked correct answer?
${complexityCheck}

Return ONLY a compact JSON array, one entry per question in the same order:
{"i":number,"ok":boolean} for a passing question.
{"i":number,"ok":false,"issue":"max 18 words"} for a genuine problem.

Only set passes_qa to false for genuine problems (ambiguity, multiple valid answers, factual error, unclear wording, over-complexity for the grade).
Do not fail a question just for being easy or simple — that's expected for some Bloom levels.
${complexityInstruction}
Judge complexity against the stated grade only, never against what would suit an older learner.

QUESTIONS:
${JSON.stringify(
  questions.map((q, i) => ({
    i,
    q: q.question,
    o: q.options,
    a: q.correctAnswerIndex,
    b: q.bloomLevel || null,
    w: countStemWords(q.question),
    s: countStemSentences(q.question)
  }))
)}
`;

  const runGenerate = generateContentFn || generateContent;

  try {
    await sleep(AI_CALL_GAP_MS);
    const { text } = await runGenerate({
      prompt: qaPrompt,
      maxTokens: GENERATION_TOKEN_LIMITS.quizQa,
      label: label ? `${label} quiz QA` : 'quiz QA'
    });
    const jsonText = extractJsonText(text);
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) {
      console.warn('Quiz QA pass: expected JSON array — skipping flags');
      return questions;
    }
    for (const entry of parsed) {
      const idx = Number(entry?.i ?? entry?.question_index ?? entry?.index);
      if (!Number.isFinite(idx) || idx < 0 || idx >= questions.length) continue;
      const passes = entry?.ok ?? entry?.passes_qa;
      if (passes === false) {
        questions[idx].qa_flagged = true;
        questions[idx].qa_issue = String(entry.issue || 'Flagged by automated QA').slice(0, 280);
      }
    }
    const flaggedCount = questions.filter((q) => q.qa_flagged).length;
    console.log(
      `Quiz QA pass${label ? ` (${label})` : ''}: ${flaggedCount}/${questions.length} flagged`
    );
  } catch (err) {
    console.warn(
      `Quiz QA pass failed${label ? ` (${label})` : ''} — continuing without flags:`,
      err?.message || err
    );
  }
  return questions;
};

const mapGeneratedLesson = (lesson, index, ctx) => {
  const { subStrand, subject, sourceOutcomes } = ctx;

  let learningObjectives = Array.isArray(lesson.learningObjectives)
    ? lesson.learningObjectives
        .map((obj) => {
          const idx = matchObjectiveToOutcomes(obj, sourceOutcomes);
          return idx >= 0 ? sourceOutcomes[idx] : null;
        })
        .filter(Boolean)
    : [];

  if (learningObjectives.length === 0) {
    learningObjectives = sourceOutcomes.slice(0, Math.min(2, sourceOutcomes.length));
  }

  const teachingBriefs = normalizeVisualBriefs(lesson.visualBriefs, learningObjectives, ctx.profile);
  const quizResult = normalizeQuiz(
    lesson.quiz,
    learningObjectives.length ? learningObjectives : sourceOutcomes,
    ctx.profile,
    { additionTemplates: isGradeOneAdditionContext(ctx), gradeNumber: ctx.gradeNumber }
  );
  const outcomesForQuiz = learningObjectives.length ? learningObjectives : sourceOutcomes;
  const { questionBriefs, downgradedVisuals: _downgraded, ...quizNormalized } = quizResult;
  const visualBriefs = [...teachingBriefs, ...questionBriefs];
  const contentBlocks = normalizeContentBlocks(
    lesson.contentBlocks,
    teachingBriefs,
    sanitizeContent(lesson.content || '')
  );
  const content = contentFromBlocks(contentBlocks) || sanitizeContent(lesson.content || '');
  const coverageReport = buildCoverageReport(quizNormalized.questions, outcomesForQuiz);

  return {
    title: lesson.title || `Lesson ${index + 1}: ${subStrand.name}`,
    description: lesson.description || '',
    strandId: subStrand.strandId,
    subStrandId: subStrand.id,
    subjectId: subStrand.subjectId,
    grade: subject.grade,
    contentType: lesson.contentType || 'interactive',
    difficulty: lesson.difficulty || 'beginner',
    tags: lesson.tags || [],
    duration: lesson.duration || 10,
    content,
    learningObjectives,
    keyConcepts: lesson.keyConcepts || [],
    examples: lesson.examples || [],
    summary: lesson.summary || '',
    isAIGenerated: true,
    status: 'pending',
    lessonOrder: lesson.lessonOrder ?? index + 1,
    quiz: {
      ...quizNormalized,
      bankStats: computeBankStats(quizNormalized.questions),
      coverageReport,
      visualBriefs,
      contentBlocks,
      visualAssets: []
    },
    visualBriefs,
    contentBlocks
  };
};

/**
 * Generate lessons one-at-a-time.
 * Shell (content+visuals) and quiz are SEPARATE Gemini calls so the quiz is not truncated.
 * onProgress?: ({ percent, message }) => void
 */
export const generateLessonsFromSubStrand = async (
  subStrandId,
  numberOfLessons = 2,
  onProgress = null
) => {
  try {
    if (numberOfLessons > 5) {
      throw new Error('Maximum 5 lessons can be generated at a time');
    }

    const total = Math.max(1, Number(numberOfLessons) || 2);
    reportProgress(onProgress, 4, 'Loading curriculum…');
    const ctx = await loadGenerationContext(subStrandId);

    reportProgress(onProgress, 12, 'Retrieving exam exemplars…');

    const lessons = [];
    const MIN_TOTAL_QUESTIONS = 20;

    for (let i = 0; i < total; i++) {
      const span = 78 / total;
      const start = 14 + i * span;

      // ——— Phase 1: lesson shell (no quiz) ———
      reportProgress(
        onProgress,
        start,
        `Lesson ${i + 1}/${total}: writing content…`
      );
      const { text: shellText } = await generateContent({
        prompt: buildLessonShellPrompt(ctx, i + 1, total),
        maxTokens: GENERATION_TOKEN_LIMITS.lessonShell,
        label: `lesson ${i + 1} shell`,
        onWait: (msg) => reportProgress(onProgress, start, msg)
      });
      let { data: shell, parseFailed: shellFailed } = parseOneLessonJson(shellText, ctx, i);
      if (shellFailed) {
        console.warn(`Lesson ${i + 1}: shell parse failed — retrying shell…`);
        reportProgress(onProgress, start + span * 0.2, `Lesson ${i + 1}: retrying content…`);
        await sleep(AI_CALL_GAP_MS);
        const { text: retryText } = await generateContent({
          prompt: buildLessonShellPrompt(ctx, i + 1, total),
          maxTokens: GENERATION_TOKEN_LIMITS.lessonShell,
          label: `lesson ${i + 1} shell retry`
        });
        const retryParsed = parseOneLessonJson(retryText, ctx, i);
        if (!retryParsed.parseFailed) shell = retryParsed.data;
      }

      // ——— Phase 2: quiz bank in bloom-banded chunks (small JSON per call) ———
      const bankQuestions = [];
      const seenStems = new Set();

      const appendChunkQuestions = (rawQuestions, chunkIdx) => {
        let added = 0;
        for (const q of rawQuestions) {
          const stemKey = normalizeStemKey(q?.question);
          if (!stemKey || seenStems.has(stemKey)) continue;
          seenStems.add(stemKey);
          // Strip AI ids — they collide across chunks; normalizeQuiz reassigns by index
          const { id: _id, diagramBriefId: _dbid, ...rest } = q || {};
          bankQuestions.push({ ...rest, _chunk: chunkIdx });
          added++;
        }
        return added;
      };

      if (!isGradeOneAdditionContext(ctx)) {
        try {
          const { pullApprovedBankQuestions } = await import('./questionBankService.js');
          const pulled = await pullApprovedBankQuestions({
            subStrandId: ctx.subStrand.id,
            grade: ctx.grade,
            count: BANK_SIZE
          });
          const added = appendChunkQuestions(pulled, 'bank');
          console.log(
            `Lesson ${i + 1}: pulled ${added} approved question-bank entries (${pulled.length} candidates)`
          );
        } catch (bankErr) {
          console.warn(
            `Lesson ${i + 1}: question-bank pull skipped:`,
            bankErr.message || bankErr
          );
        }
      }

      for (let c = 0; c < QUIZ_CHUNKS.length; c++) {
        if (bankQuestions.length >= BANK_SIZE) break;
        const chunk = QUIZ_CHUNKS[c];
        reportProgress(
          onProgress,
          start + span * (0.4 + 0.18 * c),
          `Lesson ${i + 1}/${total}: quiz bank part ${c + 1}/${QUIZ_CHUNKS.length} (${chunk.label})…`
        );

        let quizExemplars = [];
        try {
          quizExemplars = await retrieveQuizExemplars({
            subjectName: ctx.subject.name,
            grade: ctx.grade,
            topic: ctx.subStrand.name,
            bloomBand: chunk.label,
            queryText: ctx.queryText
          });
        } catch (retErr) {
          console.warn(
            `Lesson ${i + 1}: quiz exemplar retrieve failed (${chunk.label}):`,
            retErr.message || retErr
          );
          quizExemplars = [];
        }
        const quizExemplarsBlock = formatQuizExemplarsForPrompt(quizExemplars);

        let chunkAdded = 0;
        for (let attempt = 0; attempt < 2; attempt++) {
          await sleep(AI_CALL_GAP_MS);
          let chunkText;
          try {
            const remaining = Math.max(0, BANK_SIZE - bankQuestions.length);
            if (remaining < 1) break;
            const targetCount = Math.min(CHUNK_SIZE, remaining);
            const attemptAvoidStems = bankQuestions.map((q) => String(q.question || ''));
            const chunkResult = await generateContent({
              prompt: buildQuizChunkPrompt(
                ctx,
                shell,
                i + 1,
                total,
                chunk,
                attemptAvoidStems,
                quizExemplarsBlock,
                targetCount
              ),
              maxTokens: GENERATION_TOKEN_LIMITS.quizChunk,
              label: `lesson ${i + 1} quiz ${chunk.label}`,
              onWait: (msg) =>
                reportProgress(onProgress, start + span * (0.4 + 0.18 * c), msg)
            });
            chunkText = chunkResult.text;
          } catch (chunkError) {
            // Quota fully exhausted or hard failure — keep what we have
            console.error(
              `Lesson ${i + 1}: chunk "${chunk.label}" failed: ${chunkError.message || chunkError}`
            );
            break;
          }
          const parsed = parseOneLessonJson(chunkText, ctx, i);
          if (!parsed.parseFailed) {
            const flagged = flagNearDuplicateQuestions(
              chunkQuestions(parsed.data),
              quizExemplars,
              `lesson ${i + 1} ${chunk.label}`
            );
            chunkAdded += appendChunkQuestions(flagged, c);
          }
          if (chunkAdded >= MIN_CHUNK_QUESTIONS) break;
          if (attempt === 0) {
            console.warn(
              `Lesson ${i + 1}: chunk "${chunk.label}" returned ${chunkAdded} usable qs — retrying chunk…`
            );
          }
        }
        console.log(
          `Lesson ${i + 1}: chunk "${chunk.label}" contributed ${chunkAdded} questions (bank now ${bankQuestions.length})`
        );
      }

      if (bankQuestions.length < MIN_TOTAL_QUESTIONS) {
        console.warn(
          `Lesson ${i + 1}: bank has only ${bankQuestions.length}/${BANK_SIZE} questions — adaptive selection will be limited`
        );
        reportProgress(
          onProgress,
          start + span * 0.92,
          `Warning: lesson ${i + 1} quiz bank has only ${bankQuestions.length}/${BANK_SIZE} questions (quota or parse issues). You can top it up later.`
        );
      }

      // ——— Outcome coverage enforcement (targeted regen before normalize remap) ———
      const targetOutcomes = resolveTargetOutcomes(shell, ctx);
      let { uncovered } = checkOutcomeCoverage(bankQuestions, targetOutcomes);
      if (uncovered.length > 0) {
        reportProgress(
          onProgress,
          start + span * 0.9,
          `Lesson ${i + 1}: filling uncovered outcomes…`
        );
        try {
          await sleep(AI_CALL_GAP_MS);
          const avoidStems = bankQuestions.map((q) => String(q.question || ''));
          const { text: gapText } = await generateContent({
            prompt: buildCoverageGapPrompt(ctx, shell, targetOutcomes, uncovered, avoidStems),
            maxTokens: GENERATION_TOKEN_LIMITS.coverageGap,
            label: `lesson ${i + 1} coverage gap`,
            onWait: (msg) => reportProgress(onProgress, start + span * 0.9, msg)
          });
          const gapParsed = parseOneLessonJson(gapText, ctx, i);
          if (!gapParsed.parseFailed) {
            const gapQs = chunkQuestions(gapParsed.data);
            makeRoomForCoverageQuestions(bankQuestions, gapQs.length);
            const added = appendChunkQuestions(gapQs, 'coverage');
            console.log(
              `Lesson ${i + 1}: coverage gap fill added ${added} questions for outcomes [${uncovered.join(', ')}]`
            );
          } else {
            console.warn(`Lesson ${i + 1}: coverage gap fill parse failed — will remap in normalizeQuiz`);
          }
        } catch (gapErr) {
          console.warn(
            `Lesson ${i + 1}: coverage gap fill failed — will remap in normalizeQuiz:`,
            gapErr?.message || gapErr
          );
        }
        ({ uncovered } = checkOutcomeCoverage(bankQuestions, targetOutcomes));
        if (uncovered.length > 0) {
          console.warn(
            `Lesson ${i + 1}: still uncovered after targeted regen: [${uncovered.join(', ')}] — normalizeQuiz may remap`
          );
        }
      }

      const merged = mergeShellAndQuiz(shell, {
        quiz: {
          title: 'Quiz Challenge',
          passingScore: 65,
          timeLimit: 12,
          questions: bankQuestions.slice(0, BANK_SIZE)
        }
      });

      const mapped = mapGeneratedLesson(merged, i, ctx);
      const report = mapped.quiz?.coverageReport;
      if (report) {
        console.log(
          `Lesson ${i + 1} coverage: real=[${report.realCovered.join(',')}] remapped=[${report.remapped.join(',')}] missing=[${report.stillMissing.join(',')}]`
        );
      }
      if ((mapped.quiz?.questions || []).length === 0) {
        console.error(`Lesson ${i + 1} still has empty quiz after split+retry`);
      } else {
        console.log(
          `Lesson ${i + 1} ready: ${(mapped.quiz?.questions || []).length} questions`
        );
      }

      // ——— Batched QA pass (QUIZ_QA_ENABLED, default on) ———
      if (isQuizQaEnabled() && (mapped.quiz?.questions || []).length > 0) {
        reportProgress(onProgress, start + span * 0.93, `Lesson ${i + 1}: running quiz QA…`);
        await runQuizQAPass(mapped.quiz.questions, { label: `lesson ${i + 1}`, ctx });
      }

      lessons.push(mapped);

      reportProgress(onProgress, start + span * 0.95, `Lesson ${i + 1} of ${total} ready`);
    }

    reportProgress(onProgress, 94, 'Preparing to save…');
    return lessons;
  } catch (error) {
    console.error('Error generating lessons from sub-strand:', error);
    throw error;
  }
};

/**
 * Top up an existing lesson's quiz bank to BANK_SIZE without regenerating the
 * lesson (keeps content, teaching visuals and any admin-approved assets).
 * Runs the same bloom-banded chunk calls, skipping stems already in the bank.
 */
export const topUpLessonQuizBank = async (lessonId) => {
  const { Lesson } = await import('../../models/Lesson.js');
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new Error('Lesson not found');
  if (!lesson.subStrandId) throw new Error('Lesson has no sub-strand');

  const existing = lesson.quiz?.questions || [];
  if (existing.length >= BANK_SIZE) {
    return {
      lesson,
      added: 0,
      bankSize: existing.length,
      bankStats: computeBankStats(existing)
    };
  }

  const ctx = await loadGenerationContext(lesson.subStrandId);
  const outcomes =
    lesson.learningObjectives?.length > 0 ? lesson.learningObjectives : ctx.sourceOutcomes;
  const shellLike = {
    title: lesson.title,
    learningObjectives: outcomes,
    content: lesson.content
  };

  const seenStems = new Set(existing.map((q) => normalizeStemKey(q.question)));
  const existingIds = new Set(existing.map((q) => q.id).filter(Boolean));
  const existingBankIds = existing.map((q) => q.bankEntryId).filter(Boolean);
  const newRaw = [];
  const needed = BANK_SIZE - existing.length;

  if (!isGradeOneAdditionContext(ctx)) {
    try {
      const { pullApprovedBankQuestions } = await import('./questionBankService.js');
      const pulled = await pullApprovedBankQuestions({
        subStrandId: ctx.subStrand.id,
        grade: ctx.grade,
        count: needed,
        excludeBankEntryIds: existingBankIds
      });
      for (const q of pulled) {
        const stemKey = normalizeStemKey(q?.question);
        if (!stemKey || seenStems.has(stemKey)) continue;
        seenStems.add(stemKey);
        newRaw.push(q);
      }
      console.log(`Top-up: pulled ${newRaw.length} approved question-bank entries`);
    } catch (bankErr) {
      console.warn('Top-up: question-bank pull skipped:', bankErr.message || bankErr);
    }
  }

  for (const chunk of QUIZ_CHUNKS) {
    if (newRaw.length >= needed) break;
    const avoidStems = [
      ...existing.map((q) => String(q.question || '')),
      ...newRaw.map((q) => String(q.question || ''))
    ];

    let quizExemplars = [];
    try {
      quizExemplars = await retrieveQuizExemplars({
        subjectName: ctx.subject.name,
        grade: ctx.grade,
        topic: ctx.subStrand.name,
        bloomBand: chunk.label,
        queryText: ctx.queryText
      });
    } catch (retErr) {
      console.warn(
        `Top-up quiz exemplar retrieve failed (${chunk.label}):`,
        retErr.message || retErr
      );
      quizExemplars = [];
    }
    const quizExemplarsBlock = formatQuizExemplarsForPrompt(quizExemplars);

    await sleep(AI_CALL_GAP_MS);
    let chunkText;
    try {
      const targetCount = Math.min(CHUNK_SIZE, needed - newRaw.length);
      const chunkResult = await generateContent({
        prompt: buildQuizChunkPrompt(
          ctx,
          shellLike,
          1,
          1,
          chunk,
          avoidStems,
          quizExemplarsBlock,
          targetCount
        ),
        maxTokens: GENERATION_TOKEN_LIMITS.quizChunk,
        label: `top-up ${chunk.label}`
      });
      chunkText = chunkResult.text;
    } catch (error) {
      console.error(`Top-up chunk "${chunk.label}" failed: ${error.message || error}`);
      continue;
    }
    const parsed = parseOneLessonJson(chunkText, ctx, 0);
    if (parsed.parseFailed) continue;
    const flagged = flagNearDuplicateQuestions(
      chunkQuestions(parsed.data),
      quizExemplars,
      `top-up ${chunk.label}`
    );
    for (const q of flagged) {
      const stemKey = normalizeStemKey(q?.question);
      if (!stemKey || seenStems.has(stemKey)) continue;
      seenStems.add(stemKey);
      const { id: _id, diagramBriefId: _dbid, ...rest } = q || {};
      newRaw.push(rest);
    }
  }

  if (newRaw.length === 0) {
    return {
      lesson,
      added: 0,
      bankSize: existing.length,
      bankStats: computeBankStats(existing)
    };
  }

  // Assign collision-free ids BEFORE normalizing so diagram briefs line up
  let idCounter = existing.length;
  const rawWithIds = newRaw.slice(0, needed).map((q) => {
    do {
      idCounter += 1;
    } while (existingIds.has(`q-${idCounter}`));
    return { ...q, id: `q-${idCounter}` };
  });

  const normalized = normalizeQuiz({ questions: rawWithIds }, outcomes, ctx.profile, {
    additionTemplates: isGradeOneAdditionContext(ctx),
    gradeNumber: ctx.gradeNumber
  });

  // QA only the newly added batch (existing questions already reviewed / flagged)
  if (isQuizQaEnabled() && normalized.questions.length > 0) {
    await runQuizQAPass(normalized.questions, {
      label: `top-up ${lessonId.slice(0, 8)}`,
      ctx
    });
  }

  // Canonicalize difficulty on the full bank at save (fixes older medium/hard drift too)
  const mergedQuestions = [...existing, ...normalized.questions].map((q) => ({
    ...q,
    difficulty: normalizeDifficulty(q.difficulty, {
      questionId: q.id,
      context: 'top-up-save'
    })
  }));
  const mergedBriefs = [
    ...(lesson.quiz?.visualBriefs || []),
    ...normalized.questionBriefs
  ];
  const coverageReport = buildCoverageReport(mergedQuestions, outcomes);

  const quiz = {
    ...(lesson.quiz || {}),
    questions: mergedQuestions,
    visualBriefs: mergedBriefs,
    bankStats: computeBankStats(mergedQuestions),
    coverageReport
  };

  let updated = await Lesson.update(lessonId, { quiz });

  // Render diagrams for the new visual questions on approved lessons
  if (lesson.status === 'approved' && normalized.questionBriefs.length > 0) {
    try {
      const { attachEducationalVisuals } = await import('./lessonMediaService.js');
      updated = await attachEducationalVisuals(lessonId, { force: true });
    } catch (mediaError) {
      console.error('Top-up saved but visuals failed:', mediaError.message || mediaError);
    }
  }

  console.log(
    `Top-up: lesson ${lessonId} bank ${existing.length} → ${mergedQuestions.length} questions`
  );

  try {
    const { recordLessonBankServes } = await import('./questionBankService.js');
    await recordLessonBankServes([updated]);
  } catch (serveErr) {
    console.warn('Top-up bank-serve log skipped:', serveErr.message || serveErr);
  }

  return {
    lesson: updated,
    added: normalized.questions.length,
    bankSize: mergedQuestions.length,
    bankStats: quiz.bankStats
  };
};
