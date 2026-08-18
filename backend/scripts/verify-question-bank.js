/**
 * Part 3: original question bank plumbing (offline).
 * Live generation is a separate script: verify-question-bank-live.js
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeQuiz,
  emptyFixedPoolDraftStatus,
  assignedOutcomeForLesson,
  fallbackShellTitle,
  applyAssignedShellOutcome,
  buildLessonShellPrompt
} from '../admin/services/lessonGenerationService.js';
import {
  createAdaptiveSession,
  advanceAdaptiveSession
} from '../learner/services/adaptiveQuizService.js';
import { isGradeOneAdditionContext } from '../utils/additionTemplate.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const profile = {
  modalityCycle: ['practice'],
  allowedDiagramTypes: ['number_line'],
  fallbackDiagramType: 'number_line'
};

const bankUuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const withBank = normalizeQuiz(
  {
    questions: [
      {
        question: 'How many apples?',
        options: ['1', '2', '3'],
        correctAnswerIndex: 1,
        learningOutcomeIndex: 1,
        bankEntryId: bankUuid
      },
      {
        question: 'How many pears?',
        options: ['1', '2', '3'],
        correctAnswerIndex: 0,
        learningOutcomeIndex: 1,
        bankEntryId: 'not-a-uuid'
      }
    ]
  },
  ['Count objects'],
  profile
);

assert(withBank.questions[0].bankEntryId === bankUuid, 'UUID bankEntryId is preserved');
assert(!withBank.questions[1].bankEntryId, 'invented non-UUID bankEntryId is dropped');

const lesson = {
  id: 'bank-plumbing-lesson',
  grade: '1',
  learningObjectives: ['Count objects'],
  quiz: { questions: [withBank.questions[0]] }
};

let state = createAdaptiveSession({ lesson });
assert(state.question.bankEntryId === bankUuid, 'publicQuestion threads bankEntryId');
assert(!state.question.correctAnswerIndex, 'live payload still omits the answer');

const order = state.session.optionOrders[state.question.id];
const correctOriginal = Number(lesson.quiz.questions[0].correctAnswerIndex);
const selectedDisplay = Array.isArray(order) ? order.indexOf(correctOriginal) : correctOriginal;
state = advanceAdaptiveSession({
  session: state.session,
  lesson,
  selectedOptionIndex: selectedDisplay >= 0 ? selectedDisplay : 0,
  responseTimeMs: 1800
});
assert(state.attemptContext?.bankEntryId === bankUuid, 'answered attempt carries bankEntryId');

assert(
  isGradeOneAdditionContext({
    grade: '1',
    subject: { name: 'Mathematics' },
    subStrand: { name: 'Addition' }
  }) === true,
  'Grade 1 Addition context still detected'
);
assert(
  isGradeOneAdditionContext({
    grade: '1',
    subject: { name: 'Mathematics' },
    subStrand: { name: 'Counting Objects' }
  }) === false,
  'counting is not treated as Grade 1 Addition'
);

const here = dirname(fileURLToPath(import.meta.url));
const bankService = readFileSync(join(here, '../admin/services/questionBankService.js'), 'utf8');
assert(bankService.includes('COPYRIGHT'), 'bank generation prompt has a hard copyright constraint');
assert(bankService.includes('Do NOT set template:true'), 'bank items are not addition templates');
assert(bankService.includes('too close to source document'), 'near-dups are auto-rejected');
assert(
  bankService.includes('uses the template/twist engine'),
  'bank generation refuses any templatable sub-strand'
);
assert(
  bankService.includes('params.operation "subtract"') &&
    bankService.includes('question "Subtract."'),
  'bank prompt describes Grade 1 subtraction columns'
);
assert(
  bankService.includes('For Grade 1 counting/addition, prefer numeric_entry'),
  'bank prompt keeps the addition default for non-subtraction strands'
);

const genService = readFileSync(join(here, '../admin/services/lessonGenerationService.js'), 'utf8');
assert(genService.includes('pullApprovedBankQuestions'), 'lesson gen pulls approved bank items');
assert(genService.includes('resolveContentSource'), 'lesson gen branches on template vs fixed pool');
assert(genService.includes('QUIZ_SOURCE_TEMPLATES'), 'template-backed lessons are flagged');
assert(genService.includes('generateQuestionBankBatch'), 'gap fill enqueues pending bank items');
assert(genService.includes('emptyFixedPoolDraftStatus'), 'empty fixed-pool lessons stay reviewable');
assert(genService.includes('Select the outcome at index'), 'shell prompt assigns an outcome by lesson order');
assert(genService.includes('Do NOT write Mini Notes'), 'Grade 1 shell forbids explanation notes');
assert(
  !genService.includes('for (let c = 0; c < QUIZ_CHUNKS.length'),
  'lesson generation no longer AI-chunks toward 30'
);
assert(
  genService.includes('template-backed — top-up does not apply'),
  'template-backed top-up is a no-op'
);

assert(
  emptyFixedPoolDraftStatus({
    source: 'fixed_pool',
    approvedCount: 0,
    pendingCount: 12
  }) === 'pending',
  'empty fixed-pool stays pending so admin can review the shell'
);
assert(
  emptyFixedPoolDraftStatus({
    source: 'fixed_pool',
    approvedCount: 4,
    pendingCount: 12
  }) === 'pending',
  'fixed-pool with approved items stays pending'
);
assert(
  emptyFixedPoolDraftStatus({
    source: 'templates',
    approvedCount: 0,
    pendingCount: 12
  }) === 'pending',
  'template-backed lessons are not held as empty drafts'
);

const additionOutcomes = [
  'model addition as putting objects together',
  "use '+' and '=' signs in writing addition sentences",
  'add 2-single digit numbers up to a sum of 10',
  'add 3-single digit numbers up to a sum of 10 in different contexts',
  'add a 2-digit number to a 1-digit number without regrouping, horizontally and vertically with sum not exceeding 100',
  'add multiples of 10 up to 100 vertically',
  'work out missing numbers in patterns involving addition of whole numbers up to 100'
];
assert(
  assignedOutcomeForLesson(additionOutcomes, 1) === additionOutcomes[0],
  'lesson 1 is assigned outcome 1'
);
assert(
  assignedOutcomeForLesson(additionOutcomes, 5) === additionOutcomes[4],
  'lesson 5 is assigned the 2-digit outcome, not always'
);
assert(assignedOutcomeForLesson(additionOutcomes, 8) === null, 'out-of-bounds lesson has no outcome');
assert(
  fallbackShellTitle('Addition', 8) === 'Practice: Addition - Part 8',
  'out-of-bounds title is generic'
);

const shellCtx = {
  ageGroup: 'very young children (ages 5-7)',
  grade: '1',
  subject: { name: 'Mathematics' },
  strand: { name: 'Numbers' },
  subStrand: { name: 'Addition', keyInquiryQuestions: [] },
  outcomesBlock: additionOutcomes.map((o, i) => `${i + 1}. ${o}`).join('\n'),
  sourceOutcomes: additionOutcomes,
  exemplarsBlock: '',
  profile: {
    mathRule: 'plain text',
    teachingStyle: 'worked examples',
    allowedDiagramTypes: ['number_line'],
    diagramGuidance: '- counting → number_line'
  }
};
const prompt = buildLessonShellPrompt(shellCtx, 2, 7, {
  existingTitles: ['Adding a 2-Digit Number and a 1-Digit Number']
});
assert(prompt.includes('Select the outcome at index 2'), 'prompt pins lesson order to an outcome index');
assert(prompt.includes(additionOutcomes[1]), 'prompt quotes the assigned outcome');
assert(prompt.includes('Adding a 2-Digit Number and a 1-Digit Number'), 'prompt lists existing titles');
assert(!prompt.includes('pick 1–2'), 'prompt no longer lets the model pick any outcome');
assert(prompt.includes('Do NOT write Mini Notes'), 'Grade 1 prompt forbids Mini Notes');

const outOfBoundsPrompt = buildLessonShellPrompt(shellCtx, 8, 8);
assert(
  outOfBoundsPrompt.includes('Practice: Addition - Part 8'),
  'out-of-bounds prompt forces the generic title'
);

const forced = applyAssignedShellOutcome(
  { title: 'Adding a 2-Digit Number and a 1-Digit Number', learningObjectives: [additionOutcomes[4]] },
  shellCtx,
  1,
  ['Adding a 2-Digit Number and a 1-Digit Number']
);
assert(forced.learningObjectives[0] === additionOutcomes[0], 'forced shell uses the assigned outcome');
assert(forced.title === 'Practice: Addition - Part 1', 'duplicate titles are replaced');

const entryModel = readFileSync(join(here, '../models/QuestionBankEntry.js'), 'utf8');
assert(
  entryModel.includes('interactionType = null'),
  'approved pull is not restricted to multiple_choice'
);

const sql = readFileSync(join(here, '../database/migration_question_bank.sql'), 'utf8');
assert(sql.includes('question_bank_entries'), 'migration creates question_bank_entries');
assert(sql.includes('question_bank_serves'), 'migration creates question_bank_serves');
assert(
  !sql.includes('CREATE TABLE IF NOT EXISTS knowledge_chunks'),
  'bank migration does not alter knowledge_chunks'
);

console.log('verify-question-bank: OK');
