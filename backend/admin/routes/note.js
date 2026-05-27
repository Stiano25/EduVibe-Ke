import express from 'express';
import {
  createNote,
  getAllNotes,
  getNoteById,
  getNotesBySubStrand,
  getNotesByGrade,
  getNotesByDifficulty,
  updateNote,
  deleteNote
} from '../controllers/noteController.js';

const router = express.Router();

router.post('/', createNote);
router.get('/', getAllNotes);
router.get('/substrand/:subStrandId', getNotesBySubStrand);
router.get('/grade/:grade', getNotesByGrade);
router.get('/difficulty/:difficulty', getNotesByDifficulty);
router.get('/:id', getNoteById);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

export default router;







