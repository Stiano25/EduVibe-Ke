/**
 * One real Claude-default generation: Grade 3 Science / Plant parts.
 * Saves full lesson JSON + metrics for founder review.
 *
 * Usage: node scripts/generate-claude-g3-science.js
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
import { getClaudeModel } from '../providers/claudeContentProvider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUB_STRAND_ID = process.argv[2] || '82861888-d67e-42ef-8cac-3454b10c850d';
const OUT_PATH = path.resolve(__dirname, '../../docs/first-claude-generation-g3-science.json');

/** Sonnet 5 pricing (USD per million tokens): input $2 / output $10 */
const INPUT_USD_PER_M = 2;
const OUTPUT_USD_PER_M = 10;

const main = async () => {
  const provider = getGenerationProvider();
  console.log('=== Claude primary generation ===');
  console.log({
    GENERATION_PROVIDER: provider,
    CLAUDE_MODEL: getClaudeModel(),
    subStrandId: SUB_STRAND_ID,
    QUIZ_QA_ENABLED: process.env.QUIZ_QA_ENABLED ?? '(default on)'
  });

  if (provider !== 'claude') {
    console.error(
      `Expected GENERATION_PROVIDER=claude (got "${provider}"). Aborting — will not fall back.`
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
    fs.writeFileSync(
      OUT_PATH,
      JSON.stringify({ error: true, errors, usage }, null, 2),
      'utf8'
    );
    process.exit(1);
  }

  console.log('Generated', generated.length, 'lesson(s) — saving…');
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

  const usage = getGenerationUsage();
  const costUsd =
    (usage.inputTokens / 1_000_000) * INPUT_USD_PER_M +
    (usage.outputTokens / 1_000_000) * OUTPUT_USD_PER_M;

  const metrics = {
    lessonId: lesson.id,
    title: lesson.title,
    status: lesson.status,
    bankSize: `${qs.length}/30`,
    questionCount: qs.length,
    coverageReport: report,
    qaFlaggedCount: qaFlagged.length,
    qaFlags: qaFlagged.map((q) => ({
      id: q.id,
      question: q.question,
      qa_issue: q.qa_issue
    })),
    difficulties,
    usage,
    cost: {
      inputUsdPerM: INPUT_USD_PER_M,
      outputUsdPerM: OUTPUT_USD_PER_M,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      usd: Number(costUsd.toFixed(6))
    },
    provider,
    model: getClaudeModel(),
    errors,
    generatedAt: new Date().toISOString()
  };

  const payload = {
    metrics,
    lesson: {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      grade: lesson.grade,
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
  console.log('\nWrote', OUT_PATH);
  console.log('Open Admin → Lessons and review lesson id:', lesson.id);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
