import { SubStrand } from '../../models/SubStrand.js';

export const createSubStrand = async (req, res) => {
  try {
    const subStrand = await SubStrand.create(req.body);
    res.status(201).json(subStrand);
  } catch (error) {
    console.error('Error creating sub-strand:', error);
    res.status(500).json({ error: 'Failed to create sub-strand' });
  }
};

export const getAllSubStrands = async (req, res) => {
  try {
    const subStrands = await SubStrand.findAll();
    res.json(subStrands);
  } catch (error) {
    console.error('Error fetching sub-strands:', error);
    res.status(500).json({ error: 'Failed to fetch sub-strands' });
  }
};

export const getSubStrandById = async (req, res) => {
  try {
    const subStrand = await SubStrand.findById(req.params.id);
    if (!subStrand) {
      return res.status(404).json({ error: 'Sub-strand not found' });
    }
    res.json(subStrand);
  } catch (error) {
    console.error('Error fetching sub-strand:', error);
    res.status(500).json({ error: 'Failed to fetch sub-strand' });
  }
};

export const getSubStrandsByStrand = async (req, res) => {
  try {
    const subStrands = await SubStrand.findByStrand(req.params.strandId);
    res.json(subStrands);
  } catch (error) {
    console.error('Error fetching sub-strands by strand:', error);
    res.status(500).json({ error: 'Failed to fetch sub-strands' });
  }
};

export const getSubStrandsBySubject = async (req, res) => {
  try {
    const subStrands = await SubStrand.findBySubject(req.params.subjectId);
    res.json(subStrands);
  } catch (error) {
    console.error('Error fetching sub-strands by subject:', error);
    res.status(500).json({ error: 'Failed to fetch sub-strands' });
  }
};

export const updateSubStrand = async (req, res) => {
  try {
    const subStrand = await SubStrand.update(req.params.id, req.body);
    res.json(subStrand);
  } catch (error) {
    console.error('Error updating sub-strand:', error);
    res.status(500).json({ error: 'Failed to update sub-strand' });
  }
};

export const deleteSubStrand = async (req, res) => {
  try {
    await SubStrand.delete(req.params.id);
    res.json({ message: 'Sub-strand deleted successfully' });
  } catch (error) {
    console.error('Error deleting sub-strand:', error);
    res.status(500).json({ error: 'Failed to delete sub-strand' });
  }
};





