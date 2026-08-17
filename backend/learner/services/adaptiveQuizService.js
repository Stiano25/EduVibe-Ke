import { randomUUID } from 'node:crypto';
import { twistAdditionQuestion } from '../../utils/additionTemplate.js';
import { resolveInteractionType } from '../../utils/interactionTypes.js';
import {
  expectedCountForQuestion,
  isCountIntoBoxQuestion,
  twistCountIntoBoxQuestion
} from '../../utils/countIntoBox.js';
import {
  expectedScalarForQuestion,
  parseNumericAnswer
} from '../../utils/expectedScalar.js';
import {
  isNumericEntryQuestion,
  twistNumericEntryQuestion
} from '../../utils/numericEntry.js';
import {
  hasIntegerAddends,
  resolveAdditionLayout,
  resolveScaffoldCarry,
  verticalAdditionInstruction
} from '../../utils/additionLayout.js';
import { additionWorkedSteps } from '../../utils/additionWorkedExample.js';
import { normalizeQuizOption } from '../../utils/quizOptions.js';

const BLOOM_ORDER = ['recall', 'understand', 'apply', 'reason'];
const MODALITIES = ['visual', 'text_steps', 'practice'];
/** Modest nudge toward easier/harder items by mastery — keep low vs outcome/bloom bonuses. */
const DIFFICULTY_MATCH_BONUS = 5;
/**
 * Combined modality signal: per-outcome evidence, else global preferred (cold-start).
 * Modest by design — UI does not claim a majority “learning style” mix.
 */
const MODALITY_MATCH_BONUS = 8;
/** Placeholder heuristics until real Grade 1 Addition timing data is available. */
export const TWIN_TIMING_HEURISTIC = Object.freeze({
  minimumBaselineSamples: 2,
  fastRatio: 0.35,
  coldStartMs: 1200,
  interveningMainQuestions: 2
});

const asResponseTimeMs = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), 3600000) : null;
};

const isAdditionTemplateQuestion = (question) =>
  question?.template === true &&
  question?.constraints?.operation === 'addition' &&
  question?.params &&
  Number.isFinite(Number(question.params.a)) &&
  Number.isFinite(Number(question.params.b));

const qid = (q, i) => q.id || `q-${i + 1}` || `question-${i}`;

const bloomIndex = (b) => {
  const i = BLOOM_ORDER.indexOf(b);
  return i >= 0 ? i : 1;
};

const dropBloom = (b) => BLOOM_ORDER[Math.max(0, bloomIndex(b) - 1)];

const asModality = (m) => (MODALITIES.includes(m) ? m : 'practice');

/** Fisher–Yates shuffle of indices [0..n). */
const shuffleIndices = (n) => {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return order;
};

/**
 * Shuffle MCQ options so the correct answer is not always A.
 * Returns display-space options + remapped correct index; `order[display] = original`.
 */
export const shuffleQuestionOptions = (q = {}) => {
  const options = Array.isArray(q.options) ? q.options.map(normalizeQuizOption) : [];
  const n = options.length;
  if (n < 2) {
    return {
      options,
      correctAnswerIndex: Number(q.correctAnswerIndex) || 0,
      optionExplanations: Array.isArray(q.optionExplanations)
        ? q.optionExplanations
        : undefined,
      order: options.map((_, i) => i)
    };
  }
  const order = shuffleIndices(n);
  const bankCorrect = Math.min(
    Math.max(Number(q.correctAnswerIndex) || 0, 0),
    n - 1
  );
  const explanations = Array.isArray(q.optionExplanations) ? q.optionExplanations : null;
  return {
    options: order.map((oi) => options[oi]),
    correctAnswerIndex: order.indexOf(bankCorrect),
    optionExplanations: explanations
      ? order.map((oi) => explanations[oi] ?? '')
      : undefined,
    order
  };
};

