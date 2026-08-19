import {
  generateQuestionBankBatch,
  listQuestionBank,
  reviewQuestionBankEntry
} from '../services/questionBankService.js';

export const getQuestionBank = async (req, res) => {
  try {
    const { status, subStrandId, grade, subjectId, strandId, limit } = req.query || {};
    const entries = await listQuestionBank({
      status: status || null,
      subStrandId: subStrandId || null,
      grade: grade || null,
      subjectId: subjectId || null,
      strandId: strandId || null,
      limit
    });
    res.json(entries);
  } catch (error) {
    console.error('Error listing question bank:', error);
    res.status(500).json({ error: error.message || 'Failed to list question bank' });
  }
};

export const generateQuestionBank = async (req, res) => {
  try {
    const { subStrandId, count } = req.body || {};
    if (!subStrandId) {
      return res.status(400).json({ error: 'subStrandId is required' });
    }
    const result = await generateQuestionBankBatch(subStrandId, { count });
    res.status(201).json(result);
  } catch (error) {
    console.error('Error generating question bank:', error);
    res.status(500).json({ error: error.message || 'Failed to generate question bank' });
  }
};

export const approveQuestionBankEntry = async (req, res) => {
  try {
    const entry = await reviewQuestionBankEntry(req.params.id, {
      action: 'approve',
      reviewerId: req.user?.id
    });
    res.json(entry);
  } catch (error) {
    console.error('Error approving bank entry:', error);
    const status = /cannot be approved|not found/i.test(error.message) ? 400 : 500;
    res.status(status).json({ error: error.message || 'Failed to approve bank entry' });
  }
};

export const rejectQuestionBankEntry = async (req, res) => {
  try {
    const entry = await reviewQuestionBankEntry(req.params.id, {
      action: 'reject',
      rejectReason: req.body?.rejectReason,
      reviewerId: req.user?.id
    });
    res.json(entry);
  } catch (error) {
    console.error('Error rejecting bank entry:', error);
    const status = /not found/i.test(error.message) ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to reject bank entry' });
  }
};

export const editQuestionBankEntry = async (req, res) => {
  try {
    const entry = await reviewQuestionBankEntry(req.params.id, {
      action: 'edit',
      question: req.body?.question,
      reviewerId: req.user?.id
    });
    res.json(entry);
  } catch (error) {
    console.error('Error editing bank entry:', error);
    const status = /not found/i.test(error.message) ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to edit bank entry' });
  }
};
