export const MAX_REPORT_LEARNERS = 50;

export const STRENGTH_STATUSES = ['mastered', 'developing'];
export const WEAKNESS_STATUSES = ['struggling', 'scaffolding'];

const BLOOM_LEVELS = ['recall', 'understand', 'apply', 'reason'];

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
  preferredModality: row.preferredModalityObserved || null,
  consecutiveFailsAtLevel: row.consecutiveFailsAtLevel ?? 0,
  updatedAt: row.updatedAt || null
});

const statusRank = (status, order) => {
  const i = order.indexOf(status);
  return i < 0 ? order.length : i;
};

export const classifyMastery = (rows = []) => {
  const masteryCounts = emptyMasteryCounts();
  const strengths = [];
  const weaknesses = [];

  for (const row of rows) {
    const status = row.status || 'unknown';
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
    if (attempt.twinRole === 'twist') continue;
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
    misconceptions
  };
};

export const mapLessonProgress = (rows = [], titleById = new Map()) =>
  (rows || []).map((row) => ({
    lessonId: row.lesson_id || row.lessonId,
    title: titleById.get(row.lesson_id || row.lessonId) || 'Lesson',
    progress: row.progress ?? 0,
    completed: !!row.completed,
    completedAt: row.completed_at || row.completedAt || null,
    lastAccessed: row.last_accessed || row.lastAccessed || row.updated_at || row.updatedAt,
    scorePercentage:
      row.session_review?.score?.percentage ?? row.sessionReview?.score?.percentage ?? null,
    scoreCorrect: row.session_review?.score?.correct ?? row.sessionReview?.score?.correct ?? null,
    scoreTotal: row.session_review?.score?.total ?? row.sessionReview?.score?.total ?? null
  }));

export const buildReportPayload = ({
  learner,
  masteryRows = [],
  progressRows = [],
  attempts = [],
  titleById = new Map(),
  generatedAt = new Date().toISOString()
}) => {
  const { masteryCounts, strengths, weaknesses } = classifyMastery(masteryRows);
  const attemptStats = summarizeAttempts(attempts);
  const recentLessons = mapLessonProgress(progressRows, titleById);
  const scored = recentLessons.filter((row) => row.scorePercentage != null);

  return {
    learner,
    generatedAt,
    summary: {
      lessonsTracked: recentLessons.length,
      completed: recentLessons.filter((row) => row.completed).length,
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
    skillsNeedingPractice: weaknesses.slice(0, 12),
    bloomBreakdown: attemptStats.bloomBreakdown,
    modalityBreakdown: attemptStats.modalityBreakdown,
    misconceptions: attemptStats.misconceptions,
    recentLessons: recentLessons.slice(0, 40)
  };
};

const skillTallyKey = (skill) => skill.learningOutcomeKey || skill.skillFocus || 'skill';

const tallySkills = (reports, side) => {
  const map = new Map();
  for (const report of reports) {
    const name = report.learner?.name || 'Learner';
    for (const skill of report[side] || []) {
      const key = skillTallyKey(skill);
      if (!map.has(key)) {
        map.set(key, {
          skillFocus: skill.skillFocus,
          learningOutcomeKey: skill.learningOutcomeKey,
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
