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

/**
 * Approved lessons for the learner's grade, with unlock flags.
 * Quest UI uses this as a picker; locked items stay visible but not tappable.
 */
export const listLessonChoices = async (userId, grade) => {
  if (!userId || !grade) {
    return { grade: grade || null, choices: [] };
  }

  const subjects = [...(await Subject.findByGrade(grade))].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''))
  );
  if (subjects.length === 0) {
    return { grade, choices: [] };
  }

  const subjectIdsWithStrands = await Strand.findSubjectIdsHavingAny(subjects.map((s) => s.id));
  const orderedSubjects = subjects.filter((s) => subjectIdsWithStrands.has(s.id));

  const choices = [];
  for (const subject of orderedSubjects) {
    const strands = Strand.dedupeByNamePreserveOrder(await Strand.findBySubject(subject.id));
    for (const strand of strands) {
      const { subStrands, lessonsBySub, progressByLessonId } = await loadStrandUnitUnlock(
        userId,
        strand.id
      );
      const flags = unlockFlagsForSequence(subStrands, lessonsBySub, progressByLessonId);
      const visible = (subStrands || []).filter(
        (ss) => (lessonsBySub.get(ss.id) || []).length > 0
      );

      for (const unit of visible) {
        const unitIndex = subStrands.findIndex((ss) => ss.id === unit.id);
        const unitUnlocked = unitIndex < 0 ? true : flags[unitIndex] !== false;
        const lessons = sortLessons(lessonsBySub.get(unit.id) || []);
        for (let i = 0; i < lessons.length; i++) {
          const row = lessons[i];
          const prev = i > 0 ? progressByLessonId.get(lessons[i - 1].id) : null;
          const p = progressByLessonId.get(row.id);
          choices.push({
            lessonId: row.id,
            title: row.title || 'Lesson',
            subjectName: subject.name,
            strandName: strand.name,
            subStrandName: unit.name,
            isUnlocked: unitUnlocked && (i === 0 || progressMeetsUnlock(prev)),
            isCompleted: !!p?.completed,
            progress: Number(p?.progress) || 0
          });
        }
      }
    }
  }

  return { grade, choices: disambiguateDuplicateTitles(choices) };
};

/** Same title on two approved lessons in a list is a data bug; still show distinct labels. */
export const disambiguateDuplicateTitles = (choices = []) => {
  const counts = new Map();
  for (const choice of choices) {
    const key = String(choice.title || '').trim().toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const seen = new Map();
  return choices.map((choice) => {
    const key = String(choice.title || '').trim().toLowerCase();
    if ((counts.get(key) || 0) < 2) return choice;
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    return { ...choice, title: `${choice.title} (${n})` };
  });
};
