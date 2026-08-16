/**
 * Part 4: Layer 1 graph + unit unlock (offline + live after seed).
 */
import { parseCurriculumSequence } from '../utils/curriculumSequence.js';
import { unlockFlagsForSequence, progressMeetsUnlock } from '../utils/lessonUnlock.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(parseCurriculumSequence('1.3 Addition') === 3, 'parses 1.3 → 3');
assert(parseCurriculumSequence('Number Concept') === null, 'unnumbered name has no sequence');

assert(progressMeetsUnlock({ completed: true, progress: 10 }) === true, 'completed passes');
assert(progressMeetsUnlock({ completed: false, progress: 60 }) === true, '60% passes');
assert(progressMeetsUnlock({ completed: false, progress: 59 }) === false, '59% does not pass');

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

console.log('verify-prerequisite-graph (offline): OK');
