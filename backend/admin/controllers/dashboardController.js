import { getDashboardMetrics as fetchDashboardMetrics } from '../services/dashboardService.js';

export const getDashboardMetrics = async (req, res) => {
  try {
    const metrics = await fetchDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
};

