/**
 * Grouped learner path: subject → strand → unit → lessons.
 * Additive. Does not replace /lesson-choices or the next-task resolver.
 *
 * isCurrent is taken from resolveNextTask (one catalog walk for "what's next").
 * isDone is the lenient unlock/display rule. isFullyCompleted is strict
 * (every approved lesson in the unit has completed === true) and is reserved
 * for celebration — it is not used to unlock anything here.
 */
import { Subject } from '../../models/Subject.js';
import { Strand } from '../../models/Strand.js';
import { loadStrandUnitUnlock } from './unitGatingService.js';
import { resolveNextTask } from './nextTaskService.js';
import {
  progressMeetsUnlock,
  lessonIsDone,
  unitIsFullyCompleted,
  unlockFlagsForSequence
} from '../../utils/lessonUnlock.js';

const sortLessons = (lessons = []) =>
  [...lessons].sort(
    (a, b) => (Number(a.lessonOrder) || 0) - (Number(b.lessonOrder) || 0)
  );

const disambiguateLessonTitles = (lessons = []) => {
  const counts = new Map();
  for (const row of lessons) {
    const key = String(row.title || '').trim().toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const seen = new Map();
  return lessons.map((row) => {
    const key = String(row.title || '').trim().toLowerCase();
    if ((counts.get(key) || 0) < 2) return row;
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    return { ...row, title: `${row.title} (${n})` };
  });
};

export const flattenPathLessons = (subjects = []) => {
  const rows = [];
  for (const subject of subjects) {
    for (const strand of subject.strands || []) {
      for (const unit of strand.units || []) {
        for (const lesson of unit.lessons || []) {
          rows.push({ subject, strand, unit, lesson });
        }
      }
    }
  }
  return rows;
};

export const listLearnerPath = async (userId, grade) => {
  const next = await resolveNextTask(userId, grade);
  const currentLessonId = next.task?.lessonId || null;

  if (!userId || !grade) {
    return { grade: grade || null, currentLessonId: null, subjects: [] };
  }

  const subjects = [...(await Subject.findByGrade(grade))].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''))
  );
  if (subjects.length === 0) {
    return { grade, currentLessonId, subjects: [] };
  }

  const subjectIdsWithStrands = await Strand.findSubjectIdsHavingAny(subjects.map((s) => s.id));
  const orderedSubjects = subjects.filter((s) => subjectIdsWithStrands.has(s.id));

  const subjectPayloads = [];
  for (const subject of orderedSubjects) {
    const strands = Strand.dedupeByNamePreserveOrder(await Strand.findBySubject(subject.id));
    const strandPayloads = [];

    for (let si = 0; si < strands.length; si++) {
      const strand = strands[si];
      const { subStrands, lessonsBySub, progressByLessonId, unitsBySubStrandId } =
        await loadStrandUnitUnlock(userId, strand.id);
      const flags = unlockFlagsForSequence(subStrands, lessonsBySub, progressByLessonId);
      const units = [];

      for (let i = 0; i < subStrands.length; i++) {
        const ss = subStrands[i];
        const approved = sortLessons(lessonsBySub.get(ss.id) || []);
        const unitRow = unitsBySubStrandId.get(ss.id) || null;
        if (approved.length === 0 && !unitRow) continue;

        const unitUnlocked = flags[i] !== false;
        // Strict rule against every approved lesson in the unit, not a UI subset.
        const isFullyCompleted = unitIsFullyCompleted(approved, progressByLessonId);
        const labelled = disambiguateLessonTitles(approved);

        const lessons = labelled.map((row, li) => {
          const prev = li > 0 ? progressByLessonId.get(approved[li - 1].id) : null;
          const p = progressByLessonId.get(row.id);
          return {
            lessonId: row.id,
            title: row.title || 'Lesson',
            lessonOrder: row.lessonOrder ?? li + 1,
            isUnlocked: unitUnlocked && (li === 0 || progressMeetsUnlock(prev)),
            isDone: lessonIsDone(p),
            progress: Number(p?.progress) || 0,
            isCurrent: currentLessonId === row.id
          };
        });

        units.push({
          unitId: unitRow?.id ?? null,
          subStrandId: ss.id,
          unitName: unitRow?.name || ss.name,
          sequenceNumber: unitRow?.sequenceNumber ?? ss.sequenceNumber ?? i + 1,
          lessonsAllocated: unitRow?.lessonsAllocated ?? ss.lessonsAllocated ?? null,
          isUnlocked: unitUnlocked,
          isFullyCompleted,
          lessons
        });
      }

      if (units.length === 0) continue;
      strandPayloads.push({
        strandId: strand.id,
        strandName: strand.name,
        sequenceNumber: si + 1,
        units
      });
    }

    if (strandPayloads.length === 0) continue;
    subjectPayloads.push({
      subjectId: subject.id,
      subjectName: subject.name,
      strands: strandPayloads
    });
  }

  return { grade, currentLessonId, subjects: subjectPayloads };
};
