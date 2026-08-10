import { getDbClient } from '../../config/supabase.js';
import { embedText, cosineSimilarity } from './embeddingService.js';

const POOL_CAP = 200;
const MIN_FILTERED_POOL = 5;
const SCORE_THRESHOLD = 0.2;
const QUIZ_EXEMPLAR_MAX_CHARS = 420;

const SELECT_FIELDS =
  'id, content, embedding, grade, subject_name, document_id, metadata, question_number, question_text, topic, sub_topic, question_type, difficulty, grade_level, is_full_question';

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

const parseGradeNumber = (grade) => {
  if (grade == null || grade === '' || grade === 'K') return grade === 'K' ? 0 : null;
  const n = parseInt(grade, 10);
  return Number.isFinite(n) ? n : null;
};

const logRetrieval = (payload) => {
  console.log('[knowledge-retrieve]', JSON.stringify(payload));
};

const logRetrievalFallback = (params) => {
  console.warn(
    '[knowledge-retrieve] fallback:',
    JSON.stringify({
      subjectName: params.subjectName || null,
      grade: params.grade || null,
      topic: params.topic || null,
      questionType: params.questionType || null,
      reason: params.reason || 'insufficient_filtered_candidates'
    })
  );
};

/**
 * Diversify scored results by a field so we don't hand the LLM near-duplicates.
 */
export const diversifyByField = (items, field, limit = 8) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const byField = new Map();
  const nullish = [];
  for (const item of items) {
    const key = item?.[field];
    if (key == null || key === '') {
      nullish.push(item);
      continue;
    }
    const k = String(key);
    if (!byField.has(k)) byField.set(k, []);
    byField.get(k).push(item);
  }
  const keys = [...byField.keys()];
  const out = [];
  let round = 0;
  while (out.length < limit) {
    let added = false;
    for (const k of keys) {
      const bucket = byField.get(k);
      if (bucket && bucket[round]) {
        out.push(bucket[round]);
        added = true;
        if (out.length >= limit) break;
      }
    }
    if (!added) break;
    round++;
  }
  for (const item of nullish) {
    if (out.length >= limit) break;
    out.push(item);
  }
  return out.slice(0, limit);
};

const mapScoredRow = (c, queryEmbedding) => {
  const emb = Array.isArray(c.embedding) ? c.embedding : null;
  return {
    id: c.id,
    content: c.content,
    question_text: c.question_text || c.content,
    grade: c.grade,
    grade_level: c.grade_level,
    subjectName: c.subject_name,
    topic: c.topic,
    sub_topic: c.sub_topic,
    question_type: c.question_type,
    difficulty: c.difficulty,
    question_number: c.question_number,
    is_full_question: c.is_full_question,
    document_id: c.document_id,
    score: emb ? cosineSimilarity(queryEmbedding, emb) : -1
  };
};

const fetchChunkPool = async ({
  subjectName,
  grade,
  topic,
  questionType,
  preferFullQuestion,
  limit = POOL_CAP
}) => {
  const db = getDbClient();
  let q = db
    .from('knowledge_chunks')
    .select(SELECT_FIELDS)
    .not('embedding', 'is', null)
    .limit(limit);

  if (subjectName) {
    q = q.ilike('subject_name', `%${String(subjectName).slice(0, 40)}%`);
  }

  if (preferFullQuestion) {
    q = q.eq('is_full_question', true);
  }

  if (topic) {
    q = q.ilike('topic', `%${String(topic).slice(0, 60)}%`);
  }

  if (questionType) {
    q = q.eq('question_type', questionType);
  }

  const { data, error } = await q;
  if (error) {
    console.error('Knowledge retrieve query failed:', error.message || error);
    throw error;
  }

  let rows = data || [];

  // Soft grade filter in memory so NULL grade_level / legacy grade TEXT both work
  const gradeNum = parseGradeNumber(grade);
  const neighbors = gradeNeighbors(grade);
  if (gradeNum != null || neighbors.length > 0) {
    rows = rows.filter((c) => {
      if (c.grade_level != null && Number.isFinite(Number(c.grade_level))) {
        const gl = Number(c.grade_level);
        if (gradeNum != null) {
          return gl >= gradeNum - 1 && gl <= gradeNum + 1;
        }
      }
      // Unknown grade_level → treat as unfiltered/unknown (include)
      if (c.grade_level == null) {
        if (!neighbors.length) return true;
        if (c.grade == null) return true;
        return neighbors.includes(String(c.grade));
      }
      return true;
    });
  }

  return rows;
};

