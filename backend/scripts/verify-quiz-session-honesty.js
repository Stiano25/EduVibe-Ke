/**
 * Part 1 honesty checks: session progress math (no 95/85 caps) and last-item
 * lastAnswer payload so the UI can flash before review.
 * Synthetic by default — pass a lesson id to also walk a real bank.
 */
import 'dotenv/config';
import {
  advanceAdaptiveSession,
  createAdaptiveSession,
  sessionProgressPct
} from '../learner/services/adaptiveQuizService.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const makeQuestion = (i) => ({
  id: `q-${i}`,
  question: `Question ${i}?`,
  options: ['A', 'B', 'C', 'D'],
  correctAnswerIndex: 0,
  explanation: 'Because A.',
  learningOutcomeIndex: 1,
  learningOutcomeKey: 'skill-core',
  skillFocus: 'core skill',
  bloomLevel: 'understand',
  modality: 'practice',
  points: 15
});

const makeLesson = (n, { id = 'synthetic-honesty', grade = '3' } = {}) => ({
  id,
  grade,
  learningObjectives: ['core skill'],
  quiz: {
    title: 'Honesty check',
    questions: Array.from({ length: n }, (_, i) => makeQuestion(i + 1))
  }
});

const displayIndexForOriginal = (session, questionId, originalIndex) => {
  const order = session.optionOrders?.[questionId] || [];
  const index = order.indexOf(originalIndex);
  return index >= 0 ? index : originalIndex;
};

const answer = (lesson, state, { correct }) => {
  const bankQuestion =
    lesson.quiz.questions.find((question) => question.id === state.question.id) ||
    state.session.twistedQuestions?.[state.question.id];
  assert(bankQuestion, `Missing question ${state.question?.id}`);
  const correctOriginal = Number(bankQuestion.correctAnswerIndex);
  const selectedOriginal = correct
    ? correctOriginal
    : bankQuestion.options.findIndex((_option, index) => index !== correctOriginal);
  return advanceAdaptiveSession({
    session: state.session,
    lesson,
    selectedOptionIndex: displayIndexForOriginal(
      state.session,
      state.question.id,
      selectedOriginal
    ),
    responseTimeMs: 2500,
    masteryRows: [],
    modalitySuccessMap: new Map()
  });
};

const walk = (lesson, missAtMainIndexes = new Set()) => {
  const snapshots = [];
  let state = createAdaptiveSession({ lesson });
  assert(state.question, 'session started with a question');
  assert(
    !Object.prototype.hasOwnProperty.call(state.question, 'feedbackCorrect'),
    'live publicQuestion must not send feedbackCorrect'
  );
  snapshots.push({
    at: 'start',
    phase: state.meta.phase,
    progressLabel: state.meta.progressLabel,
    progressPct: state.meta.progressPct,
    done: !!state.meta.done
  });

  let mainIndex = 0;
  let safety = 0;
  while (!state.meta.done && state.question) {
    const phaseBefore = state.meta.phase;
    const correct =
      phaseBefore === 'main' ? !missAtMainIndexes.has(mainIndex) : true;
    if (phaseBefore === 'main') mainIndex += 1;
    state = answer(lesson, state, { correct });
    snapshots.push({
      at: `after-${phaseBefore}`,
      phase: state.meta.phase,
      progressLabel: state.meta.progressLabel,
      progressPct: state.meta.progressPct,
      done: !!state.meta.done,
      hasLastAnswer: !!state.lastAnswer,
      lastAnswerCorrect: state.lastAnswer?.correct
    });
    safety += 1;
    assert(safety < 80, 'session did not terminate');
  }

  return { state, snapshots };
};

// --- pure formula ---
assert(sessionProgressPct({ phase: 'done' }) === 100, 'done → 100');
assert(
  sessionProgressPct({
    phase: 'main',
    answered: [],
    mainTarget: 10,
    mainAnswered: 0,
    twinQueue: [],
    failQueue: []
  }) === 0,
  'Q1 of 10, nothing answered → 0'
);
assert(
  sessionProgressPct({
    phase: 'main',
    answered: Array.from({ length: 9 }),
    mainTarget: 10,
    mainAnswered: 9,
    twinQueue: [],
    failQueue: []
  }) === 90,
  'showing last of 10 → 90, not 95'
);
assert(
  sessionProgressPct({
    phase: 'retry',
    answered: Array.from({ length: 10 }),
    mainTarget: 10,
    mainAnswered: 10,
    twinQueue: [],
    failQueue: ['q-1']
  }) === Math.round((100 * 10) / 11),
  'first retry of one → 10/11, not 85'
);

const report = {};

