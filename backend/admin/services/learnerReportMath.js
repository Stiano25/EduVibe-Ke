import { lessonIsDone, lessonIsFullyCompleted } from '../../utils/lessonUnlock.js';
import { computePracticeScore } from '../../utils/practiceScore.js';

export const MAX_REPORT_LEARNERS = 50;

export const STRENGTH_STATUSES = ['mastered', 'developing'];
export const WEAKNESS_STATUSES = ['struggling', 'scaffolding'];

/** First-try ≥ this is a lesson strength. */
export const LESSON_STRENGTH_MIN = 75;
/** First-try ≤ this is a lesson weakness (includes the 60% pass floor). */
export const LESSON_WEAKNESS_MAX = 60;

const BLOOM_LEVELS = ['recall', 'understand', 'apply', 'reason'];

const isTwist = (attempt) => attempt?.twinRole === 'twist';

const attemptedOutcomeKeys = (attempts = []) => {
  const keys = new Set();
  for (const attempt of attempts) {
    if (isTwist(attempt)) continue;
    if (attempt?.learningOutcomeKey) keys.add(attempt.learningOutcomeKey);
  }
  return keys;
};

export const emptyMasteryCounts = () => ({
  unknown: 0,
  struggling: 0,
  scaffolding: 0,
  developing: 0,
  mastered: 0
});

export const emptyBloomBreakdown = () =>
  BLOOM_LEVELS.reduce((acc, level) => {
    acc[level] = { correct: 0, total: 0 };
    return acc;
  }, {});

export const mapSkill = (row) => ({
  skillFocus: row.skillFocus || row.learningOutcomeKey || 'Skill',
  learningOutcomeKey: row.learningOutcomeKey,
  status: row.status || 'unknown',
  bktPKnow: row.bktPKnow == null ? null : Number(row.bktPKnow),
  bktNObservations: row.bktNObservations == null ? null : Number(row.bktNObservations),
  preferredModality: row.preferredModalityObserved || null,
  consecutiveFailsAtLevel: row.consecutiveFailsAtLevel ?? 0,
  updatedAt: row.updatedAt || null
});

const statusRank = (status, order) => {
  const i = order.indexOf(status);
  return i < 0 ? order.length : i;
};

/**
 * Heuristic mastery lists. A skill_mastery row with no matching non-twist
 * skill_attempt is omitted from counts, strengths, and weaknesses.
 */
export const classifyMastery = (rows = [], attempts = []) => {
  const masteryCounts = emptyMasteryCounts();
  const strengths = [];
  const weaknesses = [];
  const attempted = attemptedOutcomeKeys(attempts);

  for (const row of rows) {
    const status = row.status || 'unknown';
    if (!attempted.has(row.learningOutcomeKey)) continue;

    if (masteryCounts[status] !== undefined) masteryCounts[status] += 1;
    else masteryCounts.unknown += 1;

    const mapped = mapSkill(row);
    if (STRENGTH_STATUSES.includes(status)) strengths.push(mapped);
    else if (WEAKNESS_STATUSES.includes(status)) weaknesses.push(mapped);
  }

  strengths.sort((a, b) => {
    const rank =
      statusRank(a.status, ['mastered', 'developing']) - statusRank(b.status, ['mastered', 'developing']);
    if (rank !== 0) return rank;
    return (b.bktPKnow ?? 0) - (a.bktPKnow ?? 0);
  });
  weaknesses.sort((a, b) => {
    const rank =
      statusRank(a.status, ['scaffolding', 'struggling']) -
      statusRank(b.status, ['scaffolding', 'struggling']);
    if (rank !== 0) return rank;
    return (b.consecutiveFailsAtLevel || 0) - (a.consecutiveFailsAtLevel || 0);
  });

  return { masteryCounts, strengths, weaknesses };
};

export const summarizeAttempts = (attempts = []) => {
  const bloomBreakdown = emptyBloomBreakdown();
  const modalityBreakdown = {};
  const misconceptionCounts = {};
  let correct = 0;
  let total = 0;

  for (const attempt of attempts) {
    if (isTwist(attempt)) continue;
    total += 1;
    if (attempt.correct) correct += 1;

    const bloom = attempt.bloomLevel;
    if (bloomBreakdown[bloom]) {
      bloomBreakdown[bloom].total += 1;
      if (attempt.correct) bloomBreakdown[bloom].correct += 1;
    }

    const modality = attempt.modalityShown;
    if (modality && modality !== 'mixed') {
      if (!modalityBreakdown[modality]) {
        modalityBreakdown[modality] = { correct: 0, total: 0 };
      }
      modalityBreakdown[modality].total += 1;
      if (attempt.correct) modalityBreakdown[modality].correct += 1;
    }

    if (!attempt.correct && attempt.misconceptionKey) {
      const key = String(attempt.misconceptionKey);
      misconceptionCounts[key] = (misconceptionCounts[key] || 0) + 1;
    }
  }

  const misconceptions = Object.entries(misconceptionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, count]) => ({ key, count }));

  return {
    attemptCount: total,
    accuracyPercent: total > 0 ? Math.round((correct / total) * 100) : null,
    bloomBreakdown,
    modalityBreakdown,
    misconceptions,
    bestModality: bestModalityFromBreakdown(modalityBreakdown)
  };
};

