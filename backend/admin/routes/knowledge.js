import express from 'express';
import {
  knowledgeUpload,
  uploadKnowledgeDocument,
  getKnowledgeDocuments,
  removeKnowledgeDocument
} from '../controllers/knowledgeController.js';

const router = express.Router();

router.get('/', getKnowledgeDocuments);
router.post('/upload', knowledgeUpload.single('pdf'), uploadKnowledgeDocument);
router.delete('/:id', removeKnowledgeDocument);

export default router;