{
  const lesson = makeLesson(10);
  const { state, snapshots } = walk(lesson);
  const start = snapshots[0];
  const afterNinth = snapshots[9];
  const last = snapshots[snapshots.length - 1];
  assert(start.progressPct === 0, `start was ${start.progressPct}, expected 0`);
  assert(afterNinth.progressPct === 90, `after 9 answers was ${afterNinth.progressPct}, expected 90`);
  assert(afterNinth.phase === 'main' || afterNinth.progressLabel === 'Question 10 of 10', 'still on last main after 9');
  assert(last.done === true && last.progressPct === 100, 'all-correct ends at 100');
  assert(last.hasLastAnswer === true, 'last item still returns lastAnswer for the UI flash');
  assert(
    snapshots.every((row) => row.progressPct !== 95 || row.progressPct === sessionProgressPct(state.session)),
    '95 cap must not appear as a fabricated ceiling'
  );
  report.allCorrect10 = {
    start: start.progressPct,
    after9: afterNinth.progressPct,
    after9Label: afterNinth.progressLabel,
    done: last.progressPct,
    lastAnswerPresent: last.hasLastAnswer,
    snapshots: snapshots.map((row) => ({
      at: row.at,
      phase: row.phase,
      label: row.progressLabel,
      pct: row.progressPct
    }))
  };
}

{
  const lesson = makeLesson(4);
  const { state, snapshots } = walk(lesson, new Set([0]));
  const retryRows = snapshots.filter((row) => row.phase === 'retry' || row.at === 'after-retry');
  const last = snapshots[snapshots.length - 1];
  assert(last.done && last.progressPct === 100, 'retry path ends at 100');
  assert(last.hasLastAnswer === true, 'retry last item returns lastAnswer');
  const retryFill = snapshots.filter((row) => row.at === 'after-main' && row.phase === 'retry');
  assert(retryFill.length >= 1, 'expected a retry after a miss');
  assert(
    retryFill.every((row) => row.progressPct !== 85),
    `retry fill must not be the old 85 constant, got ${retryFill.map((r) => r.progressPct).join(',')}`
  );
  const afterFirst = snapshots[1];
  assert(
    afterFirst.progressPct === 20,
    `after first miss of 4 was ${afterFirst.progressPct} (1 done + 3 main + 1 retry = 20)`
  );
  report.missThenRetry4 = {
    snapshots: snapshots.map((row) => ({
      at: row.at,
      phase: row.phase,
      label: row.progressLabel,
      pct: row.progressPct,
      hasLastAnswer: row.hasLastAnswer
    })),
    finalScore: state.review?.score || null
  };
}

{
  const lesson = makeLesson(10);
  const { snapshots } = walk(lesson, new Set([0, 1]));
  const retryPcts = snapshots
    .filter((row) => row.phase === 'retry' || row.at === 'after-retry')
    .map((row) => row.progressPct);
  const uniqueRetry = [...new Set(retryPcts.filter((pct) => pct < 100))];
  assert(uniqueRetry.length >= 1, 'retry snapshots exist');
  if (uniqueRetry.length > 1) {
    assert(
      uniqueRetry[uniqueRetry.length - 1] !== uniqueRetry[0],
      `retry fill must move, got ${uniqueRetry.join(',')}`
    );
  }
  assert(
    !uniqueRetry.every((pct) => pct === 85),
    'retry must not be stuck at 85'
  );
  report.twoRetries10 = {
    retryPcts,
    snapshots: snapshots.map((row) => ({
      at: row.at,
      phase: row.phase,
      label: row.progressLabel,
      pct: row.progressPct
    }))
  };
}

const lessonId = process.argv[2];
if (lessonId) {
  const { Lesson } = await import('../models/Lesson.js');
  const sourceLesson = await Lesson.findById(lessonId);
  assert(sourceLesson, `Lesson ${lessonId} not found`);
  const bank = (sourceLesson.quiz?.questions || []).slice(0, 6);
  assert(bank.length >= 3, 'real lesson needs at least 3 questions');
  const lesson = { ...sourceLesson, quiz: { ...sourceLesson.quiz, questions: bank } };
  const { state, snapshots } = walk(lesson, new Set([0]));
  const last = snapshots[snapshots.length - 1];
  assert(last.done && last.hasLastAnswer, 'real lesson last item returns lastAnswer');
  report.realLesson = {
    id: sourceLesson.id,
    title: sourceLesson.title,
    grade: sourceLesson.grade,
    walked: bank.length,
    snapshots: snapshots.map((row) => ({
      at: row.at,
      phase: row.phase,
      label: row.progressLabel,
      pct: row.progressPct
    })),
    score: state.review?.score || null
  };
}

console.log(
  JSON.stringify(
    {
      verification: 'quiz-session-honesty OK',
      progressFormula:
        'done→100; else round(100 * answered / (answered + remainingMain + twinQueue + twinCurrent + failQueue))',
      flashCopy:
        'UI-only Yes!/Try again (K–5) and Correct/Not this one (6+); stored Well done! / Review this skill… unchanged',
      report
    },
    null,
    2
  )
);
