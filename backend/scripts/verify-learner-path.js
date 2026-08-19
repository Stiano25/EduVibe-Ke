/**
 * Task 1 evidence: structured path payload + proof that /lesson-choices
 * and next-task are unchanged.
 *
 * Usage (from backend/):
 *   node scripts/verify-learner-path.js
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { listLearnerPath, flattenPathLessons } from '../learner/services/learnerPathService.js';
import { listLessonChoices, resolveNextTask } from '../learner/services/nextTaskService.js';
import { Unit } from '../models/CurriculumGraph.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../docs/measurements');
fs.mkdirSync(outDir, { recursive: true });

const writeDump = (name, data) => {
  const file = path.join(outDir, name);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`wrote ${file}`);
  return file;
};

const summarizeSubject = (subject) => ({
  subjectName: subject.subjectName,
  strandCount: (subject.strands || []).length,
  strands: (subject.strands || []).map((strand) => ({
    strandName: strand.strandName,
    sequenceNumber: strand.sequenceNumber,
    units: (strand.units || []).map((unit) => ({
      unitId: unit.unitId,
      subStrandId: unit.subStrandId,
      unitName: unit.unitName,
      sequenceNumber: unit.sequenceNumber,
      lessonsAllocated: unit.lessonsAllocated,
      isUnlocked: unit.isUnlocked,
      isFullyCompleted: unit.isFullyCompleted,
      lessonCount: (unit.lessons || []).length,
      lessons: (unit.lessons || []).map((lesson) => ({
        title: lesson.title,
        lessonOrder: lesson.lessonOrder,
        isUnlocked: lesson.isUnlocked,
        isDone: lesson.isDone,
        progress: lesson.progress,
        isCurrent: lesson.isCurrent
      }))
    }))
  }))
});

const currentCount = (payload) =>
  flattenPathLessons(payload.subjects).filter((row) => row.lesson.isCurrent).length;

const mathSubject = (payload) =>
  (payload.subjects || []).find((s) => /math/i.test(s.subjectName));

const fake = '00000000-0000-4000-8000-000000000001';
const liveGrade1 = 'd0b9f845-55b3-4f4f-95d4-ed039e0a2acd';

const fakePath = await listLearnerPath(fake, '1');
const fakeNext = await resolveNextTask(fake, '1');
const fakeChoices = await listLessonChoices(fake, '1');
const math = mathSubject(fakePath);

assert(math, 'Grade 1 payload includes Mathematics');
assert((math.strands || []).length >= 1, 'Mathematics has at least one strand');
const numberedUnits = (math.strands || []).flatMap((s) => s.units || []);
assert(numberedUnits.length >= 2, 'Mathematics has multiple units');
const seq = numberedUnits.map((u) => Number(u.sequenceNumber) || 0);
assert(
  seq.every((n, i) => i === 0 || n >= seq[i - 1] || numberedUnits[i - 1].subStrandId !== numberedUnits[i].subStrandId),
  'unit sequence numbers are ordered within the walk'
);

for (const unit of numberedUnits) {
  assert(unit.subStrandId, 'every unit has subStrandId');
  if (unit.unitId) {
    assert(unit.unitId !== unit.subStrandId, 'unitId is not the sub-strand id');
    const row = await Unit.findBySubStrandId(unit.subStrandId);
    assert(row, `units row exists for ${unit.unitName}`);
    assert(row.id === unit.unitId, `unitId matches units.id for ${unit.unitName}`);
  }
}

const currents = flattenPathLessons(fakePath.subjects).filter((row) => row.lesson.isCurrent);
assert(currents.length === 1, `exactly one isCurrent on empty Grade 1 catalog, got ${currents.length}`);
assert(fakePath.currentLessonId === fakeNext.task?.lessonId, 'isCurrent reuses resolveNextTask');
assert(currents[0].lesson.lessonId === fakeNext.task.lessonId, 'the current node is the next-task lesson');

const addition = numberedUnits.find((u) => /addition/i.test(u.unitName));
assert(addition, 'Addition unit is present');
assert(addition.lessons.length >= 2, 'Addition has multiple approved lessons');
assert(addition.isFullyCompleted === false, 'empty progress is not strictly unit-complete');
assert(addition.lessons[0].isUnlocked === true, 'first Addition lesson is unlocked');
assert(addition.lessons[0].isCurrent === true, 'first Addition lesson is current for empty progress');
assert(
  addition.lessons.slice(1).every((l) => l.isUnlocked === false),
  'later Addition lessons stay locked until the previous is done'
);

const subtraction = numberedUnits.find((u) => /subtraction/i.test(u.unitName));
if (subtraction) {
  assert(subtraction.isUnlocked === false, 'Subtraction stays locked while Addition is unfinished');
}

assert(Array.isArray(fakeChoices.choices), 'lesson-choices still returns choices[]');
assert(
  fakeChoices.choices.every((c) => c.lessonId && c.title && typeof c.isUnlocked === 'boolean' && typeof c.isCompleted === 'boolean'),
  'lesson-choices shape is unchanged'
);
assert(fakeNext.task?.lessonId, 'next-task still resolves a Grade 1 lesson');

writeDump('g1-path-empty-learner.json', {
  learner: 'empty-progress fake id',
  grade: '1',
  currentLessonId: fakePath.currentLessonId,
  nextTaskLessonId: fakeNext.task?.lessonId || null,
  isCurrentCount: currentCount(fakePath),
  mathematics: summarizeSubject(math),
  full: fakePath
});

const livePath = await listLearnerPath(liveGrade1, '1');
const liveNext = await resolveNextTask(liveGrade1, '1');
const liveChoices = await listLessonChoices(liveGrade1, '1');
const liveMath = mathSubject(livePath);
assert(liveMath, 'live Grade 1 learner has Mathematics');
assert(currentCount(livePath) === (liveNext.task ? 1 : 0), 'live isCurrent matches next-task (0 or 1)');
assert(
  liveChoices.choices.some((c) => c.lessonId === (addition?.lessons[0]?.lessonId || liveChoices.choices[0]?.lessonId)),
  'lesson-choices still lists the same Addition lessons'
);

writeDump('g1-path-live-learner.json', {
  learner: liveGrade1,
  grade: '1',
  currentLessonId: livePath.currentLessonId,
  nextTaskLessonId: liveNext.task?.lessonId || null,
  isCurrentCount: currentCount(livePath),
  mathematics: summarizeSubject(liveMath)
});

const crePath = await listLearnerPath(fake, '10');
const cre = (crePath.subjects || []).find((s) => /cre/i.test(s.subjectName));
assert(cre, 'Grade 10 CRE is present');
const creUnits = (cre.strands || []).flatMap((s) => s.units || []);
assert(creUnits.length >= 1, 'CRE groups by sub-strand even without units rows');
assert(
  creUnits.every((u) => u.unitId === null && u.subStrandId),
  'CRE unitId is null and subStrandId is always present'
);
assert(
  creUnits.every((u) => u.isFullyCompleted === false || (u.lessons || []).length > 0),
  'empty CRE groups are not marked fully completed'
);

writeDump('g10-cre-path-no-units.json', {
  learner: 'empty-progress fake id',
  grade: '10',
  currentLessonId: crePath.currentLessonId,
  cre: summarizeSubject(cre)
});

console.log('verify-learner-path: OK');
console.log(
  `  Grade 1 empty: ${numberedUnits.length} math units, isCurrent=${currents[0].lesson.title}`
);
console.log(
  `  Grade 1 live: isCurrentCount=${currentCount(livePath)} next=${liveNext.task?.title || 'null'}`
);
console.log(`  Grade 10 CRE: ${creUnits.length} grouped units, all unitId=null`);
