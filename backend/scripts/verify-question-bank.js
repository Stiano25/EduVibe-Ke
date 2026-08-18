/**
 * Part 3: original question bank plumbing (offline).
 * Live generation is a separate script: verify-question-bank-live.js
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeQuiz } from '../admin/services/lessonGenerationService.js';
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
  bankService.includes("Grade 1 Addition uses the template/twist engine"),
  'bank generation refuses Grade 1 Addition'
);

const genService = readFileSync(join(here, '../admin/services/lessonGenerationService.js'), 'utf8');
assert(genService.includes('pullApprovedBankQuestions'), 'lesson gen pulls approved bank items');
assert(genService.includes('resolveContentSource'), 'lesson gen branches on template vs fixed pool');
assert(genService.includes('QUIZ_SOURCE_TEMPLATES'), 'template-backed lessons are flagged');
assert(genService.includes('generateQuestionBankBatch'), 'gap fill enqueues pending bank items');
assert(
  !genService.includes('for (let c = 0; c < QUIZ_CHUNKS.length'),
  'lesson generation no longer AI-chunks toward 30'
);
assert(
  genService.includes('template-backed — top-up does not apply'),
  'template-backed top-up is a no-op'
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
