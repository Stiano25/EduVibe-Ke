/** Same ceiling as backend COMPLEXITY_BANDS young: Grade 5 and below. */

export const parseGradeNumber = (grade?: string | null) => {
  if (grade == null || grade === '') return NaN
  if (grade === 'K' || grade === 'k') return 0
  const n = parseInt(grade, 10)
  return Number.isFinite(n) ? n : NaN
}

export const usesQuestNavigation = (grade?: string | null) => {
  const n = parseGradeNumber(grade)
  return Number.isFinite(n) && n <= 5
}

/** Child-facing session-end (no review wall, Practice Score). K and Grade 4+ stay on the old path. */
export const isGrade1to3 = (grade?: string | null) => {
  const n = parseGradeNumber(grade)
  return n >= 1 && n <= 3
}

/** Learner-facing quest copy — all within the very_young 12-word / 1-sentence ceiling. */
export const QUEST_COPY = {
  next: 'Next',
  start: 'Start',
  keepGoing: 'Keep going',
  done: 'All done for now.',
  /** No task queued, but lessons remain — never say "all done" over a full list. */
  chooseAny: 'Pick any lesson below.',
  home: 'Home',
  lessons: 'Lessons',
  pick: 'Pick a lesson',
  locked: 'Locked',
  /** Row status words. A tick alone is not readable at this age. */
  statusDone: 'Done',
  statusKeepGoing: 'Keep going',
  statusNew: 'New',
} as const
