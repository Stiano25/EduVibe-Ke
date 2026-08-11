/**
 * Smoke checks for coverage / QA / adaptive difficulty wiring.
 * Does not call Gemini or require curriculum rows.
 */
import 'dotenv/config';
import {
  checkOutcomeCoverage,
  buildCoverageReport,
  normalizeQuiz,
  normalizeDifficulty,
  GENERATION_TOKEN_LIMITS,
  isQuizQaEnabled,
  runQuizQAPass
} from '../admin/services/lessonGenerationService.js';
import { createAdaptiveSession } from '../learner/services/adaptiveQuizService.js';

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

assert(normalizeDifficulty('medium') === 'intermediate', 'medium→intermediate');
assert(normalizeDifficulty('hard') === 'advanced', 'hard→advanced');
assert(normalizeDifficulty('easy') === 'easy', 'easy stays');
assert(normalizeDifficulty('weird') === 'intermediate', 'unrecognized→intermediate');
assert(
  normalizeQuiz(
    {
      questions: [
        {
          question: 'Diff map',
          options: ['a', 'b'],
          correctAnswerIndex: 0,
          learningOutcomeIndex: 1,
          difficulty: 'hard'
        }
      ]
    },
    ['Outcome A'],
    { modalityCycle: ['practice'], allowedDiagramTypes: ['number_line'], fallbackDiagramType: 'number_line' }
  ).questions[0].difficulty === 'advanced',
  'normalizeQuiz maps hard→advanced'
);
assert(
  GENERATION_TOKEN_LIMITS.lessonShell === 2500 &&
    GENERATION_TOKEN_LIMITS.quizChunk === 20000 &&
    GENERATION_TOKEN_LIMITS.coverageGap === 2200 &&
    GENERATION_TOKEN_LIMITS.quizQa === 3000 &&
    GENERATION_TOKEN_LIMITS.quizQa < GENERATION_TOKEN_LIMITS.quizChunk,
  'generation phases use evidence-based token budgets'
);

const compactNormalized = normalizeQuiz(
  {
    questions: [
      {
        question: 'Which option is correct?',
        options: ['Correct', 'Wrong A', 'Wrong B'],
        correctAnswerIndex: 0,
        explanation: 'Correct matches the rule.',
        distractors: [
          { optionIndex: 1, misconception: 'Uses the wrong rule' },
          { optionIndex: 2, misconception: 'Reverses the values' }
        ],
        learningOutcomeIndex: 1,
        bloomLevel: 'understand',
        modality: 'practice',
        difficulty: 'easy'
      }
    ]
  },
  ['Outcome A'],
  { modalityCycle: ['practice'] }
);
assert(
  compactNormalized.questions[0].optionExplanations[1] === 'Uses the wrong rule' &&
    compactNormalized.questions[0].optionExplanations[2] === 'Reverses the values',
  'compact distractors expand into option explanations'
);

const profile = {
  modalityCycle: ['practice', 'visual', 'text_steps'],
  allowedDiagramTypes: ['number_line'],
  fallbackDiagramType: 'number_line'
};

const outcomes = ['Identify place value', 'Compare numbers'];

// --- coverage check (1-based) ---
const partial = [
  { question: 'Q1', learningOutcomeIndex: 1, options: ['a', 'b'], correctAnswerIndex: 0 }
];
const { uncovered } = checkOutcomeCoverage(partial, outcomes);
assert(uncovered.length === 1 && uncovered[0] === 2, 'expected outcome 2 uncovered');

// --- normalize remap tags coverage_remapped ---
const normalized = normalizeQuiz({ questions: partial }, outcomes, profile);
const remapped = normalized.questions.filter((q) => q.coverage_remapped);
assert(remapped.length >= 1, 'expected coverage_remapped on remapped slot');
assert(
  normalized.questions.some((q) => Number(q.learningOutcomeIndex) === 2 && q.coverage_remapped),
  'outcome 2 should be remapped'
);

const report = buildCoverageReport(normalized.questions, outcomes);
// Remap reassigns an existing slot (does not duplicate) — remapped outcome is tagged
assert(report.remapped.includes(2), 'outcome 2 remapped in report');
assert(
  remapped.every((q) => q.coverage_remapped === true),
  'remapped questions carry coverage_remapped'
);

// --- old lesson shape: no new fields must not throw ---
const oldShape = normalizeQuiz(
  {
    questions: [
      {
        question: 'Legacy Q',
        options: ['a', 'b', 'c'],
        correctAnswerIndex: 1,
        learningOutcomeIndex: 1
      },
      {
        question: 'Legacy Q2',
        options: ['a', 'b', 'c'],
        correctAnswerIndex: 0,
        learningOutcomeIndex: 2
      }
    ]
  },
  outcomes,
  profile
);
assert(
  oldShape.questions.every((q) => q.coverage_remapped !== true && !q.qa_flagged),
  'fully covered bank should not invent flags'
);
const oldReport = buildCoverageReport(oldShape.questions, outcomes);
assert(oldReport.remapped.length === 0 && oldReport.stillMissing.length === 0, 'old full cover ok');

// --- QA fail-soft on bad model ---
const qs = oldShape.questions.map((q) => ({ ...q }));
await runQuizQAPass(qs, {
  generateContentFn: async () => {
    throw new Error('simulated QA failure');
  }
});
assert(qs.every((q) => !q.qa_flagged), 'QA failure must not flag');

// --- QA success flags ---
const qs2 = oldShape.questions.map((q) => ({ ...q }));
await runQuizQAPass(qs2, {
  generateContentFn: async () => ({
    text: JSON.stringify([
      { i: 0, ok: false, issue: 'Two answers could work' },
      { i: 1, ok: true }
    ]),
    inputTokens: 0,
    outputTokens: 0
  })
});
if (isQuizQaEnabled()) {
  assert(qs2[0].qa_flagged === true && qs2[0].qa_issue, 'QA should flag index 0');
  assert(!qs2[1].qa_flagged, 'QA should pass index 1');
} else {
  console.log('QUIZ_QA_ENABLED is off — skipped flag assertions');
}

// --- adaptive difficulty bonus does not break session create ---
const lesson = {
  id: 'smoke-lesson',
  learningObjectives: outcomes,
  quiz: {
    questions: oldShape.questions.map((q, i) => ({
      ...q,
      id: `q-${i + 1}`,
      difficulty: i === 0 ? 'easy' : 'advanced',
      bloomLevel: 'understand',
      modality: 'practice',
      learningOutcomeKey: q.learningOutcomeKey
    }))
  }
};
const session = createAdaptiveSession({
  lesson,
  preferredModality: 'mixed',
  masteryRows: [
    { learningOutcomeKey: lesson.quiz.questions[0].learningOutcomeKey, status: 'struggling' }
  ]
});
assert(session?.question && session?.session, 'adaptive session created with a question');
console.log('verify-quiz-quality: OK', {
  qaEnabled: isQuizQaEnabled(),
  coverageReport: report,
  firstQuestionId: session.question.id,
  status: 'pending-shape-compatible'
});
