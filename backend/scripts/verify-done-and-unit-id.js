/**
 * Done-rule + honest unitId checks (offline + live).
 *
 * Usage (from backend/):
 *   node scripts/verify-done-and-unit-id.js
 */
import 'dotenv/config';
import { getDbClient } from '../config/supabase.js';
import { Unit } from '../models/CurriculumGraph.js';
import { listLessonChoices, resolveNextTask } from '../learner/services/nextTaskService.js';
import {
  lessonIsDone,
  lessonIsFullyCompleted,
  progressMeetsUnlock,
  unitIsFullyCompleted
} from '../utils/lessonUnlock.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const sixtyFive = { completed: false, progress: 65 };

assert(progressMeetsUnlock(sixtyFive) === true, '65% unlocks the next lesson');
assert(lessonIsDone(sixtyFive) === true, '65% is done for node/status');
assert(lessonIsDone(sixtyFive) === progressMeetsUnlock(sixtyFive), 'display done === unlock rule');
assert(lessonIsFullyCompleted(sixtyFive) === false, '65% is not fully completed');
assert(
  unitIsFullyCompleted(
    [{ id: 'a' }, { id: 'b' }],
    new Map([
      ['a', { completed: true, progress: 100 }],
      ['b', sixtyFive]
    ])
  ) === false,
  'unit celebration does not fire on a 65% lesson'
);

const choice = {
  isCompleted: lessonIsDone(sixtyFive),
  isUnlocked: true,
  progress: 65
};
assert(choice.isCompleted === true, 'lesson-choices isCompleted uses the lenient done rule');
console.log('offline 65% case: isCompleted=true, fullyCompleted=false, unitIsFullyCompleted=false');

const db = getDbClient();
const { data: passNotComplete, error: passError } = await db
  .from('lesson_progress')
  .select('user_id, lesson_id, progress, completed')
  .eq('completed', false)
  .gte('progress', 60)
  .limit(20);
if (passError) throw passError;

if (!passNotComplete?.length) {
  console.log(
    'live 65%-style rows: none in lesson_progress (completed=false AND progress>=60). Offline rule still holds.'
  );
} else {
  const lessonIds = [...new Set(passNotComplete.map((row) => row.lesson_id))];
  const { data: lessonRows, error: lessonError } = await db
    .from('lessons')
    .select('id, grade, title, sub_strand_id')
    .in('id', lessonIds);
  if (lessonError) throw lessonError;
  const lessonById = new Map((lessonRows || []).map((row) => [row.id, row]));
  const row =
    passNotComplete.find((item) => lessonById.get(item.lesson_id)?.grade === '1') ||
    passNotComplete[0];
  const lessonMeta = lessonById.get(row.lesson_id);
  const grade = lessonMeta?.grade;
  console.log(
    `live pass-not-complete: user=${row.user_id.slice(0, 8)} lesson=${row.lesson_id.slice(0, 8)} ` +
      `progress=${row.progress} completed=${row.completed} grade=${grade || '(unknown)'} ` +
      `title="${(lessonMeta?.title || '').slice(0, 48)}"`
  );
  if (grade) {
    const listed = await listLessonChoices(row.user_id, grade);
    const choiceRow = listed.choices.find((c) => c.lessonId === row.lesson_id);
    if (!choiceRow) {
      console.log('  lesson is not in this grade catalog (progress row may be stale).');
    } else {
      assert(choiceRow.isCompleted === true, 'live 65%+ lesson isCompleted true on lesson-choices');
      console.log(
        `  lesson-choices: isCompleted=${choiceRow.isCompleted} isUnlocked=${choiceRow.isUnlocked} ` +
          `progress=${choiceRow.progress} (DB completed=false)`
      );
      const nextTask = await resolveNextTask(row.user_id, grade);
      assert(
        !nextTask.task || nextTask.task.lessonId !== row.lesson_id,
        'a done lesson is not recommended as next-task'
      );
      console.log(
        nextTask.task
          ? `  next-task skipped this lesson (recommended ${nextTask.task.lessonId.slice(0, 8)})`
          : '  next-task is null — catalog is caught up under the same done rule'
      );
      const idx = listed.choices.findIndex((c) => c.lessonId === row.lesson_id);
      const next = listed.choices[idx + 1];
      if (next && next.subStrandName === choiceRow.subStrandName) {
        assert(
          next.isUnlocked === true,
          'next lesson in the same unit is unlocked because the 65%+ lesson is done'
        );
        console.log(
          `  journey: "${choiceRow.title.slice(0, 40)}" isCompleted=${choiceRow.isCompleted} ` +
            `→ next "${next.title.slice(0, 40)}" isUnlocked=${next.isUnlocked}`
        );
      } else {
        console.log('  no following lesson in the same sub-strand to check unlock against.');
      }
    }
  }
}

const fake = '00000000-0000-4000-8000-000000000001';
const taskResult = await resolveNextTask(fake, '1');
assert(taskResult.task, 'Grade 1 catalog has a next task');
const task = taskResult.task;
assert(task.subStrandId, 'subStrandId is still the sub-strand');
assert(task.unitId, 'unitId is present for Grade 1 Mathematics');
assert(task.unitId !== task.subStrandId, 'unitId is not aliased to the sub-strand id');

const unit = await Unit.findBySubStrandId(task.subStrandId);
assert(unit, 'units table has a row for this sub-strand');
assert(unit.id === task.unitId, 'unitId matches units.id');
assert(unit.subStrandId === task.subStrandId, 'unit.subStrandId matches task.subStrandId');
console.log(
  `live unitId: ${task.unitId}  units.id=${unit.id}  sub_strand_id=${unit.subStrandId}  name="${unit.name}"`
);

const listed = await listLessonChoices(fake, '1');
const withUnit = listed.choices.filter((c) => c.unitId);
assert(withUnit.length > 0, 'lesson-choices includes real unit ids');
const sample = withUnit[0];
const { data: unitRow, error: unitLookupError } = await db
  .from('units')
  .select('id, sub_strand_id, name')
  .eq('id', sample.unitId)
  .maybeSingle();
if (unitLookupError) throw unitLookupError;
assert(unitRow, 'choice unitId exists in units');
assert(unitRow.id === sample.unitId, 'choice unitId is units.id');
console.log(`live choice unitId: ${sample.unitId} → units.name="${unitRow.name}"`);

console.log('verify-done-and-unit-id: OK');
