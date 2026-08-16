/**
 * Short live-flash phrases. Separate from stored feedbackCorrect /
 * feedbackIncorrect ("Well done!" / "Review this skill and try again."),
 * which stay unused on the learner path.
 *
 * Grade cutoffs match backend COMPLEXITY_BANDS (very_young ≤2, young ≤5).
 */
export const quizFlashCopy = (grade?: string | number | null): { correct: string; incorrect: string } => {
  const n = grade === 'K' || grade === 'k' ? 0 : Number(grade)
  const young = !Number.isFinite(n) || n <= 5
  return young
    ? { correct: 'Yes!', incorrect: 'Try again' }
    : { correct: 'Correct', incorrect: 'Not this one' }
}
