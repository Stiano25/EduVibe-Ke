import { Subject } from '../../models/Subject.js';
import { CurriculumDesign } from '../../models/CurriculumDesign.js';
import { parsePDFContent, processParsedPDF } from '../services/pdfParserService.js';

const sendError = (res, status, error, err) => {
  const body = { error };
  if (err?.message) body.message = err.message;
  if (err?.code) body.code = err.code;
  if (err?.details) body.details = err.details;
  if (err?.hint) body.hint = err.hint;
  return res.status(status).json(body);
};

const isRemotePdfUrl = (url) =>
  typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));

/** Best-effort PDF parse; never fails the parent subject request */
const parseSubjectPdfIfRemote = async (pdfUrl, subject) => {
  if (!isRemotePdfUrl(pdfUrl)) return;
  try {
    const parsedData = await parsePDFContent(pdfUrl, subject.id, subject.name, subject.grade);
    await processParsedPDF(parsedData, subject.id);
  } catch (parseError) {
    console.error('Error parsing PDF (non-blocking):', parseError.message || parseError);
  }
};

export const createSubject = async (req, res) => {
  try {
    const { name, grade, description, icon, color, curriculumDesignId, pdfUrl, pdfFileName } = req.body;

    if (!name || !grade) {
      return res.status(400).json({ error: 'Name and grade are required' });
    }

    let designId = curriculumDesignId;

    if (!designId) {
      const existingDesign = await CurriculumDesign.findBySubjectName(grade, name);
      if (existingDesign) {
        designId = existingDesign.id;
      } else {
        const newDesign = await CurriculumDesign.create({
          grade,
          subjectName: name,
          name: `Grade${grade}_${name}_Curriculum Design`,
          disciplines: [],
          pdfUrl,
          pdfFileName
        });
        designId = newDesign.id;
      }
    }

    const subject = await Subject.create({
      name,
      description,
      curriculumDesignId: designId,
      grade,
      icon,
      color
    });

    await parseSubjectPdfIfRemote(pdfUrl, subject);
    res.status(201).json(subject);
  } catch (error) {
    console.error('Error creating subject:', error.message || error);
    return sendError(res, 500, 'Failed to create subject', error);
  }
};

export const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.findAll();
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error.message || error);
    return sendError(res, 500, 'Failed to fetch subjects', error);
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
    console.error('Error fetching subject:', error.message || error);
    return sendError(res, 500, 'Failed to fetch subject', error);
  }
};

export const getSubjectsByCurriculumDesign = async (req, res) => {
  try {
    const subjects = await Subject.findByCurriculumDesign(req.params.curriculumDesignId);
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects by curriculum design:', error.message || error);
    return sendError(res, 500, 'Failed to fetch subjects', error);
  }
};

export const getSubjectsByGrade = async (req, res) => {
  try {
    const subjects = await Subject.findByGrade(req.params.grade);
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects by grade:', error.message || error);
    return sendError(res, 500, 'Failed to fetch subjects', error);
  }
};

export const updateSubject = async (req, res) => {
  try {
    const { pdfUrl, pdfFileName, ...subjectData } = req.body;
    const subject = await Subject.update(req.params.id, subjectData);

    if (pdfUrl || pdfFileName) {
      const curriculumDesign = await CurriculumDesign.findById(subject.curriculumDesignId);
      if (curriculumDesign) {
        await CurriculumDesign.update(curriculumDesign.id, {
          pdfUrl: pdfUrl || curriculumDesign.pdfUrl,
          pdfFileName: pdfFileName || curriculumDesign.pdfFileName
        });
      }
    }

    await parseSubjectPdfIfRemote(pdfUrl, subject);
    res.json(subject);
  } catch (error) {
    console.error('Error updating subject:', error.message || error);
    return sendError(res, 500, 'Failed to update subject', error);
  }
};

export const parseSubjectPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findById(id);

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const curriculumDesign = await CurriculumDesign.findById(subject.curriculumDesignId);
    if (!curriculumDesign || !curriculumDesign.pdfUrl) {
      return res.status(400).json({ error: 'No PDF found for this subject' });
    }

    if (curriculumDesign.pdfUrl.startsWith('blob:')) {
      return res.status(400).json({
        error: 'PDF is stored as a blob URL. Please re-upload the PDF to Supabase Storage first.'
      });
    }

    if (!isRemotePdfUrl(curriculumDesign.pdfUrl)) {
      return res.status(400).json({
        error: 'Invalid PDF URL. PDF must be uploaded to Supabase Storage.'
      });
    }

    const parsedData = await parsePDFContent(
      curriculumDesign.pdfUrl,
      subject.id,
      subject.name,
      subject.grade
    );
    const result = await processParsedPDF(parsedData, subject.id);

    res.json({
      message: 'PDF parsed successfully',
      theme: result.theme,
      strandsCount: result.strands.length,
      subStrandsCount: result.subStrands.length
    });
  } catch (error) {
    console.error('Error parsing subject PDF:', error.message || error);
    return sendError(res, 500, error.message || 'Failed to parse PDF', error);
  }
};

export const deleteSubject = async (req, res) => {
  try {
    await Subject.delete(req.params.id);
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error.message || error);
    return sendError(res, 500, 'Failed to delete subject', error);
  }
};
