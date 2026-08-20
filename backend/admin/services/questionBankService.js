import { generateContent } from '../../providers/contentProvider.js';
import {
  loadGenerationContext,
  parseOneLessonJson,
  chunkQuestions,
  flagNearDuplicateQuestions,
  normalizeQuiz,
  prefersConcreteDiagrams,
  runQuizQAPass
} from './lessonGenerationService.js';
import { retrieveQuizExemplars, formatQuizExemplarsForPrompt } from './knowledgeRetrieveService.js';
import { getSubjectProfile } from './subjectProfiles.js';
import { detectTemplatableSkill } from '../../utils/templateLadders.js';
import { resolveInteractionType } from '../../utils/interactionTypes.js';
import { OBJECT_KINDS } from '../../utils/objectKinds.js';
import { QuestionBankEntry, QuestionBankServe } from '../../models/QuestionBankEntry.js';

const BANK_BATCH_DEFAULT = 8;
const BANK_BATCH_MAX = 20;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const bloomForMix = (i) => {
  const cycle = ['recall', 'understand', 'apply', 'reason'];
  return cycle[i % cycle.length];
};

const stripSequencePrefix = (name = '') =>
  String(name || '')
    .toLowerCase()
    .replace(/^\d+(\.\d+)?\s*/, '')
    .trim();

/** Two-operand column add/subtract only — not measurement word problems, not Science. */
export const isColumnArithmeticTopic = (ctx = {}) => {
  const subject = String(ctx.subject?.name || ctx.subjectName || '').toLowerCase();
  if (!/math/.test(subject)) return false;
  const sub = stripSequencePrefix(ctx.subStrand?.name || ctx.subStrandName || '');
  return sub === 'addition' || sub === 'subtraction';
};

export const isFractionTopic = (ctx = {}) => {
  const subject = String(ctx.subject?.name || ctx.subjectName || '').toLowerCase();
  if (!/math/.test(subject)) return false;
  return /fraction/.test(stripSequencePrefix(ctx.subStrand?.name || ctx.subStrandName || ''));
};

const objectKindList = OBJECT_KINDS.join(', ');

const bankInteractionMix = (ctx) => {
  if (isColumnArithmeticTopic(ctx)) {
    const operation = stripSequencePrefix(ctx.subStrand?.name || '') === 'subtraction' ? 'subtract' : 'add';
    const instruction = operation === 'subtract' ? 'Subtract.' : 'Add.';
    const formula = operation === 'subtract' ? 'a - b' : 'a + b';
    return `INTERACTION MIX — COLUMN ARITHMETIC (this topic only):
- At least 2 items MUST be interactionType "numeric_entry" with params:{a,b,layout:"vertical",operation:"${operation}"}, answerFormula:"${formula}", question "${instruction}", options []. The figure is stacked digits, a line, and the answer underneath — never a shopkeeper story.
- Use drag_to_target only when both addends are small enough to place as icons (target ≤ 20). Set activity:"count_into_box", params:{a,b,target,objectPool,objectKind} with objectKind from: ${objectKindList}.
- Remaining items: multiple_choice. Use {diagramType:"object_quantity",params:{objectKind,count}} picture options when the choice is a quantity of a named object. Keep plain-text options for abstract comparisons and number patterns.
- Vertical column layout is ONLY for two-operand ${operation}. Do not put it on word-problem MCQ.`;
  }
  if (isFractionTopic(ctx)) {
    return `INTERACTION MIX — FRACTIONS:
- Default to multiple_choice. Do NOT use a vertical addition/subtraction column.
- Part of a whole: include "diagram": { "diagramType":"fraction_bars", "params":{...}, "brief":"..." } showing equal parts. Options may be fraction strings ($\\frac{1}{2}$) or picture options of equal parts.
- Part of a group: picture options {diagramType:"object_quantity",params:{objectKind,count}} using objectKind from: ${objectKindList}.
- numeric_entry only when the answer is a single count (how many objects is half of 10) — keypad, no column. drag_to_target only if the learner literally places objects.`;
  }
  const profile = ctx.profile || getSubjectProfile(ctx.subject?.name);
  if (profile.key === 'sciences') {
    return `INTERACTION MIX — SCIENCE:
- Most items: multiple_choice. Visual items MUST include a real "diagram" (labeled_boxes for parts, process_flow for processes, comparison for contrasts).
- Include exactly 1 matching_pairs item when an outcome is pairing (plant part ↔ job). Shape: left (3-4 names), right (matching jobs), correctPairs:[[leftIndex,rightIndex],...]. Do NOT force matching onto a single-fact identification question.
- Include exactly 1 odd_one_out item when an outcome is grouping/classification. Shape: options of 4 items, correctAnswerIndex is the one that does not belong.
- Remaining items stay multiple_choice.
- Do NOT use numeric_entry with a vertical column. Do NOT use drag_to_target unless the task is literally counting objects into a set.`;
  }
  return `INTERACTION MIX — NON-ARITHMETIC (Science, measurement, place value, language, …):
- Default to multiple_choice. Set interactionType "multiple_choice" on those items.
- Do NOT use numeric_entry with a vertical column — that layout is only for addition/subtraction computation.
- Do NOT use drag_to_target unless the task is literally counting objects into a set.
- Visual items MUST include a real "diagram" object (see below). Parts/functions → labeled_boxes; processes → process_flow; contrasts → comparison.
- Options stay plain text unless the choice itself is a figure or a countable quantity of a named object (${objectKindList}).`;
};

