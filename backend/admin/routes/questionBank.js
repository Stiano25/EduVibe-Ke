import express from 'express';
import {
  getQuestionBank,
  generateQuestionBank,
  approveQuestionBankEntry,
  rejectQuestionBankEntry,
  editQuestionBankEntry
} from '../controllers/questionBankController.js';

const router = express.Router();

router.get('/', getQuestionBank);
router.post('/generate', generateQuestionBank);
router.patch('/:id/approve', approveQuestionBankEntry);
router.patch('/:id/reject', rejectQuestionBankEntry);
router.patch('/:id', editQuestionBankEntry);

export default router;
