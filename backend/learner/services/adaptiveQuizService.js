/**
 * Adaptive one-by-one quiz session over a lesson question bank.
 * Main path: 10–12 items served from a ~30-question bank.
 * Failed items get one retry at the end — preferring a SIBLING question
 * (same outcome, same-or-lower bloom, unseen) over verbatim replay.
 * Selection uses mastery + bloom + modality (scaffold-then-ease).
 */

const BLOOM_ORDER = ['recall', 'understand', 'apply', 'reason'];
const MODALITIES = ['visual', 'text_steps', 'practice'];

const qid = (q, i) => q.id || `q-${i + 1}` || `question-${i}`;

const bloomIndex = (b) => {
  const i = BLOOM_ORDER.indexOf(b);
  return i >= 0 ? i : 1;
};

const dropBloom = (b) => BLOOM_ORDER[Math.max(0, bloomIndex(b) - 1)];

const asModality = (m) => (MODALITIES.includes(m) ? m : 'practice');

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const targetMainLength = (bankSize) => {
  if (bankSize <= 0) return 0;
  if (bankSize <= 10) return bankSize;
  // Prefer 10, stretch to 12 when bank allows
  return Math.min(12, Math.max(10, Math.min(bankSize, 12)));
};

const masteryByKey = (masteryRows = []) => {
  const map = new Map();
  for (const m of masteryRows) {
    if (m?.learningOutcomeKey) map.set(m.learningOutcomeKey, m);
  }
  return map;
};

const outcomeKeyOf = (q, lesson) => {
  if (q.learningOutcomeKey) return q.learningOutcomeKey;
  const text =
    lesson.learningObjectives?.[(q.learningOutcomeIndex || 1) - 1] ||
    q.skillFocus ||
    '';
  return text || 'general';
};

const publicQuestion = (q, indexInBank) => {
  if (!q) return null;
  return {
    id: qid(q, indexInBank),
    question: q.question,
    type: q.type || 'multiple-choice',
    options: q.options || [],
    points: q.points || 15,
    skillFocus: q.skillFocus,
    bloomLevel: q.bloomLevel,
    modality: q.modality,
    diagramBriefId: q.diagramBriefId || null,
    steps: q.steps || undefined,
    learningOutcomeIndex: q.learningOutcomeIndex,
    learningOutcomeKey: q.learningOutcomeKey,
    // Never send correctAnswerIndex during live attempt
  };
};

const findBankIndex = (bank, questionId) =>
  bank.findIndex((q, i) => qid(q, i) === questionId);

/**
 * Score candidates for next main-path item.
 */
const pickNextMain = (session, lesson, masteryMap, preferredModality) => {
  const bank = lesson.quiz?.questions || [];
  const used = new Set(session.usedIds);
  const last = session.lastAttempt;

  let preferredBloom = null;
  let preferredOutcome = null;
  let preferScaffold = false;

  if (last && !last.correct) {
    preferredOutcome = last.learningOutcomeKey;
    preferScaffold = ['reason', 'apply'].includes(last.bloomLevel);
    preferredBloom = preferScaffold
      ? last.bloomLevel
      : dropBloom(last.bloomLevel || 'apply');
    if (session.outcomeFailStreak[preferredOutcome] >= 2) {
      preferredBloom = dropBloom(preferredBloom || 'understand');
    }
  }

  // Uncovered outcomes first
  const outcomeKeys = [
    ...new Set(bank.map((q) => outcomeKeyOf(q, lesson)).filter(Boolean))
  ];
  const uncovered = outcomeKeys.filter((k) => !session.coveredOutcomes.includes(k));

  const candidates = bank
    .map((q, i) => ({ q, i, id: qid(q, i) }))
    .filter((c) => !used.has(c.id));

  if (candidates.length === 0) return null;

  const score = (c) => {
    let s = 0;
    const ok = outcomeKeyOf(c.q, lesson);
    const bloom = c.q.bloomLevel || 'understand';
    const mod = asModality(c.q.modality);
    const mastery = masteryMap.get(ok);

    if (uncovered.length && uncovered.includes(ok)) s += 50;
    if (preferredOutcome && ok === preferredOutcome) s += 40;
    if (preferScaffold && mod === 'text_steps' && ok === preferredOutcome) s += 35;
    if (preferredBloom && bloom === preferredBloom) s += 20;
    if (preferredBloom && bloomIndex(bloom) <= bloomIndex(preferredBloom)) s += 8;

    if (mastery?.status === 'scaffolding' || mastery?.status === 'struggling') {
      if (mod === 'text_steps' || mod === 'visual') s += 15;
      if (bloomIndex(bloom) <= 1) s += 10;
    } else if (mastery?.status === 'mastered' || mastery?.status === 'developing') {
      if (bloomIndex(bloom) >= 2) s += 10;
    }

    if (preferredModality && preferredModality !== 'mixed' && mod === preferredModality) {
      s += 5;
    }

    s += Math.random() * 3;
    return s;
  };

  candidates.sort((a, b) => score(b) - score(a));
  return candidates[0];
};

