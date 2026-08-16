import { Lesson } from '../../models/Lesson.js';
import { Subject } from '../../models/Subject.js';
import { SkillMastery } from '../../models/SkillAttempt.js';
import { LearnerProfile } from '../../models/LearnerProfile.js';
import { outcomeKey } from '../../utils/outcomeKey.js';
import { getDbClient } from '../../config/supabase.js';

const GRADE_ORDER = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const lowerGrade = (grade) => {
  const idx = GRADE_ORDER.indexOf(String(grade));
  if (idx <= 0) return null;
  return GRADE_ORDER[idx - 1];
};

/**
 * After 2 fails on a skill at grade G, find an approved lower-grade lesson
 * that teaches the same learning outcome (by outcome key), prefer modality.
 */
export const findScaffoldLesson = async (userId, { learningOutcomeKey, skillFocus, gradeLevel, lessonId }) => {
  const profile = await LearnerProfile.getOrCreate(userId);
  const tolerance = profile.scaffoldTolerance || 2;

  const mastery = learningOutcomeKey
    ? await SkillMastery.findByUserAndOutcome(userId, learningOutcomeKey)
    : null;

  const needsScaffold =
    (mastery?.consecutiveFailsAtLevel || 0) >= tolerance ||
    mastery?.status === 'scaffolding';

  if (!needsScaffold) {
    return { needsScaffold: false, scaffoldLesson: null, profile, mastery };
  }

  try {
    const { tryRouteViaApprovedLayer2Edge } = await import('./layer2PrerequisiteService.js');
    const viaEdge = await tryRouteViaApprovedLayer2Edge(userId, {
      learningOutcomeKey,
      gradeLevel: gradeLevel || mastery?.currentGradeLevel,
      consecutiveFails: mastery?.consecutiveFailsAtLevel || null
    });
    if (viaEdge?.scaffoldLesson) {
      return {
        needsScaffold: true,
        scaffoldLesson: viaEdge.scaffoldLesson,
        targetGrade: viaEdge.scaffoldLesson.grade,
        preferredModality:
          mastery?.preferredModalityObserved || profile.preferredModality || 'mixed',
        profile,
        mastery,
        viaPrerequisiteEdge: {
          edgeId: viaEdge.edge.id,
          eventId: viaEdge.event?.id || null,
          reason: viaEdge.edge.reason,
          confidence: viaEdge.edge.confidence
        }
      };
    }
  } catch (err) {
    console.warn('Layer 2 scaffold route skipped:', err.message || err);
  }

  const targetGrade = lowerGrade(gradeLevel || mastery?.currentGradeLevel);
  if (!targetGrade) {
    return { needsScaffold: true, scaffoldLesson: null, profile, mastery, reason: 'no_lower_grade' };
  }

  const currentLesson = lessonId ? await Lesson.findById(lessonId) : null;
  const subject = currentLesson ? await Subject.findById(currentLesson.subjectId) : null;

  const db = getDbClient();
  let query = db
    .from('lessons')
    .select('*')
    .eq('status', 'approved')
    .eq('grade', targetGrade)
    .order('lesson_order', { ascending: true })
    .limit(40);

  if (subject?.name) {
    // Prefer same subject name via subject_id list
    const subjects = await Subject.findByGrade(targetGrade);
    const sameNameIds = subjects
      .filter((s) => s.name.toLowerCase() === subject.name.toLowerCase())
      .map((s) => s.id);
    if (sameNameIds.length) {
      query = query.in('subject_id', sameNameIds);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  const preferred =
    mastery?.preferredModalityObserved ||
    profile.preferredModality ||
    'mixed';

  const scored = (data || [])
    .map((row) => Lesson.mapToModel(row))
    .map((lesson) => {
      const objectives = lesson.learningObjectives || [];
      const keys = objectives.map((o) => outcomeKey(o));
      const quizKeys = (lesson.quiz?.questions || [])
        .map((q) => q.learningOutcomeKey)
        .filter(Boolean);
      const allKeys = new Set([...keys, ...quizKeys]);
      const outcomeMatch = learningOutcomeKey && allKeys.has(learningOutcomeKey) ? 3 : 0;

      const focus = (skillFocus || '').toLowerCase();
      const textBlob = `${lesson.title} ${lesson.description} ${(objectives || []).join(' ')}`.toLowerCase();
      const focusMatch = focus && textBlob.includes(focus.slice(0, 20)) ? 2 : 0;

      const hasVisuals = (lesson.images?.length || 0) > 0 || (lesson.visualAssets?.length || 0) > 0;
      const modalityMatch =
        preferred === 'visual' && hasVisuals
          ? 2
          : preferred === 'mixed'
            ? 1
            : 0;

      return { lesson, score: outcomeMatch + focusMatch + modalityMatch };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    needsScaffold: true,
    scaffoldLesson: scored[0]?.lesson || null,
    targetGrade,
    preferredModality: preferred,
    profile,
    mastery
  };
};

export const getOutcomeKeysFromLesson = (lesson) => {
  const fromObjectives = (lesson.learningObjectives || []).map((o) => outcomeKey(o));
  const fromQuiz = (lesson.quiz?.questions || [])
    .map((q) => q.learningOutcomeKey)
    .filter(Boolean);
  return [...new Set([...fromObjectives, ...fromQuiz])];
};