/**
 * Shared core — metadata filter BEFORE cosine similarity.
 * Fail-soft: returns [] on embed/DB errors (never throws to callers).
 */
export const retrieveRelevantChunks = async ({
  subjectName,
  grade,
  topic,
  questionType,
  queryText,
  difficultyPrefs,
  bloomBand,
  limit = 20
} = {}) => {
  try {
    const query = String(queryText || '').trim();
    if (!query) {
      logRetrieval({
        subjectName: subjectName || null,
        grade: grade || null,
        topic: topic || null,
        questionType: questionType || null,
        bloomBand: bloomBand || null,
        filteredCandidates: 0,
        fallbackTriggered: false,
        top3: []
      });
      return [];
    }

    const queryEmbedding = await embedText(query);
    if (!queryEmbedding) {
      logRetrieval({
        subjectName: subjectName || null,
        grade: grade || null,
        topic: topic || null,
        questionType: questionType || null,
        bloomBand: bloomBand || null,
        filteredCandidates: 0,
        fallbackTriggered: false,
        reason: 'embed_failed',
        top3: []
      });
      return [];
    }

    let fallbackTriggered = false;
    let fallbackReason = null;
    let pool = [];

    try {
      pool = await fetchChunkPool({
        subjectName,
        grade,
        topic,
        questionType,
        preferFullQuestion: true,
        limit: POOL_CAP
      });
    } catch (err) {
      console.error('retrieveRelevantChunks filtered query error:', err.message || err);
      pool = [];
    }

    const filteredCount = pool.length;

    if (pool.length < MIN_FILTERED_POOL) {
      fallbackTriggered = true;
      fallbackReason = 'insufficient_filtered_candidates';
      logRetrievalFallback({
        subjectName,
        grade,
        topic,
        questionType,
        reason: fallbackReason
      });
      try {
        pool = await fetchChunkPool({
          subjectName,
          grade,
          topic: null,
          questionType: null,
          preferFullQuestion: false,
          limit: POOL_CAP
        });
      } catch (err) {
        console.error('retrieveRelevantChunks broader fallback error:', err.message || err);
        pool = [];
      }
    }

    // Soft difficulty preference (re-rank, never hard-exclude)
    if (Array.isArray(difficultyPrefs) && difficultyPrefs.length > 0) {
      const prefSet = new Set(difficultyPrefs.map((d) => String(d).toLowerCase()));
      pool = [...pool].sort((a, b) => {
        const ap = a.difficulty && prefSet.has(String(a.difficulty).toLowerCase()) ? 0 : 1;
        const bp = b.difficulty && prefSet.has(String(b.difficulty).toLowerCase()) ? 0 : 1;
        return ap - bp;
      });
    }

    const capped = pool.slice(0, POOL_CAP);
    const scored = capped
      .map((c) => mapScoredRow(c, queryEmbedding))
      .filter((c) => c.score > SCORE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(limit, 30));

    logRetrieval({
      subjectName: subjectName || null,
      grade: grade || null,
      topic: topic || null,
      questionType: questionType || null,
      bloomBand: bloomBand || null,
      filteredCandidates: filteredCount,
      fallbackTriggered,
      fallbackReason,
      poolSize: capped.length,
      top3: scored.slice(0, 3).map((c) => ({ id: c.id, score: Number(c.score.toFixed(4)) }))
    });

    return scored;
  } catch (err) {
    console.error('retrieveRelevantChunks error:', err.message || err);
    return [];
  }
};

