import { Subject } from '../../models/Subject.js';
import { Strand } from '../../models/Strand.js';
import { SubStrand } from '../../models/SubStrand.js';
import { Lesson } from '../../models/Lesson.js';
import { findSimilarLessonsWithAI } from '../../admin/services/aiService.js';
import { User } from '../../models/User.js';
import { getDbClient } from '../../config/supabase.js';
import { progressMeetsUnlock, lessonIsDone } from '../../utils/lessonUnlock.js';
import { loadStrandUnitUnlock } from '../services/unitGatingService.js';

const GRADE_ORDER = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

/** Resolve authenticated user id from JWT (set by authenticate middleware) */
const getUserId = (req) => req.user?.id || null;

/** Resolve learner grade from JWT, with DB refresh as fallback */
const getUserGrade = async (req) => {
  if (req.user?.grade) return req.user.grade;

  const userId = getUserId(req);
  if (!userId) return null;

  try {
    const user = await User.findById(userId, true);
    return user?.grade || null;
  } catch (error) {
    if (error.code !== '22P02') {
      console.error('Error fetching user grade:', error.message || error);
    }
    return null;
  }
};

const requireUserId = (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'User ID required' });
    return null;
  }
  return userId;
};

/** Insert or update a lesson_progress row */
const upsertLessonProgress = async (userId, lessonId, fields) => {
  const db = getDbClient();
  const { data: existing, error: findError } = await db
    .from('lesson_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (findError) throw findError;

  const progressData = {
    user_id: userId,
    lesson_id: lessonId,
    last_accessed: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...fields
  };

  if (existing) {
    const { data, error } = await db
      .from('lesson_progress')
      .update(progressData)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await db
    .from('lesson_progress')
    .insert(progressData)
    .select()
    .single();
  if (error) throw error;
  return data;
};

/**
 * Strip the answer key from a quiz before sending it to a learner.
 * Keeps only per-question metadata (for skill filtering and counts) plus the
 * visual briefs/assets needed to render diagrams. Stems, options, correct
 * answers and explanations are served one-by-one via the adaptive endpoints.
 */
const sanitizeQuizForLearner = (quiz) => {
  if (!quiz) return null;
  return {
    title: quiz.title || 'Quiz Challenge',
    passingScore: quiz.passingScore ?? 65,
    timeLimit: quiz.timeLimit ?? 12,
    questionCount: (quiz.questions || []).length,
    questions: (quiz.questions || []).map((q) => ({
      id: q.id,
      learningOutcomeIndex: q.learningOutcomeIndex,
      learningOutcomeKey: q.learningOutcomeKey,
      skillFocus: q.skillFocus,
      bloomLevel: q.bloomLevel,
      modality: q.modality
    })),
    visualBriefs: quiz.visualBriefs || [],
    visualAssets: quiz.visualAssets || [],
    contentBlocks: quiz.contentBlocks || []
  };
};

const mapLessonRow = (item, { lowerGrade, strandMap } = {}) => ({
  id: item.id,
  title: item.title,
  description: item.description,
  strandId: item.strand_id,
  subStrandId: item.sub_strand_id,
  subjectId: item.subject_id,
  grade: item.grade || lowerGrade,
  contentType: item.content_type,
  difficulty: item.difficulty,
  tags: item.tags || [],
  duration: item.duration,
  videoUrl: item.video_url,
  content: item.content,
  images: item.images || [],
  videos: item.videos || [],
  learningObjectives: item.learning_objectives || [],
  keyConcepts: item.key_concepts || [],
  examples: item.examples || [],
  summary: item.summary,
  quiz: sanitizeQuizForLearner(item.quiz),
  isAIGenerated: item.is_ai_generated,
  status: item.status,
  approvedAt: item.approved_at,
  approvedBy: item.approved_by,
  lessonOrder: item.lesson_order || 0,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  ...(strandMap ? { strandName: strandMap[item.strand_id] || '' } : {})
});

// Get subjects for learner's grade (only subjects with strands)
export const getLearnerSubjects = async (req, res) => {
  try {
    if (!requireUserId(req, res)) return;

    const grade = await getUserGrade(req);
    if (!grade) {
      return res.status(400).json({ error: 'Grade not set for user' });
    }

    const subjects = await Subject.findByGrade(grade);
    if (subjects.length === 0) {
      return res.json([]);
    }

    const subjectIdsWithStrands = await Strand.findSubjectIdsHavingAny(
      subjects.map((subject) => subject.id)
    );

    res.json(subjects.filter((subject) => subjectIdsWithStrands.has(subject.id)));
  } catch (error) {
    console.error('Error fetching learner subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

// Get strands for a subject
export const getLearnerStrands = async (req, res) => {
  try {
    if (!requireUserId(req, res)) return;

    const { subjectId } = req.params;
    const grade = await getUserGrade(req);

    const subject = await Subject.findById(subjectId);
    if (!subject || subject.grade !== grade) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const strands = await Strand.findBySubject(subjectId);
    if (strands.length === 0) {
      return res.json([]);
    }

    // Prefer the copy that has sub-strands (useful after duplicate PDF parses)
    const strandIdsWithSubstrands = await SubStrand.findStrandIdsHavingAny(
      strands.map((strand) => strand.id)
    );

    const withContent = strands.filter((strand) =>
      strandIdsWithSubstrands.has(strand.id)
    );
    const source = withContent.length > 0 ? withContent : strands;

    // Curriculum order, collapse near-duplicate names from re-parsed PDFs
    res.json(Strand.dedupeByNamePreserveOrder(source));
  } catch (error) {
    console.error('Error fetching learner strands:', error);
    res.status(500).json({ error: 'Failed to fetch strands' });
  }
};

/** Single subject for the learner's grade */
export const getLearnerSubject = async (req, res) => {
  try {
    if (!requireUserId(req, res)) return;

    const grade = await getUserGrade(req);
    const subject = await Subject.findById(req.params.id);
    if (!subject || subject.grade !== grade) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(subject);
  } catch (error) {
    console.error('Error fetching learner subject:', error);
    res.status(500).json({ error: 'Failed to fetch subject' });
  }
};

/** Single strand belonging to the learner's grade */
export const getLearnerStrand = async (req, res) => {
  try {
    if (!requireUserId(req, res)) return;

    const grade = await getUserGrade(req);
    const strand = await Strand.findById(req.params.id);
    if (!strand) {
      return res.status(404).json({ error: 'Strand not found' });
    }

    const subject = await Subject.findById(strand.subjectId);
    if (!subject || subject.grade !== grade) {
      return res.status(404).json({ error: 'Strand not found' });
    }

    res.json(strand);
  } catch (error) {
    console.error('Error fetching learner strand:', error);
    res.status(500).json({ error: 'Failed to fetch strand' });
  }
};

/** Single sub-strand belonging to the learner's grade */
export const getLearnerSubstrandById = async (req, res) => {
  try {
    if (!requireUserId(req, res)) return;

    const grade = await getUserGrade(req);
    const substrand = await SubStrand.findById(req.params.id);
    if (!substrand) {
      return res.status(404).json({ error: 'Substrand not found' });
    }

    const subject = await Subject.findById(substrand.subjectId);
    if (!subject || subject.grade !== grade) {
      return res.status(404).json({ error: 'Substrand not found' });
    }

    res.json(substrand);
  } catch (error) {
    console.error('Error fetching learner substrand:', error);
    res.status(500).json({ error: 'Failed to fetch substrand' });
  }
};

/** Single approved lesson belonging to the learner's grade */
export const getLearnerLesson = async (req, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const grade = await getUserGrade(req);
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson || lesson.status !== 'approved') {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    if (grade && lesson.grade !== grade) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const db = getDbClient();
    const { data: progress } = await db
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lesson.id)
      .maybeSingle();

    let isUnlocked = true;
    if (lesson.subStrandId) {
      const substrand = await SubStrand.findById(lesson.subStrandId);
      if (substrand) {
        const { flagsById } = await loadStrandUnitUnlock(userId, substrand.strandId);
        isUnlocked = flagsById.get(substrand.id) !== false;
        if (isUnlocked) {
          const siblings = (await Lesson.findBySubStrand(substrand.id))
            .filter((l) => l.status === 'approved')
            .sort((a, b) => (a.lessonOrder || 0) - (b.lessonOrder || 0));
          const index = siblings.findIndex((l) => l.id === lesson.id);
          if (index > 0) {
            const prev = siblings[index - 1];
            const { data: prevProgress } = await db
              .from('lesson_progress')
              .select('progress, completed')
              .eq('user_id', userId)
              .eq('lesson_id', prev.id)
              .maybeSingle();
            isUnlocked = progressMeetsUnlock(prevProgress);
          }
        }
      }
    }

    res.json({
      ...lesson,
      quiz: sanitizeQuizForLearner(lesson.quiz),
      progress: progress?.progress ?? 0,
      isCompleted: lessonIsDone(progress),
      isUnlocked,
      sessionReview: progress?.session_review || null
    });
  } catch (error) {
    console.error('Error fetching learner lesson:', error);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
};

// Get substrands for a strand
export const getLearnerSubstrands = async (req, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const { strandId } = req.params;
    const grade = await getUserGrade(req);

    const strand = await Strand.findById(strandId);
    if (!strand) {
      return res.status(404).json({ error: 'Strand not found' });
    }

    const subject = await Subject.findById(strand.subjectId);
    if (!subject || subject.grade !== grade) {
      return res.status(404).json({ error: 'Strand not found' });
    }

    const substrands = await SubStrand.findByStrand(strandId);
    if (substrands.length === 0) {
      return res.json([]);
    }

    const { flagsById, lessonsBySub, progressByLessonId, unitsBySubStrandId } = await loadStrandUnitUnlock(
      userId,
      strandId
    );

    const visible = substrands.filter((substrand) => (lessonsBySub.get(substrand.id) || []).length > 0);
    if (visible.length === 0) {
      return res.json([]);
    }

    res.json(
      visible.map((substrand) => {
        const lessons = lessonsBySub.get(substrand.id) || [];
        const total = lessons.length;
        let progressPercent = 0;
        if (total > 0) {
          const sum = lessons.reduce((acc, lesson) => {
            const p = progressByLessonId.get(lesson.id);
            if (!p) return acc;
            if (p.completed) return acc + 100;
            return acc + Math.max(0, Math.min(100, Number(p.progress) || 0));
          }, 0);
          progressPercent = Math.round(sum / total);
        }
        const estimatedMinutes = lessons.reduce(
          (acc, lesson) => acc + (Number(lesson.duration) || 10),
          0
        );

        return {
          ...substrand,
          unitId: unitsBySubStrandId.get(substrand.id)?.id ?? null,
          lessonCount: total,
          progressPercent,
          estimatedMinutes: estimatedMinutes || total * 10,
          isUnlocked: flagsById.get(substrand.id) !== false
        };
      })
    );
  } catch (error) {
    console.error('Error fetching learner substrands:', error);
    res.status(500).json({ error: 'Failed to fetch substrands' });
  }
};

// Get approved lessons for a substrand with unlock status
export const getLearnerLessons = async (req, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const { substrandId } = req.params;
    const grade = await getUserGrade(req);
    
    // Get substrand and verify it belongs to learner's grade
    const substrand = await SubStrand.findById(substrandId);
    if (!substrand) {
      return res.status(404).json({ error: 'Substrand not found' });
    }

    const subject = await Subject.findById(substrand.subjectId);
    if (!subject || subject.grade !== grade) {
      return res.status(404).json({ error: 'Substrand not found' });
    }

    // Get strand to access theme information
    const strand = await Strand.findById(substrand.strandId);
    const theme = strand?.theme || null;

    // Get all approved lessons for this substrand, ordered by lesson_order
    const allLessons = await Lesson.findBySubStrand(substrandId);
    const approvedLessons = allLessons
      .filter(l => l.status === 'approved')
      .sort((a, b) => (a.lessonOrder || 0) - (b.lessonOrder || 0));

    // Get user's progress for these lessons
    const { data: progressData, error: progressError } = await getDbClient()
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .in('lesson_id', approvedLessons.map(l => l.id));

    if (progressError) {
      console.error('Error fetching progress:', progressError);
    }

    const progressMap = {};
    if (progressData) {
      progressData.forEach(p => {
        progressMap[p.lesson_id] = {
          completed: p.completed,
          progress: p.progress,
          lastAccessed: p.last_accessed
        };
      });
    }

    // Determine unlock status for each lesson and include theme
    const { flagsById } = await loadStrandUnitUnlock(userId, substrand.strandId);
    const unitUnlocked = flagsById.get(substrandId) !== false;

    const lessonsWithUnlock = approvedLessons.map((lesson, index) => {
      const progress = progressMap[lesson.id] || { completed: false, progress: 0 };
      const isFirst = index === 0;
      const previousLesson = index > 0 ? approvedLessons[index - 1] : null;
      const previousProgress = previousLesson ? progressMap[previousLesson.id] : null;
      const isUnlocked =
        unitUnlocked && (isFirst || progressMeetsUnlock(previousProgress));

      return {
        ...lesson,
        quiz: sanitizeQuizForLearner(lesson.quiz),
        theme: theme, // Include theme from strand
        isUnlocked,
        isCompleted: lessonIsDone(progress),
        progress: progress.progress,
        lastAccessed: progress.lastAccessed
      };
    });

    res.json(lessonsWithUnlock);
  } catch (error) {
    console.error('Error fetching learner lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
};

/** Lessons with a quiz bank must be completed via the adaptive quiz endpoints. */
const hasQuizBank = (lesson) => (lesson?.quiz?.questions || []).length > 0;

// Mark lesson as completed (content-only lessons). Quiz lessons use adaptive-next.
export const completeLesson = async (req, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const { lessonId } = req.params;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson || lesson.status !== 'approved') {
      return res.status(404).json({ error: 'Lesson not found or not approved' });
    }

    if (hasQuizBank(lesson)) {
      return res.status(403).json({
        error: 'This lesson has a quiz — complete it through the adaptive quiz session'
      });
    }

    const grade = await getUserGrade(req);
    if (grade && lesson.grade !== grade) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const progress = await upsertLessonProgress(userId, lessonId, {
      completed: true,
      progress: 100,
      completed_at: new Date().toISOString()
    });
    res.json({ message: 'Lesson completed', progress });
  } catch (error) {
    console.error('Error completing lesson:', error);
    res.status(500).json({ error: 'Failed to complete lesson' });
  }
};

// Update lesson progress — never allow clients to mark quiz lessons complete.
export const updateLessonProgress = async (req, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const { lessonId } = req.params;
    const { progress } = req.body;

    if (progress < 0 || progress > 100) {
      return res.status(400).json({ error: 'Progress must be between 0 and 100' });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson || lesson.status !== 'approved') {
      return res.status(404).json({ error: 'Lesson not found or not approved' });
    }

    const grade = await getUserGrade(req);
    if (grade && lesson.grade !== grade) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (hasQuizBank(lesson) && progress >= 60) {
      return res.status(403).json({
        error: 'Quiz progress is recorded only by the adaptive quiz session'
      });
    }

    const record = await upsertLessonProgress(userId, lessonId, {
      progress,
      completed: !hasQuizBank(lesson) && progress >= 100,
      completed_at:
        !hasQuizBank(lesson) && progress >= 100 ? new Date().toISOString() : null
    });
    res.json({ message: 'Progress updated', progress: record });
  } catch (error) {
    console.error('Error updating lesson progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
};

// Get similar lessons from lower grades (for remediation)
export const getSimilarLessonsFromLowerGrades = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const grade = await getUserGrade(req);

    if (!grade) {
      return res.status(400).json({ error: 'User grade is required' });
    }

    const currentLesson = await Lesson.findById(lessonId);
    if (!currentLesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const strand = await Strand.findById(currentLesson.strandId);
    if (!strand) {
      return res.status(404).json({ error: 'Strand not found' });
    }

    const subject = await Subject.findById(currentLesson.subjectId);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const strandName = strand.name;
    const subjectName = subject.name;
    const currentGradeNum = grade === 'K' ? 0 : parseInt(grade, 10);
    const candidateLessons = [];
    const db = getDbClient();

    for (let i = currentGradeNum - 1; i >= 0; i--) {
      const lowerGrade = GRADE_ORDER[i];

      const { data: lowerGradeSubjects, error: subjectError } = await db
        .from('subjects')
        .select('id, name, grade')
        .eq('name', subjectName)
        .eq('grade', lowerGrade);

      if (subjectError || !lowerGradeSubjects?.length) continue;

      const subjectIds = lowerGradeSubjects.map((s) => s.id);
      const { data: allStrands, error: strandError } = await db
        .from('strands')
        .select('id, name, theme')
        .in('subject_id', subjectIds);

      if (strandError || !allStrands?.length) continue;

      const strandMap = Object.fromEntries(allStrands.map((s) => [s.id, s.name]));
      const { data: lessons, error: lessonError } = await db
        .from('lessons')
        .select('*')
        .in('strand_id', allStrands.map((s) => s.id))
        .eq('status', 'approved')
        .limit(20);

      if (!lessonError && lessons?.length) {
        candidateLessons.push(
          ...lessons.map((item) => mapLessonRow(item, { lowerGrade, strandMap }))
        );
      }
    }

    if (candidateLessons.length === 0) {
      return res.json([]);
    }

    const similarLessons = await findSimilarLessonsWithAI(
      {
        title: currentLesson.title,
        description: currentLesson.description || '',
        strandName,
        grade
      },
      candidateLessons
    );

    const userId = getUserId(req);
    if (userId && similarLessons.length > 0) {
      const lessonIds = similarLessons.map((l) => l.id);
      const { data: progressData, error: progressError } = await db
        .from('lesson_progress')
        .select('lesson_id, completed, progress')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds);

      if (!progressError && progressData) {
        const doneIds = new Set(
          progressData.filter((p) => lessonIsDone(p)).map((p) => p.lesson_id)
        );
        const filtered = similarLessons.filter((lesson) => !doneIds.has(lesson.id));
        return res.json(filtered.slice(0, 3));
      }
    }

    res.json(similarLessons.slice(0, 3));
  } catch (error) {
    console.error('Error finding similar lessons:', error);
    res.status(500).json({ error: 'Failed to find similar lessons' });
  }
};

// Get next lessons in the same sub-strand and check if user can proceed to next sub-strand
export const getNextLessonsInSubstrand = async (req, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const { lessonId } = req.params;
    
    // Get the current lesson
    const currentLesson = await Lesson.findById(lessonId);
    if (!currentLesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const substrandId = currentLesson.subStrandId;
    if (!substrandId) {
      return res.status(400).json({ error: 'Lesson does not have a sub-strand' });
    }

    // Get all approved lessons for this sub-strand, ordered by lesson_order
    const allLessons = await Lesson.findBySubStrand(substrandId);
    const approvedLessons = allLessons
      .filter(l => l.status === 'approved')
      .sort((a, b) => (a.lessonOrder || 0) - (b.lessonOrder || 0));

    // Get user's progress for these lessons
    const { data: progressData, error: progressError } = await getDbClient()
      .from('lesson_progress')
      .select('lesson_id, completed, progress')
      .eq('user_id', userId)
      .in('lesson_id', approvedLessons.map(l => l.id));

    if (progressError) {
      console.error('Error fetching progress:', progressError);
    }

    const progressMap = {};
    if (progressData) {
      progressData.forEach(p => {
        progressMap[p.lesson_id] = {
          completed: p.completed,
          progress: p.progress
        };
      });
    }

    // Count done lessons (lenient pass rule — same as unlock / node display)
    const completedCount = approvedLessons.filter((l) => lessonIsDone(progressMap[l.id])).length;

    // Find current lesson index
    const currentIndex = approvedLessons.findIndex(l => l.id === lessonId);
    
    // Get next unfinished lessons after current lesson
    const nextLessons = approvedLessons
      .slice(currentIndex + 1)
      .filter((l) => !lessonIsDone(progressMap[l.id]))
      .slice(0, 3); // Max 3 next lessons

    // Get next sub-strand if 3+ lessons completed
    let nextSubstrand = null;
    let subjectId = null;
    let strandId = null;
    
    if (completedCount >= 3) {
      const substrand = await SubStrand.findById(substrandId);
      if (substrand) {
        subjectId = substrand.subjectId;
        strandId = substrand.strandId;
        
        // Get all sub-strands in the same strand
        const allSubstrands = await SubStrand.findByStrand(substrand.strandId);
        const sortedSubstrands = allSubstrands.sort((a, b) => 
          (a.name || '').localeCompare(b.name || '')
        );
        
        // Find current sub-strand index
        const currentSubstrandIndex = sortedSubstrands.findIndex(s => s.id === substrandId);
        
        // Get next sub-strand
        if (currentSubstrandIndex < sortedSubstrands.length - 1) {
          nextSubstrand = sortedSubstrands[currentSubstrandIndex + 1];
        }
      }
    }

    res.json({
      nextLessons: nextLessons.map(l => ({
        id: l.id,
        title: l.title,
        description: l.description,
        grade: l.grade,
        difficulty: l.difficulty,
        lessonOrder: l.lessonOrder
      })),
      completedCount,
      canProceedToNextSubstrand: completedCount >= 3,
      nextSubstrand: nextSubstrand ? {
        id: nextSubstrand.id,
        name: nextSubstrand.name,
        description: nextSubstrand.description,
        subjectId: subjectId,
        strandId: strandId
      } : null
    });
  } catch (error) {
    console.error('Error getting next lessons:', error);
    res.status(500).json({ error: 'Failed to get next lessons' });
  }
};

