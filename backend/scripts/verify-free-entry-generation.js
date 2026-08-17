/**
 * Generate one real Grade 1 Addition lesson on the Admin Generate path
 * and persist it when SAVE_LESSON=1.
 *
 * Usage (from backend/):
 *   node scripts/verify-free-entry-generation.js
 *   SAVE_LESSON=1 node scripts/verify-free-entry-generation.js
 */
import '../config/loadEnv.js';
import { Lesson } from '../models/Lesson.js';
import { generateLessonsFromSubStrand } from '../admin/services/lessonGenerationService.js';
import {
  createAdaptiveSession,
  advanceAdaptiveSession
} from '../learner/services/adaptiveQuizService.js';
import { expectedScalarForQuestion } from '../utils/expectedScalar.js';
import { resolveInteractionType } from '../utils/interactionTypes.js';
import { isVisualOption } from '../utils/quizOptions.js';
import { renderCube } from '../admin/services/diagramTemplates.js';
import fs from 'node:fs';
import path from 'node:path';

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
  const counts = questions.reduce((acc, q) => {
    const t = resolveInteractionType(q.interactionType || q.type);
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const numeric = questions.filter((q) => resolveInteractionType(q.interactionType) === 'numeric_entry');
  const drag = questions.filter((q) => resolveInteractionType(q.interactionType) === 'drag_to_target');
  const picture = questions.filter(
    (q) =>
      resolveInteractionType(q.interactionType) === 'multiple_choice' &&
      (q.options || []).some(isVisualOption)
  );
  const objectBriefs = (lesson.visualBriefs || []).filter(
    (b) => b.diagramType === 'object_quantity' || b.params?.objectKind
  );

  console.log('lesson', {
    title: lesson.title,
    questions: questions.length,
    interactions: counts,
    pictureOptions: picture.length,
    objectBriefs: objectBriefs.length
  });

  assert(numeric.length >= 1, 'generation must produce at least one numeric_entry question');
  assert(drag.length >= 1, 'generation must produce at least one drag_to_target question');

  const sample = numeric[0];
  const expected = expectedScalarForQuestion(sample);
  assert(expected != null, 'numeric expected is computable');

  const sessionLesson = {
    id: 'numeric-gen-verify',
    grade: '1',
    title: lesson.title,
    learningObjectives: lesson.learningObjectives,
    quiz: { questions: [sample] }
  };
  let state = createAdaptiveSession({ lesson: sessionLesson });
  assert(state.question.interactionType === 'numeric_entry', 'live payload is numeric_entry');
  const wrong = advanceAdaptiveSession({
    session: state.session,
    lesson: sessionLesson,
    submittedValue: '0',
    responseTimeMs: 2100
  });
  assert(wrong.lastAnswer.correct === false, 'wrong numeric fails');
  state = createAdaptiveSession({ lesson: sessionLesson });
  const right = advanceAdaptiveSession({
    session: state.session,
    lesson: sessionLesson,
    submittedValue: String(expected),
    responseTimeMs: 1800
  });
  assert(right.lastAnswer.correct === true, 'correct numeric passes');

  const fixtureDir = path.resolve(process.cwd(), '../docs/verification-fixtures');
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(path.join(fixtureDir, 'cube.svg'), renderCube({ side: 5, unit: 'cm' }));
  if (objectBriefs[0]) {
    const { renderDiagram } = await import('../admin/services/diagramTemplates.js');
    fs.writeFileSync(
      path.join(fixtureDir, 'object-quantity.svg'),
      renderDiagram('object_quantity', objectBriefs[0].params || { objectKind: 'ball', count: 5 })
    );
  }

  if (process.env.SAVE_LESSON === '1') {
    const saved = await Lesson.createMany([lesson]);
    const id = saved[0]?.id || saved.id;
    console.log('saved lesson', id);
    console.log('FOUNDER_REVIEW_LESSON_ID', id);
  } else {
    console.log('lesson not saved (set SAVE_LESSON=1 to persist)');
  }

  console.log('verify-free-entry-generation: OK', {
    numericEntry: numeric.length,
    dragToTarget: drag.length,
    pictureOptions: picture.length,
    sampleNumeric: { id: sample.id, question: sample.question, expected }
  });
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
