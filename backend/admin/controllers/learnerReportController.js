import { generateLearnerReport, generateLearnerReports } from '../services/learnerReportService.js';

const sendError = (res, error, fallback) => {
  const status = error.status || 500;
  if (status >= 500) console.error(fallback, error);
  res.status(status).json({ error: error.message || fallback });
};

export const createLearnerReports = async (req, res) => {
  try {
    const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
    const payload = await generateLearnerReports(userIds);
    res.json(payload);
  } catch (error) {
    sendError(res, error, 'Failed to generate learner reports');
  }
};

export const getLearnerReport = async (req, res) => {
  try {
    const report = await generateLearnerReport(req.params.userId);
    res.json(report);
  } catch (error) {
    sendError(res, error, 'Failed to generate learner report');
  }
};
