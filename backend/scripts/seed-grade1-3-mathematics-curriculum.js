/**
 * Idempotently seed the KICD Grade 1-3 Mathematics curriculum.
 *
 * Usage:
 *   node scripts/seed-grade1-3-mathematics-curriculum.js
 *   node scripts/seed-grade1-3-mathematics-curriculum.js --verify-only
 */
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { CurriculumDesign } from '../models/CurriculumDesign.js';
import { Subject } from '../models/Subject.js';
import { Strand } from '../models/Strand.js';
import { SubStrand } from '../models/SubStrand.js';
import { parseCurriculumSequence } from '../utils/curriculumSequence.js';
import { rebuildLayer1Graph } from '../admin/services/prerequisiteGraphService.js';
import { Unit, PrerequisiteEdge } from '../models/CurriculumGraph.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(SCRIPT_DIR, '../data/grade1-3-mathematics-curriculum.json');
const SOURCE_PREFIX =
  'KICD Lower Primary Level Curriculum Designs, Volume Two (Mathematics Activities), August 2017';
const SUBJECT_DESCRIPTION = 'KICD Lower Primary Mathematics Activities curriculum';
const SUBJECT_ICON = 'calculator';
const SUBJECT_COLOR = '#2563eb';

const normalizeName = (name) => Strand.normalizeName(name);
const displayName = (name) =>
  String(name || '')
    .replace(/^\d+(\.\d+)?\s*[:.)-]?\s*/i, '')
    .trim();

const arraysEqual = (left, right) =>
  Array.isArray(left) &&
  Array.isArray(right) &&
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const sourceUrl = (source) => {
  const match = String(source).match(/https?:\/\/\S+$/);
  return match?.[0] || null;
};

export async function loadAndValidateCurriculum() {
  const curriculum = JSON.parse(await readFile(DATA_PATH, 'utf8'));

  assert(
    typeof curriculum.source === 'string' && curriculum.source.startsWith(SOURCE_PREFIX),
    'Unexpected curriculum source'
  );
  assert(curriculum.subject === 'Mathematics', 'Expected Mathematics subject');
  assert(Array.isArray(curriculum.grades) && curriculum.grades.length === 3, 'Expected three grades');
  assert(
    arraysEqual(
      curriculum.grades.map(({ grade }) => grade),
      [1, 2, 3]
    ),
    'Expected grades 1, 2 and 3 in order'
  );

  const seenGrades = new Set();
  for (const grade of curriculum.grades) {
    assert(!seenGrades.has(grade.grade), `Duplicate grade ${grade.grade}`);
    seenGrades.add(grade.grade);
    assert(Array.isArray(grade.strands) && grade.strands.length > 0, `Grade ${grade.grade} has no strands`);

    const seenStrands = new Set();
    for (const strand of grade.strands) {
      const strandKey = normalizeName(strand.strand);
      assert(strandKey, `Grade ${grade.grade} has an unnamed strand`);
      assert(!seenStrands.has(strandKey), `Grade ${grade.grade} has duplicate strand ${strand.strand}`);
      seenStrands.add(strandKey);
      assert(
        Array.isArray(strand.subStrands) && strand.subStrands.length > 0,
        `${strand.strand} has no sub-strands`
      );

      const seenSubStrands = new Set();
      for (const subStrand of strand.subStrands) {
        const subStrandKey = normalizeName(subStrand.subStrand);
        assert(subStrandKey, `${strand.strand} has an unnamed sub-strand`);
        assert(
          !seenSubStrands.has(subStrandKey),
          `${strand.strand} has duplicate sub-strand ${subStrand.subStrand}`
        );
        seenSubStrands.add(subStrandKey);
        assert(
          Number.isInteger(subStrand.lessonsAllocated) && subStrand.lessonsAllocated > 0,
          `${subStrand.subStrand} has invalid lessonsAllocated`
        );
        assert(
          Array.isArray(subStrand.specificLearningOutcomes) &&
            subStrand.specificLearningOutcomes.length > 0,
          `${subStrand.subStrand} has no specificLearningOutcomes`
        );
        assert(
          Array.isArray(subStrand.keyInquiryQuestions) &&
            subStrand.keyInquiryQuestions.length > 0,
          `${subStrand.subStrand} has no keyInquiryQuestions`
        );
      }
    }
  }

  return curriculum;
}

