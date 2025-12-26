import { Note } from '../../models/Note.js';

export const createNote = async (req, res) => {
  try {
    const note = await Note.create(req.body);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
};

export const getAllNotes = async (req, res) => {
  try {
    const notes = await Note.findAll();
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

export const getNoteById = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
};

export const getNotesBySubStrand = async (req, res) => {
  try {
    const notes = await Note.findBySubStrand(req.params.subStrandId);
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes by sub-strand:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

export const getNotesByGrade = async (req, res) => {
  try {
    const notes = await Note.findByGrade(req.params.grade);
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes by grade:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

export const getNotesByDifficulty = async (req, res) => {
  try {
    const notes = await Note.findByDifficulty(req.params.difficulty);
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes by difficulty:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

export const updateNote = async (req, res) => {
  try {
    const note = await Note.update(req.params.id, req.body);
    res.json(note);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
};

export const deleteNote = async (req, res) => {
  try {
    await Note.delete(req.params.id);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
};

