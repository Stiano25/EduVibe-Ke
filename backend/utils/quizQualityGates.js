/**
 * Mechanical quiz QA that does not depend on the LLM pass.
 *
 * 1. Answer-in-stem: the correct option is already printed in the question.
 * 2. Concept repetition: too many items in one bank test the same idea, even
 *    when wording differs (the stem-overlap detector misses this).
 *
 * Flags for review. Never auto-deletes.
 */
import { resolveInteractionType } from './interactionTypes.js';

export const MAX_QUESTIONS_PER_CONCEPT = 2;

const NUMBER_WORDS = Object.freeze({
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50
});

const STOP = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'on',
  'is',
  'are',
  'what',
  'which',
  'how',
  'many',
  'does',
  'do',
  'has',
  'have',
  'his',
  'her',
  'their',
  'now',
  'then',
  'with',
  'from'
]);

const stripLatex = (s = '') =>
  String(s)
    .replace(/\$/g, '')
    .replace(/\\[a-z]+/gi, ' ')
    .toLowerCase();

const parseNumberToken = (raw) => {
  const t = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[,.]/g, '');
  if (!t) return null;
  if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS, t)) return NUMBER_WORDS[t];
  if (/^\d+$/.test(t)) return Number(t);
  return null;
};

const extractNumbers = (text) => {
  const cleaned = stripLatex(text).replace(
    /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)-[a-z]+/g,
    ' '
  );
  const tokens = cleaned.match(/[a-z0-9]+/g) || [];
  const nums = [];
  for (const tok of tokens) {
    const n = parseNumberToken(tok);
    if (n != null) nums.push(n);
  }
  return nums;
};

/**
 * True when the correct option is already present in the stem as a number
 * token or as the option's own phrase.
 */
export const answerAppearsInStem = (stem, correctOption) => {
  const option = String(correctOption || '').trim();
  if (!option) return false;
  const stemNorm = stripLatex(stem);
  const optNorm = stripLatex(option).replace(/[{}]/g, '').trim();
  if (!optNorm) return false;

  const asNumber =
    parseNumberToken(optNorm.replace(/\s+/g, '')) ?? parseNumberToken(optNorm);
  if (asNumber != null && extractNumbers(stemNorm).includes(asNumber)) return true;

  if (optNorm.length >= 4 && /[a-z]/.test(optNorm)) {
    const compact = (s) =>
      s
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const stemC = compact(stemNorm);
    const optC = compact(optNorm);
    if (optC && stemC.includes(optC)) return true;
  }

  return false;
};

export const conceptFamily = (stem = '', { correctOption = null } = {}) => {
  const t = stripLatex(stem);
  if (
    /\btwice\b/.test(t) ||
    /either end/.test(t) ||
    /does the count change/.test(t) ||
    /forward then backward/.test(t)
  ) {
    return 'count_order_invariance';
  }
  if (
    correctOption != null &&
    answerAppearsInStem(stem, correctOption) &&
    /how many/.test(t)
  ) {
    return 'readback_subset_count';
  }
  const words = t
    .replace(/\$?\d+\$?/g, 'n')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  return words.slice(0, 6).join('_') || 'untagged';
};

const conceptGroupKey = (question) => {
  const loi = Number(question.learningOutcomeIndex);
  const options = Array.isArray(question.options) ? question.options : [];
  const idx = Math.min(Math.max(Number(question.correctAnswerIndex) || 0, 0), Math.max(options.length - 1, 0));
  const family = conceptFamily(question.question || '', { correctOption: options[idx] });
  const known = family === 'count_order_invariance' || family === 'readback_subset_count';
  if (known) return `${Number.isFinite(loi) ? loi : 0}::${family}`;
  const skill = String(question.skillFocus || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 80);
  return `${Number.isFinite(loi) ? loi : 0}::${skill}::${family}`;
};

const appendIssue = (question, issue) => {
  const prev = String(question.qa_issue || '').trim();
  const next = prev ? `${prev}; ${issue}` : issue;
  question.qa_flagged = true;
  question.qa_issue = next.slice(0, 280);
};

/**
 * Flag MCQs whose correct option is already in the stem.
 * Drag-to-target items have no option list and are skipped.
 */
export const flagAnswerInStemQuestions = (questions = []) => {
  let flagged = 0;
  for (const q of questions) {
    const interaction = resolveInteractionType(q.interactionType || q.type);
    if (interaction === 'drag_to_target' || interaction === 'numeric_entry') continue;
    const options = Array.isArray(q.options) ? q.options : [];
    if (!options.length) continue;
    const idx = Math.min(Math.max(Number(q.correctAnswerIndex) || 0, 0), options.length - 1);
    if (answerAppearsInStem(q.question, options[idx])) {
      appendIssue(q, 'answer appears in stem');
      flagged += 1;
    }
  }
  return flagged;
};

/**
 * Flag extras when more than MAX_QUESTIONS_PER_CONCEPT share the same
 * (learningOutcomeIndex, concept family). Keeps the first two; flags the rest.
 */
export const flagConceptRepetition = (
  questions = [],
  { maxPerConcept = MAX_QUESTIONS_PER_CONCEPT } = {}
) => {
  const buckets = new Map();
  questions.forEach((q, i) => {
    const options = Array.isArray(q.options) ? q.options : [];
    const idx = Math.min(
      Math.max(Number(q.correctAnswerIndex) || 0, 0),
      Math.max(options.length - 1, 0)
    );
    const family = conceptFamily(q.question || '', { correctOption: options[idx] });
    const key = conceptGroupKey(q);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push({ q, i, family });
  });
  let flagged = 0;
  for (const [, group] of buckets) {
    if (group.length <= maxPerConcept) continue;
    const family = group[0].family;
    if (family === 'untagged') continue;
    const known = family === 'count_order_invariance' || family === 'readback_subset_count';
    if (!known) continue;
    for (const extra of group.slice(maxPerConcept)) {
      appendIssue(extra.q, `concept repetition: ${family} (${group.length} in this bank)`);
      flagged += 1;
    }
  }
  return flagged;
};

/** In-place. Returns { answerInStem, conceptRepetition }. */
export const applyQuizQualityGates = (questions = []) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { answerInStem: 0, conceptRepetition: 0 };
  }
  const answerInStem = flagAnswerInStemQuestions(questions);
  const conceptRepetition = flagConceptRepetition(questions);
  return { answerInStem, conceptRepetition };
};
