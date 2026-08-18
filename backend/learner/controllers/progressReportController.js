import { generateLearnerReport } from '../../admin/services/learnerReportService.js';

const getUserId = (req) => req.user?.id || null;

/** Aggregate learner progress for dashboard + PDF report */
export const getProgressReport = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const report = await generateLearnerReport(userId, {
      id: userId,
      name: req.user?.name || null,
      email: req.user?.email || null,
      grade: req.user?.grade || null,
      role: 'learner'
    });

    res.json(report);
  } catch (error) {
    console.error('Error building progress report:', error);
    res.status(500).json({ error: 'Failed to build progress report' });
  }
};
