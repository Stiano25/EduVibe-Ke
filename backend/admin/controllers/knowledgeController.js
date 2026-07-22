import multer from 'multer';
import { randomUUID } from 'crypto';
import { supabase, supabaseAdmin } from '../../config/supabase.js';
import { Subject } from '../../models/Subject.js';
import {
  ingestKnowledgePdf,
  listKnowledgeDocuments,
  deleteKnowledgeDocument
} from '../services/knowledgeIngestService.js';

const storage = multer.memoryStorage();
export const knowledgeUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  }
});

const uploadKnowledgePdfToStorage = async (file) => {
  const storageClient = supabaseAdmin || supabase;
  if (!storageClient) throw new Error('Supabase storage not configured');

  const fileName = `${randomUUID()}.pdf`;
  const path = `knowledge-bank/${fileName}`;
  const bucketName = 'curriculum-designs';

  const { error } = await storageClient.storage.from(bucketName).upload(path, file.buffer, {
    contentType: 'application/pdf',
    upsert: false
  });
  if (error) throw error;

  const { data: urlData } = storageClient.storage.from(bucketName).getPublicUrl(path);
  return urlData.publicUrl;
};

export const uploadKnowledgeDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const title = req.body.title || req.file.originalname || 'Untitled exam';
    const grade = req.body.grade || null;
    const subjectId = req.body.subjectId || null;
    const sourceType = req.body.sourceType || 'exam';

    let subjectName = req.body.subjectName || null;
    if (subjectId && !subjectName) {
      try {
        const subject = await Subject.findById(subjectId);
        subjectName = subject?.name || null;
      } catch {
        /* ignore */
      }
    }

    let fileUrl = null;
    try {
      fileUrl = await uploadKnowledgePdfToStorage(req.file);
    } catch (storageErr) {
      console.warn('Knowledge PDF storage upload skipped:', storageErr.message || storageErr);
    }

    const doc = await ingestKnowledgePdf({
      title,
      sourceType,
      grade,
      subjectId,
      subjectName,
      fileUrl,
      pdfBuffer: req.file.buffer
    });

    if (doc.status === 'failed') {
      return res.status(422).json({
        error: doc.error_message || 'Could not extract text from PDF',
        message: doc.error_message || 'Could not extract text from PDF',
        document: doc
      });
    }

    res.status(201).json(doc);
  } catch (error) {
    console.error('Error uploading knowledge document:', error);
    res.status(500).json({
      error: 'Failed to ingest knowledge PDF',
      message: error.message
    });
  }
};

export const getKnowledgeDocuments = async (req, res) => {
  try {
    const docs = await listKnowledgeDocuments();
    res.json(docs);
  } catch (error) {
    console.error('Error listing knowledge documents:', error);
    res.status(500).json({ error: 'Failed to list knowledge documents', message: error.message });
  }
};

export const removeKnowledgeDocument = async (req, res) => {
  try {
    await deleteKnowledgeDocument(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting knowledge document:', error);
    res.status(500).json({ error: 'Failed to delete knowledge document', message: error.message });
  }
};
