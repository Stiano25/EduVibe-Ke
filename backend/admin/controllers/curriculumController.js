import { CurriculumDesign } from '../../models/CurriculumDesign.js';

export const createCurriculumDesign = async (req, res) => {
  try {
    const curriculumDesign = await CurriculumDesign.create(req.body);
    res.status(201).json(curriculumDesign);
  } catch (error) {
    console.error('Error creating curriculum design:', error);
    res.status(500).json({ error: 'Failed to create curriculum design' });
  }
};

export const getAllCurriculumDesigns = async (req, res) => {
  try {
    const designs = await CurriculumDesign.findAll();
    res.json(designs);
  } catch (error) {
    console.error('Error fetching curriculum designs:', error);
    res.status(500).json({ error: 'Failed to fetch curriculum designs' });
  }
};

export const getCurriculumDesignById = async (req, res) => {
  try {
    const design = await CurriculumDesign.findById(req.params.id);
    if (!design) {
      return res.status(404).json({ error: 'Curriculum design not found' });
    }
    res.json(design);
  } catch (error) {
    console.error('Error fetching curriculum design:', error);
    res.status(500).json({ error: 'Failed to fetch curriculum design' });
  }
};

export const getCurriculumDesignsByGrade = async (req, res) => {
  try {
    const designs = await CurriculumDesign.findByGrade(req.params.grade);
    res.json(designs);
  } catch (error) {
    console.error('Error fetching curriculum designs by grade:', error);
    res.status(500).json({ error: 'Failed to fetch curriculum designs' });
  }
};

export const updateCurriculumDesign = async (req, res) => {
  try {
    const design = await CurriculumDesign.update(req.params.id, req.body);
    res.json(design);
  } catch (error) {
    console.error('Error updating curriculum design:', error);
    res.status(500).json({ error: 'Failed to update curriculum design' });
  }
};

export const deleteCurriculumDesign = async (req, res) => {
  try {
    await CurriculumDesign.delete(req.params.id);
    res.json({ message: 'Curriculum design deleted successfully' });
  } catch (error) {
    console.error('Error deleting curriculum design:', error);
    res.status(500).json({ error: 'Failed to delete curriculum design' });
  }
};





