/**
 * After-fix screenshots for Alphonce Thuku. Does not overwrite audit before-shots.
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../docs/measurements');
const BASE = process.env.FRONTEND_URL || 'http://localhost:5173';
const LEARNER_ID = 'd0b9f845-55b3-4f4f-95d4-ed039e0a2acd';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('#email', 'admin@eduvibe.com');
  await page.fill('#password', 'password');
  await Promise.all([
    page.waitForURL(/\/admin/, { timeout: 30000 }),
    page.click('button[type="submit"]')
  ]);

  const reportResponse = page.waitForResponse(
    (res) =>
      res.url().includes('/admin/reports/learners') &&
      res.request().method() === 'POST' &&
      res.status() === 200,
    { timeout: 45000 }
  );

  await page.goto(`${BASE}/admin/reports?learnerId=${LEARNER_ID}`, {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  const res = await reportResponse;
  fs.writeFileSync(
    path.join(outDir, 'admin-learner-report-alphonce-after.json'),
    JSON.stringify(await res.json(), null, 2)
  );

  await page.locator('.learner-report-card').waitFor({ timeout: 20000 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(outDir, 'admin-learner-report-alphonce-after-full.png'),
    fullPage: true
  });
  await page.locator('.learner-report-card').first().screenshot({
    path: path.join(outDir, 'admin-learner-report-alphonce-after-card.png')
  });
  console.log('wrote after shots');
} finally {
  await browser.close();
}
