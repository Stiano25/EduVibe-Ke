/**
 * Dump Part A live pending rows (Science diagrams + Fractions picture options).
 * Usage (from backend/): node scripts/dump-part-a-bank.js
 */
import '../config/loadEnv.js';
import { QuestionBankEntry } from '../models/QuestionBankEntry.js';

const IDS = {
  scienceDiagram: '04e704eb-8de5-4a77-8dc6-cc5805f753dd',
  scienceMcq: 'e5a39dd0-81dc-4801-9880-034c64a24926',
  fractionsBars: 'fcffd050-bf6a-48a2-b4d6-965aab1bc998',
  fractionsPicture: '12033aea-2cf6-40a0-90b7-084b546896e7',
  fractionsObject: '0817ae72-3d25-4426-b8b5-2ca6b14c969c'
};

const slim = (entry) => {
  if (!entry) return null;
  const q = entry.question || {};
  return {
    id: entry.id,
    status: entry.status,
    topic: entry.topic,
    interactionType: entry.interactionType,
    stem: q.question,
    diagramBriefId: q.diagramBriefId || null,
    diagramType: q.diagram?.diagramType || null,
    diagramParams: q.diagram?.params || null,
    options: q.options,
    params: q.params || null,
    qaFlagged: entry.qaFlagged,
    qaIssue: entry.qaIssue
  };
};

const main = async () => {
  const out = {};
  for (const [key, id] of Object.entries(IDS)) {
    out[key] = slim(await QuestionBankEntry.findById(id));
  }
  console.log(JSON.stringify(out, null, 2));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
