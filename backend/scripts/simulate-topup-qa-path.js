/**
 * Exercises the post-chunk top-up path (normalize → QA new batch → coverageReport)
 * with a mock model when live Gemini is unavailable. Also can merge into a real lesson.
 *
 * Usage:
 *   node scripts/simulate-topup-qa-path.js [lessonId] [--save]
 */
import 'dotenv/config';
import {
  normalizeQuiz,
  normalizeDifficulty,
  runQuizQAPass,
  buildCoverageReport,
  computeBankStats,
  isQuizQaEnabled
} from '../admin/services/lessonGenerationService.js';
import { Lesson } from '../models/Lesson.js';

const lessonId = process.argv[2] || '4602dbb3-8274-45d5-bc3c-e836c8099156';
const shouldSave = process.argv.includes('--save');

const profile = {
  modalityCycle: ['practice', 'visual', 'text_steps'],
  allowedDiagramTypes: ['place_value', 'number_line', 'labeled_boxes'],
  fallbackDiagramType: 'place_value'
};

assertDiff();

const lesson = await Lesson.findById(lessonId);
if (!lesson) throw new Error('Lesson not found');
let existing = lesson.quiz?.questions || [];
const outcomes =
  lesson.learningObjectives?.length > 0
    ? lesson.learningObjectives
    : ['Identify place value', 'Compare numbers'];

// Idempotent: if simulated top-up Qs already present, only re-canonicalize + refresh report
const alreadyHasSimBatch = existing.some((q) => q.id === 'q-25' && q.qa_flagged);
if (alreadyHasSimBatch && shouldSave) {
  const mergedQuestions = existing.map((q) => ({
    ...q,
    difficulty: normalizeDifficulty(q.difficulty, {
      questionId: q.id,
      context: 'top-up-save'
    })
  }));
  const coverageReport = buildCoverageReport(mergedQuestions, outcomes);
  const quiz = {
    ...(lesson.quiz || {}),
    questions: mergedQuestions,
    bankStats: computeBankStats(mergedQuestions),
    coverageReport
  };
  await Lesson.update(lessonId, { quiz });
  const diffs = mergedQuestions.reduce((a, q) => {
    a[q.difficulty] = (a[q.difficulty] || 0) + 1;
    return a;
  }, {});
  console.log(
    JSON.stringify(
      {
        mode: 're-canonicalize-existing',
        count: mergedQuestions.length,
        diffs,
        nonCanonical: mergedQuestions.filter(
          (q) => !['easy', 'intermediate', 'advanced'].includes(q.difficulty)
        ).length,
        qaFlagged: mergedQuestions.filter((q) => q.qa_flagged).map((q) => q.id),
        coverageReport
      },
      null,
      2
    )
  );
  process.exit(0);
}

const rawNew = [
  {
    question: 'In 4 206, which digit is in the thousands place?',
    options: ['4', '2', '0', '6'],
    correctAnswerIndex: 0,
    explanation: '4 is in the thousands place.',
    optionExplanations: ['Correct', 'Hundreds', 'Tens', 'Ones'],
    distractors: [
      { optionIndex: 1, misconception: 'Hundreds vs thousands' },
      { optionIndex: 2, misconception: 'Tens vs thousands' },
      { optionIndex: 3, misconception: 'Ones vs thousands' }
    ],
    learningOutcomeIndex: 1,
    skillFocus: 'Thousands place',
    bloomLevel: 'recall',
    modality: 'practice',
    difficulty: 'medium',
    points: 15
  },
  {
    question: 'Which number is greater: 3 875 or 3 785?',
    options: ['3 875', '3 785', 'They are equal', 'Cannot tell'],
    correctAnswerIndex: 0,
    explanation: 'Compare hundreds: 8 > 7.',
    optionExplanations: ['Correct', 'Smaller hundreds', 'Not equal', 'We can compare'],
    distractors: [
      { optionIndex: 1, misconception: 'Digit order confusion' },
      { optionIndex: 2, misconception: 'Equal misconception' },
      { optionIndex: 3, misconception: 'Gave up comparing' }
    ],
    learningOutcomeIndex: 2,
    skillFocus: 'Compare numbers',
    bloomLevel: 'apply',
    modality: 'practice',
    difficulty: 'hard',
    points: 15
  },
  {
    question: 'A place value chart shows thousands and hundreds but the stem never defines the number — pick any digit.',
    options: ['1', '2', '3', 'All could be correct'],
    correctAnswerIndex: 3,
    explanation: 'Ambiguous on purpose for QA.',
    optionExplanations: ['Maybe', 'Maybe', 'Maybe', 'Ambiguous'],
    distractors: [
      { optionIndex: 0, misconception: 'x' },
      { optionIndex: 1, misconception: 'y' },
      { optionIndex: 2, misconception: 'z' }
    ],
    learningOutcomeIndex: 1,
    skillFocus: 'Ambiguous stem',
    bloomLevel: 'understand',
    modality: 'visual',
    difficulty: 'medium',
    points: 15
  }
];

