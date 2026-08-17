/**
 * Run mechanical quiz quality gates against live Grade 1 lessons.
 * Usage (from backend/): node scripts/report-quiz-quality-gates.js
 */
import '../config/loadEnv.js';
import { Lesson } from '../models/Lesson.js';
import {
  answerAppearsInStem,
  applyQuizQualityGates,
  conceptFamily
} from '../utils/quizQualityGates.js';

const cloneQuestions = (questions) => JSON.parse(JSON.stringify(questions || []));

const main = async () => {
  const self = [
    {
      stem: 'A tray has 5 spoons and 4 forks. How many spoons are there?',
      option: '5',
      expect: true
    },
    {
      stem: 'What is 12 + 5?',
      option: '17',
      expect: false
    },
    {
      stem: 'Seven shells counted from either end give what count?',
      option: '7',
      expect: true
    },
    {
      stem: 'Which group has only round balls?',
      option: 'Only round balls',
      expect: true
    },
    {
      stem: 'Which number comes right after twenty-nine?',
      option: 'Thirty',
      expect: false
    }
  ];
  for (const row of self) {
    const got = answerAppearsInStem(row.stem, row.option);
    if (got !== row.expect) {
      throw new Error(`answerAppearsInStem failed: "${row.stem}" / "${row.option}" got ${got}`);
    }
  }
  console.log('self-checks: ok');

  const lessons = await Lesson.findAll();
  const grade1 = lessons.filter((l) => String(l.grade) === '1');
  console.log(`Grade 1 lessons: ${grade1.length}`);

  for (const lesson of grade1) {
    const original = lesson.quiz?.questions || [];
    const questions = cloneQuestions(original);
    const counts = applyQuizQualityGates(questions);
    const answerHits = questions.filter((q) =>
      String(q.qa_issue || '').includes('answer appears in stem')
    );
    const conceptHits = questions.filter((q) =>
      String(q.qa_issue || '').includes('concept repetition')
    );
    console.log('\n==', lesson.title, `(${original.length} questions) ==`);
    console.log('  answer-in-stem:', counts.answerInStem);
    console.log('  concept-repetition extras flagged:', counts.conceptRepetition);
    for (const q of answerHits) {
      console.log('    AIS', q.id, conceptFamily(q.question, { correctOption: (q.options || [])[q.correctAnswerIndex] }), '—', String(q.question).slice(0, 90));
    }
    for (const q of conceptHits) {
      console.log('    CR ', q.id, conceptFamily(q.question, { correctOption: (q.options || [])[q.correctAnswerIndex] }), '—', String(q.question).slice(0, 90));
    }
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
