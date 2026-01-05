import { Strand } from '../../models/Strand.js';
import { generateStrandsFromPDF } from '../services/aiService.js';

export const createStrand = async (req, res) => {
  try {
    const strand = await Strand.create(req.body);
    res.status(201).json(strand);
  } catch (error) {
    console.error('Error creating strand:', error);
    res.status(500).json({ error: 'Failed to create strand' });
  }
};

export const createAIGeneratedStrands = async (req, res) => {
  try {
    const { subjectId, curriculumDesignId, pdfUrl } = req.body;
    
    if (!pdfUrl) {
      return res.status(400).json({ error: 'PDF URL is required for AI generation' });
    }

    const generatedStrands = await generateStrandsFromPDF(pdfUrl, subjectId, curriculumDesignId);
    const strands = await Strand.createMany(generatedStrands);
    
    res.status(201).json(strands);
  } catch (error) {
    console.error('Error generating AI strands:', error);
    res.status(500).json({ error: 'Failed to generate AI strands' });
  }
};

export const getAllStrands = async (req, res) => {
  try {
    const strands = await Strand.findAll();
    res.json(strands);
  } catch (error) {
    console.error('Error fetching strands:', error);
    res.status(500).json({ error: 'Failed to fetch strands' });
  }
};

export const getStrandById = async (req, res) => {
  try {
    const strand = await Strand.findById(req.params.id);
    if (!strand) {
      return res.status(404).json({ error: 'Strand not found' });
    }
    res.json(strand);
  } catch (error) {
    console.error('Error fetching strand:', error);
    res.status(500).json({ error: 'Failed to fetch strand' });
  }
};

export const getStrandsBySubject = async (req, res) => {
  try {
    const strands = await Strand.findBySubject(req.params.subjectId);
    res.json(strands);
  } catch (error) {
    console.error('Error fetching strands by subject:', error);
    res.status(500).json({ error: 'Failed to fetch strands' });
  }
};

export const updateStrand = async (req, res) => {
  try {
    const strand = await Strand.update(req.params.id, req.body);
    res.json(strand);
  } catch (error) {
    console.error('Error updating strand:', error);
    res.status(500).json({ error: 'Failed to update strand' });
  }
};

export const deleteStrand = async (req, res) => {
  try {
    await Strand.delete(req.params.id);
    res.json({ message: 'Strand deleted successfully' });
  } catch (error) {
    console.error('Error deleting strand:', error);
    res.status(500).json({ error: 'Failed to delete strand' });
  }
};





