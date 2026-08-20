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
import {
  BANK_MIXES,
  resolveBankMix,
  renderBankInteractionMix,
  isMultiplicationTopic,
  isDivisionTopic
} from '../admin/services/bankMixProfiles.js';
import {
  detectTemplatableSkill,
  outcomesNeedingBank,
  resolveContentSource,
  laddersForOutcomes
} from '../utils/templateLadders.js';
import { QUIZ_SOURCE_TEMPLATES, QUIZ_SOURCE_FIXED_POOL } from '../utils/quizSessionSize.js';

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
  bankService.includes('outcomesNeedingBank'),
  'bank generation refuses per unmatched outcome, not the whole sub-strand'
);
assert(
  !bankService.includes('Do not generate reviewed bank items for this sub-strand'),
  'bank generation no longer refuses an entire templatable sub-strand'
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
assert(
  isMultiplicationTopic({
    subject: { name: 'Mathematics' },
    subStrand: { name: '1.6 Multiplication' }
  }) === true,
  'Multiplication topic resolves from the mix record'
);
assert(
  isDivisionTopic({
    subject: { name: 'Mathematics' },
    subStrand: { name: '1.7 Division' }
  }) === true,
  'Division topic resolves from the mix record'
);
assert(
  isColumnArithmeticTopic({
    subject: { name: 'Mathematics' },
    subStrand: { name: '1.6 Multiplication' }
  }) === false,
  'Multiplication is not column-arithmetic'
);
assert(
  isColumnArithmeticTopic({
    subject: { name: 'Mathematics' },
    subStrand: { name: '1.7 Division' }
  }) === false,
  'Division is not column-arithmetic'
);
assert(
  detectTemplatableSkill({
    grade: '3',
    subject: { name: 'Mathematics' },
    subStrand: { name: '1.6 Multiplication' }
  }) == null,
  'Grade 3 Multiplication has no registered ladder'
);
assert(
  detectTemplatableSkill({
    grade: '3',
    subject: { name: 'Mathematics' },
    subStrand: { name: '1.7 Division' }
  }) == null,
  'Grade 3 Division has no registered ladder'
);

const g3AddRoutingCtx = {
  grade: '3',
  subject: { name: 'Mathematics' },
  subStrand: { name: '1.4 Addition' }
};
const g3ColumnOutcome =
  'add a 3-digit number to up to a 2-digit number without regrouping with sum not exceeding 1000';
const g3BankOnlyOutcomes = [
  'add three single digit numbers with sum up to 27',
  'work out missing numbers in patterns involving addition up to 1000',
  'create number patterns involving addition up to 1000'
];
assert(
  resolveContentSource(g3AddRoutingCtx, [g3ColumnOutcome]) === QUIZ_SOURCE_TEMPLATES,
  'matched Grade 3 Addition outcome stays on templates'
);
assert(
  g3BankOnlyOutcomes.every(
    (o) => resolveContentSource(g3AddRoutingCtx, [o]) === QUIZ_SOURCE_FIXED_POOL
  ),
  'unmatched Grade 3 Addition outcomes fall through to the bank'
);
assert(
  outcomesNeedingBank(g3AddRoutingCtx, [g3ColumnOutcome, ...g3BankOnlyOutcomes]).join('\n') ===
    g3BankOnlyOutcomes.join('\n'),
  'bank eligible list is the unmatched outcomes only'
);
assert(
  outcomesNeedingBank(g3AddRoutingCtx, [g3ColumnOutcome]).length === 0,
  'a fully template-backed request has no bank-eligible outcomes'
);

const g1AddRoutingCtx = {
  grade: '1',
  subject: { name: 'Mathematics' },
  subStrand: { name: '1.3 Addition' }
};
assert(
  resolveContentSource(g1AddRoutingCtx, [
    'work out missing numbers in patterns involving addition of whole numbers up to 100'
  ]) === QUIZ_SOURCE_FIXED_POOL,
  'Grade 1 Addition missing-number patterns route to the bank, not singles templates'
);
assert(
  laddersForOutcomes(g1AddRoutingCtx, [
    'work out missing numbers in patterns involving addition of whole numbers up to 100'
  ]).length === 0,
  'Grade 1 Addition missing-number patterns attach no templates'
);
assert(
  resolveContentSource(g1AddRoutingCtx, ['add 2-single digit numbers up to a sum of 10']) ===
    QUIZ_SOURCE_TEMPLATES,
  'Grade 1 two-single-digit addition stays on templates'
);

const g1NcRoutingCtx = {
  grade: '1',
  subject: { name: 'Mathematics' },
  subStrand: { name: '1.1 Number Concept' }
};
assert(
  outcomesNeedingBank(g1NcRoutingCtx, [
    'sort and group objects according to different attributes within the classroom',
    'pair and match objects in the environment',
    'order and sequence objects in ascending and descending order',
    'make patterns using real objects',
    'recite number names in order up to 50',
    'represent numbers 1-30 using concrete objects',
    'demonstrate through counting that a group in all situations has only one count',
    'appreciate the use of sorting and grouping items in day to day activities'
  ]).length === 6,
  'Number Concept bank-eligible outcomes are the six non-template ones'
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
assert(
  fractionsPrompt.includes('matching_pairs'),
  'Fractions mix offers matching_pairs when pairing notation to a picture'
);

const mulPrompt = buildBankGenerationPrompt(
  {
    grade: '3',
    gradeNumber: 3,
    ageGroup: 'young children',
    subject: { name: 'Mathematics' },
    strand: { name: 'Numbers' },
    subStrand: { name: '1.6 Multiplication' },
    outcomesBlock: '1. multiply single digit numbers by numbers 1-10 in different contexts',
    complexityBand: { constrained: true, maxSentences: 2, maxWords: 20 },
    profile: getSubjectProfile('Mathematics')
  },
  8,
  ''
);
const divPrompt = buildBankGenerationPrompt(
  {
    grade: '2',
    gradeNumber: 2,
    ageGroup: 'very young children',
    subject: { name: 'Mathematics' },
    strand: { name: 'Numbers' },
    subStrand: { name: '1.7 Division' },
    outcomesBlock:
      '1. represent division as equal sharing\n2. divide numbers up to 25 by 2, 3, 4 and 5 without a remainder in real life situations',
    complexityBand: { constrained: true, maxSentences: 1, maxWords: 12 },
    profile: getSubjectProfile('Mathematics')
  },
  8,
  ''
);

const mixBlock = (prompt) => {
  const start = prompt.indexOf('INTERACTION MIX');
  const end = prompt.indexOf('\n\nCOPYRIGHT');
  assert(start >= 0 && end > start, 'prompt has an INTERACTION MIX block');
  return prompt.slice(start, end);
};

const goldens = JSON.parse(
  readFileSync(join(here, 'fixtures/bank-mix-prompts.pre-refactor.json'), 'utf8')
);
const mixUnchangedKeys = [
  ['addition', g3AddPrompt],
  ['subtraction', g3SubPrompt],
  ['length', lengthPrompt]
];
for (const [key, prompt] of mixUnchangedKeys) {
  assert(
    mixBlock(prompt) === mixBlock(goldens[key]),
    `${key} INTERACTION MIX block is unchanged from the pre-refactor golden`
  );
}
assert(
  mixBlock(fractionsPrompt) !== mixBlock(goldens.fractions),
  'Fractions INTERACTION MIX changed after adding restrained matching_pairs'
);
assert(
  mixBlock(fractionsPrompt).includes('Do NOT force matching'),
  'Fractions mix does not force matching onto every item'
);
assert(
  !mixBlock(fractionsPrompt).includes('odd_one_out'),
  'Fractions mix does not add odd_one_out (no classification outcome in the mix)'
);
assert(
  BANK_MIXES.some((row) => row.key === 'multiplication'),
  'Multiplication is a mix data record'
);
assert(
  BANK_MIXES.some((row) => row.key === 'division'),
  'Division is a mix data record'
);
assert(
  resolveBankMix({
    subject: { name: 'Mathematics' },
    subStrand: { name: '1.6 Multiplication' },
    profile: getSubjectProfile('Mathematics')
  }).key === 'multiplication',
  'Multiplication resolves from the data record, not a new if-branch'
);
assert(
  resolveBankMix({
    subject: { name: 'Mathematics' },
    subStrand: { name: '1.7 Division' },
    profile: getSubjectProfile('Mathematics')
  }).key === 'division',
  'Division resolves from the data record, not a new if-branch'
);
assert(
  mulPrompt.includes('INTERACTION MIX — MULTIPLICATION'),
  'Grade 3 Multiplication bank prompt uses the Multiplication mix'
);
assert(
  mixBlock(mulPrompt).includes('groups:[n,n,...]'),
  'Multiplication mix asks for equal-groups object_quantity params'
);
assert(
  mixBlock(mulPrompt).includes('SUM of groups[] must stay ≤ 20'),
  'Multiplication mix caps total icons, not only each group'
);
assert(
  mixBlock(mulPrompt).includes('Do NOT force matching'),
  'Multiplication mix does not force matching onto every item'
);
assert(
  mixBlock(mulPrompt).includes('odd_one_out'),
  'Multiplication mix offers odd_one_out when classification fits'
);
assert(
  !mulPrompt.includes('INTERACTION MIX — COLUMN ARITHMETIC'),
  'Multiplication does not inherit the column-arithmetic mix'
);
assert(
  !mulPrompt.includes('INTERACTION MIX — SCIENCE'),
  'Multiplication does not inherit the Science mix'
);
assert(
  !mixBlock(mulPrompt).includes('layout:"vertical"'),
  'Multiplication mix does not request a vertical column'
);
assert(
  divPrompt.includes('INTERACTION MIX — DIVISION'),
  'Grade 2 Division bank prompt uses the Division mix'
);
assert(
  mixBlock(divPrompt).includes('groups:[n,n,...]'),
  'Division mix asks for equal-sharing groups'
);
assert(
  mixBlock(divPrompt).includes('Do NOT force matching'),
  'Division mix does not force matching onto every item'
);
assert(
  !divPrompt.includes('INTERACTION MIX — COLUMN ARITHMETIC'),
  'Division does not inherit the column-arithmetic mix'
);
assert(
  !mixBlock(divPrompt).includes('layout:"vertical"'),
  'Division mix does not request a vertical column'
);
assert(
  !bankService.includes("key === 'multiplication'"),
  'questionBankService has no Multiplication mix if-branch'
);
assert(
  !bankService.includes("key === 'division'"),
  'questionBankService has no Division mix if-branch'
);
assert(
  !bankService.includes('INTERACTION MIX — MULTIPLICATION'),
  'questionBankService does not hardcode the Multiplication mix heading'
);
assert(
  !bankService.includes('INTERACTION MIX — DIVISION'),
  'questionBankService does not hardcode the Division mix heading'
);
assert(
  g3AddPrompt.includes('Concrete count visuals'),
  'Grade 3 Addition bank prompt includes magnitude-aware concrete-diagram guidance'
);
assert(
  g3SubPrompt.includes('place_value (hundreds/tens/ones) or a vertical column'),
  'Grade 3 Subtraction bank prompt routes large numbers to place_value or column'
);
assert(
  scienceBankPrompt !== goldens.science,
  'Science bank prompt changed after removing the plant-part mix example'
);
assert(
  !mixBlock(scienceBankPrompt).includes('plant part ↔ job'),
  'Science mix instruction no longer hardcodes a plant-part pairing example'
);
assert(
  mixBlock(scienceBankPrompt).includes('item ↔ its function, role, or category'),
  'Science mix uses a topic-agnostic pairing instruction'
);
assert(
  mixBlock(scienceBankPrompt).includes('Plant parts'),
  'Science mix still grounds pairing in the real sub-strand name'
);

assert(
  resolveBankMix({
    subject: { name: 'Science' },
    subStrand: { name: 'Plant parts' },
    profile: getSubjectProfile('Science')
  }).key === 'sciences',
  'Science still resolves to the sciences mix record'
);
assert(
  BANK_MIXES.some((row) => row.key === 'social_studies'),
  'Social Studies is a mix data record'
);
assert(
  !bankService.includes("profile.key === 'sciences'"),
  'questionBankService no longer branches mix on profile.key'
);
assert(
  !bankService.includes('plant part ↔ job'),
  'questionBankService no longer hardcodes the plant-part pairing example'
);
assert(
  bankService.includes('renderBankInteractionMix'),
  'bank prompt pulls mix text from config records'
);

const socialPrompt = buildBankGenerationPrompt(
  {
    grade: '4',
    gradeNumber: 4,
    ageGroup: 'young children',
    subject: { name: 'Social Studies' },
    strand: { name: 'Citizenship' },
    subStrand: { name: 'Leaders and their roles' },
    outcomesBlock: '1. Match community leaders to the work they do',
    complexityBand: { constrained: true, maxSentences: 2, maxWords: 20 },
    profile: getSubjectProfile('Social Studies')
  },
  8,
  ''
);
assert(
  resolveBankMix({
    subject: { name: 'Social Studies' },
    subStrand: { name: 'Leaders and their roles' },
    profile: getSubjectProfile('Social Studies')
  }).key === 'social_studies',
  'Social Studies resolves from the data record, not a new if-branch'
);
assert(
  socialPrompt.includes('INTERACTION MIX — SOCIAL STUDIES'),
  'Social Studies bank prompt uses the Social Studies mix'
);
assert(
  mixBlock(socialPrompt).includes('matching_pairs'),
  'Social Studies mix prefers matching_pairs'
);
assert(
  mixBlock(socialPrompt).includes('people, figures, or places to roles, events, or categories'),
  'Social Studies matching-pairs prefers people/figures to roles or events'
);
assert(
  !socialPrompt.includes('INTERACTION MIX — SCIENCE'),
  'Social Studies does not inherit the Science mix'
);

const historyPrompt = buildBankGenerationPrompt(
  {
    grade: '9',
    gradeNumber: 9,
    ageGroup: 'teens',
    subject: { name: 'History and Citizenship' },
    strand: { name: 'Heritage and diversity' },
    subStrand: { name: 'National heroes' },
    outcomesBlock: '1. Relate Kenyan heroes to the events they are known for',
    complexityBand: { constrained: false },
    profile: getSubjectProfile('History and Citizenship')
  },
  8,
  ''
);
assert(
  historyPrompt.includes('INTERACTION MIX — SOCIAL STUDIES'),
  'History and Citizenship uses the Social Studies mix record'
);

const crePrompt = buildBankGenerationPrompt(
  {
    grade: '4',
    gradeNumber: 4,
    ageGroup: 'young children',
    subject: { name: 'CRE' },
    strand: { name: 'Values' },
    subStrand: { name: 'The Good Samaritan' },
    outcomesBlock: '1. Identify the values shown in the parable',
    complexityBand: { constrained: true, maxSentences: 2, maxWords: 20 },
    profile: getSubjectProfile('CRE')
  },
  8,
  ''
);
const businessPrompt = buildBankGenerationPrompt(
  {
    grade: '9',
    gradeNumber: 9,
    ageGroup: 'teens',
    subject: { name: 'Business Studies' },
    strand: { name: 'Business' },
    subStrand: { name: 'Entrepreneurship' },
    outcomesBlock: '1. Identify traits of an entrepreneur',
    complexityBand: { constrained: false },
    profile: getSubjectProfile('Business Studies')
  },
  8,
  ''
);
const geographyPrompt = buildBankGenerationPrompt(
  {
    grade: '9',
    gradeNumber: 9,
    ageGroup: 'teens',
    subject: { name: 'Geography' },
    strand: { name: 'Physical Geography' },
    subStrand: { name: 'Weather and climate' },
    outcomesBlock: '1. Distinguish weather from climate',
    complexityBand: { constrained: false },
    profile: getSubjectProfile('Geography')
  },
  8,
  ''
);
assert(
  crePrompt.includes('INTERACTION MIX — NON-ARITHMETIC'),
  'CRE stays on the default mix'
);
assert(
  businessPrompt.includes('INTERACTION MIX — NON-ARITHMETIC'),
  'Business Studies stays on the default mix'
);
assert(
  geographyPrompt.includes('INTERACTION MIX — NON-ARITHMETIC'),
  'Geography stays on the default mix'
);
assert(
  mixBlock(crePrompt) === mixBlock(goldens.length),
  'CRE default mix text matches the pre-refactor non-arithmetic mix'
);

const g9SciencePrompt = buildBankGenerationPrompt(
  {
    grade: '9',
    gradeNumber: 9,
    ageGroup: 'teens (ages 14+)',
    subject: { name: 'Integrated Science' },
    strand: { name: 'Matter and materials' },
    subStrand: { name: 'Elements, compounds and mixtures' },
    outcomesBlock:
      '1. Distinguish elements, compounds and mixtures\n2. Relate particle arrangement to the properties of matter',
    complexityBand: { constrained: false },
    profile: getSubjectProfile('Integrated Science')
  },
  8,
  ''
);
assert(
  g9SciencePrompt.includes('INTERACTION MIX — SCIENCE'),
  'Grade 9 Integrated Science still uses the Science mix'
);
assert(
  !g9SciencePrompt.toLowerCase().includes('plant part'),
  'Grade 9 Integrated Science prompt does not mention plant parts'
);
assert(
  mixBlock(g9SciencePrompt).includes('Elements, compounds and mixtures'),
  'Grade 9 Science matching-pairs is grounded in the real sub-strand'
);
assert(
  renderBankInteractionMix({
    subject: { name: 'Integrated Science' },
    subStrand: { name: 'Elements, compounds and mixtures' },
    outcomesBlock: '1. Distinguish elements, compounds and mixtures',
    profile: getSubjectProfile('Integrated Science')
  }).includes('item ↔ its function, role, or category'),
  'Science mix renderer stays topic-agnostic for matching_pairs'
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
