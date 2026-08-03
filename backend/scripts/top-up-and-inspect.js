/**
 * Top up a lesson quiz bank and print coverage / QA / difficulty summary.
 */
import 'dotenv/config';
import { topUpLessonQuizBank } from '../admin/services/lessonGenerationService.js';
import { Lesson } from '../models/Lesson.js';

const lessonId = process.argv[2] || '4602dbb3-8274-45d5-bc3c-e836c8099156';

const before = await Lesson.findById(lessonId);
const bq = before.quiz?.questions || [];
console.log('BEFORE', {
  count: bq.length,
  coverageReport: before.quiz?.coverageReport,
  qaFlagged: bq.filter((q) => q.qa_flagged).length,
  remapped: bq.filter((q) => q.coverage_remapped).length,
  difficulties: bq.reduce((a, q) => {
    a[q.difficulty || '?'] = (a[q.difficulty || '?'] || 0) + 1;
    return a;
  }, {})
});

console.log('\nRunning topUpLessonQuizBank…');
const result = await topUpLessonQuizBank(lessonId);
const after = result.lesson || (await Lesson.findById(lessonId));
const aq = after.quiz?.questions || [];

const preexistingQa = bq.filter((q) => q.qa_flagged).map((q) => q.id);
const qaStillPresent = preexistingQa.every((id) =>
  aq.some((q) => q.id === id && q.qa_flagged)
);

const beforeIds = new Set(bq.map((q) => q.id));
const newlyAdded = aq.filter((q) => !beforeIds.has(q.id));
const newQaFlagged = newlyAdded.filter((q) => q.qa_flagged);
const nonCanonical = aq.filter(
  (q) => !['easy', 'intermediate', 'advanced'].includes(q.difficulty)
);

console.log('\nAFTER', {
  added: result.added,
  bankSize: result.bankSize ?? aq.length,
  count: aq.length,
  coverageReport: after.quiz?.coverageReport,
  qaFlagged: aq.filter((q) => q.qa_flagged).length,
  qaFlaggedIds: aq.filter((q) => q.qa_flagged).map((q) => q.id),
  preexistingQaPreserved: qaStillPresent,
  newlyAddedCount: newlyAdded.length,
  newQaFlaggedCount: newQaFlagged.length,
  newQaIssues: newQaFlagged.map((q) => ({ id: q.id, issue: q.qa_issue })),
  remapped: aq.filter((q) => q.coverage_remapped).length,
  difficulties: aq.reduce((a, q) => {
    a[q.difficulty || '?'] = (a[q.difficulty || '?'] || 0) + 1;
    return a;
  }, {}),
  nonCanonicalDifficulties: nonCanonical.map((q) => ({ id: q.id, difficulty: q.difficulty })),
  bankStatsTotal: after.quiz?.bankStats?.total,
  outcomesCoveredByIndex: new Set(aq.map((q) => q.learningOutcomeIndex)).size
});
