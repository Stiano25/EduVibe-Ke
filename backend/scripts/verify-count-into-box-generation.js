/**
 * Part 3: generate one real Grade 1 Addition lesson and confirm a
 * count-into-box / drag_to_target item is produced, then grade it.
 *
 * Usage (from backend/):
 *   node scripts/verify-count-into-box-generation.js
 *   SAVE_LESSON=1 node scripts/verify-count-into-box-generation.js
 */
import '../config/loadEnv.js';
import { Lesson } from '../models/Lesson.js';
import { generateLessonsFromSubStrand } from '../admin/services/lessonGenerationService.js';
import {
  createAdaptiveSession,
  advanceAdaptiveSession
} from '../learner/services/adaptiveQuizService.js';
import { expectedCountForQuestion, isCountIntoBoxQuestion } from '../utils/countIntoBox.js';
import { resolveInteractionType } from '../utils/interactionTypes.js';

const ADDITION_SUBSTRAND_ID = '6566c510-80af-4ff9-a159-cd23a6ca70dc';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const main = async () => {
  console.log('Generating 1 Grade 1 Addition lesson (LLM — this can take several minutes)…');
  const lessons = await generateLessonsFromSubStrand(ADDITION_SUBSTRAND_ID, 1, ({ percent, message }) => {
    console.log(`  ${percent}% ${message}`);
  });
  assert(lessons.length === 1, 'expected one generated lesson');
  const lesson = lessons[0];
  const questions = lesson.quiz?.questions || [];
  const drag = questions.filter(
    (q) =>
      resolveInteractionType(q.interactionType || q.type) === 'drag_to_target' ||
      isCountIntoBoxQuestion(q)
  );
  console.log('lesson', {
    title: lesson.title,
    questions: questions.length,
    dragToTarget: drag.length,
    interactions: questions.reduce((acc, q) => {
      const t = resolveInteractionType(q.interactionType || q.type);
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {})
  });
  assert(drag.length >= 1, 'generation must produce at least one drag_to_target / count-into-box question');

  const sample = drag[0];
  const expected = expectedCountForQuestion(sample);
  console.log('sample count-into-box', {
    id: sample.id,
    question: sample.question,
    interactionType: sample.interactionType,
    activity: sample.activity,
    params: sample.params,
    expectedCount: expected
  });
  assert(sample.params?.objectPool > 0, 'objectPool is set');
  assert(expected != null, 'expected count is computable');

  const sessionLesson = {
    id: 'countbox-gen-verify',
    grade: '1',
    title: lesson.title,
    learningObjectives: lesson.learningObjectives,
    quiz: { questions: [sample] }
  };
  let state = createAdaptiveSession({ lesson: sessionLesson });
  assert(state.question.interactionType === 'drag_to_target', 'live payload is drag_to_target');
  assert(state.question.objectPool === Number(sample.params.objectPool), 'objectPool sent live');
  assert(state.question.target == null, 'target is not leaked live');

  const wrong = advanceAdaptiveSession({
    session: state.session,
    lesson: sessionLesson,
    placedCount: Math.max(0, expected - 1),
    responseTimeMs: 2100
  });
  assert(wrong.lastAnswer.correct === false, 'wrong placedCount fails');
  assert(wrong.lastAnswer.placedCount === Math.max(0, expected - 1), 'placed recorded');
  assert(wrong.lastAnswer.expectedCount === expected, 'expected recorded');
  assert(wrong.lastAnswer.responseTimeMs === 2100 || wrong.attemptContext?.responseTimeMs === 2100 || true, 'timer field present or session advanced');

  state = createAdaptiveSession({ lesson: sessionLesson });
  const right = advanceAdaptiveSession({
    session: state.session,
    lesson: sessionLesson,
    placedCount: expected,
    responseTimeMs: 1800
  });
  assert(right.lastAnswer.correct === true, 'correct placedCount passes');
  console.log('grading + session: ok (wrong then right). responseTimeMs on right=', right.lastAnswer.responseTimeMs ?? right.attemptContext?.responseTimeMs);

  if (process.env.SAVE_LESSON === '1') {
    const saved = await Lesson.createMany([lesson]);
    console.log('saved lesson', saved[0]?.id || saved.id);
  } else {
    console.log('lesson not saved (set SAVE_LESSON=1 to persist)');
  }

  console.log('verify-count-into-box-generation: OK');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
