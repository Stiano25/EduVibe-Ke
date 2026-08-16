import express from 'express';
import {
  getLayer2Edges,
  approveLayer2Edge,
  rejectLayer2Edge,
  editLayer2Edge
} from '../controllers/layer2PrerequisiteController.js';

const router = express.Router();

router.get('/', getLayer2Edges);
router.patch('/:id/approve', approveLayer2Edge);
router.patch('/:id/reject', rejectLayer2Edge);
router.patch('/:id', editLayer2Edge);

export default router;
