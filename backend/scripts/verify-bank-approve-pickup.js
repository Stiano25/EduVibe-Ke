/**
 * Live check: approving a pending bank item attaches it to a waiting
 * pending/draft lesson without a manual top-up.
 *
 * Usage (from backend/):
 *   node scripts/verify-bank-approve-pickup.js
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QuestionBankEntry } from '../models/QuestionBankEntry.js';
import { Lesson } from '../models/Lesson.js';
import { reviewQuestionBankEntry } from '../admin/services/questionBankService.js';
import { checkOutcomeCoverage } from '../admin/services/lessonGenerationService.js';
import { isTemplateBackedQuiz, fixedPoolTargetSize } from '../utils/quizSessionSize.js';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '../../docs/measurements/bank-approve-pickup.json');

const isWaiting = (lesson, entry) => {
  if (lesson.status !== 'pending' && lesson.status !== 'draft') return false;
  if (isTemplateBackedQuiz(lesson.quiz)) return false;
  if (entry.grade && lesson.grade && String(lesson.grade) !== String(entry.grade)) return false;
  const existing = lesson.quiz?.questions || [];
  const outcomes = lesson.learningObjectives || [];
  const sessionNeed = fixedPoolTargetSize(outcomes.length);
  const { uncovered } = checkOutcomeCoverage(existing, outcomes);
  return existing.length < sessionNeed || uncovered.length > 0;
};

const main = async () => {
  const pending = (await QuestionBankEntry.list({ status: 'pending', limit: 80 })).filter(
    (entry) => !entry.flaggedNearDuplicate
  );
  const filterSample = pending[0]
    ? {
        grade: pending[0].grade || null,
        subjectId: pending[0].subjectId || null,
        strandId: pending[0].strandId || null,
        subStrandId: pending[0].subStrandId || null,
        topic: pending[0].topic || null,
        href: `/admin/knowledge?status=pending${
          pending[0].grade ? `&grade=${encodeURIComponent(pending[0].grade)}` : ''
        }${pending[0].subjectId ? `&subjectId=${pending[0].subjectId}` : ''}${
          pending[0].strandId ? `&strandId=${pending[0].strandId}` : ''
        }${pending[0].subStrandId ? `&subStrandId=${pending[0].subStrandId}` : ''}`
      }
    : null;

  let pair = null;
  for (const entry of pending) {
    if (!entry.subStrandId) continue;
    const siblings = await Lesson.findBySubStrand(entry.subStrandId);
    const waiting = siblings.find((lesson) => isWaiting(lesson, entry));
    if (waiting) {
      pair = { entry, lesson: waiting };
      break;
    }
  }

  const report = {
    pendingEligible: pending.length,
    filterSample,
    pairFound: !!pair
  };

  if (!pair) {
    report.pickup = {
      ran: false,
      reason: 'No pending bank item with a waiting pending/draft lesson on the same sub-strand'
    };
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const before = pair.lesson.quiz?.questions || [];
  const beforeIds = new Set(before.map((q) => q.bankEntryId).filter(Boolean));
  report.lesson = {
    id: pair.lesson.id,
    title: pair.lesson.title,
    status: pair.lesson.status,
    grade: pair.lesson.grade,
    subStrandId: pair.lesson.subStrandId,
    questionsBefore: before.length
  };
  report.entry = {
    id: pair.entry.id,
    grade: pair.entry.grade,
    topic: pair.entry.topic,
    stem: pair.entry.question?.question || null
  };

  await reviewQuestionBankEntry(pair.entry.id, { action: 'approve', reviewerId: null });
  const afterLesson = await Lesson.findById(pair.lesson.id);
  const after = afterLesson?.quiz?.questions || [];
  const attachedThis = after.some((q) => q.bankEntryId === pair.entry.id);
  const newBankIds = after
    .map((q) => q.bankEntryId)
    .filter((id) => id && !beforeIds.has(id));

  report.pickup = {
    ran: true,
    questionsAfter: after.length,
    added: after.length - before.length,
    attachedApprovedEntry: attachedThis,
    newBankEntryIds: newBankIds,
    withoutManualTopUp: true
  };

  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (after.length <= before.length) {
    throw new Error('Approve did not attach questions to the waiting lesson');
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
