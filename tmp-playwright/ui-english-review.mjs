import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../tmp-ui-review');
fs.mkdirSync(outDir, { recursive: true });
const BASE = 'http://localhost:5173';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', 'admin@eduvibe.com');
  await page.fill('#password', 'password');
  await Promise.all([page.waitForURL(/\/admin/), page.click('button[type="submit"]')]);
  await page.goto(`${BASE}/admin/lessons`, { waitUntil: 'networkidle' });
  await page.locator('select').first().selectOption('5');
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /^English$/i }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /Reading/i }).first().click();
  await page.waitForTimeout(1000);
  await page.locator('button').filter({ hasText: 'Main idea' }).filter({ hasText: 'Learning Outcomes' }).click();
  await page.getByText(/Lessons for Main idea/i).waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Review' }).first().click();
  await page.waitForTimeout(1200);
  const quizTab = page.getByRole('button', { name: /^Quiz$/i }).first();
  if (await quizTab.isVisible().catch(() => false)) await quizTab.click();
  await page.waitForTimeout(600);
  const shot = path.join(outDir, '05-english-full-bank.png');
  await page.screenshot({ path: shot, fullPage: true });
  console.log('Wrote', shot);
  const bodyText = await page.locator('body').innerText();
  const snippets = bodyText
    .split('\n')
    .map((s) => s.trim())
    .filter((s) =>
      /flagged|coverage|remapped|QA|outcomes covered|Question bank|short —|Top up|Main idea|Finding Main/i.test(
        s
      )
    )
    .slice(0, 40);
  console.log(JSON.stringify(snippets, null, 2));
} catch (e) {
  await page.screenshot({ path: path.join(outDir, '05-english-error.png'), fullPage: true });
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
