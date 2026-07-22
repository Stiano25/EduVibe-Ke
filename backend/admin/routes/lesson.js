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
  topUpQuizBank,
  updateLessonVisuals,
  previewDiagram,
  regenerateDiagram,
  uploadLessonVisual,
  visualUploadMiddleware,
  approveLesson,
  rejectLesson,
  deleteLesson
} from '../controllers/lessonController.js';

const router = express.Router();

router.post('/', createLesson);
router.post('/ai-generate', createAIGeneratedLessons);
router.post('/preview-diagram', previewDiagram);
router.get('/', getAllLessons);
router.get('/strand/:strandId', getLessonsByStrand);
router.get('/sub-strand/:subStrandId', getLessonsBySubStrand);
router.get('/subject/:subjectId', getLessonsBySubject);
router.get('/status/:status', getLessonsByStatus);
router.get('/:id', getLessonById);
router.put('/:id', updateLesson);
router.put('/:id/visuals', updateLessonVisuals);
router.post('/:id/quiz/top-up', topUpQuizBank);
router.post('/:id/visuals/:briefId/regenerate', regenerateDiagram);
router.post('/:id/visuals/:briefId/upload', visualUploadMiddleware, uploadLessonVisual);
router.patch('/:id/approve', approveLesson);
router.patch('/:id/reject', rejectLesson);
router.delete('/:id', deleteLesson);

export default router;
