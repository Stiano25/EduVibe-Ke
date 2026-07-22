import { GoogleGenerativeAI } from '@google/generative-ai';

const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

const getEmbedModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key not configured');
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: EMBEDDING_MODEL }, { apiVersion: 'v1beta' });
};

/**
 * Embed a single string. Returns number[] or null on failure.
 */
export const embedText = async (text) => {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;

  const model = getEmbedModel();
  const result = await model.embedContent(cleaned.slice(0, 8000));
  const values = result?.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) return null;
  return values;
};

/**
 * Embed many texts sequentially (keeps rate limits simple).
 */
export const embedTexts = async (texts) => {
  const out = [];
  for (const t of texts) {
    try {
      out.push(await embedText(t));
    } catch (err) {
      console.error('Embedding failed:', err.message || err);
      out.push(null);
    }
  }
  return out;
};

export const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) {
    return -1;
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = Number(a[i]) || 0;
    const y = Number(b[i]) || 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return -1;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};
