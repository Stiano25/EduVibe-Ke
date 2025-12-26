import { User } from '../../models/User.js';
import { Lesson } from '../../models/Lesson.js';
import { Strand } from '../../models/Strand.js';
import { Subject } from '../../models/Subject.js';
import { CurriculumDesign } from '../../models/CurriculumDesign.js';

export const getDashboardMetrics = async () => {
  try {
    // Fetch all necessary data
    const [allUsers, allLessons, allStrands, allSubjects, allCurriculumDesigns] = await Promise.all([
      User.findAll(),
      Lesson.findAll(),
      Strand.findAll(),
      Subject.findAll(),
      CurriculumDesign.findAll()
    ]);

    // Calculate metrics
    const totalLearners = allUsers.filter(u => u.role === 'learner').length;
    const activeLearners = allUsers.filter(u => u.role === 'learner').length; // TODO: Implement actual active check
    const totalLessons = allLessons.length;
    const publishedLessons = allLessons.filter(l => l.status === 'approved').length;
    const totalStrands = allStrands.length;
    const totalCurriculumSubjects = allSubjects.length;
    const totalSubStrands = allStrands.length; // Strands are displayed as sub-strands to learners

    // Calculate average engagement (placeholder - would need progress data)
    const averageEngagement = 84; // TODO: Calculate from actual progress data

    // Calculate completion rate (placeholder - would need progress data)
    const completionRate = 72; // TODO: Calculate from actual progress data

    // Group lessons by grade
    const lessonsByGrade = {};
    allLessons.forEach(lesson => {
      lessonsByGrade[lesson.grade] = (lessonsByGrade[lesson.grade] || 0) + 1;
    });

    // Group lessons by difficulty
    const lessonsByDifficulty = {};
    allLessons.forEach(lesson => {
      lessonsByDifficulty[lesson.difficulty] = (lessonsByDifficulty[lesson.difficulty] || 0) + 1;
    });

    // Group lessons by content type
    const lessonsByContentType = {};
    allLessons.forEach(lesson => {
      lessonsByContentType[lesson.contentType] = (lessonsByContentType[lesson.contentType] || 0) + 1;
    });

    // Recent activity (placeholder - would need activity log)
    const recentActivity = [];

    return {
      totalLearners,
      activeLearners,
      totalLessons,
      publishedLessons,
      totalStrands,
      totalCurriculumSubjects,
      totalSubStrands,
      averageEngagement,
      completionRate,
      lessonsByGrade,
      lessonsByDifficulty,
      lessonsByContentType,
      recentActivity
    };
  } catch (error) {
    console.error('Error calculating dashboard metrics:', error);
    throw error;
  }
};

