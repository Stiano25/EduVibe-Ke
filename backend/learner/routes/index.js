import express from 'express';
import {
  getLearnerSubjects,
  getLearnerStrands,
  getLearnerSubstrands,
  getLearnerLessons,
  completeLesson,
  updateLessonProgress
} from '../controllers/learnerController.js';

const router = express.Router();

// Middleware to extract user from request (assuming it's set by auth middleware)
// For now, we'll use a simple approach - in production, use proper JWT auth
router.use((req, res, next) => {
  // TODO: Replace with proper authentication middleware
  // For now, we'll expect user to be set by auth middleware
  // req.user should contain { id: string, grade: string }
  next();
});

// Subjects - only for learner's grade, only those with strands
router.get('/subjects', getLearnerSubjects);

// Strands - for a subject, only those with substrands
router.get('/strands/:subjectId', getLearnerStrands);

// Substrands - for a strand, only those with approved lessons
router.get('/substrands/:strandId', getLearnerSubstrands);

// Lessons - approved lessons for a substrand with unlock status
router.get('/lessons/:substrandId', getLearnerLessons);

// Progress tracking
router.post('/lessons/:lessonId/complete', completeLesson);
router.patch('/lessons/:lessonId/progress', updateLessonProgress);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Learner routes are ready' });
});

export default router;
