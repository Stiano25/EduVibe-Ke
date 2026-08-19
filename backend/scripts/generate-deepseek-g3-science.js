/**
 * One real DeepSeek-default generation: Grade 3 Science / Plant parts.
 * Same Admin Generate path. Saves as pending — does not approve.
 *
 * Usage (from backend/): node scripts/generate-deepseek-g3-science.js
 */
import '../config/loadEnv.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateLessonsFromSubStrand } from '../admin/services/lessonGenerationService.js';
import { Lesson } from '../models/Lesson.js';
import {
  getGenerationProvider,
  resetGenerationUsage,
  getGenerationUsage
} from '../providers/contentProvider.js';
import { getDeepSeekModel } from '../providers/deepseekContentProvider.js';
import { applyQuizQualityGates } from '../utils/quizQualityGates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUB_STRAND_ID = process.argv[2] || '82861888-d67e-42ef-8cac-3454b10c850d';
const OUT_PATH = path.resolve(__dirname, '../../docs/first-deepseek-generation-g3-science.json');

/** DeepSeek V4-Pro list USD per million tokens (cache-miss). Peak: 01:00–04:00 and 06:00–10:00 UTC. */
const PEAK_INPUT_USD_PER_M = 1.32;
const PEAK_OUTPUT_USD_PER_M = 3.96;
const OFFPEAK_INPUT_USD_PER_M = 0.66;
const OFFPEAK_OUTPUT_USD_PER_M = 1.98;

const isPeakUtc = (date) => {
  const h = date.getUTCHours();
  return (h >= 1 && h < 4) || (h >= 6 && h < 10);
};

const main = async () => {
  const provider = getGenerationProvider();
  const model = getDeepSeekModel();
  const generatedAt = new Date();
  const peak = isPeakUtc(generatedAt);
  const inputUsdPerM = peak ? PEAK_INPUT_USD_PER_M : OFFPEAK_INPUT_USD_PER_M;
  const outputUsdPerM = peak ? PEAK_OUTPUT_USD_PER_M : OFFPEAK_OUTPUT_USD_PER_M;

  console.log('=== DeepSeek primary generation ===');
  console.log({
    GENERATION_PROVIDER: provider,
    DEEPSEEK_MODEL: model,
    subStrandId: SUB_STRAND_ID,
    QUIZ_QA_ENABLED: process.env.QUIZ_QA_ENABLED ?? '(default on)',
    utcHour: generatedAt.getUTCHours(),
    pricingBand: peak ? 'peak' : 'off-peak'
  });

  if (provider !== 'deepseek') {
    console.error(
      `Expected GENERATION_PROVIDER=deepseek (got "${provider}"). Aborting — will not fall back.`
    );
    process.exit(1);
  }

  resetGenerationUsage();
  const errors = [];

  let generated;
  try {
    generated = await generateLessonsFromSubStrand(SUB_STRAND_ID, 1, ({ percent, message }) => {
      console.log(`[${percent}%] ${message}`);
    });
  } catch (err) {
    errors.push({ phase: 'generate', message: err?.message || String(err) });
    console.error('Generation failed:', err?.message || err);
    const usage = getGenerationUsage();
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify({ error: true, errors, usage }, null, 2), 'utf8');
    process.exit(1);
  }

  console.log('Generated', generated.length, 'lesson(s) — saving as pending…');
  const saved = await Lesson.createMany(generated);
  const lesson = saved[0];
  const qs = lesson.quiz?.questions || [];
  const report = lesson.quiz?.coverageReport || null;
  const qaFlagged = qs.filter((q) => q.qa_flagged);
  const difficulties = qs.reduce((acc, q) => {
    const d = q.difficulty || 'unset';
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});

  const mechanical = applyQuizQualityGates(qs.map((q) => ({ ...q })));

  const usage = getGenerationUsage();
  const costUsd =
    (usage.inputTokens / 1_000_000) * inputUsdPerM +
    (usage.outputTokens / 1_000_000) * outputUsdPerM;

  const sampleQuestions = qs.slice(0, 5).map((q) => ({
    id: q.id,
    question: q.question,
    type: q.type || q.interactionType,
    options: q.options,
    correctAnswer: q.correctAnswer,
    qa_flagged: q.qa_flagged || false,
    qa_issue: q.qa_issue || null
  }));

  const metrics = {
    lessonId: lesson.id,
    title: lesson.title,
    status: lesson.status,
    quizSource: lesson.quiz?.source || null,
    bankSize: `${qs.length}/30`,
    questionCount: qs.length,
    coverageReport: report,
    mechanicalGates: mechanical,
    qaFlaggedCount: qaFlagged.length,
    qaFlags: qaFlagged.map((q) => ({
      id: q.id,
      question: q.question,
      qa_issue: q.qa_issue
    })),
    difficulties,
    usage,
    cost: {
      pricingBand: peak ? 'peak' : 'off-peak',
      utcHour: generatedAt.getUTCHours(),
      inputUsdPerM,
      outputUsdPerM,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      usd: Number(costUsd.toFixed(6)),
      note: 'Cache-miss list rates. Cache-hit input would be cheaper if the API reported hits on these calls.'
    },
    provider,
    model,
    errors,
    generatedAt: generatedAt.toISOString()
  };

  const payload = {
    metrics,
    sampleQuestions,
    lesson: {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      grade: lesson.grade,
      status: lesson.status,
      learningObjectives: lesson.learningObjectives,
      content: lesson.content,
      contentBlocks: lesson.contentBlocks,
      visualBriefs: lesson.visualBriefs,
      quiz: lesson.quiz
    }
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2), 'utf8');

  console.log('\n=== METRICS ===');
  console.log(JSON.stringify(metrics, null, 2));
  console.log('\n=== SAMPLE QUESTIONS ===');
  console.log(JSON.stringify(sampleQuestions, null, 2));
  console.log('\nWrote', OUT_PATH);
  console.log('Pending review lesson id:', lesson.id);
  if (lesson.status !== 'pending') {
    console.error('WARNING: expected status pending, got', lesson.status);
    process.exitCode = 1;
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