export const buildBankGenerationPrompt = (ctx, count, quizExemplarsBlock) => {
  const { grade, ageGroup, subject, strand, subStrand, outcomesBlock, complexityBand } = ctx;
  const profile = ctx.profile || getSubjectProfile(subject?.name);
  const diagramTypeList = (profile.allowedDiagramTypes || ['labeled_boxes']).join('|');
  const ceiling = complexityBand?.constrained
    ? `GRADE COMPLEXITY CEILING: at most ${complexityBand.maxSentences} sentence(s) and ${complexityBand.maxWords} words per stem.`
    : `Write clearly for ${ageGroup} (Grade ${grade}).`;
  const concreteDiagramLine = prefersConcreteDiagrams(ctx.gradeNumber ?? grade)
    ? `\nAt this grade prefer concrete figures a child can point at — object_quantity (repeated icons of a named object from: ${objectKindList}), counting_circles (only when no object is named), number_line, fraction_bars, rectangle, cube. Do NOT use labeled_boxes for counting or "N of [object]" — that draws text in a rectangle, not the object. Science parts/processes still use labeled_boxes or process_flow.`
    : '';

  return `Create ${count} ORIGINAL quiz questions for Kenyan CBC Grade ${grade} ${subject.name} · ${strand.name} · ${subStrand.name}, for ${ageGroup}.
interactionType is real and is graded — not every item is multiple_choice.

Outcomes (use exact learningOutcomeIndex 1-based):
${outcomesBlock}

${ceiling}

${profile.quizStyle || ''}
MODALITY MIX for ${subject.name}: ${profile.modalityMixText || 'balanced mix'}. Treat that as the intended overall balance, not a target to exceed.

${bankInteractionMix(ctx)}

COPYRIGHT — this is a hard constraint, not a style preference:
- Source / past-paper text below (if any) may inform TONE, FORMAT, and DIFFICULTY only.
- Do NOT reproduce, closely paraphrase, or lift specific numbers, names, option sets, or sentence structure from any source item.
- Every stem, every option, and every number must be newly authored.
- If you cannot write an original item, skip that slot rather than rewriting a source question.

${quizExemplarsBlock || 'No source exemplars were available. Write from the outcomes alone.'}

Return ONLY one JSON object:
{ "quiz": { "questions": [ /* exactly ${count} items */ ] } }

COMPACT QUESTION SHAPE — include ONLY:
- question, interactionType (multiple_choice, numeric_entry, drag_to_target, matching_pairs, or odd_one_out)
- for multiple_choice: options (3-4 strings OR {diagramType,params} picture options), correctAnswerIndex
- for odd_one_out: options (4-5 strings), correctAnswerIndex of the item that does not belong
- for matching_pairs: left[], right[], correctPairs:[[leftIndex,rightIndex],...]; options must be []
- for numeric_entry: params {a,b,layout:"vertical",operation} and answerFormula when this is column add/subtract; otherwise params for the scalar answer; options must be []
- for drag_to_target: activity "count_into_box", params {a,b,target,objectPool,objectKind}, answerFormula; options may be []
- explanation (max 16 words)
- distractors:[{"optionIndex","misconception":"max 8 words"}] for wrong MCQ options
- reviewRationale:[{"optionIndex","text"}] for EVERY MCQ option, correct and wrong
- learningOutcomeIndex, bloomLevel (recall|understand|apply|reason), modality (visual|text_steps|practice), difficulty (easy|intermediate|advanced)
Do NOT include id, type, template, or feedback fields.
Do NOT set template:true. These are fixed reviewed items, not parametrized templates.

Visual questions MUST include "diagram": { "diagramType": one of ${diagramTypeList}, "params":{...}, "brief":"..." }.
- "params" must hold real, specific values for THIS question — never {} and never generic placeholders.
- "brief" must describe the actual figure to draw, in your own words. Never restate the question as the brief.
- If you cannot design a genuine figure, do NOT tag it visual — use practice or text_steps.${concreteDiagramLine}
Match diagram type to topic:
${profile.diagramGuidance || ''}
${profile.mathRule || ''}
Do not force pictures onto abstract number comparisons ("which number is bigger") or bare symbolic math.
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
  if (detectTemplatableSkill(ctx)) {
    throw new Error(
      `Grade ${ctx.grade} ${ctx.subStrand?.name || ''} uses the template/twist engine. Do not generate reviewed bank items for this sub-strand.`
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
    {
      additionTemplates: false,
      gradeNumber: ctx.gradeNumber,
      defaultNumericLayout: isColumnArithmeticTopic(ctx) ? 'vertical' : 'horizontal'
    }
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
    grade
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
    const updated = await QuestionBankEntry.update(id, {
      status: 'approved',
      reviewedBy: reviewerId || null,
      reviewedAt: new Date().toISOString(),
      rejectReason: null
    });
    try {
      const { attachApprovedBankToWaitingLessons } = await import(
        './lessonGenerationService.js'
      );
      await attachApprovedBankToWaitingLessons(updated);
    } catch (pickupErr) {
      console.warn('Approve pickup skipped:', pickupErr.message || pickupErr);
    }
    return updated;
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
