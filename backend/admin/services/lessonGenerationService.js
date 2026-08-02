import { getModel } from '../../config/gemini.js';
import { SubStrand } from '../../models/SubStrand.js';
import { Strand } from '../../models/Strand.js';
import { Subject } from '../../models/Subject.js';
import { outcomeKey, normalizeOutcomeText } from '../../utils/outcomeKey.js';
import { DIAGRAM_TYPES } from './diagramTemplates.js';
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
const normalizeQuiz = (quiz, outcomes, profile) => {
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

  const questions = quiz.questions.map((q, qi) => {
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

    const bloom = BLOOM_LEVELS.has(q.bloomLevel)
      ? q.bloomLevel
      : q.difficulty === 'advanced'
        ? 'reason'
        : q.difficulty === 'intermediate'
          ? 'apply'
          : 'recall';

    let modality = String(q.modality || '').trim();
    if (!QUESTION_MODALITIES.has(modality)) {
      modality = assignDefaultModality(qi, profile);
    }

    const qid = q.id || `q-${qi + 1}`;
    let diagramBriefId = null;

    if (modality === 'visual') {
      const embedded = q.diagram && typeof q.diagram === 'object' ? q.diagram : null;
      const skillFocus = (q.skillFocus || outcomeText || 'core skill').slice(0, 120);
      const stem = String(q.question || '');
      let diagramType = String(
        embedded?.diagramType || q.diagramType || ''
      ).trim();
      if (!DIAGRAM_TYPES.has(diagramType)) {
        diagramType = inferDiagramType(
          `${embedded?.brief || ''} ${stem} ${skillFocus}`,
          skillFocus
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
        brief:
          normalizeOutcomeText(embedded?.brief || q.diagramBrief || '') ||
          `Figure for: ${stem.slice(0, 100)}`,
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
      options,
      correctAnswerIndex,
      explanation: q.explanation || '',
      optionExplanations: q.optionExplanations || options.map(() => ''),
      feedbackCorrect: q.feedbackCorrect || 'Well done!',
      feedbackIncorrect: q.feedbackIncorrect || 'Review this skill and try again.',
      difficulty: q.difficulty || 'easy',
      points: Number(q.points) || 15,
      learningOutcomeIndex: outcomeIndex,
      learningOutcomeKey: outcomeKey(outcomeText),
      skillFocus: (q.skillFocus || outcomeText || 'core skill').slice(0, 120),
      bloomLevel: bloom,
      distractors,
      modality,
      diagramBriefId: modality === 'visual' ? diagramBriefId : null,
      steps: modality === 'text_steps' ? steps || [] : undefined,
      ...(q.flagged_near_duplicate ? { flagged_near_duplicate: true } : {})
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
        covered.add(idx);
      }
    });
  }

  return {
    title: quiz.title || 'Quiz Challenge',
    questions,
    passingScore: Number(quiz.passingScore) || 65,
    timeLimit: Number(quiz.timeLimit) || 12,
    questionBriefs
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
      const params =
        b.params && typeof b.params === 'object'
          ? { ...defaultParamsHint(diagramType), ...b.params }
          : defaultParamsHint(diagramType);

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

/** Bloom-banded chunk specs — together they form the outcome × bloom × modality matrix. */
const QUIZ_CHUNKS = [
  {
    label: 'foundation',
    bloomFocus:
      'bloomLevel "recall" and "understand" ONLY. Foundation checks of the basic facts and meanings.',
    matrixRule:
      'For EACH outcome include at least 1 visual question and at least 1 text_steps question (with steps[]).'
  },
  {
    label: 'application',
    bloomFocus:
      'bloomLevel "apply" ONLY. Learners use the skill on new values/situations.',
    matrixRule:
      'For EACH outcome include at least 1 text_steps scaffold (steps[] showing the working) and at least 1 visual question.'
  },
  {
    label: 'reasoning',
    bloomFocus:
      'bloomLevel "reason" ONLY. Real-life reasoning, predict-the-outcome and best-choice decisions.',
    matrixRule:
      'Mostly practice modality; include at least 1 text_steps scaffold per outcome for learners who need the reasoning broken down.'
  }
];

const normalizeStemKey = (stem = '') =>
  String(stem).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 120);

/** Small gap between successive AI calls to stay under free-tier RPM limits. */
const AI_CALL_GAP_MS = 1200;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isQuotaError = (error) => {
  const msg = String(error?.message || error || '');
  return /429|too many requests|quota|rate limit|resource.?exhausted/i.test(msg);
};

/**
 * Call Gemini and return response text, backing off and retrying on 429/quota
 * errors instead of failing the whole lesson. Non-quota errors rethrow.
 */
const generateWithBackoff = async (model, prompt, { label = '', onWait = null } = {}) => {
  const waits = [15000, 30000];
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return (await result.response).text();
    } catch (error) {
      if (!isQuotaError(error) || attempt >= waits.length) throw error;
      const wait = waits[attempt];
      console.warn(
        `Gemini quota hit${label ? ` (${label})` : ''} — waiting ${wait / 1000}s before retry ${attempt + 1}/${waits.length}…`
      );
      if (typeof onWait === 'function') {
        onWait(`Rate limited — waiting ${wait / 1000}s before retrying…`);
      }
      await sleep(wait);
    }
  }
};

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

