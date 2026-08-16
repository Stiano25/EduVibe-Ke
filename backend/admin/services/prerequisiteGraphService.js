import { Subject } from '../../models/Subject.js';
import { Strand } from '../../models/Strand.js';
import { SubStrand } from '../../models/SubStrand.js';
import {
  CurriculumOutcome,
  Unit,
  PrerequisiteEdge
} from '../../models/CurriculumGraph.js';
import { outcomeKey, normalizeOutcomeText } from '../../utils/outcomeKey.js';

const EDGE_SOURCE = 'curriculum_sequence';

const pairOutcomes = (laterOutcomes, priorOutcomes, { edgeType, reason }) => {
  const rows = [];
  for (const later of laterOutcomes) {
    for (const prior of priorOutcomes) {
      if (later.id === prior.id) continue;
      rows.push({
        outcomeId: later.id,
        prerequisiteOutcomeId: prior.id,
        confidence: 1,
        source: EDGE_SOURCE,
        edgeType,
        reason,
        status: 'active'
      });
    }
  }
  return rows;
};

const loadMathsTree = async () => {
  const subjects = (await Subject.findAll()).filter(
    (subject) => Strand.normalizeName(subject.name) === 'mathematics'
  );
  const tree = [];
  for (const subject of subjects) {
    const strands = await Strand.findBySubject(subject.id);
    const strandRows = [];
    for (const strand of strands) {
      const subStrands = await SubStrand.findByStrand(strand.id);
      strandRows.push({ strand, subStrands });
    }
    tree.push({ subject, strands: strandRows });
  }
  return tree;
};

export const syncUnitsAndOutcomes = async () => {
  const tree = await loadMathsTree();
  let units = 0;
  let outcomes = 0;
  for (const { subject, strands } of tree) {
    for (const { strand, subStrands } of strands) {
      for (const subStrand of subStrands) {
        await Unit.upsertForSubStrand(subStrand, { grade: subject.grade });
        units += 1;
        const texts = (subStrand.learningOutcomes || []).map(normalizeOutcomeText).filter(Boolean);
        const rows = texts.map((text, index) => ({
          strandId: strand.id,
          subjectId: subject.id,
          grade: subject.grade,
          outcomeText: text,
          outcomeKey: outcomeKey(text),
          sortIndex: index
        }));
        const saved = await CurriculumOutcome.replaceForSubStrand(subStrand.id, rows);
        outcomes += saved.length;
      }
    }
  }
  return { units, outcomes };
};

export const derivePrerequisiteEdges = async () => {
  await PrerequisiteEdge.deleteBySource(EDGE_SOURCE);
  const tree = await loadMathsTree();

  const byGradeStrandKey = new Map();
  for (const { subject, strands } of tree) {
    const gradeNumber = subject.grade === 'K' ? 0 : parseInt(subject.grade, 10);
    for (const { strand, subStrands } of strands) {
      const key = `${gradeNumber}::${Strand.normalizeName(strand.name)}`;
      byGradeStrandKey.set(key, {
        gradeNumber,
        grade: subject.grade,
        strand,
        subStrands: [...subStrands].sort(
          (a, b) => (a.sequenceNumber ?? 999) - (b.sequenceNumber ?? 999)
        )
      });
    }
  }

  const edgeRows = [];

  for (const group of byGradeStrandKey.values()) {
    for (let i = 1; i < group.subStrands.length; i += 1) {
      const prior = group.subStrands[i - 1];
      const later = group.subStrands[i];
      const priorOutcomes = await CurriculumOutcome.findBySubStrand(prior.id);
      const laterOutcomes = await CurriculumOutcome.findBySubStrand(later.id);
      edgeRows.push(
        ...pairOutcomes(laterOutcomes, priorOutcomes, {
          edgeType: 'same_grade_prior_substrand',
          reason: `Grade ${group.grade} ${later.name} follows ${prior.name} in ${group.strand.name}`
        })
      );
    }
  }

  const strandKeys = new Set(
    [...byGradeStrandKey.values()].map((group) => Strand.normalizeName(group.strand.name))
  );
  const grades = [...new Set([...byGradeStrandKey.values()].map((g) => g.gradeNumber))].sort(
    (a, b) => a - b
  );

  for (const strandKey of strandKeys) {
    for (let g = 1; g < grades.length; g += 1) {
      const priorGrade = grades[g - 1];
      const laterGrade = grades[g];
      if (laterGrade !== priorGrade + 1) continue;
      const priorGroup = byGradeStrandKey.get(`${priorGrade}::${strandKey}`);
      const laterGroup = byGradeStrandKey.get(`${laterGrade}::${strandKey}`);
      if (!priorGroup || !laterGroup) continue;

      const priorByName = new Map(
        priorGroup.subStrands.map((ss) => [Strand.normalizeName(ss.name), ss])
      );
      for (const later of laterGroup.subStrands) {
        const prior = priorByName.get(Strand.normalizeName(later.name));
        if (!prior) continue;
        const priorOutcomes = await CurriculumOutcome.findBySubStrand(prior.id);
        const laterOutcomes = await CurriculumOutcome.findBySubStrand(later.id);
        edgeRows.push(
          ...pairOutcomes(laterOutcomes, priorOutcomes, {
            edgeType: 'same_strand_prior_grade',
            reason: `Grade ${laterGroup.grade} ${later.name} depends on Grade ${priorGroup.grade} ${prior.name}`
          })
        );
      }
    }
  }

  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < edgeRows.length; i += CHUNK) {
    const saved = await PrerequisiteEdge.createMany(edgeRows.slice(i, i + CHUNK));
    inserted += saved.length;
  }

  const counts = await PrerequisiteEdge.countByType();
  return { inserted, counts, sampleReasons: edgeRows.slice(0, 3).map((r) => r.reason) };
};

export const rebuildLayer1Graph = async () => {
  const synced = await syncUnitsAndOutcomes();
  const edges = await derivePrerequisiteEdges();
  return { ...synced, edges };
};
