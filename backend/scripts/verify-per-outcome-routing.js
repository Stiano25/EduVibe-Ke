/**
 * Exhaustive per-outcome routing for every registered template family.
 * Usage (from backend/): node scripts/verify-per-outcome-routing.js
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  familyFromContext,
  laddersForOutcomes,
  outcomesNeedingBank,
  resolveContentSource,
  rungOf
} from '../utils/templateLadders.js';
import { QUIZ_SOURCE_TEMPLATES, QUIZ_SOURCE_FIXED_POOL } from '../utils/quizSessionSize.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const strip = (name = '') =>
  String(name || '')
    .toLowerCase()
    .replace(/^\d+(\.\d+)?\s*/, '')
    .trim();

const curriculum = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../data/grade1-3-mathematics-curriculum.json'),
    'utf8'
  )
);

const FAMILIES = [
  { grade: '1', slug: 'addition', label: 'Grade 1 Addition' },
  { grade: '1', slug: 'subtraction', label: 'Grade 1 Subtraction' },
  { grade: '1', slug: 'number concept', label: 'Grade 1 Number Concept' },
  { grade: '2', slug: 'subtraction', label: 'Grade 2 Subtraction' },
  { grade: '3', slug: 'addition', label: 'Grade 3 Addition' }
];

/** Intent: template only when a registered rung actually tests this outcome. */
const EXPECT_BANK = new Set([
  '1|addition|add 3-single digit numbers up to a sum of 10 in different contexts',
  '1|addition|work out missing numbers in patterns involving addition of whole numbers up to 100',
  '1|subtraction|use the relationship between addition and subtraction in working out problems involving basic addition facts',
  '1|subtraction|work out missing numbers in patterns involving subtraction of whole numbers up to 100',
  '1|number concept|sort and group objects according to different attributes within the classroom',
  '1|number concept|pair and match objects in the environment',
  '1|number concept|order and sequence objects in ascending and descending order',
  '1|number concept|make patterns using real objects',
  '1|number concept|recite number names in order up to 50',
  '1|number concept|appreciate the use of sorting and grouping items in day to day activities',
  '2|subtraction|use the relationship between addition and subtraction in working out problems',
  '2|subtraction|work out missing numbers in subtraction of up to 2-digit numbers',
  '2|subtraction|work out missing numbers in patterns involving subtraction up to 100',
  '3|addition|add three single digit numbers with sum up to 27',
  '3|addition|work out missing numbers in patterns involving addition up to 1000',
  '3|addition|create number patterns involving addition up to 1000'
]);

const findSubStrand = (grade, slug) => {
  const g = (curriculum.grades || []).find((row) => String(row.grade) === String(grade));
  for (const strand of g?.strands || []) {
    for (const ss of strand.subStrands || []) {
      if (strip(ss.subStrand) === slug) return ss;
    }
  }
  return null;
};

const rows = [];
for (const fam of FAMILIES) {
  const ss = findSubStrand(fam.grade, fam.slug);
  assert(ss, `curriculum has ${fam.label}`);
  const ctx = {
    grade: fam.grade,
    subject: { name: 'Mathematics' },
    subStrand: { name: ss.subStrand }
  };
  assert(familyFromContext(ctx), `${fam.label} is a registered family`);
  const outcomes = ss.specificLearningOutcomes || [];
  assert(outcomes.length > 0, `${fam.label} has KICD outcomes`);
  for (const outcome of outcomes) {
    const source = resolveContentSource(ctx, [outcome]);
    const templates = laddersForOutcomes(ctx, [outcome]);
    const rungs = [...new Set(templates.map((t) => rungOf(t)))];
    const key = `${fam.grade}|${fam.slug}|${outcome}`;
    const expect = EXPECT_BANK.has(key) ? QUIZ_SOURCE_FIXED_POOL : QUIZ_SOURCE_TEMPLATES;
    const correct = source === expect;
    rows.push({
      family: fam.label,
      outcome,
      source,
      rungs: rungs.join(', ') || '—',
      expect,
      correct
    });
    assert(correct, `${fam.label}: "${outcome}" routed ${source}, expected ${expect}`);
  }
  const bankList = outcomesNeedingBank(ctx, outcomes);
  const expectedBank = outcomes.filter((o) => EXPECT_BANK.has(`${fam.grade}|${fam.slug}|${o}`));
  assert(
    bankList.join('\n') === expectedBank.join('\n'),
    `${fam.label} bank-eligible list matches expected unmatched outcomes`
  );
}

console.log('\nfamily | outcome | routing | rungs | expected | ok');
console.log('---|---|---|---|---|---');
for (const row of rows) {
  console.log(
    `${row.family} | ${row.outcome} | ${row.source} | ${row.rungs} | ${row.expect} | ${row.correct ? 'yes' : 'NO'}`
  );
}

console.log('\nverify-per-outcome-routing: OK', {
  rows: rows.length,
  bank: rows.filter((r) => r.source === QUIZ_SOURCE_FIXED_POOL).length,
  templates: rows.filter((r) => r.source === QUIZ_SOURCE_TEMPLATES).length
});
