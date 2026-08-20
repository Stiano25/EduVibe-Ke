/**
 * Real-path generation for Scope B slice 1:
 *   - one Grade 2 Subtraction lesson (should attach the newly registered 2-2 ladder)
 *   - one Grade 3 Addition lesson (should attach the new 3-digit templates)
 *
 * Does NOT generate Multiplication or Division.
 *
 * Usage (from backend/): node scripts/generate-scope-b-slice1-lessons.js
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../config/loadEnv.js';
import { Subject } from '../models/Subject.js';
import { SubStrand } from '../models/SubStrand.js';
import { Lesson } from '../models/Lesson.js';
import { generateLessonsFromSubStrand, loadGenerationContext } from '../admin/services/lessonGenerationService.js';
import {
  detectTemplatableSkill,
  laddersForOutcomes,
  resolveContentSource,
  rungOf
} from '../utils/templateLadders.js';
import { QUIZ_SOURCE_TEMPLATES, QUIZ_SOURCE_FIXED_POOL } from '../utils/quizSessionSize.js';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '../../docs/measurements/scope-b-slice1-lessons.json');

const strip = (name = '') =>
  String(name || '')
    .toLowerCase()
    .replace(/^\d+(\.\d+)?\s*/, '')
    .trim();

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

const summarizeLesson = (lesson, ctx) => {
  const templates = lesson.quiz?.templates || [];
  const questions = lesson.quiz?.questions || [];
  return {
    id: lesson.id || null,
    title: lesson.title,
    grade: ctx.grade,
    subject: ctx.subject.name,
    subStrand: ctx.subStrand.name,
    assignedOutcome: lesson.learningObjectives?.[0] || null,
    source: lesson.quiz?.source || null,
    templateCount: templates.length,
    templateIds: templates.map((t) => t.id),
    rungs: [...new Set(templates.map((t) => rungOf(t)))],
    seedCount: questions.length,
    seedSample: questions.slice(0, 3).map((q) => ({
      interactionType: q.interactionType,
      stem: q.question,
      a: q.params?.a,
      b: q.params?.b,
      layout: q.params?.layout,
      operation: q.params?.operation || null,
      answerFormula: q.answerFormula,
      templateId: q.templateId || null
    }))
  };
};

const generateOne = async (subStrand, label) => {
  const ctx = await loadGenerationContext(subStrand.id);
  const family = detectTemplatableSkill(ctx);
  console.log(`\n=== ${label} ===`);
  console.log({
    id: subStrand.id,
    grade: ctx.grade,
    name: ctx.subStrand.name,
    family,
    contentSource: resolveContentSource(ctx, ctx.sourceOutcomes)
  });
  const generated = await generateLessonsFromSubStrand(subStrand.id, 1, ({ percent, message }) => {
    console.log(`[${percent}%] ${message}`);
  });
  if (!generated.length) throw new Error(`${label}: no lesson generated`);
  const saved = await Lesson.createMany(generated);
  return summarizeLesson(saved[0], ctx);
};

const isolation = async (grade, slug) => {
  const sub = await findSubStrand(grade, slug);
  const ctx = await loadGenerationContext(sub.id);
  return {
    grade: ctx.grade,
    subStrand: ctx.subStrand.name,
    family: detectTemplatableSkill(ctx),
    contentSource: resolveContentSource(ctx, ctx.sourceOutcomes),
    attached: laddersForOutcomes(ctx, ctx.sourceOutcomes).map((t) => t.id)
  };
};

const main = async () => {
  const g2Sub = await findSubStrand(2, 'subtraction');
  const g3Add = await findSubStrand(3, 'addition');
  const g2Lesson = await generateOne(g2Sub, 'Grade 2 Subtraction');
  const g3Lesson = await generateOne(g3Add, 'Grade 3 Addition');
  const untouched = {
    g3Subtraction: await isolation(3, 'subtraction'),
    g3Multiplication: await isolation(3, 'multiplication'),
    g3Division: await isolation(3, 'division')
  };
  const report = { g2Lesson, g3Lesson, untouched };
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(report, null, 2));
  console.log('wrote', outPath);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
