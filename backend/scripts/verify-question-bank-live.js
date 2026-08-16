/**
 * Part 3 live check: generate a real original batch, review queue E2E,
 * then optionally generate one lesson and report bank vs fresh mix.
 *
 * Usage (from backend/):
 *   node scripts/verify-question-bank-live.js
 *   GENERATE_LESSON=1 node scripts/verify-question-bank-live.js
 */
import 'dotenv/config';
import { Lesson } from '../models/Lesson.js';
import {
  generateQuestionBankBatch,
  reviewQuestionBankEntry,
  pullApprovedBankQuestions,
  listQuestionBank
} from '../admin/services/questionBankService.js';
import { generateLessonsFromSubStrand } from '../admin/services/lessonGenerationService.js';
import { isGradeOneAdditionContext } from '../utils/additionTemplate.js';
import { retrieveQuizExemplars } from '../admin/services/knowledgeRetrieveService.js';
import { tokenOverlapRatio } from '../admin/utils/textSimilarity.js';

const KNOWN_LESSON_ID = 'ac9356eb-d2d7-402a-9a14-ed1f8dfe221e';

const overlap = (stem, exemplarText) => tokenOverlapRatio(stem, exemplarText);

const main = async () => {
  const lesson = await Lesson.findById(KNOWN_LESSON_ID);
  if (!lesson) throw new Error(`Known Grade 1 lesson ${KNOWN_LESSON_ID} not found`);
  const subStrandId = lesson.subStrandId;
  console.log('Live bank verify against lesson', {
    title: lesson.title,
    grade: lesson.grade,
    subStrandId
  });

  const additionSkip = isGradeOneAdditionContext({
    grade: lesson.grade,
    subject: { name: 'Mathematics' },
    subStrand: { name: lesson.title }
  });
  console.log('Grade 1 Addition skip (by lesson title, informational):', additionSkip);

  let exemplars = [];
  try {
    exemplars = await retrieveQuizExemplars({
      subjectName: 'Mathematics',
      grade: lesson.grade,
      topic: lesson.title,
      bloomBand: 'foundation',
      queryText: `${lesson.title} counting`
    });
  } catch (err) {
    console.warn('Exemplar retrieve failed:', err.message || err);
  }
  console.log(`Ingested quiz exemplars available: ${exemplars.length}`);

  console.log('Generating original bank batch…');
  const batch = await generateQuestionBankBatch(subStrandId, { count: 6 });
  console.log('Batch result', {
    created: batch.created,
    pending: batch.pending,
    rejected: batch.rejected,
    qaFlagged: batch.qaFlagged,
    nearDuplicate: batch.nearDuplicate,
    exemplarCount: batch.exemplarCount
  });

  for (const entry of batch.entries || []) {
    const stem = entry.question?.question || '';
    let maxJ = 0;
    let closest = '';
    for (const ex of exemplars) {
      const text = ex.question_text || ex.content || '';
      const j = overlap(stem, text);
      if (j > maxJ) {
        maxJ = j;
        closest = String(text).slice(0, 80);
      }
    }
    console.log('  item', {
      id: entry.id,
      status: entry.status,
      qaFlagged: entry.qaFlagged,
      nearDup: entry.flaggedNearDuplicate,
      stem,
      maxJaccardVsExemplar: Number(maxJ.toFixed(3)),
      closest: closest || null
    });
  }

  const pending = (batch.entries || []).filter(
    (e) => e.status === 'pending' && !e.flaggedNearDuplicate
  );
  if (pending.length === 0) {
    console.warn('No pending original items to review — stopping before lesson mix.');
    return;
  }

  const toApprove = pending[0];
  const approved = await reviewQuestionBankEntry(toApprove.id, {
    action: 'approve',
    reviewerId: null
  });
  console.log('Approved', approved.id, approved.status);

  const edited = await reviewQuestionBankEntry(toApprove.id, {
    action: 'edit',
    question: {
      question: approved.question.question,
      options: approved.question.options,
      correctAnswerIndex: approved.question.correctAnswerIndex
    }
  });
  console.log('Edited (flags cleared)', {
    id: edited.id,
    status: edited.status,
    qaFlagged: edited.qaFlagged,
    nearDup: edited.flaggedNearDuplicate
  });

  if (pending[1]) {
    const rejected = await reviewQuestionBankEntry(pending[1].id, {
      action: 'reject',
      rejectReason: 'verification reject',
      reviewerId: null
    });
    console.log('Rejected', rejected.id, rejected.status, rejected.rejectReason);
  }

  const listed = await listQuestionBank({ subStrandId, limit: 20 });
  console.log(
    'Queue counts',
    listed.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {})
  );

  const pulled = await pullApprovedBankQuestions({
    subStrandId,
    grade: lesson.grade,
    count: 8
  });
  console.log(`Pull after review: ${pulled.length} approved items stamped with bankEntryId`);

  if (process.env.GENERATE_LESSON !== '1') {
    console.log('Skipping full lesson generation (set GENERATE_LESSON=1 to run it).');
    console.log('verify-question-bank-live: OK (batch + review; no lesson mix)');
    return;
  }

  console.log('Generating one lesson to measure bank vs fresh mix…');
  const lessons = await generateLessonsFromSubStrand(subStrandId, 1);
  const quizQs = lessons[0]?.quiz?.questions || [];
  const fromBank = quizQs.filter((q) => q.bankEntryId).length;
  const fresh = quizQs.length - fromBank;
  console.log('Lesson mix', {
    title: lessons[0]?.title,
    total: quizQs.length,
    fromBank,
    freshlyGenerated: fresh
  });
  console.log('verify-question-bank-live: OK (batch + review + lesson mix)');
};

main().catch((err) => {
  console.error('verify-question-bank-live FAILED:', err.message || err);
  process.exit(1);
});
