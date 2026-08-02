/**
 * Cheap token-overlap Jaccard similarity — no external dependency.
 */

const normalizeStemKey = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();

const tokenSet = (text) => {
  const tokens = normalizeStemKey(text)
    .split(' ')
    .filter((t) => t.length > 1);
  return new Set(tokens);
};

/** Jaccard token overlap in [0, 1]. */
export const tokenOverlapRatio = (a, b) => {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
};

/** Conservative threshold for past-paper near-copy detection. Tunable. */
export const QUIZ_EXEMPLAR_NEAR_DUP_THRESHOLD = 0.85;
