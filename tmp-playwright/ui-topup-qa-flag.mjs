import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../tmp-ui-review');
const BASE = 'http://localhost:5173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', 'admin@eduvibe.com');
  await page.fill('#password', 'password');
  await Promise.all([page.waitForURL(/\/admin/), page.click('button[type="submit"]')]);
  await page.goto(`${BASE}/admin/lessons`, { waitUntil: 'networkidle' });
  await page.locator('select').first().selectOption('4');
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /^Mathematics$/i }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /Numbers/i }).first().click();
  await page.waitForTimeout(1000);
  await page.locator('button').filter({ hasText: 'Place value' }).filter({ hasText: 'Learning Outcomes' }).click();
  await page.getByText(/Lessons for Place value/i).waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Review' }).first().click();
  await page.waitForTimeout(1000);
  const quizTab = page.getByRole('button', { name: /^Quiz$/i }).first();
  if (await quizTab.isVisible().catch(() => false)) await quizTab.click();
  await page.waitForTimeout(400);
  await page.locator('select').filter({ hasText: /QA/i }).selectOption('flagged');
  await page.waitForTimeout(600);
  const shot = path.join(outDir, '06-topup-qa-flagged-only.png');
  await page.screenshot({ path: shot, fullPage: true });
  console.log('Wrote', shot);
  console.log(
    JSON.stringify(
      (await page.locator('body').innerText())
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => /flagged|Question bank|QA|Ambiguous|place value chart|Showing/i.test(s))
        .slice(0, 30),
      null,
      2
    )
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
