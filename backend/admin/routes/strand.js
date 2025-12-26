import express from 'express';
import {
  createStrand,
  createAIGeneratedStrands,
  getAllStrands,
  getStrandById,
  getStrandsBySubject,
  updateStrand,
  deleteStrand
} from '../controllers/strandController.js';

const router = express.Router();

router.post('/', createStrand);
router.post('/ai-generate', createAIGeneratedStrands);
router.get('/', getAllStrands);
router.get('/subject/:subjectId', getStrandsBySubject);
router.get('/:id', getStrandById);
router.put('/:id', updateStrand);
router.delete('/:id', deleteStrand);

export default router;

