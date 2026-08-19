/**
 * Two different "finished" rules. Do not mix them.
 *
 * 1. Lenient DONE — unlock + learner node/status (`isCompleted` on learner APIs):
 *    `completed === true` OR `progress >= LESSON_PASS_THRESHOLD`.
 * 2. Strict FULLY COMPLETED — future unit-complete celebration only:
 *    every approved lesson in the unit has `completed === true`.
 */
export const LESSON_PASS_THRESHOLD = 60;

/** Lenient: this lesson is done for unlocking the next one and for node display. */
export const progressMeetsUnlock = (progress) => {
  if (!progress) return false;
  return progress.completed === true || Number(progress.progress) >= LESSON_PASS_THRESHOLD;
};

/** Alias of progressMeetsUnlock — use at display/status call sites so the intent is obvious. */
export const lessonIsDone = progressMeetsUnlock;

/**
 * Strict: the lesson_progress.completed column is true.
 * Not used for unlock or node display.
 */
export const lessonIsFullyCompleted = (progress) =>
  !!progress && progress.completed === true;

/**
 * Strict unit-complete celebration: every approved lesson in the unit is fully
 * completed. Empty units are not complete. Do not use this to unlock the next
 * unit — that still uses lastLessonSatisfied / progressMeetsUnlock.
 */
export const unitIsFullyCompleted = (lessons = [], progressByLessonId) => {
  if (!Array.isArray(lessons) || lessons.length === 0) return false;
  return lessons.every((lesson) => {
    const lookup =
      progressByLessonId instanceof Map
        ? progressByLessonId.get(lesson.id)
        : progressByLessonId?.[lesson.id];
    return lessonIsFullyCompleted(lookup);
  });
};

/** Last approved lesson in order must meet the unlock threshold. Empty banks are not satisfied. */
export const lastLessonSatisfied = (lessons = [], progressByLessonId) => {
  if (!Array.isArray(lessons) || lessons.length === 0) return false;
  const ordered = [...lessons].sort(
    (a, b) => (Number(a.lessonOrder ?? a.lesson_order) || 0) - (Number(b.lessonOrder ?? b.lesson_order) || 0)
  );
  const last = ordered[ordered.length - 1];
  const lookup =
    progressByLessonId instanceof Map
      ? progressByLessonId.get(last.id)
      : progressByLessonId?.[last.id];
  return progressMeetsUnlock(lookup);
};

/**
 * Unlock flags for a curriculum-ordered sequence of units/sub-strands.
 * Empty units (no approved lessons) do not block later ones.
 */
export const unlockFlagsForSequence = (items, lessonsByItemId, progressByLessonId) => {
  let blocked = false;
  return (items || []).map((item, index) => {
    const lessons = lessonsByItemId.get(item.id) || [];
    const isUnlocked = index === 0 || !blocked;
    if (lessons.length > 0 && !lastLessonSatisfied(lessons, progressByLessonId)) {
      blocked = true;
    }
    return isUnlocked;
  });
};
