import express from 'express';
import {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  getQuizzesByLink,
  getQuizzesByGrade,
  updateQuiz,
  deleteQuiz
} from '../controllers/quizController.js';

const router = express.Router();

router.post('/', createQuiz);
router.get('/', getAllQuizzes);
router.get('/link/:type/:id', getQuizzesByLink);
router.get('/grade/:grade', getQuizzesByGrade);
router.get('/:id', getQuizById);
router.put('/:id', updateQuiz);
router.delete('/:id', deleteQuiz);

export default router;







