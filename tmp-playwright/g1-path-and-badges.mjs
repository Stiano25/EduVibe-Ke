/**
 * Path UI + unit-complete celebration screenshots.
 * Path payload is the live Grade 1 Mathematics dump from Task 1, with node
 * states set to show done / current / locked on the real lesson ids.
 *
 * Usage:
 *   FRONTEND_URL=http://localhost:5174 node g1-path-and-badges.mjs
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

const dump = JSON.parse(
  fs.readFileSync(path.join(outDir, 'g1-path-empty-learner.json'), 'utf8')
);

const user = {
  id: 'shot-learner',
  name: 'Amina',
  email: 'amina@example.com',
  role: 'learner',
  grade: '1'
};

const ADDITION_UNIT = '45091d21-4a36-4426-8c43-df6be71d93e0';
const L1 = 'eb2371b7-78e7-47fd-a912-799c0df4d34b';
const L2 = 'e77e2251-5f2d-4c18-b3ae-f5696246386f';
const L3 = '7509a440-fb35-42ca-926f-058d304579a3';
const L4 = 'b0c55697-cb5b-4a24-aa1e-3c1e125adc49';

const numbersSubject = () => {
  const subject = structuredClone(dump.full.subjects[0]);
  subject.strands = subject.strands.filter((s) => s.strandName === 'Numbers');
  return subject;
};

const findUnit = (subject, name) => {
  for (const strand of subject.strands) {
    const unit = strand.units.find((u) => u.unitName === name);
    if (unit) return unit;
  }
  return null;
};

const mixedPath = () => {
  const subject = numbersSubject();
  const addition = findUnit(subject, 'Addition');
  addition.lessons[0] = { ...addition.lessons[0], isDone: true, isUnlocked: true, isCurrent: false, progress: 67 };
  addition.lessons[1] = { ...addition.lessons[1], isDone: false, isUnlocked: true, isCurrent: true, progress: 0 };
  addition.lessons[2] = { ...addition.lessons[2], isDone: false, isUnlocked: false, isCurrent: false, progress: 0 };
  addition.lessons[3] = { ...addition.lessons[3], isDone: false, isUnlocked: false, isCurrent: false, progress: 0 };
  return { grade: '1', currentLessonId: L2, subjects: [subject] };
};

const completePath = () => {
  const subject = numbersSubject();
  const addition = findUnit(subject, 'Addition');
  addition.isFullyCompleted = true;
  addition.lessons = addition.lessons.map((lesson, i) => ({
    ...lesson,
    isDone: true,
    isUnlocked: true,
    isCurrent: false,
    progress: 100
  }));
  const subtraction = findUnit(subject, 'Subtraction');
  if (subtraction) subtraction.isUnlocked = true;
  return { grade: '1', currentLessonId: null, subjects: [subject] };
};

const json = (body) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body)
});

const handleApi = (url, mode) => {
  const u = new URL(url);
  const p = u.pathname.replace(/\/$/, '');
  const pathPayload = mode.scene === 'celebrate' ? completePath() : mixedPath();

  if (p.endsWith('/learner/profile')) {
    return json({ preferredModality: 'mixed', modalityPromptSeen: true });
  }
  if (p.endsWith('/learner/skill-mastery')) return json([]);
  if (p.endsWith('/learner/path')) return json(pathPayload);
  if (p.endsWith('/learner/lesson-choices')) {
    return json({
      grade: '1',
      choices: pathPayload.subjects[0].strands[0].units
        .flatMap((unit) => unit.lessons)
        .map((lesson) => ({
          lessonId: lesson.lessonId,
          title: lesson.title,
          subjectName: 'Mathematics',
          strandName: 'Numbers',
          subStrandName: 'Addition',
          isUnlocked: lesson.isUnlocked,
          isCompleted: lesson.isDone,
          progress: lesson.progress,
          unitId: ADDITION_UNIT
        }))
    });
  }
  if (p.endsWith('/learner/next-task')) {
    const current = pathPayload.currentLessonId
      ? pathPayload.subjects[0].strands[0].units
          .flatMap((unit) => unit.lessons)
          .find((lesson) => lesson.lessonId === pathPayload.currentLessonId)
      : null;
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
      task: current
        ? {
            lessonId: current.lessonId,
            title: current.title,
            progress: current.progress,
            reason: 'continue',
            subjectId: pathPayload.subjects[0].subjectId,
            subjectName: 'Mathematics',
            strandId: pathPayload.subjects[0].strands[0].strandId,
            strandName: 'Numbers',
            subStrandId: '6566c510-80af-4ff9-a159-cd23a6ca70dc',
            subStrandName: 'Addition',
            unitId: ADDITION_UNIT
          }
        : null
    });
  }
  return json({});
};

const shot = async (page, name) => {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log('Wrote', file);
  return file;
};

const boot = async (page, mode) => {
  await page.route(`${API}/**`, async (route) => {
    await route.fulfill(handleApi(route.request().url(), mode));
  });
  await page.addInitScript(
    ({ user: u, seen, celebrated }) => {
      sessionStorage.setItem('token', 'shot-token');
      sessionStorage.setItem('user', JSON.stringify(u));
      sessionStorage.setItem('userId', u.id);
      sessionStorage.setItem('ev-path-seen-unlocked', JSON.stringify(seen));
      if (celebrated) {
        localStorage.removeItem(`ev-unit-celebrated-${celebrated}`);
      }
    },
    {
      user,
      seen: mode.scene === 'path' ? [L1] : [L1, L2, L3, L4],
      celebrated: mode.scene === 'celebrate' ? ADDITION_UNIT : null
    }
  );
};

const browser = await chromium.launch({ headless: true });

try {
  {
    const page = await browser.newPage({ viewport: { width: 430, height: 1400 } });
    await boot(page, { scene: 'path' });
    await page.goto(`${BASE}/learner`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.locator('[data-learner-path]').waitFor({ timeout: 15000 });
    await page.locator('[data-path-line]').waitFor({ timeout: 5000 });
    await page.getByText('Addition', { exact: true }).waitFor({ timeout: 5000 });
    await page.getByText('Subtraction', { exact: true }).waitFor({ timeout: 5000 });
    const done = await page.locator('[data-node-state="done"]').count();
    const current = await page.locator('[data-node-state="current"], [data-node-state="just-unlocked"]').count();
    const locked = await page.locator('[data-node-state="locked"]').count();
    console.log('node states', { done, current, locked });
    if (done < 1) throw new Error('Expected a done node');
    if (current < 1) throw new Error('Expected a current / just-unlocked node');
    if (locked < 1) throw new Error('Expected a locked node');
    await shot(page, 'g1-path-mixed-node-states.png');
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 430, height: 1100 } });
    await boot(page, { scene: 'celebrate' });
    await page.goto(`${BASE}/learner`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.locator('[data-unit-celebration]').waitFor({ timeout: 15000 });
    await page.getByText('You finished Addition!').waitFor({ timeout: 10000 });
    await page.waitForTimeout(800);
    await shot(page, 'g1-unit-complete-celebration.png');
    await page.getByRole('link', { name: 'See my badges' }).click();
    await page.locator('[data-badge-collection]').waitFor({ timeout: 10000 });
    await page.getByText('Addition', { exact: true }).waitFor({ timeout: 5000 });
    await shot(page, 'g1-personal-badge-collection.png');
    await page.close();
  }

  console.log('g1-path-and-badges screenshots: OK');
} finally {
  await browser.close();
}
