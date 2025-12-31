import { Quiz } from '../../models/Quiz.js';

export const createQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.create(req.body);
    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
};

export const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.findAll();
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
};

export const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json(quiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
};

export const getQuizzesByLink = async (req, res) => {
  try {
    const { type, id } = req.params;
    const quizzes = await Quiz.findByLink(type, id);
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes by link:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
};

export const getQuizzesByGrade = async (req, res) => {
  try {
    const quizzes = await Quiz.findByGrade(req.params.grade);
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes by grade:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
};

export const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.update(req.params.id, req.body);
    res.json(quiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
};

export const deleteQuiz = async (req, res) => {
  try {
    await Quiz.delete(req.params.id);
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
};




