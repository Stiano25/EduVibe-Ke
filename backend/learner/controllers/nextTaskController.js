import { listLessonChoices, resolveNextTask } from '../services/nextTaskService.js';
import { User } from '../../models/User.js';

const getUserId = (req) => req.user?.id || null;

const getUserGrade = async (req) => {
  if (req.user?.grade) return req.user.grade;
  const userId = getUserId(req);
  if (!userId) return null;
  try {
    const user = await User.findById(userId, true);
    return user?.grade || null;
  } catch (error) {
    if (error.code !== '22P02') {
      console.error('Error fetching user grade:', error.message || error);
    }
    return null;
  }
};

export const getNextTask = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const grade = await getUserGrade(req);
    if (!grade) {
      return res.status(400).json({ error: 'Grade not set for user' });
    }

    const result = await resolveNextTask(userId, grade);
    res.json(result);
  } catch (error) {
    console.error('Error resolving next task:', error);
    res.status(500).json({ error: 'Failed to resolve next task' });
  }
};

export const getLessonChoices = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const grade = await getUserGrade(req);
    if (!grade) {
      return res.status(400).json({ error: 'Grade not set for user' });
    }

    const result = await listLessonChoices(userId, grade);
    res.json(result);
  } catch (error) {
    console.error('Error listing lesson choices:', error);
    res.status(500).json({ error: 'Failed to list lessons' });
  }
};
