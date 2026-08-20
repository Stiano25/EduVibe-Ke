/**
 * Pending bank batches for the Fractions / Multiplication / Division mix
 * records. Does not approve rows. Writes a measurements dump of stems,
 * interaction types, and diagram params so magnitude caps can be checked
 * against real generated output.
 *
 * Usage (from backend/): node scripts/write-frac-mul-div-bank-batches.js
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../config/loadEnv.js';
import { Subject } from '../models/Subject.js';
import { SubStrand } from '../models/SubStrand.js';
import { generateQuestionBankBatch } from '../admin/services/questionBankService.js';
import { resolveBankMix } from '../admin/services/bankMixProfiles.js';
import { detectTemplatableSkill } from '../utils/templateLadders.js';
import {
  OBJECT_QUANTITY_CEILING,
  objectQuantities,
  objectQuantityExceedsCeiling
} from '../utils/magnitudeVisuals.js';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '../../docs/measurements/frac-mul-div-bank-mix.json');

const strip = (name = '') =>
  String(name || '')
    .toLowerCase()
    .replace(/^\d+(\.\d+)?\s*/, '')
    .trim();

const TARGETS = [
  { grade: 3, slug: 'fractions', label: 'Grade 3 Fractions' },
  { grade: 2, slug: 'multiplication', label: 'Grade 2 Multiplication' },
  { grade: 3, slug: 'multiplication', label: 'Grade 3 Multiplication' },
  { grade: 2, slug: 'division', label: 'Grade 2 Division' },
  { grade: 3, slug: 'division', label: 'Grade 3 Division' }
];

const findSubStrand = async (grade, slug) => {
  const subjects = await Subject.findByGrade(String(grade));
  const math = subjects.find((s) => /math/i.test(s.name));
  if (!math) throw new Error(`No Mathematics subject for grade ${grade}`);
  const rows = await SubStrand.findBySubject(math.id);
  const hit = rows.find((row) => strip(row.name) === slug);
  if (!hit) {
    throw new Error(
      `No ${slug} sub-strand for grade ${grade}. Found: ${rows.map((r) => r.name).join(', ') || '(none)'}`
    );
  }
  return hit;
};

const iconTotal = (params = {}) => {
  const qs = objectQuantities(params);
  return qs.reduce((sum, n) => sum + n, 0);
};

const inspectEntry = (entry) => {
  const q = entry.question || {};
  const diagram = q.diagram && typeof q.diagram === 'object' ? q.diagram : {};
  const params = diagram.params && typeof diagram.params === 'object' ? diagram.params : {};
  const groups = Array.isArray(params.groups) ? params.groups : null;
  const total = groups || params.count != null ? iconTotal(params) : null;
  return {
    id: entry.id,
    status: entry.status,
    qaFlagged: entry.qaFlagged || false,
    qaIssue: entry.qaIssue || null,
    interactionType: entry.interactionType,
    stem: q.question,
    layout: q.params?.layout || null,
    operation: q.params?.operation || null,
    a: q.params?.a ?? null,
    b: q.params?.b ?? null,
    diagramType: diagram.diagramType || null,
    objectKind: params.objectKind || null,
    groups,
    count: params.count ?? null,
    iconTotal: total,
    overObjectCeiling: objectQuantityExceedsCeiling(params),
    left: q.left || null,
    options0: Array.isArray(q.options) ? q.options[0] : null
  };
};

const mixFlags = (samples) => ({
  types: samples.reduce((acc, row) => {
    acc[row.interactionType] = (acc[row.interactionType] || 0) + 1;
    return acc;
  }, {}),
  matchingPairs: samples.filter((row) => row.interactionType === 'matching_pairs').length,
  oddOneOut: samples.filter((row) => row.interactionType === 'odd_one_out').length,
  verticalColumn: samples.filter((row) => row.layout === 'vertical').length,
  groupedVisuals: samples.filter((row) => Array.isArray(row.groups) && row.groups.length >= 2).length,
  overCeilingVisuals: samples.filter((row) => row.overObjectCeiling).length,
  maxIconTotal: samples.reduce((max, row) => {
    const n = Number(row.iconTotal);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0),
  ceiling: OBJECT_QUANTITY_CEILING
});

const main = async () => {
  const batches = [];
  for (const target of TARGETS) {
    const sub = await findSubStrand(target.grade, target.slug);
    const mix = resolveBankMix({
      grade: String(target.grade),
      subject: { name: 'Mathematics' },
      subStrand: { name: sub.name }
    });
    console.log(`\n=== ${target.label} ===`);
    console.log({
      id: sub.id,
      name: sub.name,
      mix: mix.key,
      family: detectTemplatableSkill({
        grade: String(target.grade),
        subject: { name: 'Mathematics' },
        subStrand: { name: sub.name }
      })
    });
    const batch = await generateQuestionBankBatch(sub.id, { count: 8 });
    const samples = (batch.entries || []).map(inspectEntry);
    const summary = {
      label: target.label,
      subStrandId: sub.id,
      topic: batch.topic,
      grade: batch.grade,
      mixKey: mix.key,
      family: detectTemplatableSkill({
        grade: String(target.grade),
        subject: { name: 'Mathematics' },
        subStrand: { name: sub.name }
      }),
      created: batch.created,
      pending: batch.pending,
      rejected: batch.rejected,
      qaFlagged: batch.qaFlagged,
      flags: mixFlags(samples),
      samples
    };
    batches.push(summary);
    console.log(JSON.stringify({ created: summary.created, flags: summary.flags }, null, 2));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    batches
  };
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('\nwrote', outPath);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
