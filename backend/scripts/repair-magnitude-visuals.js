/**
 * Repair live Grade 2/3 add/sub visuals that the magnitude audit flagged,
 * and re-run QA on the two rejected column-subtraction bank rows.
 *
 * Does not auto-approve rejected items.
 *
 * Usage (from backend/): node scripts/repair-magnitude-visuals.js
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../config/loadEnv.js';
import { Lesson } from '../models/Lesson.js';
import { QuestionBankEntry } from '../models/QuestionBankEntry.js';
import {
  getComplexityBand,
  runQuizQAPass
} from '../admin/services/lessonGenerationService.js';
import {
  applyMagnitudeCaps,
  sanitizePlaceValueParams
} from '../utils/magnitudeVisuals.js';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '../../docs/measurements/magnitude-visuals-repair.json');

const BAD_APPROVED = [
  '5c9ae193-bd87-4a98-92f3-916f4e0868c4',
  '8d7f1c95-2b45-48fb-bbf4-f1c972681b28'
];
const REJECTED_COLUMNS = [
  'f9f1116b-3eb6-4e78-8546-9c9847f0f91f',
  '04aec297-3216-4af8-94f8-e5624c785eb7'
];
const LESSON_IDS = [
  'fcec0faf-a0e6-48c8-bc74-b1e26d8e5631',
  'd814e220-2b83-4b4b-babe-9cd24d6d1539',
  '5185a690-f1a9-40ef-8829-0d5c0a72850c'
];

const repairBrief = (brief, { interactionType, questionParams, preferPlaceValue, questionText } = {}) => {
  if (!brief || typeof brief !== 'object') return brief;
  const type = brief.diagramType;
  if (!type) return brief;
  const text = `${questionText || ''} ${brief.brief || ''} ${brief.skillFocus || ''}`;
  if (type === 'place_value') {
    return { ...brief, params: sanitizePlaceValueParams(brief.params || {}, text) };
  }
  const capped = applyMagnitudeCaps({
    diagramType: type,
    params: brief.params || {},
    text,
    interactionType,
    questionParams,
    preferPlaceValue: preferPlaceValue !== false
  });
  if (capped.dropVisual) {
    return { ...brief, diagramType: null, params: null, dropped: true };
  }
  return { ...brief, diagramType: capped.diagramType, params: capped.params };
};

const repairQuestion = (q) => {
  const diagram = q.diagram && typeof q.diagram === 'object' ? q.diagram : null;
  if (!diagram?.diagramType && !q.diagramBriefId) return { question: q, changed: false };
  const text = `${q.question || ''} ${diagram?.brief || ''}`;
  const before = JSON.stringify({
    type: diagram?.diagramType,
    params: diagram?.params
  });
  const capped = applyMagnitudeCaps({
    diagramType: diagram?.diagramType,
    params: diagram?.params || {},
    text,
    interactionType: q.interactionType || q.type,
    questionParams: q.params,
    preferPlaceValue: true
  });
  const next = { ...q };
  if (capped.dropVisual) {
    next.diagram = undefined;
    next.diagramBriefId = null;
    next.modality = next.modality === 'visual' ? 'practice' : next.modality;
  } else if (capped.diagramType) {
    next.diagram = {
      ...(diagram || {}),
      diagramType: capped.diagramType,
      params: capped.params
    };
  }
  const after = JSON.stringify({
    type: next.diagram?.diagramType || null,
    params: next.diagram?.params || null
  });
  return { question: next, changed: before !== after };
};

const report = { bank: [], lessons: [], rejectedQa: [] };

for (const id of BAD_APPROVED) {
  const row = await QuestionBankEntry.findById(id);
  if (!row) {
    report.bank.push({ id, error: 'not found' });
    continue;
  }
  const { question, changed } = repairQuestion(row.question || {});
  if (changed) {
    await QuestionBankEntry.update(id, { question });
  }
  report.bank.push({
    id,
    status: row.status,
    stem: String((question.question || row.question?.question || '')).slice(0, 80),
    beforeType: row.question?.diagram?.diagramType || null,
    beforeParams: row.question?.diagram?.params || null,
    afterType: question.diagram?.diagramType || null,
    afterParams: question.diagram?.params || null,
    changed
  });
}

for (const id of LESSON_IDS) {
  const lesson = await Lesson.findById(id);
  if (!lesson) {
    report.lessons.push({ id, error: 'not found' });
    continue;
  }
  const quiz = { ...(lesson.quiz || {}) };
  const questions = Array.isArray(quiz.questions) ? quiz.questions.map((q) => repairQuestion(q).question) : [];
  const briefs = Array.isArray(quiz.visualBriefs)
    ? quiz.visualBriefs
        .map((b) => {
          const q = questions.find((item) => item.diagramBriefId === b.id);
          return repairBrief(b, {
            interactionType: q?.interactionType,
            questionParams: q?.params,
            questionText: q?.question,
            preferPlaceValue: true
          });
        })
        .filter((b) => b && !b.dropped)
    : [];
  quiz.questions = questions;
  quiz.visualBriefs = briefs;
  await Lesson.update(id, { quiz });
  report.lessons.push({
    id,
    title: lesson.title,
    grade: lesson.grade,
    briefs: briefs.map((b) => ({
      id: b.id,
      diagramType: b.diagramType,
      params: b.params
    })),
    questions: questions.map((q) => ({
      id: q.id,
      stem: String(q.question || '').slice(0, 80),
      diagramType: q.diagram?.diagramType || null,
      params: q.diagram?.params || null
    }))
  });
}

const columnQuestions = [];
for (const id of REJECTED_COLUMNS) {
  const row = await QuestionBankEntry.findById(id);
  if (!row) {
    report.rejectedQa.push({ id, error: 'not found' });
    continue;
  }
  columnQuestions.push({
    id,
    existing: row,
    question: {
      ...(row.question || {}),
      interactionType: row.interactionType || row.question?.interactionType,
      qa_flagged: false,
      qa_issue: null
    }
  });
}

const qaInput = columnQuestions.map((row) => ({ ...row.question }));
const band = getComplexityBand(3);
await runQuizQAPass(qaInput, {
  label: 'repair-column-subtraction',
  ctx: {
    grade: '3',
    gradeNumber: 3,
    ageGroup: band.ageGroup,
    complexityBand: band,
    subject: { name: 'Mathematics' }
  }
});

for (let i = 0; i < columnQuestions.length; i += 1) {
  const { id, existing } = columnQuestions[i];
  const judged = qaInput[i];
  const passed = !judged.qa_flagged;
  const updates = {
    qaFlagged: !!judged.qa_flagged,
    qaIssue: judged.qa_issue || null
  };
  if (passed) {
    updates.status = 'pending';
    updates.rejectReason = null;
  }
  const saved = await QuestionBankEntry.update(id, updates);
  report.rejectedQa.push({
    id,
    stem: existing.question?.question,
    params: existing.question?.params,
    previousStatus: existing.status,
    previousIssue: existing.qaIssue || existing.rejectReason,
    qaFlagged: saved.qaFlagged,
    qaIssue: saved.qaIssue,
    newStatus: saved.status,
    autoApproved: false
  });
}

writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log('\nwrote', outPath);
