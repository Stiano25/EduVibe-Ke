import { Subject } from '../../models/Subject.js';
import { CurriculumDesign } from '../../models/CurriculumDesign.js';
import { parsePDFContent, processParsedPDF } from '../services/pdfParserService.js';

export const createSubject = async (req, res) => {
  try {
    const { name, grade, description, icon, color, curriculumDesignId, pdfUrl, pdfFileName } = req.body;
    
    let designId = curriculumDesignId;
    
    // If no curriculum design ID provided, create one automatically
    if (!designId) {
      // Check if curriculum design already exists for this subject and grade
      const existingDesign = await CurriculumDesign.findBySubjectName(grade, name);
      
      if (existingDesign) {
        designId = existingDesign.id;
      } else {
        // Create new curriculum design with naming format: Grade{number}_{SubjectName}_Curriculum Design
        const newDesign = await CurriculumDesign.create({
          grade,
          subjectName: name,
          name: `Grade${grade}_${name}_Curriculum Design`,
          disciplines: [], // Empty array - disciplines removed
          pdfUrl,
          pdfFileName
        });
        designId = newDesign.id;
      }
    }
    
    // Create subject with the curriculum design ID
    const subject = await Subject.create({
      name,
      description,
      curriculumDesignId: designId,
      grade,
      icon,
      color
    });
    
    // If PDF URL is provided, parse it automatically to extract strands and sub-strands
    // Only parse if it's a valid HTTP/HTTPS URL (not a blob URL)
    if (pdfUrl && (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://'))) {
      try {
        const parsedData = await parsePDFContent(pdfUrl, subject.id, name, grade);
        await processParsedPDF(parsedData, subject.id);
      } catch (parseError) {
        console.error('Error parsing PDF (non-blocking):', parseError);
        // Don't fail subject creation if PDF parsing fails
      }
    } else if (pdfUrl && pdfUrl.startsWith('blob:')) {
      console.warn('Blob URL detected. PDF should be uploaded to Supabase Storage first.');
    }
    
    res.status(201).json(subject);
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
};

export const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.findAll();
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

export const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(subject);
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ error: 'Failed to fetch subject' });
  }
};

export const getSubjectsByCurriculumDesign = async (req, res) => {
  try {
    const subjects = await Subject.findByCurriculumDesign(req.params.curriculumDesignId);
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects by curriculum design:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

export const getSubjectsByGrade = async (req, res) => {
  try {
    const subjects = await Subject.findByGrade(req.params.grade);
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects by grade:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};


export const updateSubject = async (req, res) => {
  try {
    const { pdfUrl, pdfFileName, ...subjectData } = req.body;
    
    // Update subject (without PDF fields - those go to curriculum design)
    const subject = await Subject.update(req.params.id, subjectData);
    
    // If PDF URL is provided, update the curriculum design
    if (pdfUrl || pdfFileName) {
      const curriculumDesign = await CurriculumDesign.findById(subject.curriculumDesignId);
      if (curriculumDesign) {
        await CurriculumDesign.update(curriculumDesign.id, {
          pdfUrl: pdfUrl || curriculumDesign.pdfUrl,
          pdfFileName: pdfFileName || curriculumDesign.pdfFileName
        });
      }
    }
    
    // If PDF URL is updated and provided, parse it automatically
    // Only parse if it's a valid HTTP/HTTPS URL (not a blob URL)
    if (pdfUrl && subject && (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://'))) {
      try {
        const parsedData = await parsePDFContent(pdfUrl, subject.id, subject.name, subject.grade);
        await processParsedPDF(parsedData, subject.id);
      } catch (parseError) {
        console.error('Error parsing PDF (non-blocking):', parseError);
        // Don't fail subject update if PDF parsing fails
      }
    } else if (pdfUrl && pdfUrl.startsWith('blob:')) {
      console.warn('Blob URL detected. PDF should be uploaded to Supabase Storage first.');
    }
    
    res.json(subject);
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
};

export const parseSubjectPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findById(id);
    
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    // Get curriculum design PDF URL
    const curriculumDesign = await CurriculumDesign.findById(subject.curriculumDesignId);
    if (!curriculumDesign || !curriculumDesign.pdfUrl) {
      return res.status(400).json({ error: 'No PDF found for this subject' });
    }
    
    // Check if PDF URL is a blob URL (shouldn't happen, but handle it)
    if (curriculumDesign.pdfUrl.startsWith('blob:')) {
      return res.status(400).json({ 
        error: 'PDF is stored as a blob URL. Please re-upload the PDF to Supabase Storage first.' 
      });
    }
    
    // Only parse if it's a valid HTTP/HTTPS URL
    if (!curriculumDesign.pdfUrl.startsWith('http://') && !curriculumDesign.pdfUrl.startsWith('https://')) {
      return res.status(400).json({ 
        error: 'Invalid PDF URL. PDF must be uploaded to Supabase Storage.' 
      });
    }
    
    // Parse PDF
    const parsedData = await parsePDFContent(
      curriculumDesign.pdfUrl,
      subject.id,
      subject.name,
      subject.grade
    );
    
    // Process and save to database
    const result = await processParsedPDF(parsedData, subject.id);
    
    res.json({
      message: 'PDF parsed successfully',
      theme: result.theme,
      strandsCount: result.strands.length,
      subStrandsCount: result.subStrands.length
    });
  } catch (error) {
    console.error('Error parsing subject PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to parse PDF' });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    await Subject.delete(req.params.id);
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
};

