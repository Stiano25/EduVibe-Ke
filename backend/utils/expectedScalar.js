/**
 * Scalar (numeric) expected-answer helpers for drag_to_target and numeric_entry.
 * Grading is formula + params, then a simple integer parse of the submission.
 */
import { compileFormula } from './additionTemplate.js';

const asInt = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) ? n : fallback;
};

/** Trim + leading-zero strip. "06" → 6. Empty / non-digits → null. */
export const parseNumericAnswer = (raw) => {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : null;
};

export const expectedScalarForQuestion = (question = {}) => {
  const params = question.params && typeof question.params === 'object' ? question.params : {};
  const formula = String(question.answerFormula || '').trim();
  if (formula) {
    try {
      const value = compileFormula(formula)(params);
      if (Number.isInteger(value) && value >= 0) return value;
    } catch {
      /* fall through */
    }
  }
  if (Number.isInteger(Number(params.target))) return Number(params.target);
  if (Number.isInteger(Number(params.answer))) return Number(params.answer);
  const a = asInt(params.a, NaN);
  const b = asInt(params.b, NaN);
  if (Number.isInteger(a) && Number.isInteger(b)) return a + b;
  return null;
};
