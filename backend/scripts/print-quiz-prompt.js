/**
 * Print the exact quiz-chunk prompt for a grade/subject/sub-strand combination.
 * Used to confirm the Grade 1 Addition template block and the grade complexity
 * ceiling coexist in one prompt without contradicting each other.
 *
 * Usage: node scripts/print-quiz-prompt.js <grade> <subject> <subStrand> [band]
 */
import 'dotenv/config';
import {
  buildQuizChunkPrompt,
  QUIZ_CHUNKS,
  getComplexityBand
} from '../admin/services/lessonGenerationService.js';
import { getSubjectProfile } from '../admin/services/subjectProfiles.js';
import { isGradeOneAdditionContext } from '../utils/additionTemplate.js';

const grade = process.argv[2] || '1';
const subjectName = process.argv[3] || 'Mathematics';
const subStrandName = process.argv[4] || 'Addition';
const bandLabel = process.argv[5] || 'reasoning';

const gradeNumber = grade === 'K' ? 0 : parseInt(grade, 10);
const complexityBand = getComplexityBand(gradeNumber);

const ctx = {
  grade,
  gradeNumber,
  complexityBand,
  ageGroup: complexityBand.ageGroup,
  subject: { name: subjectName },
  strand: { name: 'Numbers' },
  subStrand: { name: subStrandName },
  profile: getSubjectProfile(subjectName),
  sourceOutcomes: ['add a 2-digit number and a 1-digit number without regrouping']
};

const chunk = QUIZ_CHUNKS.find((c) => c.label === bandLabel) || QUIZ_CHUNKS[2];

console.log(`### Grade ${grade} · ${subjectName} · ${subStrandName} · band "${chunk.label}"`);
console.log(`### addition template active: ${isGradeOneAdditionContext(ctx)}`);
console.log(`### complexity band: ${complexityBand.key} (constrained: ${complexityBand.constrained})`);
console.log('-'.repeat(80));
console.log(
  buildQuizChunkPrompt(
    ctx,
    { title: 'Adding a 2-Digit Number and a 1-Digit Number', learningObjectives: ctx.sourceOutcomes, content: 'Teaching text.' },
    1,
    1,
    chunk,
    [],
    '',
    10
  )
);
