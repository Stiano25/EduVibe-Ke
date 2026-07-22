import { getDbClient } from '../../config/supabase.js';
import { SkillMastery } from '../../models/SkillAttempt.js';
import { Lesson } from '../../models/Lesson.js';

const getUserId = (req) => req.user?.id || null;

/** Aggregate learner progress for dashboard + PDF report */
export const getProgressReport = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDbClient();
    const { data: progressRows, error } = await db
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const mastery = await SkillMastery.findByUser(userId);
    const masteryCounts = {
      unknown: 0,
      struggling: 0,
      scaffolding: 0,
      developing: 0,
      mastered: 0
    };
    for (const m of mastery) {
      if (masteryCounts[m.status] !== undefined) masteryCounts[m.status] += 1;
      else masteryCounts.unknown += 1;
    }

    const recent = [];
    for (const row of progressRows || []) {
      let title = 'Lesson';
      try {
        const lesson = await Lesson.findById(row.lesson_id);
        if (lesson) title = lesson.title;
      } catch {
        /* ignore */
      }
      recent.push({
        lessonId: row.lesson_id,
        title,
        progress: row.progress ?? 0,
        completed: !!row.completed,
        completedAt: row.completed_at || null,
        lastAccessed: row.last_accessed || row.updated_at,
        scorePercentage: row.session_review?.score?.percentage ?? row.progress ?? null,
        scoreCorrect: row.session_review?.score?.correct ?? null,
        scoreTotal: row.session_review?.score?.total ?? null
      });
    }

    const completed = recent.filter((r) => r.completed).length;
    const inProgress = recent.filter((r) => !r.completed && (r.progress || 0) > 0).length;

    res.json({
      learner: {
        id: userId,
        name: req.user?.name || null,
        email: req.user?.email || null,
        grade: req.user?.grade || null
      },
      generatedAt: new Date().toISOString(),
      summary: {
        lessonsTracked: recent.length,
        completed,
        inProgress,
        averageScore:
          recent.filter((r) => r.scorePercentage != null).length > 0
            ? Math.round(
                recent
                  .filter((r) => r.scorePercentage != null)
                  .reduce((s, r) => s + r.scorePercentage, 0) /
                  recent.filter((r) => r.scorePercentage != null).length
              )
            : null
      },
      masteryCounts,
      skillsNeedingPractice: mastery
        .filter((m) => m.status === 'struggling' || m.status === 'scaffolding')
        .slice(0, 12)
        .map((m) => ({
          skillFocus: m.skillFocus,
          learningOutcomeKey: m.learningOutcomeKey,
          status: m.status
        })),
      recentLessons: recent.slice(0, 40)
    });
  } catch (error) {
    console.error('Error building progress report:', error);
    res.status(500).json({ error: 'Failed to build progress report' });
  }
};
