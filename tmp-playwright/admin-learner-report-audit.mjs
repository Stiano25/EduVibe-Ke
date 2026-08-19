/**
 * Live admin report screenshots for Alphonce Thuku.
 *   node admin-learner-report-audit.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../docs/measurements');
fs.mkdirSync(outDir, { recursive: true });

const BASE = process.env.FRONTEND_URL || 'http://localhost:5173';
const LEARNER_ID = 'd0b9f845-55b3-4f4f-95d4-ed039e0a2acd';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });

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

  await page.goto(`${BASE}/admin/reports`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByText('Generate strengths and weaknesses for one learner or a class').waitFor({
    timeout: 20000
  });
  await page.waitForTimeout(800);
  await shot('admin-learner-report-picker.png');

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
  const payload = await res.json();
  fs.writeFileSync(
    path.join(outDir, 'admin-learner-report-alphonce.json'),
    JSON.stringify(payload, null, 2)
  );
  console.log('Wrote report JSON', payload.reports?.[0]?.learner?.name, payload.reports?.[0]?.summary);

  await page.locator('.learner-report-card').waitFor({ timeout: 20000 });
  await page.waitForTimeout(600);
  await shot('admin-learner-report-alphonce-full.png');

  const card = page.locator('.learner-report-card').first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await card.screenshot({
    path: path.join(outDir, 'admin-learner-report-alphonce-card.png')
  });
  console.log('Wrote', path.join(outDir, 'admin-learner-report-alphonce-card.png'));

  const box = await card.boundingBox();
  if (box) {
    await page.evaluate((y) => window.scrollTo(0, y), box.y + box.height * 0.45);
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(outDir, 'admin-learner-report-alphonce-mid.png'),
      fullPage: false
    });
    console.log('Wrote', path.join(outDir, 'admin-learner-report-alphonce-mid.png'));

    await page.evaluate((y) => window.scrollTo(0, y), box.y + Math.max(0, box.height - 900));
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(outDir, 'admin-learner-report-alphonce-lessons.png'),
      fullPage: false
    });
    console.log('Wrote', path.join(outDir, 'admin-learner-report-alphonce-lessons.png'));
  }
} catch (err) {
  console.error(err);
  await shot('admin-learner-report-error.png');
  process.exitCode = 1;
} finally {
  await browser.close();
}
