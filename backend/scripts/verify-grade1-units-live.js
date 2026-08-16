/**
 * Live Part 4 check: Grade 1 Numbers unit sequence + unlock flags.
 * Uses a non-existent learner id so progress is empty (first unit open, later locked).
 */
import 'dotenv/config';
import { Subject } from '../models/Subject.js';
import { Strand } from '../models/Strand.js';
import { loadStrandUnitUnlock } from '../learner/services/unitGatingService.js';
import { PrerequisiteEdge, Unit } from '../models/CurriculumGraph.js';

const fakeLearner = '00000000-0000-4000-8000-000000000001';

const subjects = (await Subject.findByGrade('1')).filter(
  (s) => Strand.normalizeName(s.name) === 'mathematics'
);
if (subjects.length < 1) throw new Error('No Grade 1 Mathematics subject');
const subject = subjects[0];
const strands = await Strand.findBySubject(subject.id);
const numbers = strands.find((s) => Strand.normalizeName(s.name) === 'numbers');
if (!numbers) throw new Error('Grade 1 Numbers strand not found');

const units = await Unit.findByStrand(numbers.id);
const { flagsById, lessonsBySub } = await loadStrandUnitUnlock(fakeLearner, numbers.id);

const sequence = units.map((unit) => ({
  sequence: unit.sequenceNumber,
  name: unit.name,
  lessonsAllocated: unit.lessonsAllocated,
  approvedLessons: (lessonsBySub.get(unit.subStrandId) || []).length,
  isUnlocked: flagsById.get(unit.subStrandId) !== false
}));

const counts = await PrerequisiteEdge.countByType();

console.log(
  JSON.stringify(
    {
      strand: numbers.name,
      unitCount: units.length,
      sequence,
      prerequisiteEdges: counts
    },
    null,
    2
  )
);