let idCounter = existing.length;
const existingIds = new Set(existing.map((q) => q.id));
const rawWithIds = rawNew.map((q) => {
  do {
    idCounter += 1;
  } while (existingIds.has(`q-${idCounter}`));
  return { ...q, id: `q-${idCounter}` };
});

const normalized = normalizeQuiz({ questions: rawWithIds }, outcomes, profile);
console.log(
  'Normalized difficulties:',
  normalized.questions.map((q) => ({ id: q.id, difficulty: q.difficulty }))
);

const mockModel = {
  generateContent: async () => ({
    response: {
      text: async () =>
        JSON.stringify(
          normalized.questions.map((_, i) => ({
            question_index: i,
            passes_qa: i !== 2,
            issue: i === 2 ? 'Stem is ambiguous; multiple options could be defended.' : null
          }))
        )
    }
  })
};

if (isQuizQaEnabled()) {
  await runQuizQAPass(normalized.questions, mockModel, { label: 'simulate-top-up' });
}

// Match topUpLessonQuizBank save path: canonicalize difficulty on the full bank
const mergedQuestions = [...existing, ...normalized.questions].slice(0, 30).map((q) => ({
  ...q,
  difficulty: normalizeDifficulty(q.difficulty, {
    questionId: q.id,
    context: 'top-up-save'
  })
}));
const coverageReport = buildCoverageReport(mergedQuestions, outcomes);
const quiz = {
  ...(lesson.quiz || {}),
  questions: mergedQuestions,
  bankStats: computeBankStats(mergedQuestions),
  coverageReport
};

console.log({
  qaEnabled: isQuizQaEnabled(),
  added: normalized.questions.length,
  bankSize: mergedQuestions.length,
  newDifficulties: normalized.questions.map((q) => q.difficulty),
  nonCanonical: mergedQuestions.filter(
    (q) => !['easy', 'intermediate', 'advanced'].includes(String(q.difficulty))
  ).length,
  newQaFlagged: normalized.questions.filter((q) => q.qa_flagged).map((q) => ({
    id: q.id,
    issue: q.qa_issue
  })),
  totalQaFlagged: mergedQuestions.filter((q) => q.qa_flagged).length,
  coverageReport
});

if (shouldSave) {
  const updated = await Lesson.update(lessonId, { quiz });
  console.log('Saved lesson', updated.id, 'questions', updated.quiz.questions.length);
}

function assertDiff() {
  const pairs = [
    ['medium', 'intermediate'],
    ['hard', 'advanced'],
    ['easy', 'easy'],
    ['advanced', 'advanced'],
    ['nope', 'intermediate']
  ];
  for (const [raw, expected] of pairs) {
    const got = normalizeDifficulty(raw, { context: 'assert' });
    if (got !== expected) throw new Error(`normalizeDifficulty(${raw})=${got}, expected ${expected}`);
  }
  console.log('normalizeDifficulty assertions OK');
}
