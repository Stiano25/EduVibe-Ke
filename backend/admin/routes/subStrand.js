import express from 'express';
import {
  createSubStrand,
  getAllSubStrands,
  getSubStrandById,
  getSubStrandsByStrand,
  getSubStrandsBySubject,
  updateSubStrand,
  deleteSubStrand
} from '../controllers/subStrandController.js';

const router = express.Router();

router.post('/', createSubStrand);
router.get('/', getAllSubStrands);
router.get('/strand/:strandId', getSubStrandsByStrand);
router.get('/subject/:subjectId', getSubStrandsBySubject);
router.get('/:id', getSubStrandById);
router.put('/:id', updateSubStrand);
router.delete('/:id', deleteSubStrand);

export default router;





