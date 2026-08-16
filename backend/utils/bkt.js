/**
 * Four-parameter Bayesian Knowledge Tracing (BKT-lite).
 * Deterministic; no LLM. Twin pairs are one observation with a pair likelihood.
 */
export const BKT_DEFAULTS = Object.freeze({
  pL0: 0.3,
  pT: 0.3,
  pS: 0.1,
  pG: 0.2
});

const clamp01 = (p) => Math.min(1 - 1e-9, Math.max(1e-9, Number(p) || 0));

const posteriorThenLearn = (pL, likeKnow, likeUnk, pT) => {
  const pK = clamp01(pL);
  const pU = 1 - pK;
  const pObs = pK * likeKnow + pU * likeUnk;
  const posterior = pObs <= 0 ? pK : (pK * likeKnow) / pObs;
  return clamp01(posterior + (1 - posterior) * pT);
};

/** Single attempt: observe correct/incorrect, then apply P(T). */
export const updateAfterObservation = (pL, correct, { pS, pG, pT } = BKT_DEFAULTS) => {
  const S = clamp01(pS);
  const G = clamp01(pG);
  if (correct) {
    return posteriorThenLearn(pL, 1 - S, G, pT);
  }
  return posteriorThenLearn(pL, S, 1 - G, pT);
};

/**
 * Complete twin pair as one opportunity.
 * Consistent both-correct / both-wrong is stronger than a single attempt
 * (likelihood is the product). Inconsistency is the slip/guess diagnostic.
 */
export const updateAfterTwinPair = (
  pL,
  originalCorrect,
  twistCorrect,
  { pS, pG, pT } = BKT_DEFAULTS
) => {
  const S = clamp01(pS);
  const G = clamp01(pG);
  let likeK;
  let likeU;
  if (originalCorrect && twistCorrect) {
    likeK = (1 - S) * (1 - S);
    likeU = G * G;
  } else if (!originalCorrect && !twistCorrect) {
    likeK = S * S;
    likeU = (1 - G) * (1 - G);
  } else {
    likeK = 2 * S * (1 - S);
    likeU = 2 * G * (1 - G);
  }
  return posteriorThenLearn(pL, likeK, likeU, pT);
};

const pairCorrectness = (a, b) => {
  const orig = a.twinRole === 'twist' ? b : a;
  const twist = a.twinRole === 'twist' ? a : b;
  return { originalCorrect: !!orig.correct, twistCorrect: !!twist.correct };
};

/**
 * Replay attempts oldest-first. A completed twin pair is one update;
 * unpaired attempts (including an original waiting for its twist) are singles.
 */
export const replayBkt = (attemptsOldestFirst, params = BKT_DEFAULTS) => {
  const pL0 = clamp01(params.pL0 ?? BKT_DEFAULTS.pL0);
  const pT = clamp01(params.pT ?? BKT_DEFAULTS.pT);
  const pS = clamp01(params.pS ?? BKT_DEFAULTS.pS);
  const pG = clamp01(params.pG ?? BKT_DEFAULTS.pG);
  const cfg = { pT, pS, pG };

  const list = Array.isArray(attemptsOldestFirst) ? attemptsOldestFirst : [];
  const byPair = new Map();
  for (const a of list) {
    if (!a?.twinPairId) continue;
    if (!byPair.has(a.twinPairId)) byPair.set(a.twinPairId, []);
    byPair.get(a.twinPairId).push(a);
  }

  const consumed = new Set();
  let pL = pL0;
  let n = 0;

  for (const a of list) {
    if (consumed.has(a.id || a)) continue;
    const pairId = a.twinPairId;
    const mates = pairId ? byPair.get(pairId) || [] : [];
    if (pairId && mates.length >= 2) {
      const [first, second] = mates;
      consumed.add(first.id || first);
      consumed.add(second.id || second);
      const { originalCorrect, twistCorrect } = pairCorrectness(first, second);
      pL = updateAfterTwinPair(pL, originalCorrect, twistCorrect, cfg);
      n += 1;
      continue;
    }
    consumed.add(a.id || a);
    pL = updateAfterObservation(pL, !!a.correct, cfg);
    n += 1;
  }

  return { pKnow: pL, observations: n, params: { pL0, pT, pS, pG } };
};
