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
  titleFromOutcome,
  uniqueTitleAmong,
  applyAssignedShellOutcome,
  buildLessonShellPrompt
} from '../admin/services/lessonGenerationService.js';
import {
  createAdaptiveSession,
  advanceAdaptiveSession
} from '../learner/services/adaptiveQuizService.js';
import { isGradeOneAdditionContext } from '../utils/additionTemplate.js';
import { disambiguateDuplicateTitles } from '../learner/services/nextTaskService.js';
import {
  buildBankGenerationPrompt,
  isColumnArithmeticTopic,
  isFractionTopic
} from '../admin/services/questionBankService.js';
import { getSubjectProfile } from '../admin/services/subjectProfiles.js';

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
  !bankService.includes('For Grade 1 counting/addition, prefer numeric_entry'),
  'bank prompt no longer applies Grade 1 addition mix to every non-subtraction strand'
);

assert(
  isColumnArithmeticTopic({
    subject: { name: 'Mathematics' },
    subStrand: { name: '1.4 Addition' }
  }) === true,
  'Grade 3 Addition is column-arithmetic'
);
assert(
  isColumnArithmeticTopic({
    subject: { name: 'Science' },
    subStrand: { name: 'Plant parts' }
  }) === false,
  'Science is not column-arithmetic'
);
assert(
  isColumnArithmeticTopic({
    subject: { name: 'Mathematics' },
    subStrand: { name: 'Length' }
  }) === false,
  'Length measurement is not column-arithmetic'
);
assert(
  isFractionTopic({
    subject: { name: 'Mathematics' },
    subStrand: { name: '1.3 Fractions' }
  }) === true,
  'Fractions topic is detected'
);

const scienceBankPrompt = buildBankGenerationPrompt(
  {
    grade: '3',
    gradeNumber: 3,
    ageGroup: 'young children',
    subject: { name: 'Science' },
    strand: { name: 'Plants' },
    subStrand: { name: 'Plant parts' },
    outcomesBlock: '1. Explain the function of roots, stem, leaves and flowers',
    complexityBand: { constrained: true, maxSentences: 2, maxWords: 20 },
    profile: getSubjectProfile('Science')
  },
  8,
  ''
);
assert(scienceBankPrompt.includes('ORIGINAL quiz questions'), 'bank prompt no longer opens as MCQ-only');
assert(
  scienceBankPrompt.includes('Do NOT use numeric_entry with a vertical column'),
  'Science bank prompt forbids column layout'
);
assert(scienceBankPrompt.includes('labeled_boxes'), 'Science bank prompt requests parts diagrams');
assert(scienceBankPrompt.includes('process_flow'), 'Science bank prompt requests process diagrams');
assert(
  scienceBankPrompt.includes('Visual questions MUST include "diagram"'),
  'Science bank prompt requires diagram objects on visual items'
);
assert(
  !scienceBankPrompt.includes('COLUMN ARITHMETIC'),
  'Science bank prompt does not request column arithmetic mix'
);
assert(
  scienceBankPrompt.includes('INTERACTION MIX — SCIENCE'),
  'Science bank prompt uses the Science interaction mix'
);
assert(scienceBankPrompt.includes('matching_pairs'), 'Science bank prompt asks for matching_pairs when pairing fits');
assert(scienceBankPrompt.includes('odd_one_out'), 'Science bank prompt asks for odd_one_out when grouping fits');
assert(
  scienceBankPrompt.includes('Do NOT force matching'),
  'Science bank prompt does not force matching onto identification MCQ'
);

const g3AddPrompt = buildBankGenerationPrompt(
  {
    grade: '3',
    gradeNumber: 3,
    ageGroup: 'young children',
    subject: { name: 'Mathematics' },
    strand: { name: 'Numbers' },
    subStrand: { name: 'Addition' },
    outcomesBlock: '1. add two 3-digit numbers without regrouping',
    complexityBand: { constrained: true, maxSentences: 2, maxWords: 20 },
    profile: getSubjectProfile('Mathematics')
  },
  8,
  ''
);
assert(g3AddPrompt.includes('COLUMN ARITHMETIC'), 'Grade 3 Addition bank prompt requests column mix');
assert(g3AddPrompt.includes('layout:"vertical"'), 'Grade 3 Addition bank prompt requests vertical layout');
assert(g3AddPrompt.includes('question "Add."'), 'Grade 3 Addition bank prompt uses Add. stems');
assert(g3AddPrompt.includes('object_quantity'), 'Grade 3 Addition still allows picture options');

const g3SubPrompt = buildBankGenerationPrompt(
  {
    grade: '3',
    gradeNumber: 3,
    ageGroup: 'young children',
    subject: { name: 'Mathematics' },
    strand: { name: 'Numbers' },
    subStrand: { name: 'Subtraction' },
    outcomesBlock: '1. subtract up to 3-digit numbers without regrouping',
    complexityBand: { constrained: true, maxSentences: 2, maxWords: 20 },
    profile: getSubjectProfile('Mathematics')
  },
  8,
  ''
);
assert(g3SubPrompt.includes('question "Subtract."'), 'Grade 3 Subtraction bank prompt uses Subtract. stems');
assert(g3SubPrompt.includes('operation:"subtract"'), 'Grade 3 Subtraction bank prompt sets subtract operation');

