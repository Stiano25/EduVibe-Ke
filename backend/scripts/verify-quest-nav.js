/**
 * Part 6: quest nav for young grades. No AI. Does not query users (no emails).
 *
 * Usage (from backend/):
 *   node scripts/verify-quest-nav.js
 */
import 'dotenv/config';
import { getDbClient } from '../config/supabase.js';
import { listLessonChoices, resolveNextTask } from '../learner/services/nextTaskService.js';
import { usesQuestNavigation, complexityBandKey, isGrade1to3 } from '../utils/complexityBands.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const paginateSelect = async (db, table, columns) => {
  const page = 1000;
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .range(from, from + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < page) break;
    from += page;
  }
  return rows;
};

const runBandTests = () => {
  assert(usesQuestNavigation('K') && usesQuestNavigation('1') && usesQuestNavigation('5'), 'K–5 quest');
  assert(!usesQuestNavigation('6') && !usesQuestNavigation('7'), '6+ browse');
  assert(isGrade1to3('1') && isGrade1to3('2') && isGrade1to3('3'), '1–3 early primary');
  assert(!isGrade1to3('K') && !isGrade1to3('4') && !isGrade1to3('5'), 'K and 4+ not early primary');
  assert(complexityBandKey('1') === 'very_young', 'grade 1 band');
  assert(complexityBandKey('4') === 'young', 'grade 4 band');
  assert(complexityBandKey('7') === 'pre_teen', 'grade 7 band');
  console.log('Band gating: ok');
};

const catalogByGrade = async (db) => {
  const subjects = await paginateSelect(db, 'subjects', 'id, name, grade');
  const lessons = await paginateSelect(db, 'lessons', 'id, subject_id, grade, status');
  const approved = (lessons || []).filter((l) => l.status === 'approved');
  const byGrade = new Map();
  for (const s of subjects || []) {
    if (!byGrade.has(s.grade)) byGrade.set(s.grade, new Map());
  }
  for (const lesson of approved) {
    const subject = (subjects || []).find((s) => s.id === lesson.subject_id);
    const grade = subject?.grade || lesson.grade;
    const name = subject?.name || 'Unknown';
    if (!byGrade.has(grade)) byGrade.set(grade, new Map());
    const names = byGrade.get(grade);
    names.set(name, (names.get(name) || 0) + 1);
  }
  console.log('Approved lessons by grade / subject:');
  for (const [grade, names] of [...byGrade.entries()].sort()) {
    const parts = [...names.entries()].map(([n, c]) => `${n}:${c}`);
    if (parts.length) console.log(`  Grade ${grade}: ${parts.join(', ')}`);
  }
  return byGrade;
};

const pickYoungLearner = async (db) => {
  const progress = await paginateSelect(db, 'lesson_progress', 'user_id, lesson_id');
  const lessons = await paginateSelect(db, 'lessons', 'id, grade');
  const gradeByLesson = new Map((lessons || []).map((l) => [l.id, l.grade]));
  const counts = new Map();
  for (const row of progress || []) {
    const grade = gradeByLesson.get(row.lesson_id);
    const n = grade === 'K' ? 0 : parseInt(grade, 10);
    if (!Number.isFinite(n) || n > 5) continue;
    const key = `${row.user_id}::${grade}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return null;
  const [compound, n] = ranked[0];
  const sep = compound.indexOf('::');
  return { userId: compound.slice(0, sep), grade: compound.slice(sep + 2), progressRows: n };
};

const walkTasks = async (userId, grade, steps = 4) => {
  const seen = [];
  const extraSatisfiedIds = [];
  for (let i = 0; i < steps; i++) {
    const result = await resolveNextTask(userId, grade, { extraSatisfiedIds });
    if (i === 0) {
      console.log(
        `  catalog: ${result.catalog.subjectNames.join(', ') || '(none)'} ` +
          `(crossSubject=${result.catalog.crossSubjectAvailable})`
      );
      if (result.catalog.limitation) console.log(`  limitation: ${result.catalog.limitation}`);
      assert(result.navigationMode === 'quest', 'young grade must be quest mode');
    }
    if (!result.task) {
      console.log(`  step ${i + 1}: caught up`);
      break;
    }
    const t = result.task;
    assert(t.subjectId && t.strandId && t.subStrandId, 'taxonomy preserved on task');
    assert(t.lessonId && t.title, 'task has a real lesson');
    console.log(
      `  step ${i + 1}: ${t.lessonId.slice(0, 8)}  "${t.title.slice(0, 48)}"  ` +
        `subject=${t.subjectName}  strand=${t.strandName.slice(0, 24)}  unit=${t.subStrandName.slice(0, 24)}  ` +
        `reason=${t.reason}`
    );
    if (seen.includes(t.lessonId)) {
      throw new Error('consecutive recommendation repeated the same lesson');
    }
    seen.push(t.lessonId);
    extraSatisfiedIds.push(t.lessonId);
  }
  return seen;
};

const main = async () => {
  runBandTests();
  const db = getDbClient();
  const byGrade = await catalogByGrade(db);
  const youngGrades = [...byGrade.entries()].filter(([g]) => usesQuestNavigation(g));
  const youngSubjectSets = youngGrades.map(([, names]) => [...names.keys()]);
  const anyCross = youngSubjectSets.some((names) => names.length > 1);
  if (!anyCross) {
    console.log('6.3: only one subject has approved lessons in young grades — no cross-subject demo.');
  } else {
    console.log('6.3: more than one subject has approved lessons in a young grade.');
  }

  const learner = await pickYoungLearner(db);
  if (!learner) {
    console.log('No young-grade learner progress found; walking empty-progress catalog as Grade 1.');
    const fake = '00000000-0000-4000-8000-000000000001';
    await walkTasks(fake, '1');
    const listed = await listLessonChoices(fake, '1');
    assert(Array.isArray(listed.choices), 'lesson choices is an array');
    console.log(`  lesson choices: ${listed.choices.length}`);
  } else {
    console.log(
      `Young learner ${learner.userId.slice(0, 8)} grade ${learner.grade} (${learner.progressRows} progress rows)`
    );
    const seen = await walkTasks(learner.userId, learner.grade);
    assert(seen.length >= 1, 'at least one recommended task');
    const listed = await listLessonChoices(learner.userId, learner.grade);
    assert(Array.isArray(listed.choices), 'lesson choices is an array');
    console.log(`  lesson choices: ${listed.choices.length}`);
    assert(listed.choices.some((c) => c.lessonId === seen[0]), 'picker includes next lesson');
    assert(
      listed.choices.every((c) => c.lessonId && c.title && typeof c.isUnlocked === 'boolean'),
      'choice fields present'
    );
  }

  const browse = await resolveNextTask(
    learner?.userId || '00000000-0000-4000-8000-000000000001',
    '7'
  );
  assert(browse.navigationMode === 'browse', 'grade 7 stays browse');
  console.log('Grade 7 navigationMode=browse (existing menus unchanged).');
  console.log('verify-quest-nav: ok');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
