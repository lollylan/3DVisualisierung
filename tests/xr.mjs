// XR-Test mit der WebXR-Emulations-Runtime von Meta (iwer, Basis des "Immersive Web Emulator").
// Simuliert eine Meta Quest 3: AR-Session starten, Kreis der Stationen prüfen, mit Controller
// Buttons und Balken anklicken (auch an einer Nachbarstation), mit der Hand am Griff ziehen,
// am Ring drehen und eine Station per "Vor mich holen" nach vorne holen.
// Aufruf: npm run test:xr

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = fileURLToPath(new URL('../test-results/', import.meta.url));
mkdirSync(out, { recursive: true });
const PORT = 8125;

const server = spawn(process.execPath, ['tools/serve.mjs', String(PORT)], { cwd: root, stdio: 'pipe' });
await new Promise((r) => server.stdout.once('data', r));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const problems = [];
const results = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

// iwer vor der App installieren
await page.route(`http://localhost:${PORT}/`, async (route) => {
  const res = await route.fetch();
  let html = await res.text();
  html = html.replace('<script type="module" src="src/main.js"></script>', `
    <script type="module">
      import { XRDevice, metaQuest3 } from '/node_modules/iwer/build/iwer.module.js';
      const d = new XRDevice(metaQuest3);
      d.installRuntime({ forceInstall: true });
      d.stereoEnabled = false;
      window.__xrdevice = d;
    </script>
    <script type="module" src="src/main.js"></script>`);
  route.fulfill({ response: res, body: html, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } });
});

