import { getDbClient } from '../../config/supabase.js';
import { embedText, cosineSimilarity } from './embeddingService.js';

const gradeNeighbors = (grade) => {
  if (!grade) return [];
  if (grade === 'K') return ['K', '1'];
  const n = parseInt(grade, 10);
  if (!Number.isFinite(n)) return [String(grade)];
  const set = new Set([String(n)]);
  if (n > 0) set.add(String(n - 1));
  if (n < 12) set.add(String(n + 1));
  if (n === 1) set.add('K');
  return [...set];
};

/**
 * Retrieve top-k knowledge chunks for lesson generation grounding.
 */
export const retrieveKnowledgeChunks = async ({
  grade,
  subjectName,
  queryText,
  topK = 6
} = {}) => {
  try {
    const query = String(queryText || '').trim();
    if (!query) return [];

    const queryEmbedding = await embedText(query);
    if (!queryEmbedding) return [];

    const db = getDbClient();
    let q = db
      .from('knowledge_chunks')
      .select('id, content, embedding, grade, subject_name, document_id, metadata')
      .not('embedding', 'is', null)
      .limit(400);

    const grades = gradeNeighbors(grade);
    if (grades.length > 0) {
      q = q.in('grade', grades);
    }

    const { data, error } = await q;
    if (error) {
      console.error('Knowledge retrieve query failed:', error.message || error);
      return [];
    }

    let candidates = data || [];

    if (subjectName) {
      const subj = String(subjectName).toLowerCase();
      const filtered = candidates.filter((c) =>
        String(c.subject_name || '')
          .toLowerCase()
          .includes(subj.slice(0, 12))
      );
      if (filtered.length >= 2) candidates = filtered;
    }

    const scored = candidates
      .map((c) => {
        const emb = Array.isArray(c.embedding) ? c.embedding : null;
        return {
          content: c.content,
          grade: c.grade,
          subjectName: c.subject_name,
          score: emb ? cosineSimilarity(queryEmbedding, emb) : -1
        };
      })
      .filter((c) => c.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored;
  } catch (err) {
    console.error('retrieveKnowledgeChunks error:', err.message || err);
    return [];
  }
};

export const formatExemplarsForPrompt = (chunks = []) => {
  if (!chunks.length) return '';
  const lines = chunks.map((c, i) => {
    const snippet = String(c.content || '').slice(0, 500).trim();
    return `[${i + 1}] (grade ${c.grade || '?'}, score ${c.score?.toFixed?.(2) || '?'})\n${snippet}`;
  });
  return `STYLE AND DIFFICULTY EXEMPLARS FROM REAL EXAMS / NOTES (paraphrase only — do NOT copy wording verbatim):\n${lines.join('\n\n')}`;
};