/**
 * Retry pick: prefer a SIBLING of the failed question — same outcome,
 * same-or-lower bloom, not yet seen — so the learner proves the skill on a
 * fresh item instead of memorizing the answer. Falls back to verbatim replay.
 */
const pickRetryQuestion = (bank, lesson, session, originalId) => {
  const oIdx = findBankIndex(bank, originalId);
  if (oIdx < 0) return null;
  const original = bank[oIdx];
  const outcome = outcomeKeyOf(original, lesson);
  const oBloom = bloomIndex(original.bloomLevel || 'understand');
  const seen = new Set([
    ...(session.usedIds || []),
    ...(session.retryDoneIds || []),
    ...(session.retryServedIds || [])
  ]);

  const siblings = bank
    .map((q, i) => ({ q, i, id: qid(q, i) }))
    .filter(
      (c) =>
        c.id !== originalId &&
        !seen.has(c.id) &&
        outcomeKeyOf(c.q, lesson) === outcome &&
        bloomIndex(c.q.bloomLevel || 'understand') <= oBloom
    );

  if (siblings.length > 0) {
    // Closest bloom first; prefer a text_steps scaffold on ties
    siblings.sort((a, b) => {
      const da = oBloom - bloomIndex(a.q.bloomLevel || 'understand');
      const db = oBloom - bloomIndex(b.q.bloomLevel || 'understand');
      if (da !== db) return da - db;
      const sa = asModality(a.q.modality) === 'text_steps' ? 0 : 1;
      const sb = asModality(b.q.modality) === 'text_steps' ? 0 : 1;
      return sa - sb;
    });
    return siblings[0];
  }
  return { q: original, i: oIdx, id: originalId };
};

/** Serve the next retry item; records which failed id it answers for. */
const serveRetry = (bank, lesson, session) => {
  const originalId = session.failQueue[0];
  const next = pickRetryQuestion(bank, lesson, session, originalId);
  if (!next) return null;
  session.currentRetryFor = originalId;
  session.retryServedIds = [...(session.retryServedIds || []), next.id];
  return next;
};

export const createAdaptiveSession = ({
  lesson,
  preferredModality = 'mixed',
  masteryRows = []
}) => {
  const bank = lesson.quiz?.questions || [];
  const mainTarget = targetMainLength(bank.length);
  const session = {
    lessonId: lesson.id,
    phase: 'main', // main | retry | done
    mainTarget,
    mainAnswered: 0,
    usedIds: [],
    failQueue: [],
    retryDoneIds: [],
    retryServedIds: [],
    currentRetryFor: null,
    coveredOutcomes: [],
    answered: [],
    outcomeFailStreak: {},
    lastAttempt: null,
    preferredModality,
    scoreCorrect: 0,
    scoreTotal: 0
  };

  const masteryMap = masteryByKey(masteryRows);
  const first = pickNextMain(session, lesson, masteryMap, preferredModality);
  if (!first) {
    return {
      session: { ...session, phase: 'done' },
      question: null,
      meta: { phase: 'done', progressLabel: 'No questions', done: true }
    };
  }

  session.currentQuestionId = first.id;
  return {
    session,
    question: publicQuestion(first.q, first.i),
    meta: {
      phase: 'main',
      mainAnswered: 0,
      mainTarget,
      failQueued: 0,
      progressLabel: `Question 1 of ${mainTarget}`,
      done: false
    }
  };
};

