// Rauchtest der Desktop-Variante mit Playwright/Chromium.
// Startet den lokalen Server, lädt die Seite, prüft auf Konsolenfehler,
// klickt einen Balken und alle Ansichten durch und speichert Screenshots in test-results/.
// Aufruf: npm test

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = fileURLToPath(new URL('../test-results/', import.meta.url));
mkdirSync(out, { recursive: true });
const PORT = 8123;

const server = spawn(process.execPath, ['tools/serve.mjs', String(PORT)], { cwd: root, stdio: 'pipe' });
await new Promise((r) => server.stdout.once('data', r));

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const problems = [];
let failed = false;

async function run(viewport, tag) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${tag}] ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${tag}] pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[${tag}] request failed: ${r.url()}`));

  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 30000 });
  await page.waitForFunction(() => { const c = window.__app.chart; return c.introT < 0 && c.animDone; }, null, { timeout: 30000 });
  await page.waitForTimeout(400); // Intro abwarten
  await page.screenshot({ path: `${out}${tag}-1-start.png` });

  // Echten Mausklick auf einen Balken ausführen (Oktober, letztes Jahr)
  const target = await page.evaluate(() => {
    const { chart, renderer, camera, THREE } = window.__app;
    const cells = chart.model.cells;
    const ci = cells.findIndex((c) => c.x === 9 && c.z === 2);
    const v = chart.cellTop(ci, new THREE.Vector3());
    v.y -= 0.03;
    chart.localToWorld(v);
    v.project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return { ci, x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
  });
  await page.mouse.move(target.x, target.y);
  await page.waitForTimeout(100);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(700);
  const selected = await page.evaluate(() => window.__app.chart.selected);
  if (selected !== target.ci) { failed = true; problems.push(`[${tag}] Klick auf Balken hat nicht ausgewählt (selected=${selected}, erwartet ${target.ci})`); }
  await page.screenshot({ path: `${out}${tag}-2-tooltip.png` });

  // Alle Ansichten per Taste durchschalten
  const n = await page.evaluate(() => window.__app.views.length);
  for (let i = 1; i <= n; i++) {
    await page.keyboard.press(String(i));
    await page.waitForTimeout(1700);
    const id = await page.evaluate(() => window.__app.view);
    await page.screenshot({ path: `${out}${tag}-3-view${i}-${id}.png` });
  }
  await page.close();
}

try {
  await run({ width: 1440, height: 900 }, 'desktop');
  await run({ width: 390, height: 844 }, 'mobile');
} catch (e) {
  failed = true;
  problems.push(`Abbruch: ${e.message}`);
} finally {
  await browser.close();
  server.kill();
}

const relevant = problems.filter((p) => !/GPU stall|swiftshader|WebGL.*(performance|fallback)|Automatic fallback/i.test(p));
if (relevant.length) console.log(relevant.join('\n'));
console.log(relevant.length || failed ? `FEHLER (${relevant.length} Meldungen)` : 'OK – keine Konsolenfehler, Balkenklick funktioniert');
console.log(`Screenshots: ${out}`);
process.exit(relevant.length || failed ? 1 : 0);
