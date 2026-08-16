/**
 * Grade bands shared by generation ceilings and learner presentation.
 * Keep in lockstep with COMPLEXITY_BANDS in lessonGenerationService.js:
 *   very_young ≤ 2, young ≤ 5, pre_teen ≤ 8, teen 9+.
 */

export const parseGradeNumber = (grade) => {
  if (grade === 'K' || grade === 'k') return 0;
  const n = parseInt(grade, 10);
  return Number.isFinite(n) ? n : NaN;
};

export const complexityBandKey = (grade) => {
  const n = parseGradeNumber(grade);
  if (!Number.isFinite(n)) return 'teen';
  if (n <= 2) return 'very_young';
  if (n <= 5) return 'young';
  if (n <= 8) return 'pre_teen';
  return 'teen';
};

/** Quest nav is for the very_young and young bands only (Grade 5 and below). */
export const usesQuestNavigation = (grade) => {
  const n = parseGradeNumber(grade);
  return Number.isFinite(n) && n <= 5;
};
