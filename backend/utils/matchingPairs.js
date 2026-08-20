/**
 * matching_pairs: left items paired to right items.
 * correctPairs use canonical (unshuffled) right indices: [leftIndex, rightIndex].
 */

const asText = (value) => String(value == null ? '' : value).trim();

export const isMatchingPairsQuestion = (q = {}) => {
  const type = String(q.interactionType || q.type || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  return type === 'matching_pairs' || type === 'matchingpairs';
};

const uniqueInts = (values, max) => {
  const seen = new Set();
  const out = [];
  for (const raw of values) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n >= max || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
};

export const normalizeMatchingPairs = (q = {}) => {
  const leftSrc = Array.isArray(q.left)
    ? q.left
    : Array.isArray(q.params?.left)
      ? q.params.left
      : [];
  const rightSrc = Array.isArray(q.right)
    ? q.right
    : Array.isArray(q.params?.right)
      ? q.params.right
      : [];
  const left = leftSrc.map(asText).filter(Boolean);
  const right = rightSrc.map(asText).filter(Boolean);
  if (left.length < 2 || right.length < 2 || left.length !== right.length) {
    return { ok: false, reason: 'matching_pairs needs 2+ equal left and right items' };
  }
  const n = left.length;
  let pairs = Array.isArray(q.correctPairs)
    ? q.correctPairs
    : Array.isArray(q.params?.correctPairs)
      ? q.params.correctPairs
      : [];
  pairs = pairs
    .map((pair) => {
      if (Array.isArray(pair) && pair.length >= 2) return [Number(pair[0]), Number(pair[1])];
      if (pair && typeof pair === 'object') {
        return [Number(pair.left ?? pair.l), Number(pair.right ?? pair.r)];
      }
      return null;
    })
    .filter((pair) => pair && Number.isInteger(pair[0]) && Number.isInteger(pair[1]));
  if (pairs.length !== n) {
    pairs = left.map((_, i) => [i, i]);
  }
  const lefts = uniqueInts(pairs.map((p) => p[0]), n);
  const rights = uniqueInts(pairs.map((p) => p[1]), n);
  if (lefts.length !== n || rights.length !== n) {
    pairs = left.map((_, i) => [i, i]);
  }
  return {
    ok: true,
    left,
    right,
    correctPairs: pairs
  };
};

export const shuffleRightOrder = (n, random = Math.random) => {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  if (n > 1 && order.every((orig, display) => orig === display)) {
    const last = order[n - 1];
    order[n - 1] = order[0];
    order[0] = last;
  }
  return order;
};

/**
 * submittedPairs: [leftIndex, displayRightIndex] in display space.
 * rightOrder: order[display] = canonical right index.
 */
export const gradeMatchingPairs = ({
  correctPairs = [],
  submittedPairs = [],
  rightOrder = null
} = {}) => {
  const total = correctPairs.length;
  const expected = new Set(correctPairs.map(([l, r]) => `${l}:${r}`));
  let matched = 0;
  const canonicalSubmitted = [];
  for (const pair of Array.isArray(submittedPairs) ? submittedPairs : []) {
    const left = Number(Array.isArray(pair) ? pair[0] : pair?.left);
    const displayRight = Number(Array.isArray(pair) ? pair[1] : pair?.right);
    if (!Number.isInteger(left) || !Number.isInteger(displayRight)) continue;
    const canonicalRight =
      Array.isArray(rightOrder) && rightOrder[displayRight] !== undefined
        ? Number(rightOrder[displayRight])
        : displayRight;
    canonicalSubmitted.push([left, canonicalRight]);
    if (expected.has(`${left}:${canonicalRight}`)) matched += 1;
  }
  return {
    matched,
    total,
    correct: total > 0 && matched === total,
    ratio: total > 0 ? matched / total : 0,
    submittedCanonical: canonicalSubmitted
  };
};
