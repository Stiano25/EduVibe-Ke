import { generateContent } from '../../providers/contentProvider.js';
import {
  loadGenerationContext,
  parseOneLessonJson,
  chunkQuestions,
  flagNearDuplicateQuestions,
  normalizeQuiz,
  runQuizQAPass
} from './lessonGenerationService.js';
import { retrieveQuizExemplars, formatQuizExemplarsForPrompt } from './knowledgeRetrieveService.js';
import { isGradeOneAdditionContext } from '../../utils/additionTemplate.js';
import { resolveInteractionType } from '../../utils/interactionTypes.js';
import { QuestionBankEntry, QuestionBankServe } from '../../models/QuestionBankEntry.js';

const BANK_BATCH_DEFAULT = 8;
const BANK_BATCH_MAX = 20;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const bloomForMix = (i) => {
  const cycle = ['recall', 'understand', 'apply', 'reason'];
  return cycle[i % cycle.length];
};

const buildBankGenerationPrompt = (ctx, count, quizExemplarsBlock) => {
  const { grade, ageGroup, subject, strand, subStrand, outcomesBlock, complexityBand } = ctx;
  const ceiling = complexityBand?.constrained
    ? `GRADE COMPLEXITY CEILING: at most ${complexityBand.maxSentences} sentence(s) and ${complexityBand.maxWords} words per stem.`
    : `Write clearly for ${ageGroup} (Grade ${grade}).`;

  return `Create ${count} ORIGINAL multiple-choice quiz questions for Kenyan CBC Grade ${grade} ${subject.name} · ${strand.name} · ${subStrand.name}, for ${ageGroup}.

Outcomes (use exact learningOutcomeIndex 1-based):
${outcomesBlock}

${ceiling}

COPYRIGHT — this is a hard constraint, not a style preference:
- Source / past-paper text below (if any) may inform TONE, FORMAT, and DIFFICULTY only.
- Do NOT reproduce, closely paraphrase, or lift specific numbers, names, option sets, or sentence structure from any source item.
- Every stem, every option, and every number must be newly authored.
- If you cannot write an original item, skip that slot rather than rewriting a source question.

${quizExemplarsBlock || 'No source exemplars were available. Write from the outcomes alone.'}

Return ONLY one JSON object:
{ "quiz": { "questions": [ /* exactly ${count} items */ ] } }

Each question: question, interactionType (multiple_choice, numeric_entry, or drag_to_target), options (3-4 strings or {diagramType,params} picture options) and correctAnswerIndex for multiple_choice, or params {a,b} and answerFormula for numeric_entry, or params {a,b,target,objectPool,objectKind} and answerFormula for drag_to_target, explanation (max 16 words), distractors[{"optionIndex","misconception":"max 8 words"}] for MCQ, reviewRationale[{"optionIndex","text"}] for EVERY MCQ option, learningOutcomeIndex, bloomLevel (recall|understand|apply|reason), modality (visual|text_steps|practice), difficulty (easy|intermediate|advanced).
For Grade 1 counting/addition, prefer numeric_entry with params.layout "vertical" and question "Add." (stacked digits, no story), drag_to_target for "show this many", and picture options when the choice is a quantity of a named object. Keep plain-text multiple_choice for abstract number comparisons.
Do NOT include id, type, template, or feedback fields.
Do NOT set template:true. These are fixed reviewed items, not parametrized templates.
Keep learner-facing strings concise. Complete valid JSON only. No markdown fences.`;
};

const toBankRow = (normalizedQuestion, ctx, { status, styleSourceNote, qaFlagged, qaIssue, flaggedNearDuplicate, rejectReason }) => ({
  subjectId: ctx.subject.id,
  subjectName: ctx.subject.name,
  grade: ctx.grade,
  strandId: ctx.strand.id,
  subStrandId: ctx.subStrand.id,
  topic: ctx.subStrand.name,
  difficulty: normalizedQuestion.difficulty || 'easy',
  interactionType: resolveInteractionType(
    normalizedQuestion.interactionType || normalizedQuestion.type
  ),
  bloomLevel: normalizedQuestion.bloomLevel || 'understand',
  question: normalizedQuestion,
  styleSourceNote,
  status,
  qaFlagged,
  qaIssue,
  flaggedNearDuplicate,
  rejectReason
});