/**
 * Lesson-shell exemplars — preserve external contract: top-3, score > 0.2.
 * Truncation stays in formatExemplarsForPrompt.
 */
export const retrieveLessonExemplars = async ({
  grade,
  subjectName,
  queryText,
  topic,
  topK = 3
} = {}) => {
  const scored = await retrieveRelevantChunks({
    subjectName,
    grade,
    topic,
    queryText,
    limit: 20
  });
  return scored
    .filter((c) => c.score > SCORE_THRESHOLD)
    .slice(0, topK)
    .map((c) => ({
      content: c.content,
      grade: c.grade,
      subjectName: c.subjectName,
      score: c.score,
      id: c.id
    }));
};

/**
 * Quiz grounding exemplars — up to 8, diversified by question_type.
 */
export const retrieveQuizExemplars = async ({
  subjectName,
  grade,
  topic,
  bloomBand,
  queryText
} = {}) => {
  let questionType = null;
  let difficultyPrefs = null;

  if (bloomBand === 'foundation') {
    questionType = 'multiple_choice';
    difficultyPrefs = ['easy', 'medium'];
  } else if (bloomBand === 'application') {
    difficultyPrefs = ['medium', 'hard'];
  } else if (bloomBand === 'reasoning') {
    difficultyPrefs = ['hard', 'medium'];
  }

  let scored = await retrieveRelevantChunks({
    subjectName,
    grade,
    topic,
    questionType,
    difficultyPrefs,
    bloomBand,
    queryText,
    limit: 30
  });

  // If bloom-specific type filter emptied the useful set, retry without type
  if (scored.length < 3 && questionType) {
    scored = await retrieveRelevantChunks({
      subjectName,
      grade,
      topic,
      questionType: null,
      difficultyPrefs,
      bloomBand,
      queryText,
      limit: 30
    });
  }

  const filtered = scored.filter((c) => c.score > SCORE_THRESHOLD);
  return diversifyByField(filtered, 'question_type', 8);
};

/**
 * Backward-compat export — delegates to retrieveLessonExemplars.
 */
export const retrieveKnowledgeChunks = async ({
  grade,
  subjectName,
  queryText,
  topK = 6
} = {}) => retrieveLessonExemplars({ grade, subjectName, queryText, topK });

export const formatExemplarsForPrompt = (chunks = []) => {
  if (!chunks.length) return '';
  const lines = chunks.map((c, i) => {
    const snippet = String(c.content || '').slice(0, 500).trim();
    return `[${i + 1}] (grade ${c.grade || '?'}, score ${c.score?.toFixed?.(2) || '?'})\n${snippet}`;
  });
  return `STYLE AND DIFFICULTY EXEMPLARS FROM REAL EXAMS / NOTES (paraphrase only — do NOT copy wording verbatim):\n${lines.join('\n\n')}`;
};

export const formatQuizExemplarsForPrompt = (exemplars = []) => {
  if (!exemplars.length) return '';
  const lines = exemplars.map((e) => {
    const raw = String(e.question_text || e.content || '').replace(/\s+/g, ' ').trim();
    const text =
      raw.length > QUIZ_EXEMPLAR_MAX_CHARS
        ? `${raw.slice(0, QUIZ_EXEMPLAR_MAX_CHARS).trim()}…`
        : raw;
    return `- [${e.question_type || 'unknown'}, ${e.difficulty || 'unknown'}] ${text}`;
  });
  return `Here are ${exemplars.length} real past-paper questions on this topic/grade for reference.
Use them to inform realistic phrasing, topic coverage, and difficulty calibration.
DO NOT copy any question verbatim. Write original questions inspired by these patterns.

REFERENCE QUESTIONS:
${lines.join('\n')}`;
};
