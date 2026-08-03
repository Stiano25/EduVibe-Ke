/**
 * Login as admin, open Lesson Review modal, screenshot quiz tab.
 * Run: npx --yes playwright@1.49.0 install chromium && node scripts/ui-review-screenshot.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../../tmp-ui-review');
fs.mkdirSync(outDir, { recursive: true });

const BASE = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const LESSON_TITLE = 'Place Value and Comparing Numbers';

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

  // Find the generated lesson row and click Review
  const reviewBtn = page.getByRole('button', { name: 'Review' }).first();
  // Prefer the row containing our title if visible
  const titled = page.locator('tr, div').filter({ hasText: LESSON_TITLE }).first();
  if (await titled.count()) {
    const btn = titled.getByRole('button', { name: 'Review' });
    if (await btn.count()) await btn.click();
    else await reviewBtn.click();
  } else {
    await reviewBtn.click();
  }

  await page.waitForTimeout(1000);
  // Ensure Quiz tab
  const quizTab = page.getByRole('button', { name: /Quiz/i }).first();
  if (await quizTab.count()) await quizTab.click();
  await page.waitForTimeout(800);

  const modalShot = path.join(outDir, 'lesson-review-quiz.png');
  await page.screenshot({ path: modalShot, fullPage: true });
  console.log('Wrote', modalShot);

  // Extract visible review chrome text for the report
  const bodyText = await page.locator('body').innerText();
  const snippets = bodyText
    .split('\n')
    .map((s) => s.trim())
    .filter((s) =>
      /flagged|coverage|remapped|QA|outcomes covered|Question bank|Near duplicate|difficulty|easy|intermediate|advanced/i.test(
        s
      )
    )
    .slice(0, 40);
  console.log('UI_SNIPPETS_START');
  console.log(JSON.stringify(snippets, null, 2));
  console.log('UI_SNIPPETS_END');

  // Click through to a QA-flagged question if index pills show rose styling / title
  const flaggedPill = page.locator('button[title*="QA"]').first();
  if (await flaggedPill.count()) {
    await flaggedPill.click();
    await page.waitForTimeout(500);
    const flaggedShot = path.join(outDir, 'lesson-review-qa-flagged.png');
    await page.screenshot({ path: flaggedShot, fullPage: true });
    console.log('Wrote', flaggedShot);
  } else {
    // Try filter
    const qaSelect = page.locator('select').filter({ hasText: 'QA' });
    if (await qaSelect.count()) {
      await qaSelect.selectOption({ label: 'QA flagged only' });
      await page.waitForTimeout(500);
      const filteredShot = path.join(outDir, 'lesson-review-qa-filter.png');
      await page.screenshot({ path: filteredShot, fullPage: true });
      console.log('Wrote', filteredShot);
    }
  }
} catch (err) {
  const errShot = path.join(outDir, 'lesson-review-error.png');
  await page.screenshot({ path: errShot, fullPage: true }).catch(() => {});
  console.error('UI review failed:', err?.message || err);
  console.log('Wrote', errShot);
  process.exitCode = 1;
} finally {
  await browser.close();
}
