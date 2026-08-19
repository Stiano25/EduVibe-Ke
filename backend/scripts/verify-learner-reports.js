/**
 * Learner report classification + class-insight helpers.
 * No database access — run from backend/:
 *   node scripts/verify-learner-reports.js
 */
import {
  classifyMastery,
  summarizeAttempts,
  buildReportPayload,
  buildClassInsights,
  classifyLessonBand,
  bestModalityFromBreakdown,
  LESSON_STRENGTH_MIN,
  LESSON_WEAKNESS_MAX
} from '../admin/services/learnerReportMath.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(LESSON_STRENGTH_MIN === 75, 'strength threshold');
assert(LESSON_WEAKNESS_MAX === 60, 'weakness threshold inclusive of pass floor');
assert(classifyLessonBand(90) === 'strength', '90 is strength');
assert(classifyLessonBand(75) === 'strength', '75 is strength');
assert(classifyLessonBand(74) === 'steady', '74 is steady');
assert(classifyLessonBand(61) === 'steady', '61 is steady');
assert(classifyLessonBand(60) === 'weakness', '60 is weakness');
assert(classifyLessonBand(40) === 'weakness', '40 is weakness');

const mastery = [
  { skillFocus: 'Add within 10', learningOutcomeKey: 'lo-add', status: 'mastered', bktPKnow: 0.9, bktNObservations: 8 },
  { skillFocus: 'Place value', learningOutcomeKey: 'lo-pv', status: 'developing', bktPKnow: 0.55, bktNObservations: 3 },
  { skillFocus: 'Subtraction', learningOutcomeKey: 'lo-sub', status: 'scaffolding', consecutiveFailsAtLevel: 3, bktPKnow: 0.2 },
  { skillFocus: 'Word problems', learningOutcomeKey: 'lo-wp', status: 'struggling', consecutiveFailsAtLevel: 1 },
  { skillFocus: 'Unknown skill', learningOutcomeKey: 'lo-x', status: 'unknown' },
  {
    skillFocus: 'Orphan developing',
    learningOutcomeKey: 'lo-orphan',
    status: 'developing',
    bktPKnow: 0.76,
    bktNObservations: 1
  }
];

const skillAttempts = [
  { learningOutcomeKey: 'lo-add', correct: true, bloomLevel: 'recall', modalityShown: 'visual', lessonId: 'l1' },
  { learningOutcomeKey: 'lo-pv', correct: true, bloomLevel: 'apply', modalityShown: 'visual', lessonId: 'l1' },
  { learningOutcomeKey: 'lo-sub', correct: false, bloomLevel: 'apply', modalityShown: 'text_steps', misconceptionKey: 'added-instead-of-subtract', lessonId: 'l2' },
  { learningOutcomeKey: 'lo-wp', correct: false, bloomLevel: 'apply', modalityShown: 'practice', lessonId: 'l2' }
];

const classified = classifyMastery(mastery, skillAttempts);
assert(classified.masteryCounts.mastered === 1, 'mastered count');
assert(classified.masteryCounts.developing === 1, 'developing count');
assert(classified.masteryCounts.scaffolding === 1, 'scaffolding count');
assert(classified.masteryCounts.struggling === 1, 'struggling count');
assert(classified.masteryCounts.unknown === 0, 'unknown with no attempts is omitted');
assert(!classified.strengths.some((s) => s.learningOutcomeKey === 'lo-orphan'), 'orphan mastery is not a strength');
assert(classified.strengths.map((s) => s.learningOutcomeKey).join(',') === 'lo-add,lo-pv', 'strengths order');
assert(classified.weaknesses[0].learningOutcomeKey === 'lo-sub', 'scaffolding ranked first among weaknesses');
assert(classified.weaknesses.length === 2, 'two weaknesses');

const noAttempts = classifyMastery(mastery, []);
assert(noAttempts.strengths.length === 0, 'no attempts means no strengths');
assert(noAttempts.weaknesses.length === 0, 'no attempts means no weaknesses');

