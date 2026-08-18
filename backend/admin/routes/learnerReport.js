import express from 'express';
import { createLearnerReports, getLearnerReport } from '../controllers/learnerReportController.js';

const router = express.Router();

router.post('/learners', createLearnerReports);
router.get('/learners/:userId', getLearnerReport);

export default router;
