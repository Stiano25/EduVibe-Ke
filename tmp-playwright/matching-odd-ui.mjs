/**
 * Screenshots of matching_pairs and odd_one_out in the real learner quiz shell.
 * Uses generated Science bank items from docs/measurements/science-new-interactions.json
 * when present.
 *
 * Usage:
 *   FRONTEND_URL=http://localhost:5173 node matching-odd-ui.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../docs/measurements');
fs.mkdirSync(outDir, { recursive: true });

const BASE = process.env.FRONTEND_URL || 'http://localhost:5173';
const API = 'http://localhost:3000/api';
const generatedPath = path.join(outDir, 'science-new-interactions.json');

const generated = fs.existsSync(generatedPath)
  ? JSON.parse(fs.readFileSync(generatedPath, 'utf8'))
  : {};

const matchingQ = generated.matching?.question || {
  question: 'Match each plant part to its job.',
  left: ['Roots', 'Leaves', 'Flowers'],
  right: ['Absorb water', 'Make food', 'Make seeds'],
  interactionType: 'matching_pairs'
};

const oddQ = generated.oddOneOut?.question || {
  question: 'Which of these is not a plant part?',
  options: ['Root', 'Stem', 'Leaf', 'Stone'],
  interactionType: 'odd_one_out'
};

const user = {
  id: 'shot-learner',
  name: 'Amina',
  email: 'amina@example.com',
  role: 'learner',
  grade: '3'
};

const json = (body) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body)
});

const lessonFor = (id, question) => ({
  id,
  title: 'Plant parts',
  description: '',
  strandId: 'strand-plants',
  subStrandId: 'ss-plant-parts',
  subjectId: 'sub-science',
  grade: '3',
  contentType: 'reading',
  difficulty: 'beginner',
  tags: [],
  duration: 10,
  quiz: {
    title: 'Practice',
    passingScore: 60,
    questionCount: 1,
    questions: [
      {
        id: question.id || 'q-live',
        question: question.question,
        options: question.options || [],
        left: question.left,
        right: question.right,
        interactionType: question.interactionType
      }
    ]
  }
});

const handleApi = (url, mode) => {
  const u = new URL(url);
  const p = u.pathname.replace(/\/$/, '');
  const question = mode.kind === 'odd' ? oddQ : matchingQ;

  if (p.endsWith('/learner/profile')) {
    return json({ preferredModality: 'mixed', modalityPromptSeen: true });
  }
  if (p.endsWith('/learner/skill-mastery')) return json([]);
  if (p.endsWith('/learner/lesson-choices')) return json({ grade: '3', choices: [] });
  if (p.endsWith('/learner/next-task')) {
    return json({
      navigationMode: 'quest',
      grade: '3',
      complexityBand: 'young',
      catalog: {
        subjectCount: 1,
        subjectNames: ['Science'],
        crossSubjectAvailable: false,
        limitation: null
      },
      task: null
    });
  }
  if (p.includes('/scaffold')) return json({ needsScaffold: false });
  if (p.includes('/similar')) return json([]);
  if (p.includes('/next') && !p.includes('adaptive-next')) return json([]);

  if (p.includes('/adaptive-start')) {
    return json({
      mode: 'adaptive',
      session: { lessonId: mode.lessonId, matchingRightOrders: {} },
      question: {
        id: 'q-live',
        question: question.question,
        options: question.options || [],
        left: question.left,
        right: question.right,
        interactionType: question.interactionType
      },
      meta: { phase: 'main', progressLabel: 'Question 1 of 10', progressPct: 0, done: false }
    });
  }

  if (p.includes('/adaptive-next')) {
    const grade = generated.grading?.matchingPartial?.lastAnswer;
    const total = Array.isArray(question.left) ? question.left.length : 3;
    const matched = Number(grade?.matchedPairs);
    return json({
      session: { lessonId: mode.lessonId },
      question: {
        id: 'q-next',
        question: question.question,
        options: question.options || [],
        left: question.left,
        right: question.right,
        interactionType: question.interactionType
      },
      lastAnswer: mode.partial
        ? {
            correct: false,
            correctAnswerIndex: total,
            matchedPairs: Number.isFinite(matched) ? matched : Math.max(1, total - 2),
            totalPairs: Number(grade?.totalPairs) || total,
            explanation: 'Some matches were right.'
          }
        : {
            correct: true,
            correctAnswerIndex: 0,
            explanation: 'Yes.'
          },
      meta: { phase: 'main', progressLabel: 'Question 2 of 10', progressPct: 10, done: false }
    });
  }

  if (p.includes('/learner/lesson/')) {
    return json(lessonFor(mode.lessonId, question));
  }

  return json({});
};

const shot = async (page, name) => {
  const p = path.join(outDir, name);
  await page.screenshot({ path: p, fullPage: true });
  console.log('Wrote', p);
  return p;
};

const openLesson = async (page, mode) => {
  await page.route(`${API}/**`, async (route) => {
    await route.fulfill(handleApi(route.request().url(), mode));
  });
  await page.addInitScript(
    ({ user: u }) => {
      sessionStorage.setItem('token', 'shot-token');
      sessionStorage.setItem('user', JSON.stringify(u));
      sessionStorage.setItem('userId', u.id);
    },
    { user }
  );
  await page.goto(`${BASE}/learner/lessons/${mode.lessonId}`, {
    waitUntil: 'networkidle',
    timeout: 60000
  });
};

const browser = await chromium.launch({ headless: true });

try {
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await openLesson(page, { kind: 'matching', lessonId: 'lesson-matching' });
    await page.getByText('Tap a word on the left, then tap its match.').waitFor({ timeout: 20000 });
    await shot(page, 'science-matching-pairs-live.png');
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await openLesson(page, { kind: 'odd', lessonId: 'lesson-odd' });
    await page.getByText('Which one does not belong?').waitFor({ timeout: 20000 });
    await shot(page, 'science-odd-one-out-live.png');
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await openLesson(page, { kind: 'matching', lessonId: 'lesson-matching-partial', partial: true });
    await page.getByText('Tap a word on the left, then tap its match.').waitFor({ timeout: 20000 });
    const left = matchingQ.left || ['Roots', 'Leaves', 'Flowers'];
    const right = matchingQ.right || ['Absorb water', 'Make food', 'Make seeds'];
    const n = right.length;
    for (let i = 0; i < left.length; i += 1) {
      await page.getByRole('button', { name: String(left[i]) }).click();
      const rightIndex = i === 0 || n < 2 ? 0 : (i % (n - 1)) + 1;
      await page.getByRole('button', { name: String(right[rightIndex]) }).click();
    }
    await page.getByRole('button', { name: 'Done' }).click();
    await page.getByText(/of \d+ matches/).waitFor({ timeout: 8000 });
    await shot(page, 'science-matching-pairs-partial.png');
    await page.close();
  }

  console.log('matching/odd-one-out screenshots: OK');
} finally {
  await browser.close();
}
