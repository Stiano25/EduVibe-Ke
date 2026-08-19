/**
 * Proof screenshots for notes removal, worked-example autoplay, distinct titles, hero.
 *
 * Usage:
 *   FRONTEND_URL=http://localhost:5174 node g1-notes-autoplay-titles.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../docs/measurements');
fs.mkdirSync(outDir, { recursive: true });

const BASE = process.env.FRONTEND_URL || 'http://localhost:5174';
const API = 'http://localhost:3000/api';

const user = {
  id: 'shot-learner',
  name: 'Amina',
  email: 'amina@example.com',
  role: 'learner',
  grade: '1'
};

const NOTES_SNIPPET =
  "Let's look at another worked example. The tens digit 4 does not change. We add the ones: 5 + 3 = 8.";

const workedSteps = [
  { id: 'align', text: 'Line up 23 and 4. Ones under ones.', reveal: 'addends' },
  { id: 'ones', text: '3 + 4 = 7. Write 7 in the ones.', reveal: 'ones' },
  { id: 'carry', text: 'Nothing to carry.', reveal: 'carry' },
  { id: 'sum', text: 'The total is 27.', reveal: 'sum' }
];

const additionChoices = [
  {
    lessonId: 'eb2371b7-78e7-47fd-a912-799c0df4d34b',
    title: 'Adding a 2-Digit Number and a 1-Digit Number',
    subjectName: 'Mathematics',
    strandName: 'Numbers',
    subStrandName: 'Addition',
    isUnlocked: true,
    isCompleted: false,
    progress: 20
  },
  {
    lessonId: 'e77e2251-5f2d-4c18-b3ae-f5696246386f',
    title: 'Writing Addition Sentences with + and =',
    subjectName: 'Mathematics',
    strandName: 'Numbers',
    subStrandName: 'Addition',
    isUnlocked: true,
    isCompleted: false,
    progress: 0
  },
  {
    lessonId: '7509a440-fb35-42ca-926f-058d304579a3',
    title: 'Practice: Addition - Part 3',
    subjectName: 'Mathematics',
    strandName: 'Numbers',
    subStrandName: 'Addition',
    isUnlocked: true,
    isCompleted: false,
    progress: 0
  },
  {
    lessonId: 'b0c55697-cb5b-4a24-aa1e-3c1e125adc49',
    title: 'Adding 2 single-digit numbers up to 10',
    subjectName: 'Mathematics',
    strandName: 'Numbers',
    subStrandName: 'Addition',
    isUnlocked: true,
    isCompleted: false,
    progress: 0
  }
];

const json = (body) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body)
});

const handleApi = (url, mode) => {
  const u = new URL(url);
  const p = u.pathname.replace(/\/$/, '');

  if (p.endsWith('/learner/profile')) {
    return json({ preferredModality: 'mixed', modalityPromptSeen: true });
  }
  if (p.endsWith('/learner/skill-mastery')) return json([]);
  if (p.endsWith('/learner/lesson-choices')) {
    return json({ grade: '1', choices: additionChoices });
  }
  if (p.endsWith('/learner/next-task')) {
    if (mode.scene === 'hero-loading') return null;
    return json({
      navigationMode: 'quest',
      grade: '1',
      complexityBand: 'very_young',
      catalog: {
        subjectCount: 1,
        subjectNames: ['Mathematics'],
        crossSubjectAvailable: false,
        limitation: null
      },
      task: {
        lessonId: additionChoices[0].lessonId,
        title: additionChoices[0].title,
        progress: 20,
        reason: 'continue',
        subjectId: 'sub-1',
        subjectName: 'Mathematics',
        strandId: 'strand-1',
        strandName: 'Numbers',
        subStrandId: 'ss-1',
        subStrandName: 'Addition',
        unitId: 'ss-1'
      }
    });
  }
  if (p.includes('/scaffold')) return json({ needsScaffold: false });
  if (p.includes('/similar')) return json([]);
  if (p.includes('/next') && !p.includes('adaptive-next')) return json([]);

  if (p.includes('/adaptive-start')) {
    if (mode.scene === 'autoplay') {
      return json({
        mode: 'adaptive',
        session: { lessonId: mode.lessonId },
        question: {
          id: 'q-worked',
          question: 'Add.',
          options: [],
          interactionType: 'numeric_entry',
          layout: 'vertical',
          modality: 'text_steps',
          addends: { a: 23, b: 4 },
          operation: 'add',
          scaffoldCarry: true,
          workedSteps
        },
        meta: { phase: 'main', progressLabel: 'Question 1 of 10', progressPct: 0, done: false }
      });
    }
    return json({
      mode: 'adaptive',
      session: { lessonId: mode.lessonId },
      question: {
        id: 'q-live',
        question: 'What is 2 + 2?',
        options: ['4', '3', '5', '6'],
        interactionType: 'multiple_choice'
      },
      meta: { phase: 'main', progressLabel: 'Question 1 of 10', progressPct: 0, done: false }
    });
  }

  if (p.includes('/learner/lesson/')) {
    return json({
      id: mode.lessonId,
      title: 'Adding',
      description: NOTES_SNIPPET,
      strandId: 'strand-1',
      subStrandId: 'ss-1',
      subjectId: 'sub-1',
      grade: mode.grade || '1',
      contentType: 'reading',
      difficulty: 'beginner',
      tags: ['addition'],
      duration: 10,
      content: `## Mini Notes\n${NOTES_SNIPPET}\n\n## Worked Example\nWe add the ones.`,
      contentBlocks: [
        { type: 'text', text: NOTES_SNIPPET }
      ],
      quiz: {
        title: 'Practice',
        passingScore: 60,
        questionCount: 4,
        questions: [{ id: 'q1', question: 'What is 2 + 2?', options: ['4', '3', '5', '6'] }]
      },
      isCompleted: false,
      progress: 0
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

const boot = async (page, mode) => {
  await page.route(`${API}/**`, async (route) => {
    if (mode.scene === 'hero-loading' && route.request().url().includes('/next-task')) {
      return;
    }
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
};

const browser = await chromium.launch({ headless: true });

try {
  // Task 1: Grade 1 opens on the question — teaching notes are not rendered
  {
    const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
    await boot(page, { scene: 'notes', grade: '1', lessonId: 'lesson-g1-notes' });
    await page.goto(`${BASE}/learner/lessons/lesson-g1-notes`, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await page.getByText('What is 2 + 2?').waitFor({ timeout: 15000 });
    const notesCount = await page.getByText(NOTES_SNIPPET).count();
    const miniNotes = await page.getByText(/Mini Notes/i).count();
    const placeholder = await page.getByText('Interactive Content').count();
    console.log('G1 notes snippet count:', notesCount, 'Mini Notes:', miniNotes, 'placeholder:', placeholder);
    if (notesCount !== 0) throw new Error('Grade 1 still renders teaching notes');
    if (miniNotes !== 0) throw new Error('Grade 1 still renders Mini Notes');
    if (placeholder !== 0) throw new Error('Grade 1 still renders Interactive Content placeholder');
    await shot(page, 'g1-opens-on-question-no-notes.png');
    await page.close();
  }

  // Task 2: worked-example autoplay — four frames, no click
  {
    const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
    await boot(page, { scene: 'autoplay', grade: '1', lessonId: 'lesson-g1-autoplay' });
    await page.goto(`${BASE}/learner/lessons/lesson-g1-autoplay`, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    const step = page.getByTestId('worked-example-step');
    await step.waitFor({ timeout: 15000 });
    await page.locator('[data-worked-example]').scrollIntoViewIfNeeded();

    const nextCount = await page.getByRole('button', { name: /Next step/i }).count();
    if (nextCount !== 0) throw new Error('Worked example still has a Next step control');

    for (let i = 0; i < 4; i++) {
      await page.locator(`[data-worked-step="${i}"]`).waitFor({ timeout: 5000 });
      const text = (await step.textContent()) || '';
      console.log(`autoplay frame ${i + 1}:`, text.trim());
      await shot(page, `g1-worked-example-autoplay-step-${i + 1}.png`);
      if (i < 3) {
        await page.locator(`[data-worked-step="${i + 1}"]`).waitFor({ timeout: 4000 });
      }
    }

    await page.getByRole('button', { name: 'Watch again' }).waitFor({ timeout: 3000 });
    const stepAttr = await step.getAttribute('data-worked-step');
    if (stepAttr !== '3') throw new Error(`Expected last step 3, got ${stepAttr}`);
    await shot(page, 'g1-worked-example-watch-again.png');
    await page.close();
  }

  // Task 3: dashboard titles are distinct
  {
    const page = await browser.newPage({ viewport: { width: 900, height: 1400 } });
    await boot(page, { scene: 'dashboard', grade: '1', lessonId: 'dash' });
    await page.goto(`${BASE}/learner`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByText('Practice: Addition - Part 3').waitFor({ timeout: 15000 });
    const twoDigit = await page.getByText('Adding a 2-Digit Number and a 1-Digit Number').count();
    const part3 = await page.getByText('Practice: Addition - Part 3').count();
    const singles = await page.getByText('Adding 2 single-digit numbers up to 10').count();
    const sentences = await page.getByText('Writing Addition Sentences with + and =').count();
    console.log('dashboard title counts', { twoDigit, part3, singles, sentences });
    if (twoDigit < 1 || part3 < 1 || singles < 1 || sentences < 1) {
      throw new Error('Dashboard is missing one of the retitled lessons');
    }
    await shot(page, 'g1-dashboard-distinct-titles.png');
    await page.close();
  }

  // Task 4: hero is a coloured card with a large character, not a tiny icon in a white box
  {
    const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
    await boot(page, { scene: 'hero-loading', grade: '1', lessonId: 'dash' });
    await page.goto(`${BASE}/learner`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByText('Loading…').waitFor({ timeout: 10000 });
    await shot(page, 'g1-dashboard-hero-loading.png');
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
    await boot(page, { scene: 'dashboard', grade: '1', lessonId: 'dash' });
    await page.goto(`${BASE}/learner`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByRole('link', { name: 'Keep going', exact: true }).waitFor({ timeout: 15000 });
    await shot(page, 'g1-dashboard-hero-loaded.png');
    await page.close();
  }

  console.log('g1-notes-autoplay-titles screenshots: OK');
} finally {
  await browser.close();
}
