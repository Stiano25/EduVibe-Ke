import { createRequire } from 'module';
import { getDbClient } from '../../config/supabase.js';
import { getModel } from '../../config/gemini.js';
import { embedTexts } from './embeddingService.js';

const require = createRequire(import.meta.url);
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;
const MIN_TEXT_CHARS = 40;

/** ~8–10 dense pages; pdf-parse collapses page breaks so we window by chars. */
const CLASSIFY_WINDOW_CHARS = 14000;
/** ~1 page overlap to avoid splitting a question across windows. */
const CLASSIFY_WINDOW_OVERLAP = 1500;
const QUESTION_TYPES = new Set([
  'multiple_choice',
  'short_answer',
  'essay',
  'fill_in_blank',
  'true_false',
  'diagram_labeling',
  'calculation',
  'not_a_question'
]);
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

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

const normalizeStemKey = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
    .slice(0, 200);

const tokenSet = (text) => {
  const tokens = normalizeStemKey(text).split(' ').filter((t) => t.length > 1);
  return new Set(tokens);
};

/** Cheap Jaccard overlap for cross-window dedupe (no new dependency). */
const textOverlapRatio = (a, b) => {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
};

const splitIntoClassifyWindows = (text) => {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  if (cleaned.length <= CLASSIFY_WINDOW_CHARS) return [cleaned];
  const windows = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + CLASSIFY_WINDOW_CHARS, cleaned.length);
    windows.push(cleaned.slice(start, end));
    if (end >= cleaned.length) break;
    start = Math.max(end - CLASSIFY_WINDOW_OVERLAP, start + 1);
  }
  return windows;
};

