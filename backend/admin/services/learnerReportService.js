import { getDbClient } from '../../config/supabase.js';
import { User } from '../../models/User.js';
import { Lesson } from '../../models/Lesson.js';
import { SkillAttempt, SkillMastery } from '../../models/SkillAttempt.js';
import {
  MAX_REPORT_LEARNERS,
  buildReportPayload,
  buildClassInsights
} from './learnerReportMath.js';

export {
  MAX_REPORT_LEARNERS,
  STRENGTH_STATUSES,
  WEAKNESS_STATUSES,
  LESSON_STRENGTH_MIN,
  LESSON_WEAKNESS_MAX,
  emptyMasteryCounts,
  emptyBloomBreakdown,
  mapSkill,
  classifyMastery,
  summarizeAttempts,
  mapLessonProgress,
  classifyLessonBand,
  classifyLessons,
  bestModalityFromBreakdown,
  buildReportPayload,
  buildClassInsights
} from './learnerReportMath.js';

const chunk = (arr, size = 80) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const publicLearner = (user) => ({
  id: user.id,
  name: user.name || null,
  email: user.email || null,
  grade: user.grade || null
});

const fetchProgressByUserIds = async (userIds) => {
  const db = getDbClient();
  const rows = [];
  for (const ids of chunk(userIds)) {
    const { data, error } = await db
      .from('lesson_progress')
      .select('*')
      .in('user_id', ids)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
};

const groupByUserId = (rows, key = 'userId') => {
  const map = new Map();
  for (const row of rows) {
    const id = row[key] || row.user_id;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(row);
  }
  return map;
};

export const generateLearnerReports = async (userIds = []) => {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
  if (!uniqueIds.length) {
    throw Object.assign(new Error('Select at least one learner'), { status: 400 });
  }
  if (uniqueIds.length > MAX_REPORT_LEARNERS) {
    throw Object.assign(
      new Error(`You can generate at most ${MAX_REPORT_LEARNERS} learner reports at once`),
      { status: 400 }
    );
  }

  const users = await User.findByIds(uniqueIds);
  const learners = users.filter((user) => user.role === 'learner');
  if (!learners.length) {
    throw Object.assign(new Error('No learners found for the selected ids'), { status: 404 });
  }

  const learnerIds = learners.map((user) => user.id);
  const [masteryRows, progressRows, attempts] = await Promise.all([
    SkillMastery.findByUserIds(learnerIds),
    fetchProgressByUserIds(learnerIds),
    SkillAttempt.listByUserIds(learnerIds, { limitPerUser: 200 })
  ]);

  const titleById = await Lesson.findTitlesByIds(
    progressRows.map((row) => row.lesson_id).filter(Boolean)
  );

  const masteryByUser = groupByUserId(masteryRows, 'userId');
  const progressByUser = groupByUserId(progressRows, 'user_id');
  const attemptsByUser = groupByUserId(attempts, 'userId');
  const generatedAt = new Date().toISOString();

  const reports = learners.map((learner) =>
    buildReportPayload({
      learner: publicLearner(learner),
      masteryRows: masteryByUser.get(learner.id) || [],
      progressRows: progressByUser.get(learner.id) || [],
      attempts: attemptsByUser.get(learner.id) || [],
      titleById,
      generatedAt
    })
  );

  reports.sort((a, b) => String(a.learner.name || '').localeCompare(String(b.learner.name || '')));

  return {
    generatedAt,
    reports,
    classInsights: reports.length > 1 ? buildClassInsights(reports) : null
  };
};

export const generateLearnerReport = async (userId, learnerHint = null) => {
  const user = learnerHint || (await User.findById(userId));
  if (!user) {
    throw Object.assign(new Error('Learner not found'), { status: 404 });
  }
  const result = await generateLearnerReports([user.id]);
  if (!result.reports[0]) {
    throw Object.assign(new Error('Learner not found'), { status: 404 });
  }
  return result.reports[0];
};
