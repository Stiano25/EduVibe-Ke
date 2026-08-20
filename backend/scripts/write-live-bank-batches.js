/**
 * Part A: write live bank batches (pending review). Does not approve or
 * overwrite existing rows — createMany inserts new pending entries.
 *
 * Usage (from backend/): node scripts/write-live-bank-batches.js
 */
import '../config/loadEnv.js';
import { generateQuestionBankBatch } from '../admin/services/questionBankService.js';

const SCIENCE_ID = '82861888-d67e-42ef-8cac-3454b10c850d';
const FRACTIONS_ID = 'ff545989-b4bc-44db-bb52-5c9539039f91';

const summarize = (label, batch) => {
  const types = {};
  const samples = [];
  for (const entry of batch.entries || []) {
    const t = entry.interactionType || 'unknown';
    types[t] = (types[t] || 0) + 1;
    const q = entry.question || {};
    samples.push({
      id: entry.id,
      status: entry.status,
      interactionType: t,
      stem: q.question,
      diagramBriefId: q.diagramBriefId || null,
      option0: Array.isArray(q.options) ? q.options[0] : null,
      left: q.left || null
    });
  }
  return {
    label,
    topic: batch.topic,
    created: batch.created,
    pending: batch.pending,
    rejected: batch.rejected,
    qaFlagged: batch.qaFlagged,
    types,
    samples
  };
};

const main = async () => {
  const science = await generateQuestionBankBatch(SCIENCE_ID, { count: 8 });
  const fractions = await generateQuestionBankBatch(FRACTIONS_ID, { count: 8 });
  console.log(JSON.stringify({ science: summarize('Science', science), fractions: summarize('Fractions', fractions) }, null, 2));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
