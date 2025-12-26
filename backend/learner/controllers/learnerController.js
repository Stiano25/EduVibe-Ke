import { Subject } from '../../models/Subject.js';
import { Strand } from '../../models/Strand.js';
import { SubStrand } from '../../models/SubStrand.js';
import { Lesson } from '../../models/Lesson.js';
import { User } from '../../models/User.js';
import { supabase } from '../../config/supabase.js';

// Helper function to get user's grade
// For demo purposes, we'll extract user from headers or use a default
// In production, use proper JWT authentication
const getUserGrade = async (req) => {
  // Try to get user ID from headers (for demo - in production use JWT)
  const userId = req.headers['x-user-id'] || req.body?.userId || req.query?.userId;
  
  if (!userId) {
    // For demo, return null - in production, this should be an error
    return null;
  }

  try {
    const user = await User.findById(userId);
    return user?.grade || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

// Helper to get user ID from request
const getUserId = (req) => {
  return req.headers['x-user-id'] || req.body?.userId || req.query?.userId;
};

// Get subjects for learner's grade (only subjects with strands)
export const getLearnerSubjects = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'User ID required. Please provide x-user-id header or userId in body/query.' });
    }

    const grade = await getUserGrade(req);
    if (!grade) {
      return res.status(400).json({ error: 'Grade not set for user' });
    }

    // Get all subjects for the learner's grade
    const subjects = await Subject.findByGrade(grade);
    
    // Filter subjects that have at least one strand
    const subjectsWithStrands = [];
    for (const subject of subjects) {
      const strands = await Strand.findBySubject(subject.id);
      if (strands.length > 0) {
        subjectsWithStrands.push(subject);
      }
    }

    res.json(subjectsWithStrands);
  } catch (error) {
    console.error('Error fetching learner subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

// Get strands for a subject
export const getLearnerStrands = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const { subjectId } = req.params;
    const grade = await getUserGrade(req);
    
    // Verify subject belongs to learner's grade
    const subject = await Subject.findById(subjectId);
    if (!subject || subject.grade !== grade) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Get strands for this subject
    const strands = await Strand.findBySubject(subjectId);
    
    // Filter strands that have at least one substrand
    const strandsWithSubstrands = [];
    for (const strand of strands) {
      const substrands = await SubStrand.findByStrand(strand.id);
      if (substrands.length > 0) {
        strandsWithSubstrands.push(strand);
      }
    }

    res.json(strandsWithSubstrands);
  } catch (error) {
    console.error('Error fetching learner strands:', error);
    res.status(500).json({ error: 'Failed to fetch strands' });
  }
};

// Get substrands for a strand
export const getLearnerSubstrands = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const { strandId } = req.params;
    const grade = await getUserGrade(req);
    
    // Get strand and verify it belongs to learner's grade
    const strand = await Strand.findById(strandId);
    if (!strand) {
      return res.status(404).json({ error: 'Strand not found' });
    }

    const subject = await Subject.findById(strand.subjectId);
    if (!subject || subject.grade !== grade) {
      return res.status(404).json({ error: 'Strand not found' });
    }

    // Get substrands for this strand
    const substrands = await SubStrand.findByStrand(strandId);
    
    // Filter substrands that have at least one approved lesson
    const substrandsWithLessons = [];
    for (const substrand of substrands) {
      const lessons = await Lesson.findBySubStrand(substrand.id);
      const approvedLessons = lessons.filter(l => l.status === 'approved');
      if (approvedLessons.length > 0) {
        substrandsWithLessons.push(substrand);
      }
    }

    res.json(substrandsWithLessons);
  } catch (error) {
    console.error('Error fetching learner substrands:', error);
    res.status(500).json({ error: 'Failed to fetch substrands' });
  }
};

// Get approved lessons for a substrand with unlock status
export const getLearnerLessons = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

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

    // Get all approved lessons for this substrand, ordered by lesson_order
    const allLessons = await Lesson.findBySubStrand(substrandId);
    const approvedLessons = allLessons
      .filter(l => l.status === 'approved')
      .sort((a, b) => (a.lessonOrder || 0) - (b.lessonOrder || 0));

    // Get user's progress for these lessons
    const { data: progressData, error: progressError } = await supabase
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

    // Determine unlock status for each lesson
    const lessonsWithUnlock = approvedLessons.map((lesson, index) => {
      const progress = progressMap[lesson.id] || { completed: false, progress: 0 };
      const isFirst = index === 0;
      const previousLesson = index > 0 ? approvedLessons[index - 1] : null;
      const previousProgress = previousLesson ? progressMap[previousLesson.id] : null;
      const isUnlocked = isFirst || (previousProgress?.completed === true);

      return {
        ...lesson,
        isUnlocked,
        isCompleted: progress.completed,
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

// Mark lesson as completed
export const completeLesson = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const { lessonId } = req.params;

    // Check if lesson exists and is approved
    const lesson = await Lesson.findById(lessonId);
    if (!lesson || lesson.status !== 'approved') {
      return res.status(404).json({ error: 'Lesson not found or not approved' });
    }

    // Verify user's grade matches lesson grade (optional check for demo)
    const grade = await getUserGrade(req);
    if (grade && lesson.grade !== grade) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update or create progress record
    const { data: existingProgress, error: findError } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single();

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = not found
      throw findError;
    }

    const progressData = {
      user_id: userId,
      lesson_id: lessonId,
      completed: true,
      progress: 100,
      completed_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingProgress) {
      const { data, error } = await supabase
        .from('lesson_progress')
        .update(progressData)
        .eq('id', existingProgress.id)
        .select()
        .single();
      
      if (error) throw error;
      res.json({ message: 'Lesson completed', progress: data });
    } else {
      const { data, error } = await supabase
        .from('lesson_progress')
        .insert(progressData)
        .select()
        .single();
      
      if (error) throw error;
      res.json({ message: 'Lesson completed', progress: data });
    }
  } catch (error) {
    console.error('Error completing lesson:', error);
    res.status(500).json({ error: 'Failed to complete lesson' });
  }
};

// Update lesson progress
export const updateLessonProgress = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const { lessonId } = req.params;
    const { progress } = req.body;

    if (progress < 0 || progress > 100) {
      return res.status(400).json({ error: 'Progress must be between 0 and 100' });
    }

    // Check if lesson exists and is approved
    const lesson = await Lesson.findById(lessonId);
    if (!lesson || lesson.status !== 'approved') {
      return res.status(404).json({ error: 'Lesson not found or not approved' });
    }

    // Verify user's grade matches lesson grade (optional check for demo)
    const grade = await getUserGrade(req);
    if (grade && lesson.grade !== grade) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update or create progress record
    const { data: existingProgress, error: findError } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single();

    const progressData = {
      user_id: userId,
      lesson_id: lessonId,
      progress: progress,
      completed: progress >= 100,
      completed_at: progress >= 100 ? new Date().toISOString() : null,
      last_accessed: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingProgress) {
      const { data, error } = await supabase
        .from('lesson_progress')
        .update(progressData)
        .eq('id', existingProgress.id)
        .select()
        .single();
      
      if (error) throw error;
      res.json({ message: 'Progress updated', progress: data });
    } else {
      const { data, error } = await supabase
        .from('lesson_progress')
        .insert(progressData)
        .select()
        .single();
      
      if (error) throw error;
      res.json({ message: 'Progress updated', progress: data });
    }
  } catch (error) {
    console.error('Error updating lesson progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
};

