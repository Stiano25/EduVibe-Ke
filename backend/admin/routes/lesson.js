import express from 'express';
import {
  createLesson,
  createAIGeneratedLessons,
  getAllLessons,
  getLessonById,
  getLessonsByStrand,
  getLessonsBySubStrand,
  getLessonsBySubject,
  getLessonsByStatus,
  updateLesson,
  approveLesson,
  rejectLesson,
  deleteLesson
} from '../controllers/lessonController.js';

const router = express.Router();

router.post('/', createLesson);
router.post('/ai-generate', createAIGeneratedLessons);
router.get('/', getAllLessons);
router.get('/strand/:strandId', getLessonsByStrand);
router.get('/sub-strand/:subStrandId', getLessonsBySubStrand);
router.get('/subject/:subjectId', getLessonsBySubject);
router.get('/status/:status', getLessonsByStatus);
router.get('/:id', getLessonById);
router.put('/:id', updateLesson);
router.patch('/:id/approve', approveLesson);
router.patch('/:id/reject', rejectLesson);
router.delete('/:id', deleteLesson);

export default router;

