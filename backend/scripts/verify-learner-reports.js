/**
 * Learner report classification + class-insight helpers.
 * No database access — run from backend/:
 *   node scripts/verify-learner-reports.js
 */
import {
  classifyMastery,
  summarizeAttempts,
  buildReportPayload,
  buildClassInsights
} from '../admin/services/learnerReportMath.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const mastery = [
  { skillFocus: 'Add within 10', learningOutcomeKey: 'lo-add', status: 'mastered', bktPKnow: 0.9 },
  { skillFocus: 'Place value', learningOutcomeKey: 'lo-pv', status: 'developing', bktPKnow: 0.55 },
  { skillFocus: 'Subtraction', learningOutcomeKey: 'lo-sub', status: 'scaffolding', consecutiveFailsAtLevel: 3 },
  { skillFocus: 'Word problems', learningOutcomeKey: 'lo-wp', status: 'struggling', consecutiveFailsAtLevel: 1 },
  { skillFocus: 'Unknown skill', learningOutcomeKey: 'lo-x', status: 'unknown' }
];

const classified = classifyMastery(mastery);
assert(classified.masteryCounts.mastered === 1, 'mastered count');
assert(classified.masteryCounts.developing === 1, 'developing count');
assert(classified.masteryCounts.scaffolding === 1, 'scaffolding count');
assert(classified.masteryCounts.struggling === 1, 'struggling count');
assert(classified.masteryCounts.unknown === 1, 'unknown count');
assert(classified.strengths.map((s) => s.learningOutcomeKey).join(',') === 'lo-add,lo-pv', 'strengths order');
assert(classified.weaknesses[0].learningOutcomeKey === 'lo-sub', 'scaffolding ranked first among weaknesses');
assert(classified.weaknesses.length === 2, 'two weaknesses');

const attempts = [
  { correct: true, bloomLevel: 'recall', modalityShown: 'visual' },
  { correct: false, bloomLevel: 'apply', modalityShown: 'text_steps', misconceptionKey: 'added-instead-of-subtract' },
  { correct: true, bloomLevel: 'apply', modalityShown: 'visual' },
  { correct: false, twinRole: 'twist', bloomLevel: 'apply', modalityShown: 'practice' }
];
const attemptStats = summarizeAttempts(attempts);
assert(attemptStats.attemptCount === 3, 'twists excluded from attempt count');
assert(attemptStats.accuracyPercent === 67, `accuracy was ${attemptStats.accuracyPercent}`);
assert(attemptStats.bloomBreakdown.apply.total === 2, 'apply totals skip twists');
assert(attemptStats.bloomBreakdown.apply.correct === 1, 'apply corrects');
assert(attemptStats.modalityBreakdown.visual.correct === 2, 'visual success');
assert(attemptStats.misconceptions[0].key === 'added-instead-of-subtract', 'misconception tally');

const report = buildReportPayload({
  learner: { id: 'u1', name: 'Amina', grade: '1' },
  masteryRows: mastery,
  progressRows: [
    { lesson_id: 'l1', progress: 100, completed: true, session_review: { score: { percentage: 80 } } },
    { lesson_id: 'l2', progress: 40, completed: false }
  ],
  attempts,
  titleById: new Map([['l1', 'Adding apples'], ['l2', 'Take away']])
});
assert(report.summary.strengthsCount === 2, 'report strengths');
assert(report.summary.weaknessesCount === 2, 'report weaknesses');
assert(report.summary.completed === 1, 'completed lessons');
assert(report.summary.inProgress === 1, 'in-progress lessons');
assert(report.summary.averageScore === 80, 'average score uses scored lessons');
assert(report.recentLessons[0].title === 'Adding apples', 'lesson title lookup');
assert(report.skillsNeedingPractice.length === 2, 'legacy skillsNeedingPractice stays populated');

const classInsights = buildClassInsights([
  report,
  buildReportPayload({
    learner: { id: 'u2', name: 'Brian', grade: '1' },
    masteryRows: [
      { skillFocus: 'Subtraction', learningOutcomeKey: 'lo-sub', status: 'struggling' },
      { skillFocus: 'Add within 10', learningOutcomeKey: 'lo-add', status: 'mastered' }
    ]
  }),
  buildReportPayload({
    learner: { id: 'u3', name: 'Cynthia', grade: '1' },
    masteryRows: [
      { skillFocus: 'Subtraction', learningOutcomeKey: 'lo-sub', status: 'scaffolding' },
      { skillFocus: 'Counting', learningOutcomeKey: 'lo-count', status: 'struggling' },
      { skillFocus: 'Shapes', learningOutcomeKey: 'lo-shapes', status: 'struggling' }
    ]
  })
]);
assert(classInsights.learnerCount === 3, 'class size');
assert(classInsights.commonWeaknesses[0].learningOutcomeKey === 'lo-sub', 'shared weakness');
assert(classInsights.commonWeaknesses[0].learnerCount === 3, 'all three learners weak on subtraction');
assert(classInsights.commonStrengths[0].learningOutcomeKey === 'lo-add', 'shared strength');
assert(classInsights.needsAttention.some((row) => row.id === 'u3'), 'learner with more weaknesses is flagged');
assert(!classInsights.needsAttention.some((row) => row.id === 'u2'), 'balanced learner is not flagged');

console.log('verify-learner-reports: ok');
