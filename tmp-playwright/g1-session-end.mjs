/**
 * Screenshots for Grade 1–3 session-end (no review wall) and per-answer characters.
 * Mocks the learner API so this does not need a live login.
 *
 * Usage:
 *   FRONTEND_URL=http://localhost:5173 node g1-session-end.mjs
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

const user = {
  id: 'shot-learner',
  name: 'Amina',
  email: 'amina@example.com',
  role: 'learner',
  grade: '1'
};

const quiz = {
  title: 'Practice',
  passingScore: 60,
  questionCount: 4,
  questions: [
    {
      id: 'q1',
      question: 'What is 2 + 2?',
      options: ['4', '3', '5', '6'],
      interactionType: 'multiple_choice'
    }
  ]
};

const lessonBase = {
  id: 'lesson-g1',
  title: 'Adding',
  description: '',
  strandId: 'strand-1',
  subStrandId: 'ss-1',
  subjectId: 'sub-1',
  grade: '1',
  contentType: 'reading',
  difficulty: 'beginner',
  tags: [],
  duration: 10,
  quiz
};

const reviewItems = [
  {
    id: 'q1',
    question: 'What is 2 + 2?',
    options: ['4', '3', '5', '6'],
    correctAnswerIndex: 0,
    selectedOptionIndex: 0,
    correct: true,
    interactionType: 'multiple_choice',
    phase: 'main'
  },
  {
    id: 'q2',
    question: 'What is 5 + 3?',
    options: ['8', '7', '9', '6'],
    correctAnswerIndex: 0,
    selectedOptionIndex: 1,
    correct: false,
    interactionType: 'multiple_choice',
    phase: 'main'
  }
];

const json = (body) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body)
});

const liveQuestion = (id = 'q1') => ({
  id,
  question: 'What is 2 + 2?',
  options: ['4', '3', '5', '6'],
  interactionType: 'multiple_choice'
});

const handleApi = (url, mode) => {
  const u = new URL(url);
  const p = u.pathname.replace(/\/$/, '');

  if (p.endsWith('/learner/profile')) {
    return json({ preferredModality: 'mixed', modalityPromptSeen: true });
  }
  if (p.endsWith('/learner/skill-mastery')) return json([]);
  if (p.endsWith('/learner/lesson-choices')) {
    return json({ grade: mode.grade, choices: [] });
  }
  if (p.endsWith('/learner/next-task')) {
    return json({
      navigationMode: 'quest',
      grade: mode.grade,
      complexityBand: 'very_young',
      catalog: { subjectCount: 1, subjectNames: ['Mathematics'], crossSubjectAvailable: false, limitation: null },
      task: null
    });
  }
  if (p.includes('/scaffold')) return json({ needsScaffold: false });
  if (p.includes('/similar')) return json([]);
  if (p.includes('/next') && !p.includes('adaptive-next')) return json([]);

  if (p.includes('/adaptive-start')) {
    if (mode.scene === 'done') {
      return json({
        mode: 'review',
        completed: true,
        review: {
          items: reviewItems,
          score: { correct: 2, total: 4, percentage: 50, retryCount: 1 },
          practiceScore: { percentage: 70, total: 4, creditSum: 2.8 }
        }
      });
    }
    return json({
      mode: 'adaptive',
      session: { lessonId: mode.lessonId },
      question: liveQuestion('q-live'),
      meta: { phase: 'main', progressLabel: 'Question 1 of 10', progressPct: 0, done: false }
    });
  }

  if (p.includes('/adaptive-next')) {
    const correct = mode.scene === 'correct';
    return json({
      session: { lessonId: mode.lessonId },
      question: liveQuestion('q-next'),
      lastAnswer: {
        correct,
        correctAnswerIndex: 0,
        explanation: 'Because 2 and 2 make 4.'
      },
      meta: { phase: 'main', progressLabel: 'Question 2 of 10', progressPct: 10, done: false }
    });
  }

  if (p.includes('/learner/lesson/')) {
    const completed = mode.scene === 'done';
    return json({
      ...lessonBase,
      id: mode.lessonId,
      grade: mode.grade,
      isCompleted: completed,
      progress: completed ? 50 : 0,
      sessionReview: completed
        ? {
            score: { percentage: 50 },
            practiceScore: { percentage: 70 }
          }
        : null
    });
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
    { user: { ...user, grade: mode.grade } }
  );

  await page.goto(`${BASE}/learner/lessons/${mode.lessonId}`, { waitUntil: 'networkidle', timeout: 60000 });
};

const browser = await chromium.launch({ headless: true });

try {
  // Task 1: Grade 1–3 session end — banner only
  {
    const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
    await openLesson(page, { scene: 'done', grade: '1', lessonId: 'lesson-g1-done' });
    await page.getByText(/Well done!|Amazing!|Nearly there!|Good try!/).first().waitFor({ timeout: 15000 });
    const reviewCount = await page.getByText('Review mode').count();
    const q1Count = await page.getByText(/^Q1$/).count();
    console.log('G1 review wall heading count:', reviewCount, 'Q1 count:', q1Count);
    if (reviewCount !== 0) throw new Error('Grade 1 still shows Review mode');
    await shot(page, 'g1-3-session-end-banner-only.png');
    await page.close();
  }

  // Control: Grade 4 still has the wall
  {
    const page = await browser.newPage({ viewport: { width: 900, height: 1400 } });
    await openLesson(page, { scene: 'done', grade: '4', lessonId: 'lesson-g4-done' });
    await page.getByText('Review mode').waitFor({ timeout: 15000 });
    await shot(page, 'g4-session-end-review-wall.png');
    await page.close();
  }

  // Task 2: correct character
  {
    const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
    await openLesson(page, { scene: 'correct', grade: '1', lessonId: 'lesson-g1-live' });
    await page.getByRole('group', { name: 'Answer choices' }).waitFor({ timeout: 15000 });
    await page.getByRole('group', { name: 'Answer choices' }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.getByRole('button', { name: /A\.\s*4/ }).click();
    await page.getByText('Yes!').waitFor({ timeout: 5000 });
    await page.locator('.ev-answer-character').waitFor({ state: 'attached', timeout: 5000 });
    await page.clock.fastForward(280);
    await shot(page, 'g1-3-character-correct.png');
    await page.close();
  }

  // Task 2: incorrect character
  {
    const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
    await openLesson(page, { scene: 'incorrect', grade: '1', lessonId: 'lesson-g1-wrong' });
    await page.getByRole('group', { name: 'Answer choices' }).waitFor({ timeout: 15000 });
    await page.getByRole('group', { name: 'Answer choices' }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.getByRole('button', { name: /B\.\s*3/ }).click();
    await page.getByText('Try again').waitFor({ timeout: 5000 });
    await page.locator('.ev-answer-character').waitFor({ state: 'attached', timeout: 5000 });
    await page.clock.fastForward(400);
    await shot(page, 'g1-3-character-incorrect.png');
    await page.close();
  }

  console.log('g1-session-end screenshots: OK');
} finally {
  await browser.close();
}
