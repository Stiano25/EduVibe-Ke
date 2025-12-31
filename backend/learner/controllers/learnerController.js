import { Subject } from '../../models/Subject.js';
import { Strand } from '../../models/Strand.js';
import { SubStrand } from '../../models/SubStrand.js';
import { Lesson } from '../../models/Lesson.js';
import { findSimilarLessonsWithAI } from '../../admin/services/aiService.js';
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
    if (user) {
      return user.grade || null;
    }
    
    // If user doesn't exist, try to get grade from request body/headers as fallback
    // This is for demo purposes - in production, users should exist in DB
    const gradeFromRequest = req.body?.grade || req.headers['x-user-grade'];
    if (gradeFromRequest) {
      return gradeFromRequest;
    }
    
    return null;
  } catch (error) {
    // Handle invalid UUID format or other errors
    if (error.code === '22P02' || error.code === 'PGRST116') {
      // Invalid UUID or user not found - try to get grade from request
      const gradeFromRequest = req.body?.grade || req.headers['x-user-grade'];
      if (gradeFromRequest) {
        return gradeFromRequest;
      }
    }
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

    // Get strand to access theme information
    const strand = await Strand.findById(substrand.strandId);
    const theme = strand?.theme || null;

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

    // Determine unlock status for each lesson and include theme
    const lessonsWithUnlock = approvedLessons.map((lesson, index) => {
      const progress = progressMap[lesson.id] || { completed: false, progress: 0 };
      const isFirst = index === 0;
      const previousLesson = index > 0 ? approvedLessons[index - 1] : null;
      const previousProgress = previousLesson ? progressMap[previousLesson.id] : null;
      // Unlock if previous lesson is completed (100%) OR has progress >= 60% (passed threshold)
      const isUnlocked = isFirst || (previousProgress?.completed === true) || (previousProgress?.progress >= 60);

      return {
        ...lesson,
        theme: theme, // Include theme from strand
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

// Get similar lessons from lower grades (for remediation)
export const getSimilarLessonsFromLowerGrades = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const grade = await getUserGrade(req);
    
    if (!grade) {
      return res.status(400).json({ error: 'User grade is required' });
    }

    // Get the current lesson
    const currentLesson = await Lesson.findById(lessonId);
    if (!currentLesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    console.log('🔍 Searching for similar lessons...');
    console.log('Current lesson:', {
      id: currentLesson.id,
      title: currentLesson.title,
      strandId: currentLesson.strandId,
      subjectId: currentLesson.subjectId,
      grade: currentLesson.grade
    });

    // Get strand to find theme
    const strand = await Strand.findById(currentLesson.strandId);
    if (!strand) {
      console.log('❌ Strand not found for lesson:', currentLesson.strandId);
      return res.status(404).json({ error: 'Strand not found' });
    }

    // Get subject to find subject name
    const subject = await Subject.findById(currentLesson.subjectId);
    if (!subject) {
      console.log('❌ Subject not found for lesson:', currentLesson.subjectId);
      return res.status(404).json({ error: 'Subject not found' });
    }

    const theme = strand.theme;
    const strandName = strand.name; // Also match by strand name/topic
    const subjectName = subject.name;
    const currentGradeNum = grade === 'K' ? 0 : parseInt(grade);

    console.log('📋 Search criteria:', {
      currentGrade: grade,
      currentGradeNum,
      subjectName,
      strandName,
      theme: theme || 'N/A'
    });

    // NEW APPROACH: Collect all candidate lessons from lower grades, then use AI to find similar ones
    const candidateLessons = [];
    const gradesToTry = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    
    console.log('\n📚 Step 1: Collecting all candidate lessons from lower grades...');
    
    // Collect all approved lessons from lower grades in the same subject
    for (let i = currentGradeNum - 1; i >= 0; i--) {
      const lowerGrade = gradesToTry[i];
      console.log(`  🔎 Checking Grade ${lowerGrade}...`);
      
      // Find subjects with same name in lower grade
      const { data: lowerGradeSubjects, error: subjectError } = await supabase
        .from('subjects')
        .select('id, name, grade')
        .eq('name', subjectName)
        .eq('grade', lowerGrade);

      if (subjectError) {
        console.log(`  ❌ Error finding subjects:`, subjectError.message);
        continue;
      }

      if (!lowerGradeSubjects || lowerGradeSubjects.length === 0) {
        console.log(`  ⚠️  No subjects named "${subjectName}" in grade ${lowerGrade}`);
        continue;
      }

      const subjectIds = lowerGradeSubjects.map(s => s.id);

      // Get all strands in these subjects
      const { data: allStrands, error: strandError } = await supabase
        .from('strands')
        .select('id, name, theme')
        .in('subject_id', subjectIds);

      if (strandError || !allStrands || allStrands.length === 0) {
        console.log(`  ⚠️  No strands found in grade ${lowerGrade}`);
        continue;
      }

      const strandIds = allStrands.map(s => s.id);

      // Get all approved lessons from these strands
      const { data: lessons, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .in('strand_id', strandIds)
        .eq('status', 'approved')
        .limit(20); // Get up to 20 candidates per grade

      if (!lessonError && lessons && lessons.length > 0) {
        // Create a map of strand IDs to strand names for quick lookup
        const strandMap = {};
        allStrands.forEach(s => {
          strandMap[s.id] = s.name;
        });

        const mappedLessons = lessons.map(item => ({
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
          quiz: item.quiz || null,
          isAIGenerated: item.is_ai_generated,
          status: item.status,
          approvedAt: item.approved_at,
          approvedBy: item.approved_by,
          lessonOrder: item.lesson_order || 0,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          strandName: strandMap[item.strand_id] || ''
        }));
        
        candidateLessons.push(...mappedLessons);
        console.log(`  ✅ Found ${lessons.length} approved lesson(s) in grade ${lowerGrade}`);
      }
    }

    console.log(`\n📊 Total candidate lessons collected: ${candidateLessons.length}`);

    if (candidateLessons.length === 0) {
      console.log('💡 No lessons found in lower grades');
      return res.json([]);
    }

    // Step 2: Use AI to find semantically similar lessons
    console.log('\n🤖 Step 2: Using AI to find semantically similar lessons...');
    const currentLessonInfo = {
      title: currentLesson.title,
      description: currentLesson.description || '',
      strandName: strandName,
      grade: grade
    };

    const similarLessons = await findSimilarLessonsWithAI(currentLessonInfo, candidateLessons);

    // Step 3: Filter out completed lessons
    const userId = getUserId(req);
    if (userId && similarLessons.length > 0) {
      const lessonIds = similarLessons.map(l => l.id);
      
      // Get completion status for these lessons
      const { data: progressData, error: progressError } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds);
      
      if (!progressError && progressData) {
        const completedLessonIds = new Set(
          progressData
            .filter(p => p.completed === true)
            .map(p => p.lesson_id)
        );
        
        // Filter out completed lessons
        const filteredLessons = similarLessons.filter(lesson => !completedLessonIds.has(lesson.id));
        
        console.log(`\n✨ Final result: ${filteredLessons.length} lesson(s) selected (${similarLessons.length - filteredLessons.length} already completed)`);
        if (filteredLessons.length > 0) {
          console.log('   Selected lessons:');
          filteredLessons.forEach((lesson, idx) => {
            console.log(`   ${idx + 1}. "${lesson.title}" (Grade ${lesson.grade})`);
          });
        } else {
          console.log('   ⚠️  All similar lessons have been completed');
        }
        
        return res.json(filteredLessons.slice(0, 3)); // Return max 3 lessons
      }
    }

    console.log(`\n✨ Final result: ${similarLessons.length} lesson(s) selected`);
    if (similarLessons.length > 0) {
      console.log('   Selected lessons:');
      similarLessons.forEach((lesson, idx) => {
        console.log(`   ${idx + 1}. "${lesson.title}" (Grade ${lesson.grade})`);
      });
    } else {
      console.log('   ⚠️  No lessons selected - this might indicate an issue');
    }
    
    res.json(similarLessons.slice(0, 3)); // Return max 3 lessons
  } catch (error) {
    console.error('Error finding similar lessons:', error);
    res.status(500).json({ error: 'Failed to find similar lessons' });
  }
};

// Get next lessons in the same sub-strand and check if user can proceed to next sub-strand
export const getNextLessonsInSubstrand = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

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
    const { data: progressData, error: progressError } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', userId)
      .in('lesson_id', approvedLessons.map(l => l.id));

    if (progressError) {
      console.error('Error fetching progress:', progressError);
    }

    const progressMap = {};
    if (progressData) {
      progressData.forEach(p => {
        progressMap[p.lesson_id] = {
          completed: p.completed
        };
      });
    }

    // Count completed lessons
    const completedCount = approvedLessons.filter(l => progressMap[l.id]?.completed === true).length;

    // Find current lesson index
    const currentIndex = approvedLessons.findIndex(l => l.id === lessonId);
    
    // Get next uncompleted lessons after current lesson
    const nextLessons = approvedLessons
      .slice(currentIndex + 1)
      .filter(l => !progressMap[l.id]?.completed)
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

