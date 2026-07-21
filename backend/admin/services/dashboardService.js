import { User } from '../../models/User.js';
import { Lesson } from '../../models/Lesson.js';
import { Strand } from '../../models/Strand.js';
import { Subject } from '../../models/Subject.js';

export const getDashboardMetrics = async () => {
  try {
    const [allUsers, allLessons, allStrands, allSubjects] = await Promise.all([
      User.findAll(),
      Lesson.findAll(),
      Strand.findAll(),
      Subject.findAll()
    ]);

    const totalLearners = allUsers.filter((u) => u.role === 'learner').length;
    const totalLessons = allLessons.length;
    const publishedLessons = allLessons.filter((l) => l.status === 'approved').length;
    const totalStrands = allStrands.length;
    const totalCurriculumSubjects = allSubjects.length;

    const lessonsByGrade = {};
    const lessonsByDifficulty = {};
    const lessonsByContentType = {};

    allLessons.forEach((lesson) => {
      lessonsByGrade[lesson.grade] = (lessonsByGrade[lesson.grade] || 0) + 1;
      lessonsByDifficulty[lesson.difficulty] = (lessonsByDifficulty[lesson.difficulty] || 0) + 1;
      lessonsByContentType[lesson.contentType] = (lessonsByContentType[lesson.contentType] || 0) + 1;
    });

    return {
      totalLearners,
      activeLearners: totalLearners, // placeholder until last-active tracking exists
      totalLessons,
      publishedLessons,
      totalStrands,
      totalCurriculumSubjects,
      totalSubStrands: totalStrands, // legacy field name kept for API compatibility
      averageEngagement: 0,
      completionRate: 0,
      lessonsByGrade,
      lessonsByDifficulty,
      lessonsByContentType,
      recentActivity: []
    };
  } catch (error) {
    console.error('Error calculating dashboard metrics:', error.message || error);
    throw error;
  }
};