const applyStoredOrder = (q, order) => {
  const options = Array.isArray(q.options) ? q.options.map(normalizeQuizOption) : [];
  if (!Array.isArray(order) || order.length !== options.length) {
    return {
      options,
      correctAnswerIndex: Number(q.correctAnswerIndex) || 0,
      optionExplanations: q.optionExplanations
    };
  }
  const bankCorrect = Math.min(
    Math.max(Number(q.correctAnswerIndex) || 0, 0),
    Math.max(options.length - 1, 0)
  );
  const explanations = Array.isArray(q.optionExplanations) ? q.optionExplanations : null;
  return {
    options: order.map((oi) => options[oi]),
    correctAnswerIndex: order.indexOf(bankCorrect),
    optionExplanations: explanations
      ? order.map((oi) => explanations[oi] ?? '')
      : q.optionExplanations
  };
};

const publicNumericFields = (q) => {
  if (!hasIntegerAddends(q.params)) return {};
  const a = Number(q.params.a);
  const b = Number(q.params.b);
  const layout = resolveAdditionLayout(q.params.layout);
  const scaffoldCarry = resolveScaffoldCarry(q.params.scaffoldCarry, { layout });
  const worked =
    q.modality === 'text_steps' && layout === 'vertical' ? additionWorkedSteps(a, b) : null;
  return {
    layout,
    addends: { a, b },
    scaffoldCarry,
    ...(worked ? { workedSteps: worked.map(({ id, text, reveal }) => ({ id, text, reveal })) } : {}),
    ...(layout === 'vertical' ? { question: verticalAdditionInstruction(q.question) } : {})
  };
};

const publicQuestion = (q, indexInBank, session = null) => {
  if (!q) return null;
  const id = qid(q, indexInBank);
  const shuffled = shuffleQuestionOptions(q);
  if (session) {
    session.optionOrders = { ...(session.optionOrders || {}), [id]: shuffled.order };
  }
  const interactionType = resolveInteractionType(q.interactionType || q.type);
  const numericFields = interactionType === 'numeric_entry' ? publicNumericFields(q) : {};
  return {
    id,
    question: numericFields.question || q.question,
    type: q.type || 'multiple-choice',
    interactionType,
    activity: q.activity || undefined,
    options: shuffled.options,
    points: q.points || 15,
    skillFocus: q.skillFocus,
    bloomLevel: q.bloomLevel,
    modality: q.modality,
    diagramBriefId: q.diagramBriefId || null,
    steps: q.steps || undefined,
    learningOutcomeIndex: q.learningOutcomeIndex,
    learningOutcomeKey: q.learningOutcomeKey,
    ...(interactionType === 'drag_to_target'
      ? {
          objectPool: Number(q.params?.objectPool) || 8,
          objectKind: q.params?.objectKind || undefined
        }
      : {}),
    ...(interactionType === 'numeric_entry'
      ? {
          layout: numericFields.layout,
          addends: numericFields.addends,
          scaffoldCarry: numericFields.scaffoldCarry,
          ...(numericFields.workedSteps ? { workedSteps: numericFields.workedSteps } : {})
        }
      : {}),
    ...(q.bankEntryId ? { bankEntryId: q.bankEntryId } : {}),
    ...(q.isTwistedVariant
      ? {
          isTwistedVariant: true,
          twinPairId: q.twinPairId,
          twinOf: q.twinOf
        }
      : {})
    // Never send correctAnswerIndex, params, or answerFormula during live attempt
  };
};

const targetMainLength = (bankSize) => {
  if (bankSize <= 0) return 0;
  if (bankSize <= 10) return bankSize;
  // Prefer 10, stretch to 12 when bank allows
  return Math.min(12, Math.max(10, Math.min(bankSize, 12)));
};

/**
 * Honest session completion 0–100. 100 only when the session is done.
 * Remaining is known work only (leftover main items, queued twins, fail-queue
 * retries). The current twin is already spliced out of twinQueue, so it is
 * counted separately; the current retry is still in failQueue, so it is not.
 */
