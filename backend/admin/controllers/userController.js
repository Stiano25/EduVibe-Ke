import { User } from '../../models/User.js';

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const getUsersByRole = async (req, res) => {
  try {
    const users = await User.findByRole(req.params.role);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users by role:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getActiveLearners = async (req, res) => {
  try {
    const learners = await User.getActiveLearners();
    res.json(learners);
  } catch (error) {
    console.error('Error fetching active learners:', error);
    res.status(500).json({ error: 'Failed to fetch active learners' });
  }
};




