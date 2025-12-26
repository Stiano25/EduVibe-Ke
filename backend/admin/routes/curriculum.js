import express from 'express';
import {
  getAllCurriculumDesigns,
  getCurriculumDesignById,
  getCurriculumDesignsByGrade
} from '../controllers/curriculumController.js';

const router = express.Router();

// Read-only routes - Curriculum designs are created automatically when subjects are created
router.get('/', getAllCurriculumDesigns);
router.get('/grade/:grade', getCurriculumDesignsByGrade);
router.get('/:id', getCurriculumDesignById);

// Note: POST, PUT, DELETE routes removed - curriculum designs are managed through subjects

export default router;