/** Highest first-try accuracy among modalities with attempts. Null unless ≥2 modalities. */
export const bestModalityFromBreakdown = (modalityBreakdown = {}) => {
  const usable = Object.entries(modalityBreakdown).filter(
    ([key, pair]) => key !== 'mixed' && pair && pair.total > 0
  );
  if (usable.length < 2) return null;

  usable.sort((a, b) => {
    const rateA = a[1].correct / a[1].total;
    const rateB = b[1].correct / b[1].total;
    if (rateB !== rateA) return rateB - rateA;
    return b[1].total - a[1].total;
  });
  return usable[0][0];
};

export const classifyLessonBand = (firstTryPercent) => {
  if (firstTryPercent == null || Number.isNaN(Number(firstTryPercent))) return null;
  const pct = Number(firstTryPercent);
  if (pct >= LESSON_STRENGTH_MIN) return 'strength';
  if (pct <= LESSON_WEAKNESS_MAX) return 'weakness';
  return 'steady';
};

const retryCountFromReview = (review = {}) => {
  if (review.score?.retryCount != null) return Number(review.score.retryCount) || 0;
  const answered = review.answered || [];
  return answered.filter((a) => a?.phase === 'retry').length;
};

export const practiceScoreFromReview = (review = {}) => {
  if (review.practiceScore?.percentage != null) {
    return Number(review.practiceScore.percentage);
  }
  const answered = review.answered;
  if (!Array.isArray(answered) || answered.length === 0) return null;
  const computed = computePracticeScore({ answered }, {});
  if (computed.total === 0) return null;

  const retries = answered.filter((a) => a.phase === 'retry');
  const retriesLinked = retries.some((a) => a.retryFor);
  if (retries.length && !retriesLinked) {
    const missed = computed.items.filter((item) => item.tier === 'miss');
    let creditSum = computed.creditSum;
    for (let i = 0; i < missed.length; i += 1) {
      const retry = retries[i];
      if (!retry) break;
      if (retry.correct) creditSum += 0.5;
    }
    return Math.round((creditSum / computed.total) * 100);
  }
  return computed.percentage;
};

