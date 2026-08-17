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

/** Learner-facing quest copy — all within the very_young 12-word / 1-sentence ceiling. */
export const QUEST_COPY = {
  next: 'Next',
  start: 'Start',
  keepGoing: 'Keep going',
  done: 'All done for now.',
  home: 'Home',
  lessons: 'Lessons',
  pick: 'Pick a lesson',
  locked: 'Locked',
} as const