const check = (name, ok, detail = '') => { results.push(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' – ' + detail : ''}`); if (!ok) problems.push(name); };
const frames = (n = 6) => page.waitForTimeout(n * 40);

// Zeiger (Controller oder Hand) auf einen Weltpunkt richten
async function aim(kind, from, targetExpr) {
  await page.evaluate(({ kind, from, targetExpr }) => {
    const { THREE } = window.__app;
    const d = window.__xrdevice;
    const input = kind === 'hand' ? d.hands.right : d.controllers.right;
    const target = new Function('app', 'THREE', `return (${targetExpr})`)(window.__app, THREE);
    const pos = new THREE.Vector3(...from);
    const dir = target.clone().sub(pos).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
    input.position.set(pos.x, pos.y, pos.z);
    input.quaternion.set(q.x, q.y, q.z, q.w);
  }, { kind, from, targetExpr });
  await frames(4);
}

async function trigger(kind, on) {
  await page.evaluate(({ kind, on }) => {
    const d = window.__xrdevice;
    if (kind === 'hand') d.hands.right.setPinchValueImmediate?.(on ? 1 : 0) ?? d.hands.right.updatePinchValue(on ? 1 : 0);
    else d.controllers.right.updateButtonValue('trigger', on ? 1 : 0);
  }, { kind, on });
  await frames(4);
}

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 30000 });
  await page.waitForFunction(() => !document.getElementById('enter-xr').disabled, null, { timeout: 10000 });
  const label = await page.textContent('#enter-xr');
  check('AR wird erkannt, Button aktiv', label.includes('In den Raum holen'), label);

  await page.click('#enter-xr');
  await page.waitForFunction(() => window.__app.renderer.xr.isPresenting && window.__app.chart.visible, null, { timeout: 15000 });
  const place = await page.evaluate(() => {
    const d = window.__xrdevice;
    const all = window.__app.stations.map((st) => st.chart.position.toArray());
    return { head: [d.position.x, d.position.y, d.position.z], chart: all[0], all };
  });
  const dist = Math.hypot(place.chart[0] - place.head[0], place.chart[2] - place.head[2]);
  const ringR = place.all.length === 1 ? 1.05 : place.all.length <= 5 ? 1.3 : 1.42;
  check('Erste Station vor dem Kopf', Math.abs(dist - ringR) < 0.05 && place.chart[2] < place.head[2], `${dist.toFixed(2)} m`);
  check('Diagramm auf Tischhöhe', place.chart[1] > 0.4 && place.chart[1] <= 0.81, `y = ${place.chart[1].toFixed(2)} m (Kopf ${place.head[1].toFixed(2)} m)`);
  const radii = place.all.map((p) => Math.hypot(p[0] - place.head[0], p[2] - place.head[2]));
  const angles = place.all.map((p) => Math.atan2(p[0] - place.head[0], -(p[2] - place.head[2]))).sort((a, b) => a - b);
  const gaps = angles.map((a, i) => (i ? a - angles[i - 1] : a - angles[angles.length - 1] + Math.PI * 2));
  check(`${place.all.length} Stationen im Kreis um den Kopf`, radii.every((x) => Math.abs(x - ringR) < 0.05) && gaps.every((g) => Math.abs(g - (Math.PI * 2) / place.all.length) < 0.05),
    `Radien ${radii.map((x) => x.toFixed(2)).join('/')} m`);

  await page.waitForFunction(() => { const c = window.__app.chart; return c.introT < 0 && c.animDone; }, null, { timeout: 20000 });
  await page.screenshot({ path: `${out}xr-1-placed.png` });

  // Controller: Button "Scheinzahlen"
  const ctrlFrom = [place.head[0] + 0.15, place.head[1] - 0.35, place.head[2] - 0.25];
  await aim('controller', ctrlFrom, `app.panel.buttons.find(b => b.id === 'scheine').panel.getWorldPosition(new THREE.Vector3())`);
  const hoverBtn = await page.evaluate(() => window.__app.panel.hovered);
  check('Controller-Strahl trifft Button', hoverBtn === 'scheine', String(hoverBtn));
  await trigger('controller', true);
  await trigger('controller', false);
  await page.waitForTimeout(1200);
  check('Trigger schaltet Ansicht um', (await page.evaluate(() => window.__app.view)) === 'scheine');

  // Controller: Balken auswählen
  await aim('controller', ctrlFrom, `(() => { const c = app.chart; const ci = c.model.cells.findIndex(x => x.x === 3 && x.z === 0); const v = c.cellTop(ci, new THREE.Vector3()); v.y -= 0.02; return c.localToWorld(v); })()`);
  await trigger('controller', true);
  await trigger('controller', false);
  const sel = await page.evaluate(() => { const c = window.__app.chart; return { sel: c.selected, want: c.model.cells.findIndex((x) => x.x === 3 && x.z === 0) }; });
  check('Trigger auf Balken zeigt Wert', sel.sel === sel.want, `selected=${sel.sel}`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}xr-2-tooltip.png` });

  // Hand: Griff greifen und verschieben
  await page.evaluate(() => { window.__xrdevice.primaryInputMode = 'hand'; });
  await frames(10);
  const handFrom = [place.head[0] + 0.12, place.head[1] - 0.4, place.head[2] - 0.15];
  await aim('hand', handFrom, `app.chart.handle.getWorldPosition(new THREE.Vector3())`);
  const hs = await page.evaluate(() => window.__app.chart.handleState);
  check('Hand-Strahl trifft Griff', hs === 'hover', hs);
  const before = await page.evaluate(() => window.__app.chart.position.toArray());
  await trigger('hand', true);
  const grabbing = await page.evaluate(() => window.__app.chart.handleState);
  check('Pinch greift Griff', grabbing === 'grab', grabbing);
  // Hand 20 cm nach rechts bewegen
  await page.evaluate(() => { const h = window.__xrdevice.hands.right; h.position.x += 0.2; });
  await page.waitForTimeout(800);
  await trigger('hand', false);
  const after = await page.evaluate(() => window.__app.chart.position.toArray());
  const moved = Math.hypot(after[0] - before[0], after[2] - before[2]);
  check('Diagramm folgt der Hand', moved > 0.15, `${moved.toFixed(2)} m bewegt`);

  // Hand: am Drehring drehen
  const rotBefore = await page.evaluate(() => window.__app.chart.rotation.y);
  await aim('hand', handFrom, `app.chart.localToWorld(new THREE.Vector3(Math.cos(0.9) * 0.53, -0.011, Math.sin(0.9) * 0.53))`);
  const rh = await page.evaluate(() => window.__app.chart.ringHover);
  check('Hand-Strahl trifft Drehring', !!rh);
  await trigger('hand', true);
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => { const h = window.__xrdevice.hands.right; h.position.x -= 0.03; });
    await frames(2);
  }
  await trigger('hand', false);
  await page.waitForTimeout(600);
  const rotAfter = await page.evaluate(() => window.__app.chart.rotation.y);
  check('Drehring dreht das Diagramm', Math.abs(rotAfter - rotBefore) > 0.1, `${((rotAfter - rotBefore) * 180 / Math.PI).toFixed(0)}°`);
  await page.screenshot({ path: `${out}xr-3-moved.png` });

  // Nachbarstation rechts (HZV): Controller-Trigger auf den Button "HZV-Quote"
  await page.evaluate(() => { window.__xrdevice.primaryInputMode = 'controller'; });
  await frames(10);
  await aim('controller', ctrlFrom, `app.stations[1].panel.buttons.find(b => b.id === 'hzv-quote').panel.getWorldPosition(new THREE.Vector3())`);
  await trigger('controller', true);
  await trigger('controller', false);
  await page.waitForTimeout(1200);
  check('Button an Nachbarstation schaltet deren Ansicht', (await page.evaluate(() => window.__app.stations[1].view)) === 'hzv-quote');

  // "Vor mich holen" an der Nachbarstation: sie gleitet nach vorne
  await aim('controller', ctrlFrom, `app.stations[1].panel.buttons.find(b => b.id === 'recenter').panel.getWorldPosition(new THREE.Vector3())`);
  await trigger('controller', true);
  await trigger('controller', false);
  await page.waitForTimeout(1800);
  const front = await page.evaluate(() => {
    const d = window.__xrdevice;
    const q = new window.__app.THREE.Quaternion(d.quaternion.x, d.quaternion.y, d.quaternion.z, d.quaternion.w);
    const f = new window.__app.THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const p = window.__app.stations[1].chart.position;
    const v = new window.__app.THREE.Vector3(p.x - d.position.x, 0, p.z - d.position.z).normalize();
    return v.x * f.x + v.z * f.z;
  });
  check('"Vor mich holen" bringt die Station nach vorne', front > 0.95, `cos = ${front.toFixed(3)}`);
  await page.screenshot({ path: `${out}xr-4-recenter.png` });

  // Station 1 zurück, Station 0 wieder nach vorne holen
  await aim('controller', ctrlFrom, `app.stations[0].panel.buttons.find(b => b.id === 'recenter').panel.getWorldPosition(new THREE.Vector3())`);
  await trigger('controller', true);
  await trigger('controller', false);
  await page.waitForTimeout(1800);

  // Heatmap per Hand-Pinch auf Button
  await page.evaluate(() => { window.__xrdevice.primaryInputMode = 'hand'; });
  await frames(10);
  await aim('hand', handFrom, `app.panel.buttons.find(b => b.id === 'heatmap').panel.getWorldPosition(new THREE.Vector3())`);
  await trigger('hand', true);
  await trigger('hand', false);
  await page.waitForTimeout(1600);
  check('Hand-Pinch schaltet auf Heatmap', (await page.evaluate(() => window.__app.view)) === 'heatmap');
  await page.screenshot({ path: `${out}xr-5-heatmap.png` });
} catch (e) {
  problems.push(`Abbruch: ${e.message}`);
} finally {
  await browser.close();
  server.kill();
}

console.log(results.join('\n'));
if (problems.length) console.log('\nProbleme:\n' + problems.join('\n'));
console.log(problems.length ? 'FEHLER' : 'OK – XR-Ablauf im Emulator erfolgreich');
process.exit(problems.length ? 1 : 0);
