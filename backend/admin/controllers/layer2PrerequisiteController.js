import {
  listLayer2Edges,
  reviewLayer2Edge
} from '../services/layer2PrerequisiteService.js';

export const getLayer2Edges = async (req, res) => {
  try {
    const { status, limit } = req.query || {};
    const edges = await listLayer2Edges({
      status: status || 'pending_review',
      limit
    });
    res.json(edges);
  } catch (error) {
    console.error('Error listing Layer 2 edges:', error);
    res.status(500).json({ error: error.message || 'Failed to list prerequisite edges' });
  }
};

export const approveLayer2Edge = async (req, res) => {
  try {
    const edge = await reviewLayer2Edge(req.params.id, {
      action: 'approve',
      reviewerId: req.user?.id
    });
    res.json(edge);
  } catch (error) {
    console.error('Error approving Layer 2 edge:', error);
    const status = /not found|cannot be approved|Only Layer 2/i.test(error.message) ? 400 : 500;
    res.status(status).json({ error: error.message || 'Failed to approve edge' });
  }
};

export const rejectLayer2Edge = async (req, res) => {
  try {
    const edge = await reviewLayer2Edge(req.params.id, {
      action: 'reject',
      rejectReason: req.body?.rejectReason,
      reviewerId: req.user?.id
    });
    res.json(edge);
  } catch (error) {
    console.error('Error rejecting Layer 2 edge:', error);
    const status = /not found/i.test(error.message) ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to reject edge' });
  }
};

export const editLayer2Edge = async (req, res) => {
  try {
    const edge = await reviewLayer2Edge(req.params.id, {
      action: 'edit',
      reason: req.body?.reason,
      confidence: req.body?.confidence,
      prerequisiteOutcomeId: req.body?.prerequisiteOutcomeId,
      reviewerId: req.user?.id
    });
    res.json(edge);
  } catch (error) {
    console.error('Error editing Layer 2 edge:', error);
    const status = /not found|not a real/i.test(error.message) ? 400 : 500;
    res.status(status).json({ error: error.message || 'Failed to edit edge' });
  }
};