const topMisconceptionForLesson = (attempts = [], lessonId) => {
  const counts = {};
  for (const attempt of attempts) {
    if (isTwist(attempt)) continue;
    if (attempt.correct) continue;
    if ((attempt.lessonId || attempt.lesson_id) !== lessonId) continue;
    if (!attempt.misconceptionKey) continue;
    const key = String(attempt.misconceptionKey);
    counts[key] = (counts[key] || 0) + 1;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return ranked[0] ? ranked[0][0] : null;
};

const bktForLesson = (attempts = [], lessonId, masteryByKey) => {
  const byOutcome = new Map();
  for (const attempt of attempts) {
    if (isTwist(attempt)) continue;
    if ((attempt.lessonId || attempt.lesson_id) !== lessonId) continue;
    const key = attempt.learningOutcomeKey;
    if (!key) continue;
    byOutcome.set(key, (byOutcome.get(key) || 0) + 1);
  }
  let best = null;
  for (const [key, n] of byOutcome) {
    const row = masteryByKey.get(key);
    if (!row || row.bktPKnow == null) continue;
    if (!best || n > best.n || (n === best.n && row.bktPKnow < best.bktPKnow)) {
      best = {
        n,
        bktPKnow: Number(row.bktPKnow),
        bktNObservations: row.bktNObservations == null ? null : Number(row.bktNObservations),
        skillFocus: row.skillFocus || key,
        learningOutcomeKey: key
      };
    }
  }
  return best;
};

export const mapLessonProgress = (rows = [], titleById = new Map(), attempts = [], masteryRows = []) => {
  const masteryByKey = new Map();
  for (const row of masteryRows) {
    if (row?.learningOutcomeKey) masteryByKey.set(row.learningOutcomeKey, mapSkill(row));
  }

  return (rows || []).map((row) => {
    const lessonId = row.lesson_id || row.lessonId;
    const review = row.session_review || row.sessionReview || {};
    const firstTry = review.score?.percentage ?? row.session_review?.score?.percentage ?? null;
    const retryCount = retryCountFromReview(review);
    const practiceScorePercent = practiceScoreFromReview(review);
    const scorePercentage = firstTry == null ? null : Number(firstTry);

    return {
      lessonId,
      title: titleById.get(lessonId) || 'Lesson',
      progress: row.progress ?? 0,
      completed: lessonIsDone(row),
      fullyCompleted: lessonIsFullyCompleted(row),
      completedAt: row.completed_at || row.completedAt || null,
      lastAccessed: row.last_accessed || row.lastAccessed || row.updated_at || row.updatedAt,
      scorePercentage,
      scoreCorrect: review.score?.correct ?? null,
      scoreTotal: review.score?.total ?? null,
      retryCount,
      practiceScorePercent,
      misconception: topMisconceptionForLesson(attempts, lessonId),
      bkt: bktForLesson(attempts, lessonId, masteryByKey)
    };
  });
};

export const classifyLessons = (lessons = []) => {
  const strengths = [];
  const weaknesses = [];
  const steady = [];

  for (const lesson of lessons) {
    if (lesson.scorePercentage == null) continue;
    const band = classifyLessonBand(lesson.scorePercentage);
    const entry = {
      lessonId: lesson.lessonId,
      title: lesson.title,
      skillFocus: lesson.title,
      learningOutcomeKey: lesson.lessonId,
      band,
      firstTryPercent: lesson.scorePercentage,
      retryCount: lesson.retryCount ?? 0,
      practiceScorePercent: lesson.practiceScorePercent,
      misconception: lesson.misconception || null,
      bktPKnow: lesson.bkt?.bktPKnow ?? null,
      bktNObservations: lesson.bkt?.bktNObservations ?? null,
      bktSkillFocus: lesson.bkt?.skillFocus ?? null
    };
    if (band === 'strength') strengths.push(entry);
    else if (band === 'weakness') weaknesses.push(entry);
    else if (band === 'steady') steady.push(entry);
  }

  strengths.sort((a, b) => b.firstTryPercent - a.firstTryPercent);
  weaknesses.sort((a, b) => a.firstTryPercent - b.firstTryPercent);
  steady.sort((a, b) => a.firstTryPercent - b.firstTryPercent);
  return { strengths, weaknesses, steady };
};

export const buildReportPayload = ({
  learner,
  masteryRows = [],
  progressRows = [],
  attempts = [],
  titleById = new Map(),
  generatedAt = new Date().toISOString()
}) => {
  const { masteryCounts, strengths: skillStrengths, weaknesses: skillWeaknesses } = classifyMastery(
    masteryRows,
    attempts
  );
  const attemptStats = summarizeAttempts(attempts);
  const recentLessons = mapLessonProgress(progressRows, titleById, attempts, masteryRows);
  const { strengths, weaknesses, steady } = classifyLessons(recentLessons);
  const scored = recentLessons.filter((row) => row.scorePercentage != null);

  return {
    learner,
    generatedAt,
    summary: {
      lessonsTracked: recentLessons.length,
      completed: recentLessons.filter((row) => row.completed).length,
      fullyCompleted: recentLessons.filter((row) => row.fullyCompleted).length,
      inProgress: recentLessons.filter((row) => !row.completed && (row.progress || 0) > 0).length,
      averageScore:
        scored.length > 0
          ? Math.round(scored.reduce((sum, row) => sum + Number(row.scorePercentage), 0) / scored.length)
          : null,
      skillsTracked: masteryRows.length,
      strengthsCount: strengths.length,
      weaknessesCount: weaknesses.length,
      attemptCount: attemptStats.attemptCount,
      accuracyPercent: attemptStats.accuracyPercent
    },
    masteryCounts,
    strengths,
    weaknesses,
    steady,
    skillsNeedingPractice: skillWeaknesses.slice(0, 12),
    skillStrengths,
    bloomBreakdown: attemptStats.bloomBreakdown,
    modalityBreakdown: attemptStats.modalityBreakdown,
    bestModality: attemptStats.bestModality,
    misconceptions: attemptStats.misconceptions,
    recentLessons: recentLessons.slice(0, 40)
  };
};

const skillTallyKey = (item) => item.learningOutcomeKey || item.lessonId || item.skillFocus || 'skill';

const tallySkills = (reports, side) => {
  const map = new Map();
  for (const report of reports) {
    const name = report.learner?.name || 'Learner';
    for (const skill of report[side] || []) {
      const key = skillTallyKey(skill);
      if (!map.has(key)) {
        map.set(key, {
          skillFocus: skill.skillFocus || skill.title,
          learningOutcomeKey: skill.learningOutcomeKey || skill.lessonId,
          learnerCount: 0,
          learnerNames: []
        });
      }
      const row = map.get(key);
      row.learnerCount += 1;
      if (row.learnerNames.length < 8) row.learnerNames.push(name);
    }
  }
  return [...map.values()].sort((a, b) => b.learnerCount - a.learnerCount).slice(0, 10);
};

export const buildClassInsights = (reports = []) => {
  const needsAttention = reports
    .filter((report) => {
      const weak = report.summary?.weaknessesCount || 0;
      const strong = report.summary?.strengthsCount || 0;
      return weak >= 3 || weak > strong;
    })
    .map((report) => ({
      id: report.learner?.id,
      name: report.learner?.name,
      grade: report.learner?.grade || null,
      weaknessesCount: report.summary?.weaknessesCount || 0,
      strengthsCount: report.summary?.strengthsCount || 0,
      accuracyPercent: report.summary?.accuracyPercent ?? null
    }))
    .sort((a, b) => b.weaknessesCount - a.weaknessesCount);

  return {
    learnerCount: reports.length,
    commonWeaknesses: tallySkills(reports, 'weaknesses'),
    commonStrengths: tallySkills(reports, 'strengths'),
    needsAttention
  };
};
