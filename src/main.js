// Einstieg: Renderer, Szene, Desktop-Ansicht (OrbitControls) und WebXR-Session (immersive-ar).

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadData, availableViews, buildView } from './data.js';
import { Chart, DIM } from './chart.js';
import { ButtonPanel } from './panel.js';
import { Interaction } from './input.js';
import { loadFonts } from './theme.js';
import { setMaxAnisotropy } from './text.js';

const $ = (id) => document.getElementById(id);
const ui = {
  enter: $('enter-xr'),
  status: $('xr-status'),
  error: $('error'),
};

const PLACE_DISTANCE = 1.05; // m vor dem Kopf
const TABLE_HEIGHT = 0.8; // m über dem Boden

async function main() {
  const [data] = await Promise.all([loadData(), loadFonts()]);
  const views = availableViews(data);

  // ---------- Renderer & Szene ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  renderer.xr.setFramebufferScaleFactor(1.2); // etwas schärferer Text, Szene ist leicht genug
  $('stage').appendChild(renderer.domElement);
  setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 40);
  const DESK_CAM = new THREE.Vector3(0.28, 0.72, 1.55);
  const DESK_TARGET = new THREE.Vector3(-0.08, 0.16, 0);
  // Hochformat (Handy): Kamera weiter weg, damit das Diagramm hineinpasst
  const deskCam = () => {
    const a = window.innerWidth / window.innerHeight;
    const k = THREE.MathUtils.clamp(1.3 / a, 1, 2.8);
    return DESK_CAM.clone().sub(DESK_TARGET).multiplyScalar(k).add(DESK_TARGET);
  };
  camera.position.copy(deskCam());

  // ---------- Diagramm ----------
  const heat = data.heatmap;
  const poolSize = Math.max(data.years.length * 12 * 2, heat ? heat.days.length * heat.hours.length : 0);
  const chart = new Chart(poolSize);
  scene.add(chart);

  const items = views.map((v) => ({ id: v.id, label: v.label }));
  if (heat) items.splice(items.length - 1, 0, { gap: 0.03 });
  items.push({ gap: 0.03 }, { id: 'replay', label: 'Neu aufbauen', small: true }, { id: 'recenter', label: 'Vor mich holen', small: true });
  const panel = new ButtonPanel(items);
  panel.position.set(-DIM.discR - 0.2, 0.37, 0.1);
  panel.rotation.y = 0.5;
  chart.add(panel);

  let currentView = null;
  function showView(id, opts) {
    const v = views.find((x) => x.id === id);
    if (!v) return;
    currentView = id;
    chart.setView(buildView(data, v), opts);
    panel.setActive(id);
  }

  // ---------- Eingabe ----------
  const interaction = new Interaction({
    renderer, scene, camera, chart, panel, domElement: renderer.domElement,
    onButton: (id) => {
      if (id === 'replay') chart.playIntro();
      else if (id === 'recenter') needsPlacement = renderer.xr.isPresenting ? 'move' : false;
      else showView(id);
    },
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(DESK_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.5;
  controls.maxDistance = 5;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotateSpeed = 0.7;
  controls.update();
  interaction.controls = controls;

  showView(views[0].id, { instant: true });
  chart.playIntro();

  // ---------- Platzierung im Raum ----------
  let needsPlacement = false; // false | 'intro' | 'move'
  const _q = new THREE.Quaternion();
  const _f = new THREE.Vector3();

  function placeInFront(frame, mode) {
    const pose = frame.getViewerPose(renderer.xr.getReferenceSpace());
    if (!pose) return false;
    const p = pose.transform.position;
    const o = pose.transform.orientation;
    _q.set(o.x, o.y, o.z, o.w);
    _f.set(0, 0, -1).applyQuaternion(_q);
    _f.y = 0;
    if (_f.lengthSq() < 1e-4) _f.set(0, 0, -1);
    _f.normalize();
    // Tischhöhe: 0,8 m, aber deutlich unter Augenhöhe (auch im Sitzen)
    const floorKnown = p.y > 0.6;
    const y = floorKnown ? Math.max(0.45, Math.min(TABLE_HEIGHT, p.y - 0.5)) : p.y - 0.5;
    chart.position.set(p.x + _f.x * PLACE_DISTANCE, y, p.z + _f.z * PLACE_DISTANCE);
    chart.rotation.set(0, Math.atan2(-_f.x, -_f.z), 0);
    chart.spin = 0;
    chart.visible = true;
    if (mode === 'intro') chart.playIntro();
    return true;
  }

  function resetDesktop() {
    chart.position.set(0, 0, 0);
    chart.rotation.set(0, 0, 0);
    chart.spin = 0;
    chart.visible = true;
    // Hochformat (Handy): Kamera weiter weg, damit das Diagramm hineinpasst
  const deskCam = () => {
    const a = window.innerWidth / window.innerHeight;
    const k = THREE.MathUtils.clamp(1.3 / a, 1, 2.8);
    return DESK_CAM.clone().sub(DESK_TARGET).multiplyScalar(k).add(DESK_TARGET);
  };
  camera.position.copy(deskCam());
    controls.target.copy(DESK_TARGET);
    controls.update();
  }

  renderer.xr.addEventListener('sessionstart', () => {
    document.body.classList.add('in-xr');
    chart.visible = false;
    needsPlacement = 'intro';
    tour.stop();
  });
  renderer.xr.addEventListener('sessionend', () => {
    document.body.classList.remove('in-xr');
    needsPlacement = false;
    resetDesktop();
    chart.playIntro();
    updateEnterButton();
  });

  // ---------- XR-Einstieg ----------
  let xrMode = null;
  async function detectXR() {
    if (!('xr' in navigator)) return null;
    try {
      if (await navigator.xr.isSessionSupported('immersive-ar')) return 'immersive-ar';
      if (await navigator.xr.isSessionSupported('immersive-vr')) return 'immersive-vr';
    } catch { /* nicht verfügbar */ }
    return null;
  }

  function updateEnterButton() {
    if (xrMode === 'immersive-ar') {
      ui.enter.disabled = false;
      ui.enter.textContent = 'In den Raum holen';
      ui.status.textContent = 'Mixed Reality bereit. Hände oder Controller funktionieren.';
    } else if (xrMode === 'immersive-vr') {
      ui.enter.disabled = false;
      ui.enter.textContent = 'In VR ansehen';
      ui.status.textContent = 'Nur VR verfügbar, kein Passthrough.';
    } else {
      ui.enter.disabled = true;
      ui.enter.textContent = 'In den Raum holen';
      ui.status.textContent = window.isSecureContext
        ? 'WebXR ist hier nicht verfügbar. Öffne die Seite im Browser der Meta Quest 3.'
        : 'WebXR braucht HTTPS. Öffne die GitHub-Pages-Adresse.';
    }
  }

  xrMode = await detectXR();
  updateEnterButton();
  navigator.xr?.addEventListener?.('devicechange', async () => { xrMode = await detectXR(); updateEnterButton(); });

  ui.enter.addEventListener('click', async () => {
    if (!xrMode || renderer.xr.isPresenting) return;
    ui.enter.disabled = true;
    ui.status.textContent = 'Starte Session …';
    const init = { requiredFeatures: ['local-floor'], optionalFeatures: ['hand-tracking'] };
    try {
      const session = await navigator.xr.requestSession(xrMode, init);
      await renderer.xr.setSession(session);
    } catch (err) {
      console.warn(err);
      ui.status.textContent = `Session konnte nicht starten: ${err.message || err}`;
      ui.enter.disabled = false;
    }
  });

  // ---------- Desktop: Tastatur & Tour (für Backup-Video) ----------
  const tour = {
    on: false, t: 0,
    start() { this.on = true; this.t = 0; controls.autoRotate = true; document.body.classList.add('touring'); },
    stop() { this.on = false; controls.autoRotate = false; document.body.classList.remove('touring'); },
    update(dt) {
      if (!this.on) return;
      this.t += dt;
      if (this.t > 7) {
        this.t = 0;
        const i = views.findIndex((v) => v.id === currentView);
        showView(views[(i + 1) % views.length].id);
      }
    },
  };

  window.addEventListener('keydown', (e) => {
    if (e.target.closest?.('button') && (e.key === 'Enter' || e.key === ' ')) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= views.length) showView(views[n - 1].id);
    else if (e.key === 'r' || e.key === 'R') chart.playIntro();
    else if (e.key === 't' || e.key === 'T') (tour.on ? tour.stop() : tour.start());
    else if (e.key === 'Escape') chart.select(-1);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------- Schleife ----------
  const timer = new THREE.Timer();
  const camPos = new THREE.Vector3();
  renderer.setAnimationLoop((time, frame) => {
    timer.update(time);
    const dt = Math.min(timer.getDelta(), 0.05);
    if (frame && needsPlacement) {
      if (placeInFront(frame, needsPlacement)) needsPlacement = false;
    }
    if (!renderer.xr.isPresenting) {
      controls.update();
      tour.update(dt);
    }
    camera.getWorldPosition(camPos);
    interaction.update(dt);
    chart.update(dt, camPos);
    panel.update(dt);
    renderer.render(scene, camera);
  });

  document.body.classList.add('ready');
  // Für automatisierte Tests
  window.__app = { chart, panel, views, showView, renderer, camera, THREE, get view() { return currentView; } };
}

main().catch((err) => {
  console.error(err);
  ui.error.hidden = false;
  ui.error.textContent = `Fehler beim Start: ${err.message}. Tipp: Die Seite muss über einen Webserver laufen (npm run serve), nicht als Datei.`;
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
