/**
 * Single next-task recommendation. Presentation-layer routing only:
 * unit unlock (Part 4) + lesson progress. Does not add diagnostic logic.
 * Mastery is attached for reporting; it does not change which lesson is picked.
 */
import { Subject } from '../../models/Subject.js';
import { Strand } from '../../models/Strand.js';
import { Lesson } from '../../models/Lesson.js';
import { SkillMastery } from '../../models/SkillAttempt.js';
import { loadStrandUnitUnlock } from './unitGatingService.js';
import { progressMeetsUnlock, unlockFlagsForSequence } from '../../utils/lessonUnlock.js';
import { complexityBandKey, usesQuestNavigation } from '../../utils/complexityBands.js';

const overlaySatisfied = (progressByLessonId, extraSatisfiedIds) => {
  const map = new Map(progressByLessonId || []);
  for (const id of extraSatisfiedIds || []) {
    if (!id) continue;
    map.set(id, { completed: true, progress: 100 });
  }
  return map;
};

const sortLessons = (lessons = []) =>
  [...lessons].sort(
    (a, b) => (Number(a.lessonOrder) || 0) - (Number(b.lessonOrder) || 0)
  );

const masteryForLesson = (lesson, masteryRows) => {
  const keys = [
    ...new Set(
      (lesson?.quiz?.questions || []).map((q) => q.learningOutcomeKey).filter(Boolean)
    )
  ];
  const byKey = new Map((masteryRows || []).map((m) => [m.learningOutcomeKey, m.status]));
  return keys.map((learningOutcomeKey) => ({
    learningOutcomeKey,
    status: byKey.get(learningOutcomeKey) || 'unknown'
  }));
};

/**
 * Walk the learner's grade catalog in curriculum order and return the first
 * unlocked lesson that is not yet satisfied (completed or ≥ 60%).
 */
export const resolveNextTask = async (userId, grade, { extraSatisfiedIds = [] } = {}) => {
  const navigationMode = usesQuestNavigation(grade) ? 'quest' : 'browse';
  const complexityBand = complexityBandKey(grade);
  const emptyCatalog = {
    subjectCount: 0,
    subjectNames: [],
    crossSubjectAvailable: false,
    limitation: 'No approved lessons are seeded for this grade yet.'
  };

  if (!userId || !grade) {
    return { navigationMode, grade: grade || null, complexityBand, catalog: emptyCatalog, task: null };
  }

  const subjects = [...(await Subject.findByGrade(grade))].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''))
  );
  if (subjects.length === 0) {
    return { navigationMode, grade, complexityBand, catalog: emptyCatalog, task: null };
  }

  const subjectIdsWithStrands = await Strand.findSubjectIdsHavingAny(subjects.map((s) => s.id));
  const orderedSubjects = subjects.filter((s) => subjectIdsWithStrands.has(s.id));

  const masteryRows = await SkillMastery.findByUser(userId);
  const subjectNamesWithLessons = new Set();
  let picked = null;

  for (const subject of orderedSubjects) {
    const strands = Strand.dedupeByNamePreserveOrder(await Strand.findBySubject(subject.id));
    for (const strand of strands) {
      const { subStrands, lessonsBySub, progressByLessonId } = await loadStrandUnitUnlock(
        userId,
        strand.id
      );
      const progress = overlaySatisfied(progressByLessonId, extraSatisfiedIds);
      const flags = unlockFlagsForSequence(subStrands, lessonsBySub, progress);
      const visible = subStrands.filter((ss) => (lessonsBySub.get(ss.id) || []).length > 0);
      if (visible.length > 0) subjectNamesWithLessons.add(subject.name);

      for (let i = 0; i < visible.length; i++) {
        const unit = visible[i];
        const unitIndex = subStrands.findIndex((ss) => ss.id === unit.id);
        const unlocked = unitIndex < 0 ? true : flags[unitIndex] !== false;
        if (!unlocked) continue;

        const lessons = sortLessons(lessonsBySub.get(unit.id) || []);
        for (const row of lessons) {
          if (progressMeetsUnlock(progress.get(row.id))) continue;
          if (picked) continue;
          picked = {
            lessonId: row.id,
            progress: Number(progress.get(row.id)?.progress) || 0,
            subject,
            strand,
            unit
          };
        }
      }
    }
  }

  const names = [...subjectNamesWithLessons];
  const catalog = {
    subjectCount: names.length,
    subjectNames: names,
    crossSubjectAvailable: names.length > 1,
    limitation:
      names.length > 1
        ? null
        : names.length === 1
          ? `Only ${names[0]} is seeded for this grade. Cross-subject variety cannot be demonstrated yet.`
          : emptyCatalog.limitation
  };

  if (!picked) {
    return { navigationMode, grade, complexityBand, catalog, task: null };
  }

  const lesson = await Lesson.findById(picked.lessonId);
  if (!lesson || lesson.status !== 'approved') {
    return { navigationMode, grade, complexityBand, catalog, task: null };
  }

  const p = picked.progress;
  return {
    navigationMode,
    grade,
    complexityBand,
    catalog,
    task: {
      lessonId: lesson.id,
      title: lesson.title,
      progress: p,
      reason: p > 0 ? 'continue' : 'next',
      subjectId: picked.subject.id,
      subjectName: picked.subject.name,
      strandId: picked.strand.id,
      strandName: picked.strand.name,
      subStrandId: picked.unit.id,
      subStrandName: picked.unit.name,
      unitId: picked.unit.id,
      mastery: masteryForLesson(lesson, masteryRows)
    }
  };
};
