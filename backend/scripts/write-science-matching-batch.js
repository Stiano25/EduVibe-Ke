/**
 * Part B: live Science bank batch after matching_pairs / odd_one_out prompt.
 * Inserts new pending rows. Does not overwrite Part A rows.
 *
 * Usage (from backend/): node scripts/write-science-matching-batch.js
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../config/loadEnv.js';
import { generateQuestionBankBatch } from '../admin/services/questionBankService.js';
import {
  createAdaptiveSession,
  advanceAdaptiveSession
} from '../learner/services/adaptiveQuizService.js';
import { computePracticeScore } from '../utils/practiceScore.js';

const SCIENCE_ID = '82861888-d67e-42ef-8cac-3454b10c850d';
const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '../../docs/measurements/science-new-interactions.json');

const summarize = (batch) => {
  const types = {};
  const samples = [];
  for (const entry of batch.entries || []) {
    const t = entry.interactionType || 'unknown';
    types[t] = (types[t] || 0) + 1;
    const q = entry.question || {};
    samples.push({
      id: entry.id,
      status: entry.status,
      interactionType: t,
      stem: q.question,
      left: q.left || null,
      right: q.right || null,
      correctPairs: q.correctPairs || null,
      options: q.options || null,
      correctAnswerIndex: q.correctAnswerIndex,
      diagramType: q.diagram?.diagramType || q.options?.[0]?.diagramType || null
    });
  }
  return {
    topic: batch.topic,
    created: batch.created,
    pending: batch.pending,
    rejected: batch.rejected,
    qaFlagged: batch.qaFlagged,
    types,
    samples
  };
};

const pickByType = (batch, type) =>
  (batch.entries || []).find((entry) => entry.interactionType === type) || null;

const gradeMatchingEvidence = (entry) => {
  if (!entry?.question) return null;
  const q = { ...entry.question, id: entry.id };
  const lesson = {
    id: 'science-matching-evidence',
    grade: '3',
    learningObjectives: ['Explain the function of roots, stem, leaves and flowers'],
    quiz: { questions: [q] }
  };
  let state = createAdaptiveSession({ lesson });
  const order = state.session.matchingRightOrders[q.id];
  const correctPairs = q.correctPairs || [];
  const n = correctPairs.length;
  const partialDisplay = correctPairs.map(([left, right], i) => {
    const canonicalRight = i === 0 || n < 2 ? right : correctPairs[(i % (n - 1)) + 1][1];
    return [left, order.indexOf(canonicalRight)];
  });
  state = advanceAdaptiveSession({
    session: state.session,
    lesson,
    submittedPairs: partialDisplay,
    responseTimeMs: 3200
  });
  const practice = computePracticeScore(state.session, lesson);
  return {
    stem: q.question,
    left: q.left,
    canonicalRight: q.right,
    displayedRight: state.session.matchingRightOrders[q.id]
      ? order.map((i) => q.right[i])
      : q.right,
    submittedDisplayPairs: partialDisplay,
    lastAnswer: {
      correct: state.lastAnswer.correct,
      matchedPairs: state.lastAnswer.matchedPairs,
      totalPairs: state.lastAnswer.totalPairs
    },
    practiceScore: practice.items[0]
  };
};

const gradeOddEvidence = (entry) => {
  if (!entry?.question) return null;
  const q = { ...entry.question, id: entry.id };
  const lesson = {
    id: 'science-odd-evidence',
    grade: '3',
    learningObjectives: ['Explain the function of roots, stem, leaves and flowers'],
    quiz: { questions: [q] }
  };
  let state = createAdaptiveSession({ lesson });
  const order = state.session.optionOrders[q.id] || [];
  const correctDisplay = Array.isArray(order)
    ? order.indexOf(Number(q.correctAnswerIndex))
    : Number(q.correctAnswerIndex);
  const wrongDisplay = correctDisplay === 0 ? 1 : 0;
  state = advanceAdaptiveSession({
    session: state.session,
    lesson,
    selectedOptionIndex: wrongDisplay,
    responseTimeMs: 1100
  });
  const miss = {
    correct: state.lastAnswer.correct,
    selectedOptionIndex: state.lastAnswer.selectedOptionIndex
  };
  let state2 = createAdaptiveSession({ lesson });
  const order2 = state2.session.optionOrders[q.id] || [];
  const correctDisplay2 = Array.isArray(order2)
    ? order2.indexOf(Number(q.correctAnswerIndex))
    : Number(q.correctAnswerIndex);
  state2 = advanceAdaptiveSession({
    session: state2.session,
    lesson,
    selectedOptionIndex: correctDisplay2 >= 0 ? correctDisplay2 : 0,
    responseTimeMs: 900
  });
  return {
    stem: q.question,
    options: q.options,
    correctAnswerIndex: q.correctAnswerIndex,
    wrongAttempt: miss,
    correctAttempt: { correct: state2.lastAnswer.correct }
  };
};

const main = async () => {
  const attempts = [];
  let matching = null;
  let odd = null;
  let last = null;
  for (let i = 0; i < 2 && (!matching || !odd); i += 1) {
    const batch = await generateQuestionBankBatch(SCIENCE_ID, { count: 8 });
    last = batch;
    attempts.push(summarize(batch));
    matching = matching || pickByType(batch, 'matching_pairs');
    odd = odd || pickByType(batch, 'odd_one_out');
  }

  const payload = {
    attempts,
    matching: matching
      ? {
          id: matching.id,
          status: matching.status,
          question: matching.question
        }
      : null,
    oddOneOut: odd
      ? {
          id: odd.id,
          status: odd.status,
          question: odd.question
        }
      : null,
    grading: {
      matchingPartial: matching ? gradeMatchingEvidence(matching) : null,
      oddOneOut: odd ? gradeOddEvidence(odd) : null
    }
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
  if (!matching || !odd) {
    console.error('Science batch missing matching_pairs and/or odd_one_out after retries');
    process.exit(1);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
