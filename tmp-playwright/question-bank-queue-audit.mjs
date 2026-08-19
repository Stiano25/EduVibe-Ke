/**
 * Screenshot the compact, filterable question-bank review queue.
 *   node question-bank-queue-audit.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../docs/measurements');
fs.mkdirSync(outDir, { recursive: true });

const BASE = process.env.FRONTEND_URL || 'http://localhost:5173';
const pickupPath = path.join(outDir, 'bank-approve-pickup.json');
const pickup = fs.existsSync(pickupPath)
  ? JSON.parse(fs.readFileSync(pickupPath, 'utf8'))
  : null;
const filterHref = pickup?.filterSample?.href || '/admin/knowledge?status=pending';

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
  const email = page.locator('#email');
  if (await email.count()) {
    await email.fill('admin@eduvibe.com');
    await page.fill('#password', 'password');
    await Promise.all([
      page.waitForURL(/\/admin/, { timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);
  }

  await page.goto(`${BASE}${filterHref}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByTestId('question-bank-queue').waitFor({ timeout: 20000 });
  await page.getByRole('heading', { name: 'Original question bank' }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(800);

  const diagnoses = await page.getByText('Diagnoses:').count();
  const showDetails = await page.getByRole('button', { name: 'Show details' }).count();
  console.log('compact check', { diagnosesVisible: diagnoses, showDetailsButtons: showDetails, href: filterHref });

  await shot('admin-question-bank-queue-filtered.png');

  const queue = page.getByTestId('question-bank-queue');
  await queue.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await queue.screenshot({
    path: path.join(outDir, 'admin-question-bank-queue-filtered-card.png'),
  });
  console.log('Wrote', path.join(outDir, 'admin-question-bank-queue-filtered-card.png'));
} catch (err) {
  console.error(err);
  await shot('admin-question-bank-queue-filtered-error.png');
  process.exitCode = 1;
} finally {
  await browser.close();
}