const sanitizeContent = (content = '') =>
  String(content || '')
    .replace(/[#*_`]+/g, '')
    // Keep $…$ for KaTeX; strip only bare markdown-style leftovers
    .replace(/[📐🗣🔬🌍✝️🎨🎵🔥⭐✅❌]/g, '')
    .trim();

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

const parseOneLessonJson = (text, ctx, index) => {
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

const loadGenerationContext = async (subStrandId) => {
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
  const ageGroup =
    gradeNumber <= 2
      ? 'very young children (ages 5-7)'
      : gradeNumber <= 5
        ? 'young children (ages 8-10)'
        : gradeNumber <= 8
          ? 'pre-teens (ages 11-13)'
          : 'teens (ages 14+)';

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
    ageGroup,
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
  "visualBriefs": [{"id":"vb-1","skillFocus":"...","diagramType":"...","params":{},"brief":"..."}],
  "contentBlocks": [
    {"type":"text","text":"2–4 sentences"},
    {"type":"diagram","briefId":"vb-1"},
    {"type":"text","text":"Short example or activity"}
  ]
}`;
};

const buildQuizChunkPrompt = (
  ctx,
  shell,
  lessonIndex,
  totalLessons,
  chunk,
  avoidStems = [],
  quizExemplarsBlock = ''
) => {
  const title = shell?.title || `Lesson ${lessonIndex}`;
  const objectives = (shell?.learningObjectives || ctx.sourceOutcomes.slice(0, 2))
    .map((o, i) => `${i + 1}. ${o}`)
    .join('\n');
  const { profile } = ctx;
  const diagramTypeList = profile.allowedDiagramTypes.join('|');
  const avoidBlock =
    avoidStems.length > 0
      ? `\nDo NOT repeat or lightly reword any of these existing questions (use different values, situations and wording):\n${avoidStems
          .slice(0, 30)
          .map((s) => `- ${s.slice(0, 80)}`)
          .join('\n')}\n`
      : '';
  return `Create PART "${chunk.label}" of the adaptive QUIZ BANK for Kenyan CBC lesson "${title}" (lesson ${lessonIndex} of ${totalLessons}, Grade ${ctx.grade}).

Outcomes:
${objectives}
Topic: ${ctx.subject.name} · ${ctx.strand.name} · ${ctx.subStrand.name}
Teaching summary: ${String(shell?.content || '').slice(0, 400)}

${profile.quizStyle}

THIS PART: ${chunk.bloomFocus}
${chunk.matrixRule}
${avoidBlock}${quizExemplarsBlock ? `\n${quizExemplarsBlock}\n` : ''}
Return ONLY one JSON object:
{
  "quiz": {
    "questions": [ /* EXACTLY ${CHUNK_SIZE} items */ ]
  }
}

Each question MUST have: id, question, type:"multiple-choice", options(3-4), correctAnswerIndex, explanation (1 short sentence), optionExplanations (short), distractors[{optionIndex,misconception}], learningOutcomeIndex, skillFocus, bloomLevel, modality, difficulty, points.
Keep explanations SHORT (under 25 words) so JSON does not truncate.
Visual questions MUST include "diagram": { "diagramType": one of ${diagramTypeList}, "params":{}, "brief":"..." }.
text_steps questions MUST include steps[] (max 3 short steps).
NEVER reuse vb-1/vb-2 for quiz diagrams.
Match diagram type to topic. Diagram content must match the question exactly (same numbers, words, steps).
${profile.mathRule}
Return complete valid JSON only — do not truncate. No markdown fences.`;
};

/** Flag generated questions that are near-verbatim copies of injected exemplars. */
const flagNearDuplicateQuestions = (questions, exemplars, contextLabel = '') => {
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
const chunkQuestions = (payload) => {
  if (Array.isArray(payload?.quiz?.questions)) return payload.quiz.questions;
  if (Array.isArray(payload?.questions)) return payload.questions;
  return [];
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
    ctx.profile
  );
  const { questionBriefs, ...quizNormalized } = quizResult;
  const visualBriefs = [...teachingBriefs, ...questionBriefs];
  const contentBlocks = normalizeContentBlocks(
    lesson.contentBlocks,
    teachingBriefs,
    sanitizeContent(lesson.content || '')
  );
  const content = contentFromBlocks(contentBlocks) || sanitizeContent(lesson.content || '');

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

    const model = getModel({ maxOutputTokens: 8192 });
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
      const shellText = await generateWithBackoff(
        model,
        buildLessonShellPrompt(ctx, i + 1, total),
        {
          label: `lesson ${i + 1} shell`,
          onWait: (msg) => reportProgress(onProgress, start, msg)
        }
      );
      let { data: shell, parseFailed: shellFailed } = parseOneLessonJson(shellText, ctx, i);
      if (shellFailed) {
        console.warn(`Lesson ${i + 1}: shell parse failed — retrying shell…`);
        reportProgress(onProgress, start + span * 0.2, `Lesson ${i + 1}: retrying content…`);
        await sleep(AI_CALL_GAP_MS);
        const retryText = await generateWithBackoff(
          model,
          buildLessonShellPrompt(ctx, i + 1, total),
          { label: `lesson ${i + 1} shell retry` }
        );
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

      for (let c = 0; c < QUIZ_CHUNKS.length; c++) {
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

        const avoidStems = bankQuestions.map((q) => String(q.question || ''));
        let chunkAdded = 0;
        for (let attempt = 0; attempt < 2; attempt++) {
          await sleep(AI_CALL_GAP_MS);
          let chunkText;
          try {
            chunkText = await generateWithBackoff(
              model,
              buildQuizChunkPrompt(
                ctx,
                shell,
                i + 1,
                total,
                chunk,
                avoidStems,
                quizExemplarsBlock
              ),
              {
                label: `lesson ${i + 1} quiz ${chunk.label}`,
                onWait: (msg) =>
                  reportProgress(onProgress, start + span * (0.4 + 0.18 * c), msg)
              }
            );
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

      const merged = mergeShellAndQuiz(shell, {
        quiz: {
          title: 'Quiz Challenge',
          passingScore: 65,
          timeLimit: 12,
          questions: bankQuestions.slice(0, BANK_SIZE)
        }
      });

      const mapped = mapGeneratedLesson(merged, i, ctx);
      if ((mapped.quiz?.questions || []).length === 0) {
        console.error(`Lesson ${i + 1} still has empty quiz after split+retry`);
      } else {
        console.log(
          `Lesson ${i + 1} ready: ${(mapped.quiz?.questions || []).length} questions`
        );
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
  const model = getModel({ maxOutputTokens: 8192 });

  const seenStems = new Set(existing.map((q) => normalizeStemKey(q.question)));
  const existingIds = new Set(existing.map((q) => q.id).filter(Boolean));
  const newRaw = [];
  const needed = BANK_SIZE - existing.length;

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
      chunkText = await generateWithBackoff(
        model,
        buildQuizChunkPrompt(ctx, shellLike, 1, 1, chunk, avoidStems, quizExemplarsBlock),
        { label: `top-up ${chunk.label}` }
      );
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

  const normalized = normalizeQuiz({ questions: rawWithIds }, outcomes, ctx.profile);
  const mergedQuestions = [...existing, ...normalized.questions];
  const mergedBriefs = [
    ...(lesson.quiz?.visualBriefs || []),
    ...normalized.questionBriefs
  ];

  const quiz = {
    ...(lesson.quiz || {}),
    questions: mergedQuestions,
    visualBriefs: mergedBriefs,
    bankStats: computeBankStats(mergedQuestions)
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

  return {
    lesson: updated,
    added: normalized.questions.length,
    bankSize: mergedQuestions.length,
    bankStats: quiz.bankStats
  };
};
