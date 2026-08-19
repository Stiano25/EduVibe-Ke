/**
 * Real Path verification: winding road, unit-card states, matatu travel frames,
 * and a checkpoint obstacle meter that shrinks on a correct answer only.
 *
 * Usage:
 *   FRONTEND_URL=http://localhost:5173 node g1-path-road.mjs
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
  const concept = findUnit(subject, 'Number Concept');
  if (concept) concept.isFullyCompleted = true;
  const addition = findUnit(subject, 'Addition');
  addition.lessons[0] = {
    ...addition.lessons[0],
    lessonId: L1,
    isDone: true,
    isUnlocked: true,
    isCurrent: false,
    progress: 67
  };
  addition.lessons[1] = {
    ...addition.lessons[1],
    lessonId: L2,
    isDone: false,
    isUnlocked: true,
    isCurrent: true,
    progress: 0
  };
  addition.lessons[2] = {
    ...addition.lessons[2],
    lessonId: L3,
    isDone: false,
    isUnlocked: false,
    isCurrent: false,
    progress: 0
  };
  addition.lessons[3] = {
    ...addition.lessons[3],
    lessonId: L4,
    isDone: false,
    isUnlocked: false,
    isCurrent: false,
    progress: 0
  };
  const subtraction = findUnit(subject, 'Subtraction');
  if (subtraction) subtraction.isUnlocked = false;
  return { grade: '1', currentLessonId: L2, subjects: [subject] };
};

const checkpointPath = () => {
  const subject = numbersSubject();
  const addition = findUnit(subject, 'Addition');
  addition.lessons = addition.lessons.map((lesson, i) => ({
    ...lesson,
    lessonId: [L1, L2, L3, L4][i],
    isDone: i < 3,
    isUnlocked: true,
    isCurrent: i === 3,
    progress: i < 3 ? 80 : 0
  }));
  return { grade: '1', currentLessonId: L4, subjects: [subject] };
};

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

const handlePathApi = (url, pathPayload) => {
  const u = new URL(url);
  const p = u.pathname.replace(/\/$/, '');
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
  if (p.includes('/adaptive-start')) {
    return json({
      mode: 'adaptive',
      session: { lessonId: L4, mainScoreCorrect: 0, mainTarget: 10 },
      question: liveQuestion('q-live'),
      meta: {
        phase: 'main',
        progressLabel: 'Question 1 of 10',
        progressPct: 0,
        done: false,
        mainTarget: 10,
        mainAnswered: 0
      }
    });
  }
  if (p.includes('/learner/lesson/')) {
    return json({
      id: L4,
      title: 'Adding 2 single-digit numbers up to 10',
      description: '',
      strandId: pathPayload.subjects[0].strands[0].strandId,
      subStrandId: '6566c510-80af-4ff9-a159-cd23a6ca70dc',
      subjectId: pathPayload.subjects[0].subjectId,
      grade: '1',
      contentType: 'reading',
      difficulty: 'beginner',
      tags: [],
      duration: 10,
      quiz: { title: 'Practice', passingScore: 60, questionCount: 10, questions: [liveQuestion()] }
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

const bootPath = async (page) => {
  const pathPayload = mixedPath();
  await page.route(`${API}/**`, async (route) => {
    await route.fulfill(handlePathApi(route.request().url(), pathPayload));
  });
  await page.addInitScript(
    ({ user: u, fromStop, celebrated }) => {
      sessionStorage.setItem('token', 'shot-token');
      sessionStorage.setItem('user', JSON.stringify(u));
      sessionStorage.setItem('userId', u.id);
      sessionStorage.setItem('ev-path-seen-unlocked', JSON.stringify([fromStop]));
      sessionStorage.setItem('ev-path-vehicle-stop', `lesson:${fromStop}`);
      for (const key of celebrated) {
        localStorage.setItem(`ev-unit-celebrated-${key}`, '1');
      }
    },
    {
      user,
      fromStop: L1,
      celebrated: ['d4da54ca-7e04-4f5a-8179-4610a0fa360b', 'sub:342a17b4-84cb-4ce7-8faf-6895e42779b9']
    }
  );
};

const vehiclePoint = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-path-vehicle]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  });

const browser = await chromium.launch({ headless: true });

try {
  {
    const page = await browser.newPage({ viewport: { width: 430, height: 1600 } });
    page.on('pageerror', (err) => console.log('pageerror', err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('console', msg.text());
    });
    await bootPath(page);
    await page.goto(`${BASE}/learner`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-path-vehicle]').waitFor({ state: 'attached', timeout: 15000 });
    await page.waitForTimeout(80);
    const start = await vehiclePoint(page);
    const debug = await page.evaluate(() => {
      const path = document.querySelector('[data-path-line]');
      const v = document.querySelector('[data-path-vehicle]');
      return {
        pathLen: path && 'getTotalLength' in path ? path.getTotalLength() : null,
        vehicleState: v?.getAttribute('data-vehicle-state'),
        transform: v ? getComputedStyle(v).transform : null,
        travel: document.querySelector('[data-path-road]')?.getAttribute('data-travel'),
        origin: document.querySelector('[data-path-road]')?.getAttribute('data-origin-stop')
      };
    });
    console.log('path debug', debug);
    await shot(page, 'g1-path-road-nodes.png');
    await page.waitForTimeout(400);
    const mid = await vehiclePoint(page);
    await shot(page, 'g1-path-vehicle-mid.png');
    await page.waitForTimeout(900);
    const end = await vehiclePoint(page);
    await shot(page, 'g1-path-vehicle-end.png');
    console.log('vehicle frames', { start, mid, end });
    if (!start || !end) throw new Error('Matatu was not on the path');
    const travel = Math.hypot(end.x - start.x, end.y - start.y);
    const midTravel = Math.hypot(mid.x - start.x, mid.y - start.y);
    const [fromP, toP] = (debug.travel || '0-0').split('-').map(Number);
    if (travel < 8 && midTravel < 8 && !(Math.abs(fromP - toP) > 0.01 && debug.vehicleState === 'moving')) {
      throw new Error(`Matatu did not travel along the road: ${JSON.stringify({ start, mid, end, debug })}`);
    }

    const doneNodes = await page.locator('[data-node-state="done"]').count();
    const currentNodes = await page.locator('[data-node-state="current"], [data-node-state="just-unlocked"]').count();
    const lockedNodes = await page.locator('[data-node-state="locked"]').count();
    const unitStates = await page.locator('[data-unit-state]').evaluateAll((els) =>
      els.map((el) => ({
        name: el.querySelector('.truncate, span.block.truncate')?.textContent || el.textContent.trim(),
        state: el.getAttribute('data-unit-state')
      }))
    );
    console.log('node states', { doneNodes, currentNodes, lockedNodes, unitStates });
    if (doneNodes < 1) throw new Error('Expected a done lesson node');
    if (currentNodes < 1) throw new Error('Expected a current lesson node');
    if (lockedNodes < 1) throw new Error('Expected a locked lesson node');
    const states = new Set(unitStates.map((row) => row.state));
    if (!states.has('done') || !states.has('current') || !states.has('locked')) {
      throw new Error(`Unit cards missing locked/current/done: ${JSON.stringify(unitStates)}`);
    }

    const obstacle = page.locator('[data-path-obstacle]').first();
    await obstacle.waitFor({ timeout: 5000 });
    await obstacle.scrollIntoViewIfNeeded();
    await shot(page, 'g1-path-obstacle.png');
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
    const pathPayload = checkpointPath();
    let answers = 0;
    await page.route(`${API}/**`, async (route) => {
      const u = new URL(route.request().url());
      const p = u.pathname.replace(/\/$/, '');
      if (p.includes('/adaptive-next')) {
        answers += 1;
        const correct = answers >= 2;
        await route.fulfill(
          json({
            session: { lessonId: L4, mainScoreCorrect: correct ? 1 : 0, mainTarget: 10 },
            question: liveQuestion('q-next'),
            lastAnswer: {
              correct,
              correctAnswerIndex: 0,
              explanation: 'Because 2 and 2 make 4.'
            },
            meta: {
              phase: 'main',
              progressLabel: 'Question 2 of 10',
              progressPct: 10,
              done: false,
              mainTarget: 10,
              mainAnswered: answers
            }
          })
        );
        return;
      }
      await route.fulfill(handlePathApi(route.request().url(), pathPayload));
    });
    await page.addInitScript(
      ({ user: u }) => {
        sessionStorage.setItem('token', 'shot-token');
        sessionStorage.setItem('user', JSON.stringify(u));
        sessionStorage.setItem('userId', u.id);
      },
      { user }
    );
    await page.goto(`${BASE}/learner/lessons/${L4}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.locator('[data-checkpoint-hud]').waitFor({ timeout: 15000 });
    const remainingBefore = await page.locator('[data-obstacle-remaining]').first().getAttribute('data-obstacle-remaining');
    await shot(page, 'g1-checkpoint-meter-full.png');
    await page.getByRole('button', { name: /B\.\s*3/ }).click();
    await page.waitForTimeout(900);
    const remainingAfterWrong = await page.locator('[data-obstacle-remaining]').first().getAttribute('data-obstacle-remaining');
    await shot(page, 'g1-checkpoint-meter-after-wrong.png');
    await page.getByRole('button', { name: /A\.\s*4/ }).click();
    await page.waitForTimeout(900);
    const remainingAfterCorrect = await page.locator('[data-obstacle-remaining]').first().getAttribute('data-obstacle-remaining');
    await shot(page, 'g1-checkpoint-meter-after-correct.png');
    console.log('meter', { remainingBefore, remainingAfterWrong, remainingAfterCorrect, answers });
    if (remainingAfterWrong !== remainingBefore) {
      throw new Error('Wrong answer changed the obstacle meter — that is a penalty');
    }
    if (!(Number(remainingAfterCorrect) < Number(remainingBefore))) {
      throw new Error('Correct answer did not shrink the obstacle meter');
    }
    await page.close();
  }

  console.log('g1-path-road: OK');
} finally {
  await browser.close();
}
