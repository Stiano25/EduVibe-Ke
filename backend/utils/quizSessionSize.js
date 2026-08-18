/**
 * Session length vs legacy lesson-bank size.
 * Template-backed quizzes instantiate live twists; they must not inherit
 * targetMainLength from the number of stored seed templates.
 */

export const QUIZ_SOURCE_TEMPLATES = 'templates';
export const QUIZ_SOURCE_FIXED_POOL = 'fixed_pool';

/** Prefer 10 main items; stretch to 12 when a fixed pool is large enough. */
export const SESSION_MAIN_MIN = 10;
export const SESSION_MAIN_MAX = 12;

/** Legacy ceiling for unconverted fixed-pool lessons. Not used on the template path. */
export const BANK_SIZE = 30;

export const isTemplateBackedQuiz = (quiz) => quiz?.source === QUIZ_SOURCE_TEMPLATES;

export const fixedPoolTargetSize = (outcomeCount = 0) =>
  Math.max(SESSION_MAIN_MAX, Math.max(0, Number(outcomeCount) || 0));

export const targetMainLength = (bankSize, { templateBacked = false } = {}) => {
  if (templateBacked) return SESSION_MAIN_MIN;
  if (bankSize <= 0) return 0;
  if (bankSize <= SESSION_MAIN_MIN) return bankSize;
  return Math.min(
    SESSION_MAIN_MAX,
    Math.max(SESSION_MAIN_MIN, Math.min(bankSize, SESSION_MAIN_MAX))
  );
};
