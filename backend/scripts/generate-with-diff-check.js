/**
 * Generate one lesson and assert all question difficulties are canonical.
 */
import 'dotenv/config';
import { generateLessonsFromSubStrand } from '../admin/services/lessonGenerationService.js';
import { Lesson } from '../models/Lesson.js';

const subStrandId = process.argv[2];
if (!subStrandId) {
  console.error('Usage: node scripts/generate-with-diff-check.js <subStrandId>');
  process.exit(1);
}

const CANONICAL = new Set(['easy', 'intermediate', 'advanced']);

console.log('Generating for', subStrandId);
const generated = await generateLessonsFromSubStrand(subStrandId, 1, ({ percent, message }) => {
  console.log(`[${percent}%] ${message}`);
});
const saved = await Lesson.createMany(generated);
const lesson = saved[0];
const qs = lesson.quiz?.questions || [];
const diffs = qs.reduce((a, q) => {
  a[q.difficulty || '?'] = (a[q.difficulty || '?'] || 0) + 1;
  return a;
}, {});
const nonCanonical = qs.filter((q) => !CANONICAL.has(q.difficulty));
const qaFlagged = qs.filter((q) => q.qa_flagged);

console.log(
  JSON.stringify(
    {
      id: lesson.id,
      title: lesson.title,
      status: lesson.status,
      count: qs.length,
      coverageReport: lesson.quiz?.coverageReport,
      difficulties: diffs,
      nonCanonicalCount: nonCanonical.length,
      nonCanonicalSamples: nonCanonical.slice(0, 5),
      qaFlaggedCount: qaFlagged.length,
      qaIssues: qaFlagged.slice(0, 5).map((q) => q.qa_issue)
    },
    null,
    2
  )
);

if (nonCanonical.length > 0) {
  console.error('FAIL: non-canonical difficulties present after save');
  process.exit(2);
}
console.log('OK: all difficulties canonical');
