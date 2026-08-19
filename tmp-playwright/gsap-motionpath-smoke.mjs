/**
 * Task 1.2 — GSAP MotionPathPlugin smoke test (no CSS offset-path, no 3D).
 * Moves a dot along a cubic curve and records three frames plus positions.
 *
 * Usage:
 *   node gsap-motionpath-smoke.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../docs/measurements');
fs.mkdirSync(outDir, { recursive: true });

const gsapJs = path.join(__dirname, '../frontend/node_modules/gsap/dist/gsap.min.js');
const motionJs = path.join(__dirname, '../frontend/node_modules/gsap/dist/MotionPathPlugin.min.js');

const html = `<!doctype html>
<html>
  <body style="margin:0;background:#E0F5FE;">
    <svg width="360" height="220" viewBox="0 0 360 220">
      <path id="road" d="M 28 40 C 90 40, 90 180, 180 180 S 270 40, 332 40"
        fill="none" stroke="#1A93CE" stroke-width="18" stroke-linecap="round"/>
      <path d="M 28 40 C 90 40, 90 180, 180 180 S 270 40, 332 40"
        fill="none" stroke="#2BB3F3" stroke-width="10" stroke-linecap="round"/>
    </svg>
    <div id="dot" style="position:absolute;left:0;top:0;width:22px;height:22px;border-radius:50%;background:#FF5CA8;will-change:transform;"></div>
  </body>
</html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 360, height: 220 } });
await page.setContent(html);
await page.addScriptTag({ path: gsapJs });
await page.addScriptTag({ path: motionJs });

const info = await page.evaluate(() => {
  const gsap = window.gsap;
  gsap.registerPlugin(window.MotionPathPlugin);
  return {
    version: gsap.version,
    plugin: window.MotionPathPlugin?.name || null,
  };
});

if (info.plugin !== 'motionPath') {
  throw new Error(`MotionPathPlugin did not register: ${JSON.stringify(info)}`);
}

await page.evaluate(() => {
  window.gsap.set('#dot', { x: 0, y: 0 });
  window.__tween = window.gsap.to('#dot', {
    duration: 1.2,
    ease: 'none',
    paused: true,
    motionPath: {
      path: '#road',
      align: '#road',
      alignOrigin: [0.5, 0.5],
      autoRotate: true,
    },
  });
});

const sample = async (progress, name) => {
  const pos = await page.evaluate((p) => {
    window.__tween.progress(p);
    const el = document.getElementById('dot');
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  }, progress);
  const file = path.join(outDir, name);
  await page.screenshot({ path: file });
  console.log(name, pos);
  return pos;
};

const a = await sample(0, 'g1-gsap-smoke-start.png');
const b = await sample(0.5, 'g1-gsap-smoke-mid.png');
const c = await sample(1, 'g1-gsap-smoke-end.png');

const moved = Math.hypot(c.x - a.x, c.y - a.y) > 80;
const notStraight = Math.abs(b.y - a.y) > 20 && Math.abs(b.y - c.y) > 20;
if (!moved) throw new Error('dot did not travel along the path');
if (!notStraight) throw new Error('midpoint looks like a straight line, not a curve');

console.log('gsap-motionpath-smoke: OK', info);
await browser.close();