const lengthPrompt = buildBankGenerationPrompt(
  {
    grade: '3',
    gradeNumber: 3,
    ageGroup: 'young children',
    subject: { name: 'Mathematics' },
    strand: { name: 'Measurement' },
    subStrand: { name: 'Length' },
    outcomesBlock: '1. add and subtract length in metres',
    complexityBand: { constrained: true, maxSentences: 2, maxWords: 20 },
    profile: getSubjectProfile('Mathematics')
  },
  8,
  ''
);
assert(
  !lengthPrompt.includes('COLUMN ARITHMETIC'),
  'Length measurement does not get column-arithmetic mix'
);
assert(
  lengthPrompt.includes('Do NOT use numeric_entry with a vertical column'),
  'Length bank prompt forbids vertical column'
);
assert(
  !lengthPrompt.includes('INTERACTION MIX — SCIENCE'),
  'Length does not get the Science matching/odd mix'
);

const fractionsPrompt = buildBankGenerationPrompt(
  {
    grade: '3',
    gradeNumber: 3,
    ageGroup: 'young children',
    subject: { name: 'Mathematics' },
    strand: { name: 'Numbers' },
    subStrand: { name: 'Fractions' },
    outcomesBlock: '1. identify 1/2, 1/4 and 1/8 as part of a whole',
    complexityBand: { constrained: true, maxSentences: 2, maxWords: 20 },
    profile: getSubjectProfile('Mathematics')
  },
  8,
  ''
);
assert(fractionsPrompt.includes('fraction_bars'), 'Fractions bank prompt requests fraction_bars');
assert(
  fractionsPrompt.includes('Do NOT use a vertical addition/subtraction column'),
  'Fractions bank prompt forbids column add'
);

const columnNormalized = normalizeQuiz(
  {
    questions: [
      {
        question: 'Add.',
        interactionType: 'numeric_entry',
        params: { a: 214, b: 53 },
        answerFormula: 'a + b',
        options: [],
        learningOutcomeIndex: 1
      }
    ]
  },
  ['add two 3-digit numbers without regrouping'],
  { modalityCycle: ['practice'], allowedDiagramTypes: ['number_line'], fallbackDiagramType: 'number_line' },
  { defaultNumericLayout: 'vertical', gradeNumber: 3 }
);
assert(
  columnNormalized.questions[0].params.layout === 'vertical',
  'column-arithmetic bank items default to vertical layout'
);

const scienceNormalized = normalizeQuiz(
  {
    questions: [
      {
        question: 'Add.',
        interactionType: 'numeric_entry',
        params: { a: 2, b: 3 },
        answerFormula: 'a + b',
        options: [],
        learningOutcomeIndex: 1
      }
    ]
  },
  ['Explain plant parts'],
  { modalityCycle: ['practice'], allowedDiagramTypes: ['labeled_boxes'], fallbackDiagramType: 'labeled_boxes' },
  { defaultNumericLayout: 'horizontal', gradeNumber: 3 }
);
assert(
  scienceNormalized.questions[0].params.layout === 'horizontal',
  'non-arithmetic bank numeric_entry still defaults horizontal'
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
  genService.includes('attachApprovedBankToWaitingLessons'),
  'waiting-lesson pickup is exported from lesson generation'
);
assert(
  genService.includes('enqueueIfShort'),
  'pickup path can skip enqueueing more pending items'
);
assert(
  bankService.includes('attachApprovedBankToWaitingLessons'),
  'approve triggers waiting-lesson pickup'
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
assert(
  forced.title === titleFromOutcome(additionOutcomes[0]),
  'duplicate model titles become the assigned outcome title'
);

assert(
  uniqueTitleAmong(
    ['Adding a 2-Digit Number and a 1-Digit Number', titleFromOutcome(additionOutcomes[0]), fallbackShellTitle('Addition', 1)],
    ['Adding a 2-Digit Number and a 1-Digit Number', titleFromOutcome(additionOutcomes[0]), 'Practice: Addition - Part 1']
  ) === 'Practice: Addition - Part 1 (2)',
  'fallback collision gets a numeric suffix'
);

const emptyExisting = applyAssignedShellOutcome(
  { title: 'Adding a 2-Digit Number and a 1-Digit Number', learningObjectives: [additionOutcomes[4]] },
  shellCtx,
  1,
  []
);
assert(
  emptyExisting.title === 'Adding a 2-Digit Number and a 1-Digit Number',
  'unique titles are kept when the catalog is empty'
);

const labeled = disambiguateDuplicateTitles([
  { lessonId: 'a', title: 'Adding a 2-Digit Number and a 1-Digit Number' },
  { lessonId: 'b', title: 'Adding a 2-Digit Number and a 1-Digit Number' },
  { lessonId: 'c', title: 'Writing Addition Sentences with + and =' }
]);
assert(labeled[0].title.endsWith('(1)'), 'listing suffixes the first duplicate');
assert(labeled[1].title.endsWith('(2)'), 'listing suffixes the second duplicate');
assert(
  labeled[2].title === 'Writing Addition Sentences with + and =',
  'unique titles are not rewritten in the listing'
);

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
