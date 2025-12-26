import express from 'express';
import {
  createSubject,
  getAllSubjects,
  getSubjectById,
  getSubjectsByCurriculumDesign,
  getSubjectsByGrade,
  updateSubject,
  deleteSubject,
  parseSubjectPDF
} from '../controllers/subjectController.js';

const router = express.Router();

router.post('/', createSubject);
router.get('/', getAllSubjects);
router.get('/curriculum/:curriculumDesignId', getSubjectsByCurriculumDesign);
router.get('/grade/:grade', getSubjectsByGrade);
// Parse PDF route - must be before /:id to avoid route conflicts
router.post('/parse-pdf/:id', parseSubjectPDF);
router.get('/:id', getSubjectById);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

export default router;

