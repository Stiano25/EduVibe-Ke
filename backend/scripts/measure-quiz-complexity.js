/**
 * Grade-complexity / diagram / token measurement harness.
 *
 * Runs a real generation for one sub-strand WITHOUT saving to the database,
 * then reports the numbers the grade-banding work is judged on:
 *   - stem word + sentence counts per bloom band
 *   - subordinate/comparative clause usage per bloom band
 *   - visual modality ratio and placeholder ("Figure for:") brief ratio
 *   - reviewRationale coverage
 *   - real input/output token usage per generation call
 *
 * Usage: node scripts/measure-quiz-complexity.js <subStrandId> <outLabel>
 */
import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { generateLessonsFromSubStrand } from '../admin/services/lessonGenerationService.js';
import { runWithGenerationUsage } from '../providers/contentProvider.js';

const subStrandId = process.argv[2];
const outLabel = process.argv[3] || 'run';
if (!subStrandId) {
  console.error('Usage: node scripts/measure-quiz-complexity.js <subStrandId> <outLabel>');
  process.exit(1);
}

/** Sonnet-class list pricing, USD per million tokens. Override via env for other tiers. */
const USD_PER_M_INPUT = Number(process.env.PRICE_INPUT_PER_M || 3);
const USD_PER_M_OUTPUT = Number(process.env.PRICE_OUTPUT_PER_M || 15);

const SUBORDINATORS =
  /\b(while|after|before|since|because|although|though|whereas|unless|until|if|when|whenever|which|whose|so that|in order to)\b/gi;
const COMPARATIVES = /\b(more|less|fewer|most|least|fastest|slowest|greater|smaller|better|worse|than|-er than)\b/gi;

const countWords = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;

const countSentences = (s) =>
  String(s)
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean).length;

const countMatches = (s, re) => (String(s).match(re) || []).length;

const analyseQuestion = (q) => {
  const stem = String(q.question || '');
  return {
    id: q.id,
    bloom: q.bloomLevel || 'unknown',
    modality: q.modality || 'unknown',
    words: countWords(stem),
    sentences: countSentences(stem),
    subordinators: countMatches(stem, SUBORDINATORS),
    comparatives: countMatches(stem, COMPARATIVES),
    hasDiagramBrief: Boolean(q.diagramBriefId),
    qaFlagged: Boolean(q.qa_flagged),
    qaIssue: q.qa_issue || null,
    optionCount: (q.options || []).length,
    rationaleCount: (q.reviewRationale || []).filter((r) => String(r || '').trim()).length,
    rationaleWords: (q.reviewRationale || [])
      .filter((r) => String(r || '').trim())
      .map((r) => countWords(r)),
    explanationWords: countWords(q.explanation || ''),
    misconceptionWords: (q.distractors || []).map((d) => countWords(d.misconception || '')),
    stem
  };
};

const summarise = (rows) => {
  if (rows.length === 0) return null;
  const avg = (key) => Number((rows.reduce((a, r) => a + r[key], 0) / rows.length).toFixed(2));
  const max = (key) => Math.max(...rows.map((r) => r[key]));
  return {
    n: rows.length,
    avgWords: avg('words'),
    maxWords: max('words'),
    avgSentences: avg('sentences'),
    maxSentences: max('sentences'),
    stemsWithSubordinator: rows.filter((r) => r.subordinators > 0).length,
    stemsWithComparative: rows.filter((r) => r.comparatives > 0).length,
    stemsOver20Words: rows.filter((r) => r.words > 20).length,
    stemsOver12Words: rows.filter((r) => r.words > 12).length,
    stemsOver2Sentences: rows.filter((r) => r.sentences > 2).length
  };
};

console.log(`Generating 1 lesson for subStrand ${subStrandId} (label: ${outLabel})`);
const started = Date.now();

const { result: lessons, usage } = await runWithGenerationUsage(() =>
  generateLessonsFromSubStrand(subStrandId, 1, ({ percent, message }) =>
    console.log(`[${percent}%] ${message}`)
  )
);

