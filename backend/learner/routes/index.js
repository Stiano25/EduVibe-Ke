import express from 'express';
import {
  getLearnerSubjects,
  getLearnerSubject,
  getLearnerStrands,
  getLearnerStrand,
  getLearnerSubstrands,
  getLearnerSubstrandById,
  getLearnerLessons,
  getLearnerLesson,
  completeLesson,
  updateLessonProgress,
  getSimilarLessonsFromLowerGrades,
  getNextLessonsInSubstrand
} from '../controllers/learnerController.js';
import {
  getLearnerProfile,
  updateLearnerProfile,
  submitSkillAttempts,
  getScaffoldForLesson,
  getSkillMastery,
  startAdaptiveQuiz,
  nextAdaptiveQuiz,
  getAdaptiveReview
} from '../controllers/adaptiveController.js';
import { getProgressReport } from '../controllers/progressReportController.js';
import { getLessonChoices, getNextTask } from '../controllers/nextTaskController.js';
import { registerLearner, loginLearner } from '../controllers/authController.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// Public auth + health
router.post('/register', registerLearner);
router.post('/login', loginLearner);
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Learner routes are ready' });
});

// Authenticated learner routes
router.use(authenticate, requireRole('learner'));

// Learner model / adaptive
router.get('/profile', getLearnerProfile);
router.patch('/profile', updateLearnerProfile);
router.post('/skill-attempts', submitSkillAttempts);
router.get('/skill-mastery', getSkillMastery);
router.get('/progress-report', getProgressReport);
router.get('/next-task', getNextTask);
router.get('/lesson-choices', getLessonChoices);
router.get('/lessons/:lessonId/scaffold', getScaffoldForLesson);
router.post('/lessons/:lessonId/adaptive-start', startAdaptiveQuiz);
router.post('/lessons/:lessonId/adaptive-next', nextAdaptiveQuiz);
router.get('/lessons/:lessonId/adaptive-review', getAdaptiveReview);

// Collections (param = parent id)
router.get('/subjects', getLearnerSubjects);
router.get('/strands/:subjectId', getLearnerStrands);
router.get('/substrands/:strandId', getLearnerSubstrands);

// Single resources (singular paths avoid clashing with collection params)
router.get('/subject/:id', getLearnerSubject);
router.get('/strand/:id', getLearnerStrand);
router.get('/substrand/:id', getLearnerSubstrandById);
router.get('/lesson/:id', getLearnerLesson);

// Lesson actions / related (specific paths before :substrandId list)
router.post('/lessons/:lessonId/complete', completeLesson);
router.patch('/lessons/:lessonId/progress', updateLessonProgress);
router.get('/lessons/:lessonId/similar', getSimilarLessonsFromLowerGrades);
router.get('/lessons/:lessonId/next', getNextLessonsInSubstrand);
router.get('/lessons/:substrandId', getLearnerLessons);

export default router;
