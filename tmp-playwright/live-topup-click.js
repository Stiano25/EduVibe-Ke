/**
 * Live UI: open LessonReviewModal, screenshot, click "Top up to 30", screenshot after.
 * CommonJS so it runs from tmp-playwright with local playwright install.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '../tmp-ui-review');
fs.mkdirSync(outDir, { recursive: true });
const BASE = 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('BROWSER_CONSOLE_ERROR:', msg.text());
  });
  page.on('pageerror', (err) => console.log('PAGE_ERROR:', err.message));

  const shot = async (name) => {
    const p = path.join(outDir, name);
    await page.screenshot({ path: p, fullPage: true });
    console.log('SHOT', p);
    return p;
  };

  const bankSnippets = async () => {
    const text = await page.locator('body').innerText();
    return text
      .split('\n')
      .map((s) => s.trim())
      .filter((s) =>
        /Question bank|outcomes covered|flagged|Top up|Added |Bank already|coverage|QA|short —|Showing/i.test(
          s
        )
      )
      .slice(0, 25);
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
    await page.locator('select').first().selectOption('4');
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /^Mathematics$/i }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /Numbers/i }).first().click();
    await page.waitForTimeout(1000);
    await page
      .locator('button')
      .filter({ hasText: 'Place value' })
      .filter({ hasText: 'Learning Outcomes' })
      .click();
    await page.getByText(/Lessons for Place value/i).waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Review' }).first().click();
    await page.waitForTimeout(1200);

    const quizTab = page.getByRole('button', { name: /^Quiz/i }).first();
    if (await quizTab.isVisible().catch(() => false)) {
      await quizTab.click();
      await page.waitForTimeout(500);
    }

    await shot('07-live-topup-BEFORE.png');
    const before = await bankSnippets();
    console.log('BEFORE_SNIPPETS', JSON.stringify(before, null, 2));

    const topUpBtn = page.getByRole('button', { name: /Top up to 30/i });
    await topUpBtn.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Clicking Top up to 30…');
    await topUpBtn.click();

    // Wait for topping-up to finish (Playwright: options are 3rd arg)
    await page.waitForFunction(
      () => {
        const body = document.body.innerText || '';
        if (/Added \d+ questions|Bank already at/i.test(body)) return true;
        if (/Failed to top up quiz bank/i.test(body)) return true;
        return false;
      },
      undefined,
      { timeout: 600000 }
    );
    await page.waitForTimeout(1500);

    await shot('08-live-topup-AFTER.png');
    const after = await bankSnippets();
    console.log('AFTER_SNIPPETS', JSON.stringify(after, null, 2));

    // Confirm UI updated without reload — bank count in modal should match
    const bankLine = after.find((s) => /Question bank:/i.test(s)) || '';
    console.log('BANK_LINE_AFTER', bankLine);
  } catch (err) {
    await shot('07-live-topup-ERROR.png');
    console.error('LIVE_TOPUP_FAILED', err.message || err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