const attempts = [
  { correct: true, bloomLevel: 'recall', modalityShown: 'visual', learningOutcomeKey: 'lo-add', lessonId: 'l1' },
  {
    correct: false,
    bloomLevel: 'apply',
    modalityShown: 'text_steps',
    misconceptionKey: 'added-instead-of-subtract',
    learningOutcomeKey: 'lo-sub',
    lessonId: 'l2'
  },
  { correct: true, bloomLevel: 'apply', modalityShown: 'visual', learningOutcomeKey: 'lo-add', lessonId: 'l1' },
  { correct: false, twinRole: 'twist', bloomLevel: 'apply', modalityShown: 'practice', lessonId: 'l1' }
];
const attemptStats = summarizeAttempts(attempts);
assert(attemptStats.attemptCount === 3, 'twists excluded from attempt count');
assert(attemptStats.accuracyPercent === 67, `accuracy was ${attemptStats.accuracyPercent}`);
assert(attemptStats.bloomBreakdown.apply.total === 2, 'apply totals skip twists');
assert(attemptStats.bloomBreakdown.apply.correct === 1, 'apply corrects');
assert(attemptStats.modalityBreakdown.visual.correct === 2, 'visual success');
assert(attemptStats.misconceptions[0].key === 'added-instead-of-subtract', 'misconception tally');
assert(attemptStats.bestModality === 'visual', 'best modality is highest accuracy among ≥2');
assert(bestModalityFromBreakdown({ practice: { correct: 1, total: 1 } }) === null, 'single modality is not a best claim');

const report = buildReportPayload({
  learner: { id: 'u1', name: 'Amina', grade: '1' },
  masteryRows: mastery,
  progressRows: [
    {
      lesson_id: 'l1',
      progress: 80,
      completed: true,
      session_review: {
        score: { percentage: 80, correct: 8, total: 10, retryCount: 0 },
        answered: [
          { phase: 'main', correct: true, questionId: 'q1' },
          { phase: 'main', correct: true, questionId: 'q2' }
        ]
      }
    },
    { lesson_id: 'l2', progress: 40, completed: false, session_review: { score: { percentage: 40, retryCount: 2 } } },
    { lesson_id: 'l3', progress: 65, completed: false, session_review: { score: { percentage: 65, retryCount: 1 } } }
  ],
  attempts: [
    ...skillAttempts,
    ...attempts
  ],
  titleById: new Map([['l1', 'Adding apples'], ['l2', 'Take away'], ['l3', 'Tens']])
});

assert(report.summary.completed === 2, '65% still counts as lenient done for summary.completed');
assert(report.summary.fullyCompleted === 1, 'only the completed=true row is fully completed');
assert(report.summary.inProgress === 1, 'in-progress lessons (lenient, not fullyCompleted)');
assert(report.recentLessons[2].completed === true, 'mapped 65% row is lenient-done');
assert(report.recentLessons[2].fullyCompleted === false, '65% is not strictly fully completed');
assert(report.summary.averageScore === 62, 'average of 80/40/65');
assert(report.recentLessons[0].title === 'Adding apples', 'lesson title lookup');
assert(report.strengths.length === 1 && report.strengths[0].title === 'Adding apples', '80% is a lesson strength');
assert(report.weaknesses.length === 1 && report.weaknesses[0].title === 'Take away', '40% is a lesson weakness');
assert(report.steady.length === 1 && report.steady[0].title === 'Tens', '65% is steady');
assert(report.weaknesses[0].misconception === 'added-instead-of-subtract', 'lesson misconception from attempts');
assert(report.strengths[0].misconception == null, 'no fabricated mainly-missing on the strong lesson');
assert(report.bestModality === 'visual', 'report bestModality matches table');
assert(
  report.skillsNeedingPractice.every((s) => s.learningOutcomeKey !== 'lo-orphan'),
  'learner skillsNeedingPractice also drops orphans'
);

