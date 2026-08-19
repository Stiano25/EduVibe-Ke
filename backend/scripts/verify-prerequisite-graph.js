/**
 * Part 4: Layer 1 graph + unit unlock (offline + live after seed).
 */
import { parseCurriculumSequence } from '../utils/curriculumSequence.js';
import { unlockFlagsForSequence, progressMeetsUnlock, lessonIsDone, lessonIsFullyCompleted, unitIsFullyCompleted } from '../utils/lessonUnlock.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(parseCurriculumSequence('1.3 Addition') === 3, 'parses 1.3 → 3');
assert(parseCurriculumSequence('Number Concept') === null, 'unnumbered name has no sequence');

assert(progressMeetsUnlock({ completed: true, progress: 10 }) === true, 'completed passes');
assert(progressMeetsUnlock({ completed: false, progress: 60 }) === true, '60% passes');
assert(progressMeetsUnlock({ completed: false, progress: 59 }) === false, '59% does not pass');
assert(lessonIsDone({ completed: false, progress: 65 }) === true, '65% is done for display and unlock');
assert(lessonIsFullyCompleted({ completed: false, progress: 65 }) === false, '65% is not fully completed');
assert(
  unitIsFullyCompleted(
    [{ id: 'l1' }, { id: 'l2' }],
    new Map([
      ['l1', { completed: true, progress: 100 }],
      ['l2', { completed: false, progress: 70 }]
    ])
  ) === false,
  'unit celebration stays strict — 70% on the last lesson is not unit-complete'
);
assert(
  unitIsFullyCompleted(
    [{ id: 'l1' }, { id: 'l2' }],
    new Map([
      ['l1', { completed: true, progress: 100 }],
      ['l2', { completed: true, progress: 100 }]
    ])
  ) === true,
  'unit is fully completed only when every lesson.completed is true'
);

const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const lessonsByItemId = new Map([
  ['a', [{ id: 'l1', lessonOrder: 1 }]],
  ['b', [{ id: 'l2', lessonOrder: 1 }]],
  ['c', [{ id: 'l3', lessonOrder: 1 }]]
]);
const none = new Map();
const flagsLocked = unlockFlagsForSequence(items, lessonsByItemId, none);
assert(JSON.stringify(flagsLocked) === JSON.stringify([true, false, false]), 'only first unit open with no progress');

const passedA = new Map([['l1', { completed: true, progress: 100 }]]);
const flagsNext = unlockFlagsForSequence(items, lessonsByItemId, passedA);
assert(JSON.stringify(flagsNext) === JSON.stringify([true, true, false]), 'second unit opens after first is passed');

const passedALenient = new Map([['l1', { completed: false, progress: 65 }]]);
const flagsLenient = unlockFlagsForSequence(items, lessonsByItemId, passedALenient);
assert(
  JSON.stringify(flagsLenient) === JSON.stringify([true, true, false]),
  '65% without completed still opens the next unit'
);

console.log('verify-prerequisite-graph (offline): OK');
