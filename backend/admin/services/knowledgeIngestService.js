import { createRequire } from 'module';
import { getDbClient } from '../../config/supabase.js';
import { getModel } from '../../config/gemini.js';
import { embedTexts } from './embeddingService.js';

const require = createRequire(import.meta.url);
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;
const MIN_TEXT_CHARS = 40;

/**
 * Local text extraction via pdf-parse (CJS require — ESM import breaks v1.x).
 */
const extractWithPdfParse = async (pdfBuffer) => {
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(pdfBuffer);
    return String(data?.text || '')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (err) {
    console.error('pdf-parse failed:', err.message || err);
    return null;
  }
};

/**
 * Gemini can read digital + many scanned PDFs when sent as inline PDF bytes.
 */
const extractWithGemini = async (pdfBuffer) => {
  try {
    const model = getModel();
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: Buffer.from(pdfBuffer).toString('base64')
        }
      },
      {
        text: `Extract ALL readable text from this exam/past-paper PDF for a knowledge bank.
Include question stems, options, short instructions, and mark schemes if present.
Return plain text only — no markdown fences, no commentary.
Preserve numbers and math as plain text (e.g. "2/5" or "x + 3 = 7").`
      }
    ]);
    const text = String(result?.response?.text?.() || '')
      .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*/g, '').trim())
      .replace(/\s+/g, ' ')
      .trim();
    return text;
  } catch (err) {
    console.error('Gemini PDF extract failed:', err.message || err);
    return null;
  }
};

/**
 * Prefer local parse; fall back to Gemini when text is missing/short (scanned PDFs).
 */
export const extractTextFromPdfBuffer = async (pdfBuffer) => {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length < 100) {
    return { text: null, method: null, reason: 'empty_or_invalid_buffer' };
  }

  // Quick signature check
  const head = pdfBuffer.subarray(0, 5).toString('utf8');
  if (!head.startsWith('%PDF')) {
    return { text: null, method: null, reason: 'not_a_pdf' };
  }

  let text = await extractWithPdfParse(pdfBuffer);
  if (text && text.length >= MIN_TEXT_CHARS) {
    return { text, method: 'pdf-parse', reason: null };
  }

  const geminiText = await extractWithGemini(pdfBuffer);
  if (geminiText && geminiText.length >= MIN_TEXT_CHARS) {
    return { text: geminiText, method: 'gemini', reason: null };
  }

  return {
    text: null,
    method: null,
    reason:
      text || geminiText
        ? 'too_little_text'
        : 'scanned_or_unreadable'
  };
};

export const chunkText = (text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) => {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + size, cleaned.length);
    chunks.push(cleaned.slice(start, end).trim());
    if (end >= cleaned.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter(Boolean);
};

const failMessageForReason = (reason) => {
  switch (reason) {
    case 'not_a_pdf':
      return 'File is not a valid PDF';
    case 'empty_or_invalid_buffer':
      return 'Upload was empty or corrupted';
    case 'too_little_text':
      return 'PDF had almost no readable text (try a clearer scan or a text-based PDF)';
    case 'scanned_or_unreadable':
      return 'Could not read text from PDF. Use a text-based PDF, or a clearer scan (not a photo of a page)';
    default:
      return 'Could not extract enough text from PDF';
  }
};

/**
 * Ingest PDF buffer into knowledge_documents + knowledge_chunks.
 */
export const ingestKnowledgePdf = async ({
  title,
  sourceType = 'exam',
  grade = null,
  subjectId = null,
  subjectName = null,
  fileUrl = null,
  pdfBuffer
}) => {
  const db = getDbClient();

  const { data: doc, error: docError } = await db
    .from('knowledge_documents')
    .insert({
      title: title || 'Untitled exam',
      source_type: ['exam', 'past_paper', 'notes'].includes(sourceType) ? sourceType : 'exam',
      grade: grade || null,
      subject_id: subjectId || null,
      subject_name: subjectName || null,
      file_url: fileUrl || null,
      status: 'processing'
    })
    .select()
    .single();

  if (docError) throw docError;

  try {
    const { text, method, reason } = await extractTextFromPdfBuffer(pdfBuffer);
    if (!text || text.length < MIN_TEXT_CHARS) {
      const error_message = failMessageForReason(reason);
      await db
        .from('knowledge_documents')
        .update({
          status: 'failed',
          error_message,
          updated_at: new Date().toISOString()
        })
        .eq('id', doc.id);
      return { ...doc, status: 'failed', error_message };
    }

    const pieces = chunkText(text);
    const embeddings = await embedTexts(pieces);

    const rows = pieces
      .map((content, i) => ({
        document_id: doc.id,
        chunk_index: i,
        content,
        embedding: embeddings[i],
        grade: grade || null,
        subject_name: subjectName || null,
        metadata: {
          title: title || 'Untitled exam',
          sourceType,
          extractMethod: method
        }
      }))
      .filter((r) => Array.isArray(r.embedding) && r.embedding.length > 0);

    if (rows.length === 0) {
      await db
        .from('knowledge_documents')
        .update({
          status: 'failed',
          error_message: 'Text extracted but embedding failed — check GEMINI_API_KEY / embedding model',
          updated_at: new Date().toISOString()
        })
        .eq('id', doc.id);
      return {
        ...doc,
        status: 'failed',
        error_message: 'Text extracted but embedding failed — check GEMINI_API_KEY / embedding model'
      };
    }

    const { error: chunkError } = await db.from('knowledge_chunks').insert(rows);
    if (chunkError) throw chunkError;

    const { data: ready, error: updError } = await db
      .from('knowledge_documents')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', doc.id)
      .select()
      .single();

    if (updError) throw updError;
    return { ...ready, chunkCount: rows.length, extractMethod: method };
  } catch (err) {
    await db
      .from('knowledge_documents')
      .update({
        status: 'failed',
        error_message: (err.message || String(err)).slice(0, 500),
        updated_at: new Date().toISOString()
      })
      .eq('id', doc.id);
    throw err;
  }
};

export const listKnowledgeDocuments = async () => {
  const db = getDbClient();
  const { data, error } = await db
    .from('knowledge_documents')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const deleteKnowledgeDocument = async (id) => {
  const db = getDbClient();
  const { error } = await db.from('knowledge_documents').delete().eq('id', id);
  if (error) throw error;
  return true;
};
