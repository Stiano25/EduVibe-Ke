import { Lesson } from '../../models/Lesson.js';
import { User } from '../../models/User.js';
import { Note } from '../../models/Note.js';
import { Quiz } from '../../models/Quiz.js';

export const getAnalytics = async () => {
  try {
    // Fetch all data
    const [lessons, users, notes, quizzes] = await Promise.all([
      Lesson.findAll(),
      User.findAll(),
      Note.findAll(),
      Quiz.findAll()
    ]);

    // Calculate various analytics
    const totalUsers = users.length;
    const totalLearners = users.filter(u => u.role === 'learner').length;
    const totalAdmins = users.filter(u => u.role === 'admin').length;

    const totalLessons = lessons.length;
    const approvedLessons = lessons.filter(l => l.status === 'approved').length;
    const pendingLessons = lessons.filter(l => l.status === 'pending').length;
    const rejectedLessons = lessons.filter(l => l.status === 'rejected').length;

    // Group by grade
    const lessonsByGrade = {};
    lessons.forEach(lesson => {
      lessonsByGrade[lesson.grade] = (lessonsByGrade[lesson.grade] || 0) + 1;
    });

    // Group by difficulty
    const lessonsByDifficulty = {};
    lessons.forEach(lesson => {
      lessonsByDifficulty[lesson.difficulty] = (lessonsByDifficulty[lesson.difficulty] || 0) + 1;
    });

    // Group by content type
    const lessonsByContentType = {};
    lessons.forEach(lesson => {
      lessonsByContentType[lesson.contentType] = (lessonsByContentType[lesson.contentType] || 0) + 1;
    });

    // AI generated vs manual
    const aiGeneratedLessons = lessons.filter(l => l.isAIGenerated).length;
    const manualLessons = lessons.filter(l => !l.isAIGenerated).length;

    return {
      users: {
        total: totalUsers,
        learners: totalLearners,
        admins: totalAdmins
      },
      lessons: {
        total: totalLessons,
        approved: approvedLessons,
        pending: pendingLessons,
        rejected: rejectedLessons,
        aiGenerated: aiGeneratedLessons,
        manual: manualLessons,
        byGrade: lessonsByGrade,
        byDifficulty: lessonsByDifficulty,
        byContentType: lessonsByContentType
      },
      notes: {
        total: notes.length
      },
      quizzes: {
        total: quizzes.length
      }
    };
  } catch (error) {
    console.error('Error calculating analytics:', error);
    throw error;
  }
};