const lesson = lessons[0];
const questions = lesson?.quiz?.questions || [];
const briefs = lesson?.quiz?.visualBriefs || [];
const questionBriefs = briefs.filter((b) => String(b.id || '').startsWith('qvb-'));
const placeholderBriefs = questionBriefs.filter((b) => /^Figure for:/.test(String(b.brief || '')));

const rows = questions.map(analyseQuestion);
const byBloom = {};
for (const bloom of ['recall', 'understand', 'apply', 'reason']) {
  const s = summarise(rows.filter((r) => r.bloom === bloom));
  if (s) byBloom[bloom] = s;
}

const modality = rows.reduce((acc, r) => {
  acc[r.modality] = (acc[r.modality] || 0) + 1;
  return acc;
}, {});

const rationaleWordsAll = rows.flatMap((r) => r.rationaleWords);
const cost =
  (usage.inputTokens / 1_000_000) * USD_PER_M_INPUT +
  (usage.outputTokens / 1_000_000) * USD_PER_M_OUTPUT;

const report = {
  label: outLabel,
  subStrandId,
  generatedAt: new Date().toISOString(),
  elapsedSeconds: Math.round((Date.now() - started) / 1000),
  lessonTitle: lesson?.title,
  grade: lesson?.grade,
  questionCount: questions.length,
  overall: summarise(rows),
  byBloom,
  modality,
  visualQuestions: rows.filter((r) => r.modality === 'visual').length,
  visualWithBrief: rows.filter((r) => r.modality === 'visual' && r.hasDiagramBrief).length,
  questionBriefs: questionBriefs.length,
  placeholderBriefs: placeholderBriefs.length,
  placeholderRatio: questionBriefs.length
    ? Number((placeholderBriefs.length / questionBriefs.length).toFixed(3))
    : 0,
  qaFlagged: rows.filter((r) => r.qaFlagged).length,
  qaIssues: rows.filter((r) => r.qaFlagged).map((r) => ({ id: r.id, issue: r.qaIssue })),
  optionsTotal: rows.reduce((a, r) => a + r.optionCount, 0),
  rationalesPresent: rationaleWordsAll.length,
  rationaleAvgWords: rationaleWordsAll.length
    ? Number((rationaleWordsAll.reduce((a, b) => a + b, 0) / rationaleWordsAll.length).toFixed(2))
    : 0,
  learnerFacingLengths: {
    explanationAvgWords: Number(
      (rows.reduce((a, r) => a + r.explanationWords, 0) / (rows.length || 1)).toFixed(2)
    ),
    explanationMaxWords: Math.max(0, ...rows.map((r) => r.explanationWords)),
    explanationsOver16Words: rows.filter((r) => r.explanationWords > 16).length,
    misconceptionMaxWords: Math.max(0, ...rows.flatMap((r) => r.misconceptionWords)),
    misconceptionsOver8Words: rows.flatMap((r) => r.misconceptionWords).filter((w) => w > 8).length
  },
  tokens: {
    calls: usage.calls,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    byLabel: usage.byLabel,
    estimatedUsd: Number(cost.toFixed(4)),
    pricing: { inputPerM: USD_PER_M_INPUT, outputPerM: USD_PER_M_OUTPUT }
  },
  reasoningStems: rows.filter((r) => r.bloom === 'reason').map((r) => ({
    id: r.id,
    words: r.words,
    sentences: r.sentences,
    subordinators: r.subordinators,
    comparatives: r.comparatives,
    stem: r.stem
  })),
  allRows: rows
};

const outPath = resolve(process.cwd(), `../docs/measurements/${outLabel}.json`);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  JSON.stringify({ report, lesson }, null, 2),
  'utf8'
);

console.log('\n=== REPORT ===');
console.log(JSON.stringify(report, null, 2).slice(0, 6000));
console.log(`\nFull dump written to ${outPath}`);
