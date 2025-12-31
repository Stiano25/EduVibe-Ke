import express from 'express';
import {
  getLearnerSubjects,
  getLearnerStrands,
  getLearnerSubstrands,
  getLearnerLessons,
  completeLesson,
  updateLessonProgress,
  getSimilarLessonsFromLowerGrades,
  getNextLessonsInSubstrand
} from '../controllers/learnerController.js';
import { registerLearner, loginLearner } from '../controllers/authController.js';

const router = express.Router();

// Middleware to extract user from request (assuming it's set by auth middleware)
// For now, we'll use a simple approach - in production, use proper JWT auth
router.use((req, res, next) => {
  // TODO: Replace with proper authentication middleware
  // For now, we'll expect user to be set by auth middleware
  // req.user should contain { id: string, grade: string }
  next();
});

// Auth routes (must be before other routes to avoid conflicts)
router.post('/register', registerLearner);
router.post('/login', loginLearner);

// Subjects - only for learner's grade, only those with strands
router.get('/subjects', getLearnerSubjects);

// Strands - for a subject, only those with substrands
router.get('/strands/:subjectId', getLearnerStrands);

// Substrands - for a strand, only those with approved lessons
router.get('/substrands/:strandId', getLearnerSubstrands);

// Progress tracking (must come before general lessons route to avoid conflicts)
router.post('/lessons/:lessonId/complete', completeLesson);
router.patch('/lessons/:lessonId/progress', updateLessonProgress);

// Get similar lessons from lower grades (for remediation)
router.get('/lessons/:lessonId/similar', getSimilarLessonsFromLowerGrades);

// Get next lessons in same sub-strand (must come before general lessons route)
router.get('/lessons/:lessonId/next', getNextLessonsInSubstrand);

// Lessons - approved lessons for a substrand with unlock status (must be last to avoid conflicts)
router.get('/lessons/:substrandId', getLearnerLessons);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Learner routes are ready' });
});

export default router;