/**
 * Apply an answer and return next question (or done + review payload).
 */
export const advanceAdaptiveSession = ({
  session: rawSession,
  lesson,
  selectedOptionIndex,
  masteryRows = []
}) => {
  const bank = lesson.quiz?.questions || [];
  const session = {
    ...rawSession,
    usedIds: [...(rawSession.usedIds || [])],
    failQueue: [...(rawSession.failQueue || [])],
    retryDoneIds: [...(rawSession.retryDoneIds || [])],
    retryServedIds: [...(rawSession.retryServedIds || [])],
    coveredOutcomes: [...(rawSession.coveredOutcomes || [])],
    answered: [...(rawSession.answered || [])],
    outcomeFailStreak: { ...(rawSession.outcomeFailStreak || {}) }
  };

  const currentId = session.currentQuestionId;
  const idx = findBankIndex(bank, currentId);
  if (idx < 0) {
    throw new Error('Current question not found in bank');
  }
  const question = bank[idx];
  const selected = Number(selectedOptionIndex);
  const correct = selected === Number(question.correctAnswerIndex);
  const learningOutcomeKey = outcomeKeyOf(question, lesson);
  const bloomLevel = question.bloomLevel || 'understand';
  const phase = session.phase === 'retry' ? 'retry' : 'main';

  const answerRecord = {
    questionId: currentId,
    selectedOptionIndex: selected,
    correct,
    phase,
    learningOutcomeKey,
    bloomLevel,
    modality: question.modality || null,
    skillFocus: question.skillFocus || null
  };

  session.answered.push(answerRecord);
  session.scoreTotal += 1;
  if (correct) session.scoreCorrect += 1;

  session.lastAttempt = answerRecord;

  if (!session.coveredOutcomes.includes(learningOutcomeKey)) {
    session.coveredOutcomes.push(learningOutcomeKey);
  }

  if (!correct) {
    session.outcomeFailStreak[learningOutcomeKey] =
      (session.outcomeFailStreak[learningOutcomeKey] || 0) + 1;
    if (phase === 'main' && !session.failQueue.includes(currentId)) {
      session.failQueue.push(currentId);
    }
  } else {
    session.outcomeFailStreak[learningOutcomeKey] = 0;
  }

  if (phase === 'main') {
    if (!session.usedIds.includes(currentId)) session.usedIds.push(currentId);
    session.mainAnswered += 1;
  } else {
    // A sibling may have been served for the failed question — clear the
    // ORIGINAL failed id, not just the served one.
    const retryFor = session.currentRetryFor || currentId;
    session.retryDoneIds.push(retryFor);
    session.failQueue = session.failQueue.filter(
      (id) => id !== retryFor && id !== currentId
    );
    session.currentRetryFor = null;
  }

  const masteryMap = masteryByKey(masteryRows);
  const percentage =
    session.scoreTotal > 0
      ? Math.round((session.scoreCorrect / session.scoreTotal) * 100)
      : 0;

  // Decide next
  let next = null;
  let nextPhase = session.phase;

  if (session.phase === 'main') {
    const mainDone = session.mainAnswered >= session.mainTarget;
    const noMoreUnused = bank.every((q, i) => session.usedIds.includes(qid(q, i)));
    if (mainDone || noMoreUnused) {
      if (session.failQueue.length > 0) {
        nextPhase = 'retry';
        session.phase = 'retry';
        next = serveRetry(bank, lesson, session);
      } else {
        nextPhase = 'done';
        session.phase = 'done';
      }
    } else {
      next = pickNextMain(session, lesson, masteryMap, session.preferredModality);
      if (!next) {
        if (session.failQueue.length > 0) {
          nextPhase = 'retry';
          session.phase = 'retry';
          next = serveRetry(bank, lesson, session);
          if (!next) {
            nextPhase = 'done';
            session.phase = 'done';
          }
        } else {
          nextPhase = 'done';
          session.phase = 'done';
        }
      }
    }
  } else if (session.phase === 'retry') {
    if (session.failQueue.length > 0) {
      next = serveRetry(bank, lesson, session);
      if (!next) {
        nextPhase = 'done';
        session.phase = 'done';
      }
    } else {
      nextPhase = 'done';
      session.phase = 'done';
    }
  }

  if (next) {
    session.currentQuestionId = next.id;
    session.phase = nextPhase === 'retry' ? 'retry' : 'main';
  } else {
    session.currentQuestionId = null;
    session.phase = 'done';
  }

  const done = session.phase === 'done';
  const retryTotal = (session.failQueue?.length || 0) + (session.retryDoneIds?.length || 0);
  const retryIndex = session.retryDoneIds.length + (session.phase === 'retry' ? 1 : 0);

  let progressLabel = '';
  if (done) {
    progressLabel = 'Complete';
  } else if (session.phase === 'retry') {
    progressLabel = `Retry ${Math.min(retryIndex, Math.max(retryTotal, 1))} of ${Math.max(retryTotal, 1)}`;
  } else {
    progressLabel = `Question ${session.mainAnswered + 1} of ${session.mainTarget}`;
  }

  const reviewPayload = done
    ? {
        answered: session.answered,
        score: {
          correct: session.scoreCorrect,
          total: session.scoreTotal,
          percentage
        },
        completedAt: new Date().toISOString()
      }
    : null;

  return {
    session,
    question: next ? publicQuestion(next.q, next.i) : null,
    lastAnswer: {
      ...answerRecord,
      correctAnswerIndex: question.correctAnswerIndex,
      explanation: question.explanation,
      optionExplanations: question.optionExplanations
    },
    meta: {
      phase: session.phase,
      mainAnswered: session.mainAnswered,
      mainTarget: session.mainTarget,
      failQueued: session.failQueue.length,
      progressLabel,
      done,
      score: {
        correct: session.scoreCorrect,
        total: session.scoreTotal,
        percentage
      }
    },
    review: reviewPayload,
    // For skill attempt recording
    attemptContext: {
      question,
      questionId: currentId,
      selected,
      correct,
      learningOutcomeKey,
      bloomLevel
    }
  };
};

