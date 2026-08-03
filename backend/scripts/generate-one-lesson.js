/**
 * Full generation path: generateLessonsFromSubStrand(1) → Lesson.createMany
 * Mirrors Admin → Lessons AI generate for one lesson.
 */
import 'dotenv/config';
import { generateLessonsFromSubStrand } from '../admin/services/lessonGenerationService.js';
import { Lesson } from '../models/Lesson.js';

const subStrandId = process.argv[2] || '02ceb2ff-2aa9-46eb-a815-fc7ae4a0b973';

console.log('Generating 1 lesson for subStrand', subStrandId);
console.log('QUIZ_QA_ENABLED=', process.env.QUIZ_QA_ENABLED ?? '(default on)');

const generated = await generateLessonsFromSubStrand(subStrandId, 1, ({ percent, message }) => {
  console.log(`[${percent}%] ${message}`);
});

console.log('Generated', generated.length, 'lesson(s) — saving…');
const saved = await Lesson.createMany(generated);
const lesson = saved[0];
const qs = lesson.quiz?.questions || [];
const report = lesson.quiz?.coverageReport;
const qaFlagged = qs.filter((q) => q.qa_flagged);
const remapped = qs.filter((q) => q.coverage_remapped);
const difficulties = qs.reduce((acc, q) => {
  const d = q.difficulty || 'unset';
  acc[d] = (acc[d] || 0) + 1;
  return acc;
}, {});

console.log('\n=== SAVED LESSON ===');
console.log({
  id: lesson.id,
  title: lesson.title,
  status: lesson.status,
  questionCount: qs.length,
  coverageReport: report,
  remappedCount: remapped.length,
  qaFlaggedCount: qaFlagged.length,
  qaIssues: qaFlagged.slice(0, 5).map((q) => q.qa_issue),
  difficulties,
  sampleDifficulties: qs.slice(0, 5).map((q) => ({
    id: q.id,
    difficulty: q.difficulty,
    bloom: q.bloomLevel,
    outcome: q.learningOutcomeIndex
  }))
});

console.log('\nOpen Admin → Lessons and review lesson id:', lesson.id);
