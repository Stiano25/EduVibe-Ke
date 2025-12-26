import express from 'express';
import {
  getAllUsers,
  getUserById,
  getUsersByRole,
  getActiveLearners
} from '../controllers/userController.js';

const router = express.Router();

router.get('/', getAllUsers);
router.get('/role/:role', getUsersByRole);
router.get('/active-learners', getActiveLearners);
router.get('/:id', getUserById);

export default router;

