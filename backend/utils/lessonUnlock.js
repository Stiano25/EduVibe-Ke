/**
 * Shared pass threshold for lesson unlock and unit unlock.
 * A lesson/unit is satisfied when completed OR progress >= this value.
 */
export const LESSON_PASS_THRESHOLD = 60;

export const progressMeetsUnlock = (progress) => {
  if (!progress) return false;
  return progress.completed === true || Number(progress.progress) >= LESSON_PASS_THRESHOLD;
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