/** Full review view: all answered items with choices + corrections (all at once). */
export const buildReviewView = (lesson, sessionReview) => {
  const bank = lesson.quiz?.questions || [];
  const answered = sessionReview?.answered || [];
  // Prefer last attempt per questionId for display (retry overwrites)
  const byId = new Map();
  for (const a of answered) {
    byId.set(a.questionId, a);
  }

  const items = [];
  for (const [questionId, a] of byId.entries()) {
    const idx = findBankIndex(bank, questionId);
    if (idx < 0) continue;
    const q = bank[idx];
    items.push({
      id: questionId,
      question: q.question,
      options: q.options || [],
      correctAnswerIndex: q.correctAnswerIndex,
      selectedOptionIndex: a.selectedOptionIndex,
      correct: a.correct,
      explanation: q.explanation,
      optionExplanations: q.optionExplanations,
      feedbackCorrect: q.feedbackCorrect,
      feedbackIncorrect: q.feedbackIncorrect,
      modality: q.modality,
      steps: q.steps,
      diagramBriefId: q.diagramBriefId,
      skillFocus: q.skillFocus,
      bloomLevel: q.bloomLevel,
      phase: a.phase
    });
  }

  return {
    items,
    score: sessionReview?.score || null,
    completedAt: sessionReview?.completedAt || null
  };
};
