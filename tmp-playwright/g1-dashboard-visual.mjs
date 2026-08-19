/**
 * Full-page, phone-width evidence for the dashboard visual pass.
 * No cropped zooms — 390px wide, full scroll of the real page.
 *
 *   FRONTEND_URL=http://localhost:5173 node g1-dashboard-visual.mjs
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
const dump = JSON.parse(fs.readFileSync(path.join(outDir, 'g1-path-empty-learner.json'), 'utf8'));

const user = {
  id: 'shot-learner',
  name: 'Amina',
  email: 'amina@example.com',
  role: 'learner',
  grade: '1'
};

const L1 = 'eb2371b7-78e7-47fd-a912-799c0df4d34b';
const L2 = 'e77e2251-5f2d-4c18-b3ae-f5696246386f';
const L3 = '7509a440-fb35-42ca-926f-058d304579a3';
const L4 = 'b0c55697-cb5b-4a24-aa1e-3c1e125adc49';
const ADDITION_UNIT = '45091d21-4a36-4426-8c43-df6be71d93e0';

const json = (body) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body)
});

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
  const concept = findUnit(subject, 'Number Concept');
  if (concept) {
    concept.isFullyCompleted = true;
    concept.lessons = [
      {
        lessonId: 'concept-done-1',
        title: 'Counting to 10',
        lessonOrder: 1,
        isUnlocked: true,
        isDone: true,
        isCurrent: false,
        progress: 100
      },
      {
        lessonId: 'concept-done-2',
        title: 'More or less',
        lessonOrder: 2,
        isUnlocked: true,
        isDone: true,
        isCurrent: false,
        progress: 100
      }
    ];
  }
  const addition = findUnit(subject, 'Addition');
  addition.lessons = addition.lessons.map((lesson, i) => ({
    ...lesson,
    lessonId: [L1, L2, L3, L4][i],
    isDone: i === 0,
    isUnlocked: i <= 1,
    isCurrent: i === 1,
    progress: i === 0 ? 67 : 0
  }));
  const subtraction = findUnit(subject, 'Subtraction');
  if (subtraction) subtraction.isUnlocked = false;
  return { grade: '1', currentLessonId: L2, subjects: [subject] };
};

const doneHeroPath = () => {
  const payload = mixedPath();
  payload.currentLessonId = null;
  for (const unit of payload.subjects[0].strands[0].units) {
    unit.lessons = (unit.lessons || []).map((lesson) => ({
      ...lesson,
      isDone: true,
      isUnlocked: true,
      isCurrent: false,
      progress: 100
    }));
  }
  return payload;
};

const handleApi = (url, pathPayload, { task } = { task: true }) => {
  const p = new URL(url).pathname.replace(/\/$/, '');
  if (p.endsWith('/learner/profile')) return json({ preferredModality: 'mixed', modalityPromptSeen: true });
  if (p.endsWith('/learner/skill-mastery')) return json([]);
  if (p.endsWith('/learner/path')) return json(pathPayload);
  if (p.endsWith('/learner/next-task')) {
    const current = task
      ? pathPayload.subjects[0].strands[0].units.flatMap((u) => u.lessons).find((l) => l.isCurrent)
      : null;
    return json({
      navigationMode: 'quest',
      grade: '1',
      complexityBand: 'very_young',
      catalog: { subjectCount: 1, subjectNames: ['Mathematics'], crossSubjectAvailable: false, limitation: null },
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

const pngSize = (file) => {
  const buf = fs.readFileSync(file);
  return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
};

const shot = async (page, name) => {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
  console.log('Wrote', file, pngSize(file));
};

const login = async (page, fromStop = L1) => {
  await page.addInitScript(
    ({ user: u, fromStop: stop }) => {
      sessionStorage.setItem('token', 'shot-token');
      sessionStorage.setItem('user', JSON.stringify(u));
      sessionStorage.setItem('userId', u.id);
      sessionStorage.setItem('ev-path-seen-unlocked', JSON.stringify([stop]));
      sessionStorage.setItem('ev-path-vehicle-stop', `lesson:${stop}`);
      localStorage.setItem('ev-unit-celebrated-d4da54ca-7e04-4f5a-8179-4610a0fa360b', '1');
    },
    { user, fromStop }
  );
};

const browser = await chromium.launch({ headless: true });

try {
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const payload = mixedPath();
    await page.route(`${API}/**`, (route) => route.fulfill(handleApi(route.request().url(), payload)));
    await login(page);
    await page.goto(`${BASE}/learner`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.locator('[data-welcome-header]').waitFor({ timeout: 15000 });
    await page.locator('[data-path-vehicle]').waitFor({ state: 'attached', timeout: 15000 });
    await page.waitForTimeout(900);

    const matatu = await page.locator('[data-path-vehicle]').boundingBox();
    const obstacle = await page.locator('[data-path-obstacle] svg').first().boundingBox();
    console.log('sizes', { matatu, obstacle });
    if (!matatu || matatu.width < 140) throw new Error(`Matatu too small: ${JSON.stringify(matatu)}`);
    if (!obstacle || obstacle.height < 140) throw new Error(`Obstacle too small: ${JSON.stringify(obstacle)}`);

    await shot(page, 'g1-dashboard-visual-full.png');
    const scrollH = await page.evaluate(() => document.documentElement.scrollHeight);
    const viewH = 844;
    const step = 620;
    let slice = 0;
    for (let y = 0; y < scrollH; y += step) {
      slice += 1;
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(150);
      const file = path.join(outDir, `g1-dashboard-visual-scroll-${slice}.png`);
      await page.screenshot({ path: file, fullPage: false, animations: 'disabled' });
      console.log('Wrote', file, `y=${y}/${scrollH}`);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(outDir, 'g1-dashboard-visual-top.png'), fullPage: false });
    await page.evaluate(() => window.scrollTo(0, 620));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, 'g1-dashboard-visual-mid.png'), fullPage: false });
    await page.locator('[data-path-obstacle]').last().scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, 'g1-dashboard-visual-path-end.png'), fullPage: false });
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const payload = doneHeroPath();
    await page.route(`${API}/**`, (route) => route.fulfill(handleApi(route.request().url(), payload, { task: false })));
    await login(page, L4);
    await page.goto(`${BASE}/learner`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.locator('[data-welcome-header]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(600);
    await shot(page, 'g1-dashboard-visual-all-done.png');
    await page.close();
  }

  console.log('g1-dashboard-visual: OK');
} finally {
  await browser.close();
}