const sourceCounts = (curriculum) => ({
  curriculumDesigns: curriculum.grades.length,
  subjects: curriculum.grades.length,
  strands: curriculum.grades.reduce((total, grade) => total + grade.strands.length, 0),
  subStrands: curriculum.grades.reduce(
    (total, grade) =>
      total + grade.strands.reduce((gradeTotal, strand) => gradeTotal + strand.subStrands.length, 0),
    0
  ),
  learningOutcomes: curriculum.grades.reduce(
    (total, grade) =>
      total +
      grade.strands.reduce(
        (gradeTotal, strand) =>
          gradeTotal +
          strand.subStrands.reduce(
            (strandTotal, subStrand) =>
              strandTotal + subStrand.specificLearningOutcomes.length,
            0
          ),
        0
      ),
    0
  ),
  keyInquiryQuestions: curriculum.grades.reduce(
    (total, grade) =>
      total +
      grade.strands.reduce(
        (gradeTotal, strand) =>
          gradeTotal +
          strand.subStrands.reduce(
            (strandTotal, subStrand) => strandTotal + subStrand.keyInquiryQuestions.length,
            0
          ),
        0
      ),
    0
  )
});

async function ensureCurriculumDesign(grade, curriculum) {
  const gradeText = String(grade);
  const values = {
    grade: gradeText,
    subjectName: curriculum.subject,
    name: `Grade${gradeText}_${curriculum.subject}_Curriculum Design`,
    disciplines: [curriculum.subject],
    pdfUrl: sourceUrl(curriculum.source),
    pdfFileName: 'volume-2-curriculum-designs-September-2017.pdf'
  };
  const existing = await CurriculumDesign.findBySubjectName(gradeText, curriculum.subject);
  return existing
    ? CurriculumDesign.update(existing.id, values)
    : CurriculumDesign.create(values);
}

async function ensureSubject(grade, curriculumDesignId) {
  const gradeText = String(grade);
  const subjects = await Subject.findByGrade(gradeText);
  const matches = subjects.filter(
    (subject) =>
      normalizeName(subject.name) === normalizeName('Mathematics') &&
      subject.curriculumDesignId === curriculumDesignId
  );
  assert(matches.length <= 1, `Grade ${grade} has duplicate Mathematics subjects for this design`);

  const values = {
    name: 'Mathematics',
    description: SUBJECT_DESCRIPTION,
    curriculumDesignId,
    grade: gradeText,
    icon: SUBJECT_ICON,
    color: SUBJECT_COLOR
  };
  return matches[0] ? Subject.update(matches[0].id, values) : Subject.create(values);
}

async function ensureStrand(subjectId, sourceStrand) {
  const strands = await Strand.findBySubject(subjectId);
  const key = normalizeName(sourceStrand.strand);
  const matches = strands.filter((strand) => normalizeName(strand.name) === key);
  assert(matches.length <= 1, `Subject ${subjectId} has duplicate normalized strand ${sourceStrand.strand}`);

  const name = displayName(sourceStrand.strand);
  const values = {
    name,
    description: `${name} curriculum strand`,
    subjectId,
    theme: name,
    isAIGenerated: false
  };
  return matches[0] ? Strand.update(matches[0].id, values) : Strand.create(values);
}

async function ensureSubStrand(subjectId, strandId, sourceSubStrand) {
  const subStrands = await SubStrand.findByStrand(strandId);
  const key = normalizeName(sourceSubStrand.subStrand);
  const matches = subStrands.filter((subStrand) => normalizeName(subStrand.name) === key);
  assert(
    matches.length <= 1,
    `Strand ${strandId} has duplicate normalized sub-strand ${sourceSubStrand.subStrand}`
  );

  const name = displayName(sourceSubStrand.subStrand);
  const values = {
    name,
    description: `${name} curriculum sub-strand`,
    strandId,
    subjectId,
    learningOutcomes: sourceSubStrand.specificLearningOutcomes,
    keyInquiryQuestions: sourceSubStrand.keyInquiryQuestions,
    lessonsAllocated: sourceSubStrand.lessonsAllocated,
    sequenceNumber: parseCurriculumSequence(sourceSubStrand.subStrand),
    isAIGenerated: false
  };
  return matches[0] ? SubStrand.update(matches[0].id, values) : SubStrand.create(values);
}

async function seed(curriculum) {
  for (const sourceGrade of curriculum.grades) {
    const design = await ensureCurriculumDesign(sourceGrade.grade, curriculum);
    const subject = await ensureSubject(sourceGrade.grade, design.id);
    for (const sourceStrand of sourceGrade.strands) {
      const strand = await ensureStrand(subject.id, sourceStrand);
      for (const sourceSubStrand of sourceStrand.subStrands) {
        await ensureSubStrand(subject.id, strand.id, sourceSubStrand);
      }
    }
  }
}

