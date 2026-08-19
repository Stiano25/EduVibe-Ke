/**
 * Child-facing Practice Score. Display-only — never feeds BKT, mastery,
 * unlock, or difficulty. First-try scoring stays in adaptiveQuizService.
 */
import { resolveInteractionType } from './interactionTypes.js';
import { expectedScalarForQuestion, parseNumericAnswer } from './expectedScalar.js';
import { isNumericEntryQuestion } from './numericEntry.js';
import { isCountIntoBoxQuestion, expectedCountForQuestion } from './countIntoBox.js';
import { optionDisplayText } from './quizOptions.js';

export const PRACTICE_CREDIT = Object.freeze({
  FIRST_TRY: 1,
  NEAR_MISS: 0.75,
  RETRY: 0.5,
  MISS: 0
});

const qid = (q, i) => q?.id || `q-${i + 1}`;

/**
 * Same digit multiset, different integer, at least two digits.
 * 58 vs 85 → true; 58 vs 58 → false; 7 vs 7 → false.
 */
export const isDigitTransposition = (submitted, expected) => {
  if (submitted == null || expected == null) return false;
  const a = Number(submitted);
  const b = Number(expected);
  if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
  if (a === b) return false;
  const sa = String(Math.abs(a));
  const sb = String(Math.abs(b));
  if (sa.length < 2 || sa.length !== sb.length) return false;
  return [...sa].sort().join('') === [...sb].sort().join('');
};

/** Option text that is itself an integer (plain or $wrapped$). */
export const optionAsInteger = (option) => {
  const text = optionDisplayText(option)
    .trim()
    .replace(/^\$/, '')
    .replace(/\$$/, '')
    .trim();
  return parseNumericAnswer(text);
};

const lookupQuestion = (session, lesson, questionId, snapshot) => {
  const bank = lesson?.quiz?.questions || [];
  const idx = bank.findIndex((q, i) => qid(q, i) === questionId);
  if (idx >= 0) return bank[idx];
  return snapshot || session?.twistedQuestions?.[questionId] || null;
};

const submittedAndExpected = (attempt, question) => {
  if (!question) return { submitted: null, expected: null };
  const type = resolveInteractionType(question.interactionType || question.type);
  if (type === 'numeric_entry' || isNumericEntryQuestion(question)) {
    const submitted = parseNumericAnswer(
      attempt.submittedValue ?? attempt.selectedOptionIndex
    );
    return { submitted, expected: expectedScalarForQuestion(question) };
  }
  if (type === 'drag_to_target' || isCountIntoBoxQuestion(question)) {
    const placed = Number(attempt.placedCount ?? attempt.selectedOptionIndex);
    return {
      submitted: Number.isInteger(placed) ? placed : null,
      expected: expectedCountForQuestion(question)
    };
  }
  const options = question.options || [];
  const order = attempt.optionOrder;
  const displayIdx = Number(attempt.selectedOptionIndex);
  const selectedOriginal =
    Array.isArray(order) && order[displayIdx] !== undefined ? Number(order[displayIdx]) : displayIdx;
  const correctOriginal = Number(question.correctAnswerIndex);
  return {
    submitted: optionAsInteger(options[selectedOriginal]),
    expected: optionAsInteger(options[correctOriginal])
  };
};

const isNearMiss = (attempt, question) => {
  const { submitted, expected } = submittedAndExpected(attempt, question);
  return isDigitTransposition(submitted, expected);
};

/**
 * Per main-phase item (twins excluded). Tiers are mutually exclusive, highest first:
 * first-try correct → 1; first-try near-miss → 0.75 (kept even after a later retry);
 * retry correct → 0.5; else 0.
 */
export const computePracticeScore = (session = {}, lesson = {}) => {
  const answered = session.answered || [];
  const mains = answered.filter((a) => a.phase === 'main');
  const retriesByOriginal = new Map();
  for (const a of answered) {
    if (a.phase !== 'retry') continue;
    const originalId = a.retryFor || a.questionId;
    const list = retriesByOriginal.get(originalId) || [];
    list.push(a);
    retriesByOriginal.set(originalId, list);
  }

  const items = mains.map((attempt) => {
    const question = lookupQuestion(session, lesson, attempt.questionId, attempt.questionSnapshot);
    let credit = PRACTICE_CREDIT.MISS;
    let tier = 'miss';
    if (attempt.correct) {
      credit = PRACTICE_CREDIT.FIRST_TRY;
      tier = 'first_try';
    } else if (isNearMiss(attempt, question)) {
      credit = PRACTICE_CREDIT.NEAR_MISS;
      tier = 'near_miss';
    } else {
      const retries = retriesByOriginal.get(attempt.questionId) || [];
      if (retries.some((r) => r.correct)) {
        credit = PRACTICE_CREDIT.RETRY;
        tier = 'retry';
      }
    }
    return { questionId: attempt.questionId, credit, tier };
  });

  const total = items.length;
  const creditSum = items.reduce((sum, item) => sum + item.credit, 0);
  const percentage = total > 0 ? Math.round((creditSum / total) * 100) : 0;
  return {
    percentage,
    total,
    creditSum,
    items
  };
};
