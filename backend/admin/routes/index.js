import express from 'express';
import dashboardRoutes from './dashboard.js';
import curriculumRoutes from './curriculum.js';
import subjectRoutes from './subject.js';
import strandRoutes from './strand.js';
import subStrandRoutes from './subStrand.js';
import lessonRoutes from './lesson.js';
import noteRoutes from './note.js';
import quizRoutes from './quiz.js';
import userRoutes from './user.js';
import analyticsRoutes from './analytics.js';
import uploadRoutes from './upload.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.use('/dashboard', dashboardRoutes);
router.use('/curriculum', curriculumRoutes);
router.use('/subjects', subjectRoutes);
router.use('/strands', strandRoutes);
router.use('/sub-strands', subStrandRoutes);
router.use('/lessons', lessonRoutes);
router.use('/notes', noteRoutes);
router.use('/quizzes', quizRoutes);
router.use('/users', userRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/upload', uploadRoutes);

export default router;

