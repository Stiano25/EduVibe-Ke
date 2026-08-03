/**
 * Login as admin, drill Grade→Subject→Strand→Sub-strand, open Review modal.
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../tmp-ui-review');
fs.mkdirSync(outDir, { recursive: true });

const BASE = process.env.FRONTEND_URL || 'http://localhost:5173';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

const shot = async (name) => {
  const p = path.join(outDir, name);
  await page.screenshot({ path: p, fullPage: true });
  console.log('Wrote', p);
  return p;
};

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('#email', 'admin@eduvibe.com');
  await page.fill('#password', 'password');
  await Promise.all([
    page.waitForURL(/\/admin/, { timeout: 30000 }),
    page.click('button[type="submit"]')
  ]);

  await page.goto(`${BASE}/admin/lessons`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1000);

  await page.locator('select').first().selectOption('4');
  await page.waitForTimeout(1000);

  await page.getByRole('button', { name: /^Mathematics$/i }).click();
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: /Numbers/i }).filter({ hasText: 'Whole numbers' }).or(
    page.getByRole('button', { name: /^Numbers$/i })
  ).first().click();
  await page.waitForTimeout(1500);

  // Click the Place value sub-strand card (heading text)
  await page.locator('button').filter({ hasText: 'Place value' }).filter({ hasText: 'Learning Outcomes' }).click();
  await page.waitForTimeout(500);

  // Path should include Place value
  await page.getByText(/Path:/).waitFor({ timeout: 5000 });
  await page.getByText('Place value', { exact: true }).first().waitFor({ timeout: 5000 });

  // Wait for lessons section
  await page.getByText(/Lessons for Place value/i).waitFor({ timeout: 20000 });
  await page.waitForTimeout(2000);
  await shot('01-lessons-list.png');

  const review = page.getByRole('button', { name: 'Review' }).first();
  await review.waitFor({ state: 'visible', timeout: 20000 });
  await review.scrollIntoViewIfNeeded();
  await review.click();
  await page.waitForTimeout(1500);

  // Modal open — click Quiz tab if present
  const quizTab = page.getByRole('button', { name: /^Quiz$/i }).first();
  if (await quizTab.isVisible().catch(() => false)) {
    await quizTab.click();
    await page.waitForTimeout(600);
  }
  await shot('02-review-quiz-bank.png');

  const qaPill = page.locator('button[title*="QA"]').first();
  if (await qaPill.count()) {
    await qaPill.click();
    await page.waitForTimeout(600);
    await shot('03-qa-flagged-question.png');
  }

  const bodyText = await page.locator('body').innerText();
  const snippets = bodyText
    .split('\n')
    .map((s) => s.trim())
    .filter((s) =>
      /flagged|coverage|remapped|QA|outcomes covered|Question bank|Near duplicate|short —|Place Value|difficulty|easy|intermediate|advanced|QA flagged/i.test(
        s
      )
    )
    .slice(0, 60);
  console.log('UI_SNIPPETS_START');
  console.log(JSON.stringify(snippets, null, 2));
  console.log('UI_SNIPPETS_END');
} catch (err) {
  await shot('lesson-review-error.png');
  console.error('UI review failed:', err?.message || err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
