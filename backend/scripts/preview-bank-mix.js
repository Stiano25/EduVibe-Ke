/**
 * Live mix-config evidence. Generates from synthetic ctx — does NOT load a
 * sub-strand from the DB and does NOT insert question_bank_entries.
 *
 * Usage (from backend/): node scripts/preview-bank-mix.js
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../config/loadEnv.js';
import { generateContent } from '../providers/contentProvider.js';
import {
  getComplexityBand,
  parseOneLessonJson,
  chunkQuestions,
  flagNearDuplicateQuestions,
  normalizeQuiz
} from '../admin/services/lessonGenerationService.js';
import { getSubjectProfile } from '../admin/services/subjectProfiles.js';
import {
  buildBankGenerationPrompt,
  isColumnArithmeticTopic
} from '../admin/services/questionBankService.js';
import { resolveBankMix, renderBankInteractionMix } from '../admin/services/bankMixProfiles.js';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '../../docs/measurements/bank-mix-config-live.json');

const mixBlock = (prompt) => {
  const start = prompt.indexOf('INTERACTION MIX');
  const end = prompt.indexOf('\n\nCOPYRIGHT');
  return start >= 0 && end > start ? prompt.slice(start, end) : '';
};

const makeCtx = ({ grade, subjectName, strandName, subStrandName, outcomes }) => {
  const gradeNumber = grade === 'K' ? 0 : parseInt(grade, 10);
  const complexityBand = getComplexityBand(gradeNumber);
  return {
    grade: String(grade),
    gradeNumber,
    ageGroup: complexityBand.ageGroup,
    complexityBand,
    subject: { name: subjectName },
    strand: { name: strandName },
    subStrand: { name: subStrandName },
    outcomesBlock: outcomes.map((o, i) => `${i + 1}. ${o}`).join('\n'),
    sourceOutcomes: outcomes,
    profile: getSubjectProfile(subjectName)
  };
};

const summarizeQuestion = (q) => ({
  interactionType: q.interactionType,
  stem: q.question,
  left: q.left || null,
  right: q.right || null,
  correctPairs: q.correctPairs || null,
  options: Array.isArray(q.options) ? q.options.slice(0, 4) : q.options || null,
  diagramType: q.diagram?.diagramType || q.options?.[0]?.diagramType || null,
  explanation: q.explanation || null
});

const plantPartMentions = (questions) => {
  const hits = [];
  for (const q of questions) {
    const blob = JSON.stringify(q).toLowerCase();
    if (blob.includes('plant part') || blob.includes('plant-part')) {
      hits.push(q.question || q.stem || '');
    }
  }
  return hits;
};

const generateSynthetic = async (label, ctx, count) => {
  const mix = resolveBankMix(ctx);
  const prompt = buildBankGenerationPrompt(ctx, count, '');
  const { text } = await generateContent({
    prompt,
    maxTokens: 16000,
    label: `preview-mix ${label}`
  });
  const parsed = parseOneLessonJson(text, ctx, 0);
  if (parsed.parseFailed) {
    throw new Error(`${label}: unparseable JSON`);
  }
  const raw = flagNearDuplicateQuestions(chunkQuestions(parsed.data), [], `preview ${label}`);
  const { questions } = normalizeQuiz(
    { questions: raw },
    ctx.sourceOutcomes,
    ctx.profile,
    {
      additionTemplates: false,
      gradeNumber: ctx.gradeNumber,
      defaultNumericLayout: isColumnArithmeticTopic(ctx) ? 'vertical' : 'horizontal'
    }
  );
  const types = {};
  for (const q of questions) {
    const t = q.interactionType || 'unknown';
    types[t] = (types[t] || 0) + 1;
  }
  return {
    label,
    mixKey: mix.key,
    grade: ctx.grade,
    subject: ctx.subject.name,
    topic: ctx.subStrand.name,
    mixBlock: mixBlock(prompt),
    mixRenderer: renderBankInteractionMix(ctx),
    generatedCount: questions.length,
    types,
    matchingPairs: questions.filter((q) => q.interactionType === 'matching_pairs').map(summarizeQuestion),
    oddOneOut: questions.filter((q) => q.interactionType === 'odd_one_out').map(summarizeQuestion),
    samples: questions.map(summarizeQuestion),
    plantPartMentions: plantPartMentions(questions)
  };
};

const CASES = [
  {
    label: 'g3-science',
    count: 8,
    ctx: makeCtx({
      grade: '3',
      subjectName: 'Science',
      strandName: 'Plants',
      subStrandName: 'Plant parts',
      outcomes: [
        'Name the main parts of a flowering plant',
        'Explain the function of roots, stem, leaves and flowers'
      ]
    })
  },
  {
    label: 'g3-fractions',
    count: 6,
    ctx: makeCtx({
      grade: '3',
      subjectName: 'Mathematics',
      strandName: 'Numbers',
      subStrandName: 'Fractions',
      outcomes: ['identify 1/2, 1/4 and 1/8 as part of a whole']
    })
  },
  {
    label: 'g3-addition',
    count: 6,
    ctx: makeCtx({
      grade: '3',
      subjectName: 'Mathematics',
      strandName: 'Numbers',
      subStrandName: 'Addition',
      outcomes: ['add two 3-digit numbers without regrouping']
    })
  },
  {
    label: 'social-studies',
    count: 8,
    ctx: makeCtx({
      grade: '4',
      subjectName: 'Social Studies',
      strandName: 'Citizenship',
      subStrandName: 'Leaders and their roles',
      outcomes: [
        'Match community leaders and Kenyan figures to the work or events they are known for',
        'Describe the role of a chief, a teacher and a parent in the community'
      ]
    })
  },
  {
    label: 'g9-integrated-science',
    count: 8,
    ctx: makeCtx({
      grade: '9',
      subjectName: 'Integrated Science',
      strandName: 'Matter and materials',
      subStrandName: 'Elements, compounds and mixtures',
      outcomes: [
        'Distinguish elements, compounds and mixtures',
        'Relate particle arrangement to the properties of matter'
      ]
    })
  }
];

const main = async () => {
  const results = {};
  for (const item of CASES) {
    console.log(`Generating ${item.label}…`);
    results[item.label] = await generateSynthetic(item.label, item.ctx, item.count);
    console.log(
      item.label,
      results[item.label].mixKey,
      results[item.label].types,
      'plantPartHits',
      results[item.label].plantPartMentions.length
    );
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log('wrote', outPath);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