export const generateQuestionBankBatch = async (subStrandId, { count = BANK_BATCH_DEFAULT } = {}) => {
  const n = Math.min(BANK_BATCH_MAX, Math.max(4, Number(count) || BANK_BATCH_DEFAULT));
  const ctx = await loadGenerationContext(subStrandId);
  if (isGradeOneAdditionContext(ctx)) {
    throw new Error(
      'Grade 1 Addition uses the template/twist engine. Do not generate reviewed bank items for this sub-strand.'
    );
  }

  let exemplars = [];
  try {
    exemplars = await retrieveQuizExemplars({
      subjectName: ctx.subject.name,
      grade: ctx.grade,
      topic: ctx.subStrand.name,
      bloomBand: 'foundation',
      queryText: ctx.queryText
    });
  } catch (err) {
    console.warn('Bank generation: exemplar retrieve failed:', err.message || err);
  }
  const quizExemplarsBlock = formatQuizExemplarsForPrompt(exemplars);
  const styleSourceNote = exemplars.length
    ? `Style informed by ${exemplars.length} ingested source question(s) on ${ctx.subStrand.name} (tone/format/difficulty only; not copied).`
    : `No ingested source documents; authored from Grade ${ctx.grade} ${ctx.subStrand.name} curriculum outcomes.`;

  await sleep(400);
  const { text } = await generateContent({
    prompt: buildBankGenerationPrompt(ctx, n, quizExemplarsBlock),
    maxTokens: 16000,
    label: `question-bank ${ctx.subStrand.name}`
  });

  const parsed = parseOneLessonJson(text, ctx, 0);
  if (parsed.parseFailed) {
    throw new Error('Bank generation returned unparseable JSON');
  }
  let raw = flagNearDuplicateQuestions(chunkQuestions(parsed.data), exemplars, 'question-bank');
  raw = raw.filter((q) => q?.template !== true);

  const outcomes = ctx.sourceOutcomes;
  const profile = ctx.profile;
  const { questions } = normalizeQuiz(
    { questions: raw },
    outcomes,
    profile,
    { additionTemplates: false, gradeNumber: ctx.gradeNumber }
  );

  await runQuizQAPass(questions, { label: 'question-bank', ctx });

  const rows = questions.map((q, i) => {
    const nearDup = !!q.flagged_near_duplicate;
    const qaFail = !!q.qa_flagged;
    let status = 'pending';
    let rejectReason = null;
    if (nearDup) {
      status = 'rejected';
      rejectReason = 'too close to source document';
    } else if (qaFail) {
      status = 'pending';
    }
    if (!q.bloomLevel) q.bloomLevel = bloomForMix(i);
    return toBankRow(q, ctx, {
      status,
      styleSourceNote,
      qaFlagged: qaFail,
      qaIssue: q.qa_issue || null,
      flaggedNearDuplicate: nearDup,
      rejectReason
    });
  });

  const saved = await QuestionBankEntry.createMany(rows);
  return {
    subStrandId,
    topic: ctx.subStrand.name,
    grade: ctx.grade,
    exemplarCount: exemplars.length,
    created: saved.length,
    pending: saved.filter((r) => r.status === 'pending').length,
    rejected: saved.filter((r) => r.status === 'rejected').length,
    qaFlagged: saved.filter((r) => r.qaFlagged).length,
    nearDuplicate: saved.filter((r) => r.flaggedNearDuplicate).length,
    entries: saved
  };
};

const diversify = (entries, count) => {
  const byBloom = new Map();
  for (const entry of entries) {
    const key = entry.bloomLevel || 'understand';
    if (!byBloom.has(key)) byBloom.set(key, []);
    byBloom.get(key).push(entry);
  }
  for (const list of byBloom.values()) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
  }
  const keys = [...byBloom.keys()];
  const picked = [];
  let guard = 0;
  while (picked.length < count && guard < count * 8) {
    guard += 1;
    for (const key of keys) {
      const list = byBloom.get(key);
      if (list?.length) picked.push(list.shift());
      if (picked.length >= count) break;
    }
  }
  return picked;
};

/** Approved bank items as quiz questions, stamped with bankEntryId. */
export const pullApprovedBankQuestions = async ({
  subStrandId,
  grade,
  count,
  excludeBankEntryIds = []
} = {}) => {
  const approved = await QuestionBankEntry.findApprovedForPull({
    subStrandId,
    grade,
    interactionType: 'multiple_choice'
  });
  const exclude = new Set(excludeBankEntryIds.filter(Boolean));
  const eligible = approved.filter((entry) => !exclude.has(entry.id));
  const picked = diversify(eligible, Math.max(0, Number(count) || 0));
  return picked.map((entry) => {
    const q = { ...(entry.question || {}) };
    delete q.id;
    delete q.template;
    q.bankEntryId = entry.id;
    q.interactionType = resolveInteractionType(q.interactionType || entry.interactionType);
    return q;
  });
};

export const recordLessonBankServes = async (lessons = []) => {
  for (const lesson of lessons) {
    const questions = lesson?.quiz?.questions || [];
    for (const q of questions) {
      if (!q?.bankEntryId) continue;
      await QuestionBankServe.record({
        bankEntryId: q.bankEntryId,
        lessonId: lesson.id,
        questionId: q.id || null,
        source: 'lesson_generation'
      });
    }
  }
};

export const recordLearnerBankServe = async ({ bankEntryId, lessonId, learnerId, questionId }) => {
  if (!bankEntryId) return null;
  return QuestionBankServe.record({
    bankEntryId,
    lessonId,
    learnerId,
    questionId,
    source: 'learner_attempt'
  });
};

export const listQuestionBank = (filters) => QuestionBankEntry.list(filters);

export const reviewQuestionBankEntry = async (id, { action, question, rejectReason, reviewerId }) => {
  const existing = await QuestionBankEntry.findById(id);
  if (!existing) throw new Error('Bank entry not found');
  if (action === 'approve') {
    if (existing.flaggedNearDuplicate) {
      throw new Error('Near-duplicate of source material cannot be approved — edit it first');
    }
    return QuestionBankEntry.update(id, {
      status: 'approved',
      reviewedBy: reviewerId || null,
      reviewedAt: new Date().toISOString(),
      rejectReason: null
    });
  }
  if (action === 'reject') {
    return QuestionBankEntry.update(id, {
      status: 'rejected',
      reviewedBy: reviewerId || null,
      reviewedAt: new Date().toISOString(),
      rejectReason: rejectReason || existing.rejectReason || 'rejected in review'
    });
  }
  if (action === 'edit') {
    const nextQuestion = { ...existing.question, ...(question || {}) };
    delete nextQuestion.flagged_near_duplicate;
    return QuestionBankEntry.update(id, {
      question: nextQuestion,
      difficulty: nextQuestion.difficulty || existing.difficulty,
      bloomLevel: nextQuestion.bloomLevel || existing.bloomLevel,
      flaggedNearDuplicate: false,
      qaFlagged: false,
      qaIssue: null,
      status: existing.status === 'rejected' ? 'pending' : existing.status
    });
  }
  throw new Error('Unknown review action');
};