const extractJsonArray = (raw) => {
  let text = String(raw || '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const buildClassifyPrompt = (extractedText) => `
You are parsing a CBC exam/past paper or notes document. Split the following text into individual questions or self-contained content units.

For each unit, return:
- question_number (string, or null if not a numbered question)
- question_text (verbatim text of the question/unit, do not paraphrase)
- topic (best-guess CBC curriculum topic)
- sub_topic (if identifiable, else null)
- question_type: one of ["multiple_choice", "short_answer", "essay", "fill_in_blank", "true_false", "diagram_labeling", "calculation", "not_a_question"]
- estimated_difficulty: one of ["easy", "medium", "hard"]
- grade_level: integer 1-12, or null if not inferable

Rules:
- Preserve the original wording exactly in question_text. Do not summarize or rewrite.
- If a chunk of text is not a question (e.g. instructions, header, blank page noise), tag question_type as "not_a_question" — we will discard these.
- Return ONLY a JSON array. No prose, no markdown code fences, no explanation.

TEXT:
"""${extractedText}"""
`;

const normalizeUnit = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const question_text = String(raw.question_text || '').trim();
  if (!question_text || question_text.length < 8) return null;

  let question_type = String(raw.question_type || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (!QUESTION_TYPES.has(question_type)) question_type = 'short_answer';

  let difficulty = String(raw.estimated_difficulty || raw.difficulty || '')
    .trim()
    .toLowerCase();
  if (!DIFFICULTIES.has(difficulty)) difficulty = null;

  let grade_level = raw.grade_level;
  if (grade_level != null) {
    const n = parseInt(grade_level, 10);
    grade_level = Number.isFinite(n) && n >= 1 && n <= 12 ? n : null;
  } else {
    grade_level = null;
  }

  const question_number =
    raw.question_number == null || raw.question_number === ''
      ? null
      : String(raw.question_number).trim();

  return {
    question_number,
    question_text,
    topic: raw.topic != null && String(raw.topic).trim() ? String(raw.topic).trim() : null,
    sub_topic:
      raw.sub_topic != null && String(raw.sub_topic).trim()
        ? String(raw.sub_topic).trim()
        : null,
    question_type,
    difficulty,
    grade_level
  };
};

const classifyWindow = async (windowText) => {
  try {
    const model = getModel();
    const result = await model.generateContent(buildClassifyPrompt(windowText));
    const raw = String(result?.response?.text?.() || '');
    const arr = extractJsonArray(raw);
    if (!arr) {
      console.warn('Knowledge classify: unparseable JSON for window — skipping window');
      return [];
    }
    return arr.map(normalizeUnit).filter(Boolean);
  } catch (err) {
    console.error('Knowledge classify window failed:', err.message || err);
    return [];
  }
};

const dedupeUnits = (units) => {
  const kept = [];
  for (const unit of units) {
    if (unit.question_type === 'not_a_question') continue;
    const stem = normalizeStemKey(unit.question_text);
    const isDup = kept.some((k) => {
      if (
        unit.question_number &&
        k.question_number &&
        String(unit.question_number) === String(k.question_number) &&
        textOverlapRatio(unit.question_text, k.question_text) >= 0.6
      ) {
        return true;
      }
      return textOverlapRatio(unit.question_text, k.question_text) >= 0.85 || stem === normalizeStemKey(k.question_text);
    });
    if (!isDup) kept.push(unit);
  }
  return kept;
};

/**
 * Segment extracted PDF text into tagged question units via Gemini.
 * Fail-soft: returns [] on total failure (caller falls back to char-chunking).
 */
export const segmentAndTagQuestions = async (extractedText) => {
  const windows = splitIntoClassifyWindows(extractedText);
  if (windows.length === 0) return [];

  const all = [];
  for (let i = 0; i < windows.length; i++) {
    console.log(`Knowledge classify: window ${i + 1}/${windows.length} (${windows[i].length} chars)`);
    const units = await classifyWindow(windows[i]);
    all.push(...units);
  }

  const deduped = dedupeUnits(all);
  console.log(
    `Knowledge classify: ${all.length} raw units → ${deduped.length} after filter/dedupe`
  );
  return deduped;
};

const parseUploadGradeLevel = (grade) => {
  if (grade == null || grade === '' || grade === 'K') return null;
  const n = parseInt(grade, 10);
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : null;
};

const embedSourceForUnit = (unit) =>
  [unit.topic || '', unit.sub_topic || '', unit.question_type || '', unit.question_text || '']
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

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

    const uploadGradeLevel = parseUploadGradeLevel(grade);
    let units = [];
    let usedQuestionTagging = false;

    try {
      units = await segmentAndTagQuestions(text);
      usedQuestionTagging = units.length > 0;
    } catch (err) {
      console.error('segmentAndTagQuestions failed — falling back to char chunks:', err.message || err);
      units = [];
    }

    let rows;

    if (usedQuestionTagging) {
      const embedSources = units.map(embedSourceForUnit);
      const embeddings = await embedTexts(embedSources);
      rows = units
        .map((unit, i) => ({
          document_id: doc.id,
          chunk_index: i,
          content: unit.question_text,
          embedding: embeddings[i],
          grade: grade || null,
          subject_name: subjectName || null,
          question_number: unit.question_number,
          question_text: unit.question_text,
          topic: unit.topic,
          sub_topic: unit.sub_topic,
          question_type: unit.question_type,
          difficulty: unit.difficulty,
          grade_level: unit.grade_level ?? uploadGradeLevel,
          is_full_question: true,
          metadata: {
            title: title || 'Untitled exam',
            sourceType,
            extractMethod: method,
            tagged: true
          }
        }))
        .filter((r) => Array.isArray(r.embedding) && r.embedding.length > 0);
    } else {
      console.warn(
        'Knowledge ingest: question tagging yielded no units — falling back to char-chunking'
      );
      const pieces = chunkText(text);
      const embeddings = await embedTexts(pieces);
      rows = pieces
        .map((content, i) => ({
          document_id: doc.id,
          chunk_index: i,
          content,
          embedding: embeddings[i],
          grade: grade || null,
          subject_name: subjectName || null,
          question_number: null,
          question_text: null,
          topic: null,
          sub_topic: null,
          question_type: null,
          difficulty: null,
          grade_level: uploadGradeLevel,
          is_full_question: false,
          metadata: {
            title: title || 'Untitled exam',
            sourceType,
            extractMethod: method,
            tagged: false,
            fallback: 'char_chunk'
          }
        }))
        .filter((r) => Array.isArray(r.embedding) && r.embedding.length > 0);
    }

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
    return {
      ...ready,
      chunkCount: rows.length,
      extractMethod: method,
      tagged: usedQuestionTagging
    };
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