async function verify(curriculum) {
  const actual = {
    curriculumDesigns: 0,
    subjects: 0,
    strands: 0,
    subStrands: 0,
    learningOutcomes: 0,
    keyInquiryQuestions: 0
  };
  let addition = null;

  for (const sourceGrade of curriculum.grades) {
    const gradeText = String(sourceGrade.grade);
    const design = await CurriculumDesign.findBySubjectName(gradeText, curriculum.subject);
    assert(design, `Missing Grade ${gradeText} Mathematics curriculum design`);
    actual.curriculumDesigns += 1;

    const subjects = (await Subject.findByGrade(gradeText)).filter(
      (subject) =>
        normalizeName(subject.name) === normalizeName(curriculum.subject) &&
        subject.curriculumDesignId === design.id
    );
    assert(subjects.length === 1, `Expected one Grade ${gradeText} Mathematics subject, found ${subjects.length}`);
    const subject = subjects[0];
    actual.subjects += 1;

    const persistedStrands = await Strand.findBySubject(subject.id);
    for (const sourceStrand of sourceGrade.strands) {
      const strands = persistedStrands.filter(
        (strand) => normalizeName(strand.name) === normalizeName(sourceStrand.strand)
      );
      assert(
        strands.length === 1,
        `Expected one Grade ${gradeText} ${sourceStrand.strand} strand, found ${strands.length}`
      );
      const strand = strands[0];
      assert(strand.isAIGenerated === false, `${strand.name} must have is_ai_generated=false`);
      actual.strands += 1;

      const persistedSubStrands = await SubStrand.findByStrand(strand.id);
      for (const sourceSubStrand of sourceStrand.subStrands) {
        const subStrands = persistedSubStrands.filter(
          (subStrand) => normalizeName(subStrand.name) === normalizeName(sourceSubStrand.subStrand)
        );
        assert(
          subStrands.length === 1,
          `Expected one Grade ${gradeText} ${sourceSubStrand.subStrand} sub-strand, found ${subStrands.length}`
        );
        const subStrand = subStrands[0];
        assert(subStrand.subjectId === subject.id, `${subStrand.name} has the wrong subject link`);
        assert(subStrand.isAIGenerated === false, `${subStrand.name} must have is_ai_generated=false`);
        assert(
          arraysEqual(subStrand.learningOutcomes, sourceSubStrand.specificLearningOutcomes),
          `${subStrand.name} learning outcomes do not match the source`
        );
        assert(
          arraysEqual(subStrand.keyInquiryQuestions, sourceSubStrand.keyInquiryQuestions),
          `${subStrand.name} key inquiry questions do not match the source`
        );
        assert(
          subStrand.lessonsAllocated === sourceSubStrand.lessonsAllocated,
          `${subStrand.name} lessonsAllocated does not match the source`
        );
        assert(
          subStrand.sequenceNumber === parseCurriculumSequence(sourceSubStrand.subStrand),
          `${subStrand.name} sequenceNumber does not match the source`
        );
        const unit = await Unit.findBySubStrandId(subStrand.id);
        assert(unit, `${subStrand.name} is missing its 1:1 unit`);
        assert(unit.lessonsAllocated === sourceSubStrand.lessonsAllocated, `${subStrand.name} unit lessonsAllocated mismatch`);
        actual.subStrands += 1;
        actual.learningOutcomes += subStrand.learningOutcomes.length;
        actual.keyInquiryQuestions += subStrand.keyInquiryQuestions.length;

        if (
          sourceGrade.grade === 1 &&
          normalizeName(sourceStrand.strand) === 'numbers' &&
          normalizeName(sourceSubStrand.subStrand) === 'addition'
        ) {
          addition = {
            curriculumDesignId: design.id,
            subjectId: subject.id,
            strandId: strand.id,
            subStrandId: subStrand.id,
            learningOutcomeCount: subStrand.learningOutcomes.length,
            keyInquiryQuestionCount: subStrand.keyInquiryQuestions.length
          };
        }
      }
    }
  }

  const expected = sourceCounts(curriculum);
  assert(JSON.stringify(actual) === JSON.stringify(expected), 'Persisted curriculum counts do not match source');
  assert(addition, 'Grade 1 Numbers Addition was not found');
  assert(addition.learningOutcomeCount === 7, 'Grade 1 Numbers Addition must have exactly 7 outcomes');

  return { expected, actual, grade1NumbersAddition: addition };
}

export async function runGrade1To3MathematicsSeed({ verifyOnly = false } = {}) {
  const curriculum = await loadAndValidateCurriculum();
  if (!verifyOnly) {
    await seed(curriculum);
    await rebuildLayer1Graph();
  }
  const graph = await PrerequisiteEdge.countByType();
  return {
    mode: verifyOnly ? 'verify-only' : 'seed-and-verify',
    ...(await verify(curriculum)),
    prerequisiteEdges: graph
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  try {
    const report = await runGrade1To3MathematicsSeed({
      verifyOnly: process.argv.includes('--verify-only')
    });
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(`Curriculum seed failed: ${error.message}`);
    process.exitCode = 1;
  }
}
