/**
 * Dry-run the bank prompt. Generates and prints samples. Does NOT insert
 * question_bank_entries and does not touch existing pending rows.
 *
 * Usage (from backend/):
 *   node scripts/preview-bank-generation.js
 *   node scripts/preview-bank-generation.js <scienceSubStrandId> <fractionsSubStrandId>
 */
import '../config/loadEnv.js';
import { generateContent } from '../providers/contentProvider.js';
import {
  loadGenerationContext,
  parseOneLessonJson,
  chunkQuestions,
  flagNearDuplicateQuestions,
  normalizeQuiz
} from '../admin/services/lessonGenerationService.js';
import { retrieveQuizExemplars, formatQuizExemplarsForPrompt } from '../admin/services/knowledgeRetrieveService.js';
import {
  buildBankGenerationPrompt,
  isColumnArithmeticTopic
} from '../admin/services/questionBankService.js';
import { isVisualOption } from '../utils/quizOptions.js';

const SCIENCE_ID = process.argv[2] || '82861888-d67e-42ef-8cac-3454b10c850d';
const FRACTIONS_ID = process.argv[3] || 'ff545989-b4bc-44db-bb52-5c9539039f91';

const pickScienceSample = (questions, briefs) => {
  const withDiagram = questions.find((q) => q.diagram || q.diagramBriefId);
  const sample = withDiagram || questions.find((q) => q.modality === 'visual') || questions[0];
  const brief = briefs.find((b) => b.id === sample?.diagramBriefId) || null;
  return { sample, brief };
};

const pickFractionsSample = (questions, briefs) => {
  const withPics = questions.find((q) => (q.options || []).some(isVisualOption));
  const withBars = questions.find(
    (q) =>
      q.diagram?.diagramType === 'fraction_bars' ||
      briefs.some((b) => b.id === q.diagramBriefId && b.diagramType === 'fraction_bars')
  );
  const sample = withPics || withBars || questions.find((q) => q.diagram || q.diagramBriefId) || questions[0];
  const brief = briefs.find((b) => b.id === sample?.diagramBriefId) || null;
  return { sample, brief };
};

const generatePreview = async (subStrandId, label, picker) => {
  const ctx = await loadGenerationContext(subStrandId);
  let exemplars = [];
  try {
    exemplars = await retrieveQuizExemplars({
      subjectName: ctx.subject.name,
      grade: ctx.grade,
      topic: ctx.subStrand.name,
      bloomBand: 'foundation',
      queryText: ctx.queryText
    });
  } catch (err) {
    console.warn(`${label}: exemplar retrieve failed:`, err.message || err);
  }
  const prompt = buildBankGenerationPrompt(ctx, 4, formatQuizExemplarsForPrompt(exemplars));
  const { text } = await generateContent({
    prompt,
    maxTokens: 8000,
    label: `preview-bank ${ctx.subStrand.name}`
  });
  const parsed = parseOneLessonJson(text, ctx, 0);
  if (parsed.parseFailed) {
    throw new Error(`${label}: unparseable JSON`);
  }
  const raw = flagNearDuplicateQuestions(chunkQuestions(parsed.data), exemplars, `preview ${label}`);
  const { questions, questionBriefs } = normalizeQuiz(
    { questions: raw },
    ctx.sourceOutcomes,
    ctx.profile,
    {
      additionTemplates: false,
      gradeNumber: ctx.gradeNumber,
      defaultNumericLayout: isColumnArithmeticTopic(ctx) ? 'vertical' : 'horizontal'
    }
  );
  const { sample, brief } = picker(questions, questionBriefs);
  return {
    label,
    topic: ctx.subStrand.name,
    grade: ctx.grade,
    subject: ctx.subject.name,
    generatedCount: questions.length,
    interactionTypes: [...new Set(questions.map((q) => q.interactionType))],
    sample,
    attachedBrief: brief
  };
};

const main = async () => {
  const science = await generatePreview(SCIENCE_ID, 'Science', pickScienceSample);
  const fractions = await generatePreview(FRACTIONS_ID, 'Fractions', pickFractionsSample);
  console.log(JSON.stringify({ science, fractions }, null, 2));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
