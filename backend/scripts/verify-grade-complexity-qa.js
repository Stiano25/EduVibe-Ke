/**
 * Real QA-pass check for the grade complexity ceiling.
 *
 * Three stems, judged by the live QA model:
 *   OVERCOMPLEX — deliberately verbose, should fail at Grade 1.
 *   MODERATE    — 2 sentences with a temporal clause. Ordinary Grade 9 material,
 *                 but over the Grade 1 ceiling. Run at BOTH grades, this is what
 *                 proves the check is grade-sensitive rather than length-phobic.
 *   COMPLIANT   — inside the Grade 1 ceiling, should pass.
 */
import 'dotenv/config';
import { runQuizQAPass, getComplexityBand } from '../admin/services/lessonGenerationService.js';

const OVERCOMPLEX_STEM =
  'While Amina was walking to the market on Tuesday morning, she counted 14 ripe mangoes in the first basket, and after her aunt added 3 more mangoes from a second basket that had been left in the shade since sunrise, she wanted to know the combined total she could now carry home.';

const MODERATE_STEM =
  'A trader buys 3 sacks of maize at 2,400 shillings each. After selling all of them for 8,700 shillings, what is her profit?';

const COMPLIANT_STEM = 'What is 14 + 3?';

const question = (id, stem, options, correctAnswerIndex = 0) => ({
  id,
  question: stem,
  options,
  correctAnswerIndex,
  bloomLevel: 'reason',
  modality: 'practice',
  difficulty: 'intermediate'
});

const ADD_OPTIONS = ['17', '11', '18', '16'];
const PROFIT_OPTIONS = ['1,500 shillings', '900 shillings', '8,700 shillings', '7,200 shillings'];

const makeCtx = (grade) => {
  const gradeNumber = Number(grade);
  const band = getComplexityBand(gradeNumber);
  return {
    grade: String(grade),
    gradeNumber,
    ageGroup: band.ageGroup,
    complexityBand: band,
    subject: { name: 'Mathematics' }
  };
};

const run = async (title, grade, questions) => {
  const qs = questions.map((q) => ({ ...q }));
  await runQuizQAPass(qs, { label: title, ctx: makeCtx(grade) });
  console.log(`\n--- ${title} (Grade ${grade}) ---`);
  for (const q of qs) {
    console.log(
      `  ${q.id}: ${q.qa_flagged ? 'FLAGGED' : 'passed'}${q.qa_issue ? ` — ${q.qa_issue}` : ''}`
    );
  }
  return qs;
};

const g1 = await run('grade-1-ceiling', 1, [
  question('overcomplex', OVERCOMPLEX_STEM, ADD_OPTIONS),
  question('moderate', MODERATE_STEM, PROFIT_OPTIONS),
  question('compliant', COMPLIANT_STEM, ADD_OPTIONS)
]);

const g9 = await run('grade-9-control', 9, [
  question('moderate', MODERATE_STEM, PROFIT_OPTIONS)
]);

const byId = (list, id) => list.find((q) => q.id === id);
const g1Overcomplex = byId(g1, 'overcomplex');
const g1Moderate = byId(g1, 'moderate');
const g1Compliant = byId(g1, 'compliant');
const g9Moderate = g9[0];

const results = {
  'deliberately verbose stem flagged at Grade 1': g1Overcomplex.qa_flagged === true,
  'Grade 1 flag cites complexity': /complex|long|wordy|word|sentence|clause/i.test(
    g1Overcomplex.qa_issue || ''
  ),
  'over-ceiling stem flagged at Grade 1': g1Moderate.qa_flagged === true,
  'compliant Grade 1 stem passes': g1Compliant.qa_flagged !== true,
  'SAME stem passes at Grade 9 (grade-sensitive, not length-phobic)':
    g9Moderate.qa_flagged !== true
};

console.log('\n=== ASSERTIONS ===');
let failed = 0;
for (const [name, pass] of Object.entries(results)) {
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (!pass) failed++;
}
console.log(failed === 0 ? '\nverify-grade-complexity-qa: OK' : `\n${failed} assertion(s) failed`);
process.exit(failed === 0 ? 0 : 1);