const sixty = buildReportPayload({
  learner: { id: 'u4', name: 'Alphonce-like' },
  masteryRows: [],
  progressRows: [
    {
      lesson_id: 'l60',
      progress: 60,
      completed: false,
      session_review: {
        score: { percentage: 60, correct: 6, total: 10, retryCount: 4 },
        answered: [
          { phase: 'main', correct: true, questionId: 'a' },
          { phase: 'main', correct: true, questionId: 'b' },
          { phase: 'main', correct: true, questionId: 'c' },
          { phase: 'main', correct: true, questionId: 'd' },
          { phase: 'main', correct: true, questionId: 'e' },
          { phase: 'main', correct: true, questionId: 'f' },
          { phase: 'main', correct: false, questionId: 'g' },
          { phase: 'main', correct: false, questionId: 'h' },
          { phase: 'main', correct: false, questionId: 'i' },
          { phase: 'main', correct: false, questionId: 'j' },
          { phase: 'retry', correct: true, questionId: 'g', retryFor: 'g' },
          { phase: 'retry', correct: true, questionId: 'h', retryFor: 'h' },
          { phase: 'retry', correct: true, questionId: 'i', retryFor: 'i' },
          { phase: 'retry', correct: false, questionId: 'j', retryFor: 'j' }
        ]
      }
    }
  ],
  attempts: [],
  titleById: new Map([['l60', 'Adding 2 single-digit numbers up to 10']])
});
assert(sixty.recentLessons[0].fullyCompleted === false, '60% completed=false is not fully completed');
assert(sixty.recentLessons[0].completed === true, 'lenient done unchanged for unlock-aligned flag');
assert(sixty.weaknesses[0].title === 'Adding 2 single-digit numbers up to 10', '60% headlines as weakness');
assert(sixty.weaknesses[0].firstTryPercent === 60, 'first-try drives classification');
assert(sixty.weaknesses[0].retryCount === 4, 'retry count from session_review');
assert(sixty.weaknesses[0].practiceScorePercent === 75, 'practice credit 6 + 1.5 / 10 = 75');
assert(sixty.strengths.length === 0, '60% is not a strength');

const unpairedRetries = buildReportPayload({
  learner: { id: 'u5', name: 'Unpaired' },
  progressRows: [
    {
      lesson_id: 'l60b',
      progress: 60,
      completed: false,
      session_review: {
        score: { percentage: 60, retryCount: 4 },
        answered: [
          { phase: 'main', correct: true, questionId: 'm1' },
          { phase: 'main', correct: true, questionId: 'm2' },
          { phase: 'main', correct: true, questionId: 'm3' },
          { phase: 'main', correct: true, questionId: 'm4' },
          { phase: 'main', correct: true, questionId: 'm5' },
          { phase: 'main', correct: true, questionId: 'm6' },
          { phase: 'main', correct: false, questionId: 'm7' },
          { phase: 'main', correct: false, questionId: 'm8' },
          { phase: 'main', correct: false, questionId: 'm9' },
          { phase: 'main', correct: false, questionId: 'm10' },
          { phase: 'retry', correct: true, questionId: 'r1' },
          { phase: 'retry', correct: true, questionId: 'r2' },
          { phase: 'retry', correct: true, questionId: 'r3' },
          { phase: 'retry', correct: false, questionId: 'r4' }
        ]
      }
    }
  ],
  titleById: new Map([['l60b', 'Adding 2 single-digit numbers up to 10']])
});
assert(unpairedRetries.weaknesses[0].practiceScorePercent === 75, 'unlinked retries still get practice credit in order');

const classInsights = buildClassInsights([
  report,
  buildReportPayload({
    learner: { id: 'u2', name: 'Brian', grade: '1' },
    masteryRows: [],
    progressRows: [
      { lesson_id: 'l1', progress: 90, completed: true, session_review: { score: { percentage: 90 } } },
      { lesson_id: 'l2', progress: 40, completed: false, session_review: { score: { percentage: 40 } } }
    ],
    titleById: new Map([['l1', 'Adding apples'], ['l2', 'Take away']])
  }),
  buildReportPayload({
    learner: { id: 'u3', name: 'Cynthia', grade: '1' },
    masteryRows: [],
    progressRows: [
      { lesson_id: 'l2', progress: 50, completed: false, session_review: { score: { percentage: 50 } } },
      { lesson_id: 'l4', progress: 40, completed: false, session_review: { score: { percentage: 40 } } },
      { lesson_id: 'l5', progress: 30, completed: false, session_review: { score: { percentage: 30 } } }
    ],
    titleById: new Map([
      ['l2', 'Take away'],
      ['l4', 'Counting'],
      ['l5', 'Shapes']
    ])
  })
]);
assert(classInsights.learnerCount === 3, 'class size');
assert(classInsights.commonWeaknesses[0].skillFocus === 'Take away', 'shared weakness is a lesson title');
assert(classInsights.commonWeaknesses[0].learnerCount === 3, 'all three learners weak on Take away');
assert(classInsights.commonStrengths[0].skillFocus === 'Adding apples', 'shared strength is a lesson title');
assert(classInsights.needsAttention.some((row) => row.id === 'u3'), 'learner with more weaknesses is flagged');
assert(!classInsights.needsAttention.some((row) => row.id === 'u2'), 'balanced learner is not flagged');

console.log('verify-learner-reports: ok');
