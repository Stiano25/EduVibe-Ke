/**
 * Screenshot LessonReviewModal for the Claude G3 Science lesson.
 * Navigates: Grade 3 → Science → Plants → Plant parts → Review.
 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const require = createRequire('E:/EduVibe Ke/tmp-playwright/package.json');
const { chromium } = require('playwright');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, '../../docs');
fs.mkdirSync(docsDir, { recursive: true });

const BASE = process.env.FRONTEND_URL || 'http://localhost:5173';
const LESSON_TITLE = process.env.LESSON_TITLE || 'Parts of a Plant and Their Jobs';
const OUT = path.join(docsDir, 'first-claude-generation-g3-science-review.png');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('#email, input[type="email"]', 'admin@eduvibe.com');
  await page.fill('#password, input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 30000 });

  await page.goto(`${BASE}/admin/lessons`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);

  // 1. Grade
  await page.locator('select').first().selectOption('3');
  await page.waitForTimeout(800);

  // 2. Subject — click Science card/button
  const science = page.getByText('Science', { exact: true }).first();
  await science.click();
  await page.waitForTimeout(1200);

  // 3. Strand — Plants
  const plants = page.getByText('Plants', { exact: true }).first();
  await plants.click();
  await page.waitForTimeout(1200);

  // 4. Sub-strand — Plant parts
  const plantParts = page.getByText('Plant parts', { exact: true }).first();
  await plantParts.click();
  await page.waitForTimeout(2000);

  // Prefer Review on our lesson row
  const titled = page.locator('tr, div, li, article').filter({ hasText: LESSON_TITLE }).first();
  if (await titled.count()) {
    const btn = titled.getByRole('button', { name: /Review/i });
    if (await btn.count()) await btn.click();
    else await page.getByRole('button', { name: /Review/i }).first().click();
  } else {
    await page.getByRole('button', { name: /Review/i }).first().click();
  }

  await page.waitForTimeout(1200);
  const quizTab = page.getByRole('button', { name: /Quiz/i }).first();
  if (await quizTab.count()) await quizTab.click();
  await page.waitForTimeout(800);

  await page.screenshot({ path: OUT, fullPage: true });
  console.log('Wrote', OUT);
} catch (err) {
  const errShot = path.join(docsDir, 'first-claude-generation-g3-science-review-error.png');
  await page.screenshot({ path: errShot, fullPage: true }).catch(() => {});
  console.error('Screenshot failed:', err?.message || err);
  console.log('Wrote', errShot);
  process.exitCode = 1;
} finally {
  await browser.close();
}