export const sessionProgressPct = (session = {}) => {
  if (session.phase === 'done') return 100;
  const itemsDone = Array.isArray(session.answered) ? session.answered.length : 0;
  const remainingMain = Math.max(
    0,
    (Number(session.mainTarget) || 0) - (Number(session.mainAnswered) || 0)
  );
  const twinQueued = Array.isArray(session.twinQueue) ? session.twinQueue.length : 0;
  const twinCurrent = session.phase === 'twin' ? 1 : 0;
  const failQueued = Array.isArray(session.failQueue) ? session.failQueue.length : 0;
  const itemsRemaining = remainingMain + twinQueued + twinCurrent + failQueued;
  const total = itemsDone + itemsRemaining;
  if (total <= 0) return 0;
  return Math.round((100 * itemsDone) / total);
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

/** Distinct learningOutcomeKeys in a lesson bank (for modality map load). */
export const lessonOutcomeKeys = (lesson) => {
  const bank = lesson.quiz?.questions || [];
  return [...new Set(bank.map((q) => outcomeKeyOf(q, lesson)).filter(Boolean))];
};

const modalityBonusFor = (mod, outcomeKey, preferredModality, modalitySuccessMap) => {
  const perOutcome =
    modalitySuccessMap instanceof Map
      ? modalitySuccessMap.get(outcomeKey)
      : modalitySuccessMap?.[outcomeKey];
  if (perOutcome && mod === perOutcome) {
    return { bonus: MODALITY_MATCH_BONUS, source: 'per_outcome', modality: perOutcome };
  }
  if (
    !perOutcome &&
    preferredModality &&
    preferredModality !== 'mixed' &&
    mod === preferredModality
  ) {
    return {
      bonus: MODALITY_MATCH_BONUS,
      source: 'global_fallback',
      modality: preferredModality
    };
  }
  return { bonus: 0, source: 'none', modality: null };
};

const findBankIndex = (bank, questionId) =>
  bank.findIndex((q, i) => qid(q, i) === questionId);

/**
 * Score candidates for next main-path item.
 * Returns candidate plus modalitySignal for the winner.
 */
const pickNextMain = (
  session,
  lesson,
  masteryMap,
  preferredModality,
  modalitySuccessMap = new Map()
) => {
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

    const modHit = modalityBonusFor(mod, ok, preferredModality, modalitySuccessMap);
    s += modHit.bonus;

    const diff = c.q.difficulty || 'easy';
    if (mastery?.status === 'scaffolding' || mastery?.status === 'struggling') {
      if (diff === 'easy') s += DIFFICULTY_MATCH_BONUS;
    } else if (mastery?.status === 'mastered' || mastery?.status === 'developing') {
      if (diff === 'advanced') s += DIFFICULTY_MATCH_BONUS;
    }

    s += Math.random() * 3;
    return { score: s, modalitySignal: { source: modHit.source, modality: modHit.modality } };
  };

  let best = null;
  let bestMeta = null;
  for (const c of candidates) {
    const { score: s, modalitySignal } = score(c);
    if (!best || s > bestMeta.score) {
      best = c;
      bestMeta = { score: s, modalitySignal };
    }
  }

  return {
    ...best,
    modalitySignal: bestMeta?.modalitySignal || { source: 'none', modality: null }
  };
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

const fastAnswerTrigger = (session, responseTimeMs) => {
  if (responseTimeMs === null) return false;
  const samples = (session.additionTemplateResponseTimes || []).filter(Number.isFinite);
  if (samples.length < TWIN_TIMING_HEURISTIC.minimumBaselineSamples) {
    return responseTimeMs < TWIN_TIMING_HEURISTIC.coldStartMs;
  }
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  return responseTimeMs < average * TWIN_TIMING_HEURISTIC.fastRatio;
};

const scheduleTwin = ({ session, lesson, question, questionId, correct, responseTimeMs }) => {
  if (String(lesson?.grade) !== '1') return null;
  const drag = isCountIntoBoxQuestion(question);
  const numeric = isNumericEntryQuestion(question);
  if (!drag && !numeric && !isAdditionTemplateQuestion(question)) return null;
  const triggerReason = !correct
    ? 'incorrect'
    : fastAnswerTrigger(session, responseTimeMs)
      ? 'fast_correct'
      : null;
  if (!triggerReason) return null;

  const twisted = drag
    ? twistCountIntoBoxQuestion(question)
    : numeric
      ? twistNumericEntryQuestion(question)
      : twistAdditionQuestion(question);
  if (!twisted.ok) {
    console.warn(`[twin-consistency] ${questionId}: ${twisted.reason}`);
    return null;
  }

  const pairId = randomUUID();
  const twistId = `${questionId}-twin-${pairId.slice(0, 8)}`;
  const twistQuestion = {
    ...twisted.question,
    id: twistId,
    isTwistedVariant: true,
    twinPairId: pairId,
    twinOf: questionId,
    diagramBriefId: question.diagramBriefId || null,
    modality: drag || numeric ? question.modality || (drag ? 'visual' : 'practice') : 'practice',
    steps: undefined,
    ...(drag
      ? { interactionType: 'drag_to_target', activity: 'count_into_box' }
      : numeric
        ? { interactionType: 'numeric_entry', activity: 'numeric_entry' }
        : {})
  };
  const entry = {
    pairId,
    originalQuestionId: questionId,
    twistQuestionId: twistId,
    triggerReason,
    eligibleAfterMain:
      session.mainAnswered + TWIN_TIMING_HEURISTIC.interveningMainQuestions + 1
  };
  session.twistedQuestions[twistId] = twistQuestion;
  session.twinQueue.push(entry);
  session.twinPairs.push({
    ...entry,
    originalParams: question.params,
    twistParams: twistQuestion.params,
    originalResult: { correct, responseTimeMs },
    twistResult: null
  });
  return entry;
};

const serveTwin = (session, { force = false } = {}) => {
  const index = session.twinQueue.findIndex(
    (entry) => force || session.mainAnswered >= entry.eligibleAfterMain
  );
  if (index < 0) return null;
  const [entry] = session.twinQueue.splice(index, 1);
  const question = session.twistedQuestions[entry.twistQuestionId];
  if (!question) return null;
  session.currentTwinPairId = entry.pairId;
  return { q: question, i: -1, id: entry.twistQuestionId };
};

/** First-try (main phase) score only — retries excluded from percentage (Option C). */
const firstTryScore = (session) => {
  const total = session.mainScoreTotal || 0;
  const correct = session.mainScoreCorrect || 0;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const retryCount = session.retryDoneIds?.length || 0;
  return { correct, total, percentage, retryCount };
};

const pushModalitySignalLog = (session, pick, lesson) => {
  if (!pick?.modalitySignal) return;
  const entry = {
    source: pick.modalitySignal.source || 'none',
    modality: pick.modalitySignal.modality || null,
    questionId: pick.id || null,
    learningOutcomeKey: pick.q ? outcomeKeyOf(pick.q, lesson) : null,
    at: new Date().toISOString()
  };
  session.modalitySignalLog = [...(session.modalitySignalLog || []), entry];
};

export const createAdaptiveSession = ({
  lesson,
  preferredModality = 'mixed',
  masteryRows = [],
  modalitySuccessMap = new Map()
}) => {
  const bank = lesson.quiz?.questions || [];
  const mainTarget = targetMainLength(bank.length);
  const session = {
    lessonId: lesson.id,
    phase: 'main', // main | twin | retry | done
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
    // First-try scoring only (Option C) — retries tracked via retryDoneIds
    mainScoreCorrect: 0,
    mainScoreTotal: 0,
    // Persisted into session_review + adaptive_modality_signal_log on complete
    modalitySignalLog: [],
    // displayIndex → originalIndex per questionId (for shuffled options)
    optionOrders: {},
    // Twin-consistency is Addition-template-only in Phase 1.
    additionTemplateResponseTimes: [],
    twinQueue: [],
    twinPairs: [],
    twistedQuestions: {},
    currentTwinPairId: null
  };

  const masteryMap = masteryByKey(masteryRows);
  const first = pickNextMain(
    session,
    lesson,
    masteryMap,
    preferredModality,
    modalitySuccessMap
  );
  if (!first) {
    const doneSession = { ...session, phase: 'done' };
    return {
      session: doneSession,
      question: null,
      meta: {
        phase: 'done',
        progressLabel: 'No questions',
        done: true,
        progressPct: sessionProgressPct(doneSession)
      }
    };
  }

  pushModalitySignalLog(session, first, lesson);
  session.currentQuestionId = first.id;
  return {
    session,
    question: publicQuestion(first.q, first.i, session),
    meta: {
      phase: 'main',
      mainAnswered: 0,
      mainTarget,
      failQueued: 0,
      progressLabel: `Question 1 of ${mainTarget}`,
      done: false,
      progressPct: sessionProgressPct(session),
      modalitySignal: first.modalitySignal || { source: 'none', modality: null }
    }
  };
};

/**
 * Apply an answer and return next question (or done + review payload).
 * Score percentage uses main-phase answers only (Option C).
 */
export const advanceAdaptiveSession = ({
  session: rawSession,
  lesson,
  selectedOptionIndex,
  placedCount: rawPlacedCount,
  submittedValue: rawSubmittedValue,
  responseTimeMs: rawResponseTimeMs,
  masteryRows = [],
  modalitySuccessMap = new Map()
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
    outcomeFailStreak: { ...(rawSession.outcomeFailStreak || {}) },
    mainScoreCorrect: rawSession.mainScoreCorrect ?? 0,
    mainScoreTotal: rawSession.mainScoreTotal ?? 0,
    modalitySignalLog: [...(rawSession.modalitySignalLog || [])],
    optionOrders: { ...(rawSession.optionOrders || {}) },
    additionTemplateResponseTimes: [...(rawSession.additionTemplateResponseTimes || [])],
    twinQueue: [...(rawSession.twinQueue || [])],
    twinPairs: (rawSession.twinPairs || []).map((pair) => ({ ...pair })),
    twistedQuestions: { ...(rawSession.twistedQuestions || {}) },
    currentTwinPairId: rawSession.currentTwinPairId || null
  };

  const currentId = session.currentQuestionId;
  const idx = findBankIndex(bank, currentId);
  const isTwin = session.phase === 'twin';
  if (idx < 0 && !isTwin) {
    throw new Error('Current question not found in bank');
  }
  const question = isTwin ? session.twistedQuestions[currentId] : bank[idx];
  if (!question) throw new Error('Current question payload not found');
  const responseTimeMs = asResponseTimeMs(rawResponseTimeMs);
  const interactionType = resolveInteractionType(question.interactionType || question.type);
  const isDrag = interactionType === 'drag_to_target';
  const isNumeric = interactionType === 'numeric_entry' || isNumericEntryQuestion(question);
  const order = session.optionOrders?.[currentId];
  let selectedDisplay = Number(selectedOptionIndex);
  let selectedOriginal = selectedDisplay;
  let correct = false;
  let displayCorrect = 0;
  let expectedCount = null;
  let expectedValue = null;
  let submittedValue = null;

  if (isDrag) {
    expectedCount = expectedCountForQuestion(question);
    const placed =
      rawPlacedCount != null && Number.isFinite(Number(rawPlacedCount))
        ? Number(rawPlacedCount)
        : selectedDisplay;
    selectedDisplay = placed;
    selectedOriginal = placed;
    correct = expectedCount != null && placed === expectedCount;
    displayCorrect = expectedCount;
  } else if (isNumeric) {
    expectedValue = expectedScalarForQuestion(question);
    submittedValue = parseNumericAnswer(
      rawSubmittedValue ?? rawPlacedCount ?? selectedOptionIndex
    );
    selectedDisplay = submittedValue;
    selectedOriginal = submittedValue;
    correct = expectedValue != null && submittedValue === expectedValue;
    displayCorrect = expectedValue;
  } else {
    selectedOriginal =
      Array.isArray(order) && order[selectedDisplay] !== undefined
        ? Number(order[selectedDisplay])
        : selectedDisplay;
    const bankCorrect = Number(question.correctAnswerIndex);
    correct = selectedOriginal === bankCorrect;
    displayCorrect =
      Array.isArray(order) && order.length > 0 ? order.indexOf(bankCorrect) : bankCorrect;
  }
  const learningOutcomeKey = outcomeKeyOf(question, lesson);
  const bloomLevel = question.bloomLevel || 'understand';
  const phase = isTwin ? 'twin' : session.phase === 'retry' ? 'retry' : 'main';
  const scheduledTwin =
    phase === 'main'
      ? scheduleTwin({
          session,
          lesson,
          question,
          questionId: currentId,
          correct,
          responseTimeMs
        })
      : null;
  const twinPairId = isTwin ? session.currentTwinPairId : scheduledTwin?.pairId || null;
  const twinPair = twinPairId
    ? session.twinPairs.find((pair) => pair.pairId === twinPairId)
    : null;

  const answerRecord = {
    questionId: currentId,
    selectedOptionIndex: selectedDisplay,
    optionOrder: Array.isArray(order) ? order : undefined,
    correct,
    phase,
    learningOutcomeKey,
    bloomLevel,
    modality: question.modality || null,
    skillFocus: question.skillFocus || null,
    responseTimeMs,
    ...(twinPairId
      ? {
          twinPairId,
          twinRole: isTwin ? 'twist' : 'original',
          twinTriggerReason: twinPair?.triggerReason || scheduledTwin?.triggerReason || null,
          sourceQuestionId: isTwin ? question.twinOf : currentId,
          questionParams: question.params || null
        }
      : {}),
    ...(isTwin ? { questionSnapshot: question } : {})
  };

  session.answered.push(answerRecord);

  if (
    phase === 'main' &&
    String(lesson?.grade) === '1' &&
    isAdditionTemplateQuestion(question) &&
    responseTimeMs !== null
  ) {
    session.additionTemplateResponseTimes.push(responseTimeMs);
  }
  if (isTwin && twinPair) {
    twinPair.twistResult = { correct, responseTimeMs };
  }

  if (phase === 'main') {
    session.mainScoreTotal += 1;
    if (correct) session.mainScoreCorrect += 1;
  }

  if (!isTwin) session.lastAttempt = answerRecord;

  if (!session.coveredOutcomes.includes(learningOutcomeKey)) {
    session.coveredOutcomes.push(learningOutcomeKey);
  }

  if (!correct && !isTwin) {
    session.outcomeFailStreak[learningOutcomeKey] =
      (session.outcomeFailStreak[learningOutcomeKey] || 0) + 1;
    if (phase === 'main' && !session.failQueue.includes(currentId)) {
      session.failQueue.push(currentId);
    }
  } else if (!isTwin) {
    session.outcomeFailStreak[learningOutcomeKey] = 0;
  }

  if (phase === 'main') {
    if (!session.usedIds.includes(currentId)) session.usedIds.push(currentId);
    session.mainAnswered += 1;
  } else if (phase === 'retry') {
    // A sibling may have been served for the failed question — clear the
    // ORIGINAL failed id, not just the served one.
    const retryFor = session.currentRetryFor || currentId;
    session.retryDoneIds.push(retryFor);
    session.failQueue = session.failQueue.filter(
      (id) => id !== retryFor && id !== currentId
    );
    session.currentRetryFor = null;
  } else {
    session.currentTwinPairId = null;
  }

  const masteryMap = masteryByKey(masteryRows);
  let next = null;
  let nextPhase = session.phase;
  let modalitySignal = { source: 'none', modality: null };

  if (phase === 'main' || phase === 'twin') {
    const mainDone = session.mainAnswered >= session.mainTarget;
    const noMoreUnused = bank.every((q, i) => session.usedIds.includes(qid(q, i)));
    if (mainDone || noMoreUnused) {
      next = serveTwin(session, { force: true });
      if (next) {
        nextPhase = 'twin';
        session.phase = 'twin';
      } else if (session.failQueue.length > 0) {
        nextPhase = 'retry';
        session.phase = 'retry';
        next = serveRetry(bank, lesson, session);
      } else {
        nextPhase = 'done';
        session.phase = 'done';
      }
    } else {
      // Never serve a twin immediately after its original. Once due, it may
      // interrupt the main path; after a twin, return to a normal main item.
      if (phase === 'main') {
        next = serveTwin(session);
        if (next) {
          nextPhase = 'twin';
          session.phase = 'twin';
        }
      }
      if (!next) {
        next = pickNextMain(
          session,
          lesson,
          masteryMap,
          session.preferredModality,
          modalitySuccessMap
        );
        nextPhase = 'main';
        session.phase = 'main';
        if (next?.modalitySignal) modalitySignal = next.modalitySignal;
        if (next) pushModalitySignalLog(session, next, lesson);
      }
      if (!next) {
        next = serveTwin(session, { force: true });
        if (next) {
          nextPhase = 'twin';
          session.phase = 'twin';
        } else if (session.failQueue.length > 0) {
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
    session.phase = nextPhase;
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
  } else if (session.phase === 'twin') {
    progressLabel = 'Practice check';
  } else {
    progressLabel = `Question ${session.mainAnswered + 1} of ${session.mainTarget}`;
  }

  const finalScore = firstTryScore(session);

  const reviewPayload = done
    ? {
        answered: session.answered,
        score: finalScore,
        // Queryable copy of selection signals (also written to adaptive_modality_signal_log)
        modalitySignals: session.modalitySignalLog || [],
        twinPairs: session.twinPairs || [],
        completedAt: new Date().toISOString()
      }
    : null;

  return {
    session,
    question: next ? publicQuestion(next.q, next.i, session) : null,
    lastAnswer: {
      ...answerRecord,
      correctAnswerIndex: displayCorrect,
      explanation: question.explanation,
      optionExplanations: applyStoredOrder(question, order).optionExplanations,
      ...(isDrag ? { expectedCount, placedCount: selectedOriginal } : {}),
      ...(isNumeric ? { expectedValue, submittedValue } : {})
    },
    meta: {
      phase: session.phase,
      mainAnswered: session.mainAnswered,
      mainTarget: session.mainTarget,
      failQueued: session.failQueue.length,
      progressLabel,
      done,
      progressPct: sessionProgressPct(session),
      score: finalScore,
      modalitySignal,
      twinPending: session.twinQueue.length
    },
    review: reviewPayload,
    attemptContext: {
      question,
      questionId: currentId,
      selected: selectedOriginal,
      correct,
      learningOutcomeKey,
      bloomLevel,
      responseTimeMs,
      isTwin,
      twinPairId,
      twinRole: twinPairId ? (isTwin ? 'twist' : 'original') : null,
      twinTriggerReason: twinPair?.triggerReason || scheduledTwin?.triggerReason || null,
      sourceQuestionId: isTwin ? question.twinOf : currentId,
      questionParams: question.params || null,
      bankEntryId: question.bankEntryId || null
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
    const q = idx >= 0 ? bank[idx] : a.questionSnapshot;
    if (!q) continue;
    const displayed = applyStoredOrder(q, a.optionOrder);
    items.push({
      id: questionId,
      question: q.question,
      options: displayed.options,
      correctAnswerIndex: displayed.correctAnswerIndex,
      selectedOptionIndex: a.selectedOptionIndex,
      correct: a.correct,
      explanation: q.explanation,
      optionExplanations: displayed.optionExplanations,
      feedbackCorrect: q.feedbackCorrect,
      feedbackIncorrect: q.feedbackIncorrect,
      modality: q.modality,
      steps: q.steps,
      diagramBriefId: q.diagramBriefId,
      skillFocus: q.skillFocus,
      bloomLevel: q.bloomLevel,
      interactionType: resolveInteractionType(q.interactionType || q.type),
      activity: q.activity || undefined,
      objectPool: q.params?.objectPool != null ? Number(q.params.objectPool) : undefined,
      objectKind: q.params?.objectKind || undefined,
      expectedCount: isCountIntoBoxQuestion(q) ? expectedCountForQuestion(q) : undefined,
      placedCount: isCountIntoBoxQuestion(q) ? a.selectedOptionIndex : undefined,
      expectedValue: isNumericEntryQuestion(q) ? expectedScalarForQuestion(q) : undefined,
      submittedValue: isNumericEntryQuestion(q) ? a.selectedOptionIndex : undefined,
      ...(isNumericEntryQuestion(q) && hasIntegerAddends(q.params)
        ? {
            layout: resolveAdditionLayout(q.params.layout),
            addends: { a: Number(q.params.a), b: Number(q.params.b) },
            scaffoldCarry: resolveScaffoldCarry(q.params.scaffoldCarry, {
              layout: resolveAdditionLayout(q.params.layout)
            }),
            question:
              resolveAdditionLayout(q.params.layout) === 'vertical'
                ? verticalAdditionInstruction(q.question)
                : q.question
          }
        : {}),
      phase: a.phase
    });
  }

  return {
    items,
    score: sessionReview?.score || null,
    modalitySignals: sessionReview?.modalitySignals || [],
    twinPairs: sessionReview?.twinPairs || [],
    completedAt: sessionReview?.completedAt || null
  };
};
