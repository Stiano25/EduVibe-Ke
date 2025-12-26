import { getAnalytics as fetchAnalytics } from '../services/analyticsService.js';

export const getAnalytics = async (req, res) => {
  try {
    const analytics = await fetchAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

