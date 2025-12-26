import { Lesson } from '../../models/Lesson.js';
import { generateLessonsFromSubStrand } from '../services/lessonGenerationService.js';

export const createLesson = async (req, res) => {
  try {
    const lesson = await Lesson.create(req.body);
    res.status(201).json(lesson);
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
};

export const createAIGeneratedLessons = async (req, res) => {
  try {
    const { subStrandId, numberOfLessons = 5 } = req.body;
    
    if (!subStrandId) {
      return res.status(400).json({ error: 'Sub-strand ID is required' });
    }

    if (numberOfLessons > 5) {
      return res.status(400).json({ error: 'Maximum 5 lessons can be generated at a time' });
    }

    const generatedLessons = await generateLessonsFromSubStrand(subStrandId, numberOfLessons);
    const lessons = await Lesson.createMany(generatedLessons);
    
    res.status(201).json(lessons);
  } catch (error) {
    console.error('Error generating AI lessons:', error);
    res.status(500).json({ error: error.message || 'Failed to generate AI lessons' });
  }
};

export const getAllLessons = async (req, res) => {
  try {
    const lessons = await Lesson.findAll();
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
};

export const getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    res.json(lesson);
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
};

export const getLessonsByStrand = async (req, res) => {
  try {
    const lessons = await Lesson.findByStrand(req.params.strandId);
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons by strand:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
};

export const getLessonsBySubStrand = async (req, res) => {
  try {
    const lessons = await Lesson.findBySubStrand(req.params.subStrandId);
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons by sub-strand:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
};

export const getLessonsBySubject = async (req, res) => {
  try {
    const lessons = await Lesson.findBySubject(req.params.subjectId);
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons by subject:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
};

export const getLessonsByStatus = async (req, res) => {
  try {
    const lessons = await Lesson.findByStatus(req.params.status);
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons by status:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
};

export const updateLesson = async (req, res) => {
  try {
    const lesson = await Lesson.update(req.params.id, req.body);
    res.json(lesson);
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
};

export const approveLesson = async (req, res) => {
  try {
    const lesson = await Lesson.update(req.params.id, {
      status: 'approved',
      approvedAt: new Date().toISOString()
    });
    res.json(lesson);
  } catch (error) {
    console.error('Error approving lesson:', error);
    res.status(500).json({ error: 'Failed to approve lesson' });
  }
};

export const rejectLesson = async (req, res) => {
  try {
    const lesson = await Lesson.update(req.params.id, {
      status: 'rejected'
    });
    res.json(lesson);
  } catch (error) {
    console.error('Error rejecting lesson:', error);
    res.status(500).json({ error: 'Failed to reject lesson' });
  }
};

export const deleteLesson = async (req, res) => {
  try {
    await Lesson.delete(req.params.id);
    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
};

