// Einstieg: Renderer, Szene, Stationen im Kreis, Desktop-Ansicht (OrbitControls) und WebXR-Session (immersive-ar).

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadData, buildView, viewAvailable } from './data.js';
import { availableStations } from './stations.js';
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
  nav: $('stations'),
};

const TABLE_HEIGHT = 0.8; // m über dem Boden
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

async function main() {
  const [data] = await Promise.all([loadData(), loadFonts()]);

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

  // ---------- Stationen ----------
  const stations = availableStations(data, viewAvailable).map((def, index) => {
    const models = new Map(def.views.map((v) => [v.id, buildView(data, v)]));
    // Instanzen-Pool: so viele Balken, wie die größte Ansicht braucht (Zellen × Segmente)
    let pool = 1;
    for (const m of models.values()) pool = Math.max(pool, m.cells.length * Math.max(1, ...m.cells.map((c) => c.segments.length)));
    const chart = new Chart(pool);
    chart.name = `station-${def.id}`;
    scene.add(chart);

    const items = [];
    for (const v of def.views) {
      if (v.gapBefore) items.push({ gap: 0.03 });
      items.push({ id: v.id, label: v.label });
    }
    items.push({ gap: 0.03 }, { id: 'replay', label: 'Neu aufbauen', small: true }, { id: 'recenter', label: 'Vor mich holen', small: true });
    const panel = new ButtonPanel(items);
    panel.position.set(-DIM.discR - 0.2, 0.37, 0.1);
    panel.rotation.y = 0.5;
    chart.add(panel);

    return { index, def, views: def.views, models, chart, panel, view: null };
  });
  const N = stations.length;
  // Kreis um den Betrachter: bei einer Station wie früher 1,05 m, sonst genug Abstand zwischen den Sockeln
  const RING_R = N === 1 ? 1.05 : N <= 5 ? 1.3 : 1.42;

  function showView(st, id, opts) {
    const v = st.views.find((x) => x.id === id);
    if (!v) return;
    st.view = id;
    st.chart.setView(st.models.get(id), opts);
    st.panel.setActive(id);
  }
  for (const st of stations) showView(st, st.views[0].id, { instant: true });

  // Stationen im Kreis anordnen. center: Mittelpunkt (y = Tischhöhe), fwd: Blickrichtung (x/z), front: Station vorne.
  const _fwd = new THREE.Vector3();
  const _rgt = new THREE.Vector3();
  function ringPose(i, center, fwd, front) {
    const a = (((i - front) % N) + N) % N * ((Math.PI * 2) / N);
    _rgt.set(-fwd.z, 0, fwd.x);
    const dir = new THREE.Vector3().copy(fwd).multiplyScalar(Math.cos(a)).addScaledVector(_rgt, Math.sin(a));
    return { pos: new THREE.Vector3().copy(center).addScaledVector(dir, RING_R), yaw: Math.atan2(-dir.x, -dir.z) };
  }
  function layoutRing(center, fwd, front, { glide = false } = {}) {
    stations.forEach((st, i) => {
      const p = ringPose(i, center, fwd, front);
      st.chart.spin = 0;
      if (glide) {
        st.chart.glide = p;
      } else {
        st.chart.glide = null;
        st.chart.position.copy(p.pos);
        st.chart.rotation.set(0, p.yaw, 0);
      }
    });
  }
  // Desktop: Station 0 steht im Ursprung, der gedachte Betrachter in +z
  const DESK_CENTER = new THREE.Vector3(0, 0, RING_R);
  const DESK_FWD = new THREE.Vector3(0, 0, -1);
  layoutRing(DESK_CENTER, DESK_FWD, 0);

  // Intro: Stationen erscheinen nacheinander, vorne beginnend, dann abwechselnd links/rechts
  function playIntros(front) {
    stations.forEach((st, i) => {
      const k = Math.min((i - front + N) % N, (front - i + N) % N);
      st.chart.playIntro(k * 0.45 + ((i - front + N) % N > N / 2 ? 0.2 : 0));
    });
  }

  // ---------- Desktop-Kamera ----------
  const DESK_CAM = new THREE.Vector3(0.28, 0.72, 1.55);
  const DESK_TARGET = new THREE.Vector3(-0.08, 0.16, 0);
  // Hochformat (Handy): Kamera etwas weiter weg und weiterer Blickwinkel, damit das Diagramm hineinpasst.
  // Nicht zu weit zurück, sonst stünden die Stationen hinter dem Betrachter im Bild.
  // Verborgener Tab/Fenster meldet 0 × 0 – dann ein übliches Format annehmen, sonst wird die Kamera NaN
  const aspect = () => (window.innerWidth > 0 && window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 1.6);
  const portraitK = () => THREE.MathUtils.clamp(1.3 / aspect(), 1, 1.25);
  function fitCamera() {
    camera.aspect = aspect();
    camera.fov = Math.max(45, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(23)) / camera.aspect)));
    camera.updateProjectionMatrix();
  }
  fitCamera();
  const deskCam = () => DESK_CAM.clone().sub(DESK_TARGET).multiplyScalar(portraitK()).add(DESK_TARGET);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.5;
  controls.maxDistance = 9;
  controls.maxPolarAngle = Math.PI * 0.49;

  let active = 0; // Station im Fokus (Desktop, Tastatur); -1 = Übersicht
  const fly = { t: 1, dur: 1.2, fromPos: new THREE.Vector3(), fromTgt: new THREE.Vector3(), toPos: new THREE.Vector3(), toTgt: new THREE.Vector3() };

  function camGoal(i, outPos, outTgt) {
    if (i < 0) {
      // Übersicht: schräg von oben hinter dem gedachten Betrachter
      const k = portraitK();
      outTgt.copy(DESK_CENTER).add(new THREE.Vector3(0, 0.1, 0.1));
      outPos.copy(outTgt).add(new THREE.Vector3(0, 3.5 * k, 2.9 * k));
      return;
    }
    const c = stations[i].chart;
    c.updateMatrixWorld(true);
    outPos.copy(deskCam()).applyMatrix4(c.matrixWorld);
    outTgt.copy(DESK_TARGET).applyMatrix4(c.matrixWorld);
  }

  function focus(i, { instant = false } = {}) {
    if (i >= N) i = -1;
    active = i;
    camGoal(i, fly.toPos, fly.toTgt);
    if (instant) {
      fly.t = 1;
      camera.position.copy(fly.toPos);
      controls.target.copy(fly.toTgt);
      controls.update();
    } else {
      fly.fromPos.copy(camera.position);
      fly.fromTgt.copy(controls.target);
      fly.t = 0;
      fly.dur = 0.9 + Math.min(0.8, fly.fromPos.distanceTo(fly.toPos) * 0.25);
    }
    updateNav();
  }
  controls.addEventListener('start', () => { fly.t = 1; });

  function updateFly(dt) {
    if (fly.t >= 1) return;
    fly.t = Math.min(1, fly.t + dt / fly.dur);
    const e = easeInOutCubic(fly.t);
    camera.position.lerpVectors(fly.fromPos, fly.toPos, e);
    controls.target.lerpVectors(fly.fromTgt, fly.toTgt, e);
    // Bogen statt gerader Linie: auf halbem Weg etwas zurück und nach oben
    const lift = Math.sin(e * Math.PI) * Math.min(0.9, fly.fromPos.distanceTo(fly.toPos) * 0.3);
    camera.position.y += lift;
  }

  // ---------- Stationen-Navigation (HTML, Desktop) ----------
  const navButtons = stations.map((st, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = st.def.name;
    b.addEventListener('click', () => { tour.stop(); focus(i); });
    return b;
  });
  if (N > 1) {
    const all = document.createElement('button');
    all.type = 'button';
    all.textContent = 'Übersicht';
    all.addEventListener('click', () => { tour.stop(); focus(-1); });
    navButtons.push(all);
    ui.nav.append(...navButtons);
    ui.nav.hidden = false;
  }
  function updateNav() {
    navButtons.forEach((b, i) => {
      const on = i === active || (active < 0 && i === N);
      if (on) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  // ---------- Eingabe ----------
  let needsPlacement = false; // false | { mode: 'intro'|'move', front }
  const interaction = new Interaction({
    renderer, scene, camera, stations, domElement: renderer.domElement,
    onButton: (st, id) => {
      if (id === 'replay') st.chart.playIntro();
      else if (id === 'recenter') needsPlacement = renderer.xr.isPresenting ? { mode: 'move', front: st.index } : false;
      else showView(st, id);
    },
    onTouch: (st) => {
      if (!renderer.xr.isPresenting && st.index !== active) { tour.stop(); focus(st.index); }
    },
  });
  interaction.controls = controls;

  focus(0, { instant: true });
  playIntros(0);

  // ---------- Platzierung im Raum ----------
  const _q = new THREE.Quaternion();
  const _c = new THREE.Vector3();

  function placeAround(frame, { mode, front }) {
    const pose = frame.getViewerPose(renderer.xr.getReferenceSpace());
    if (!pose) return false;
    const p = pose.transform.position;
    const o = pose.transform.orientation;
    _q.set(o.x, o.y, o.z, o.w);
    _fwd.set(0, 0, -1).applyQuaternion(_q);
    _fwd.y = 0;
    if (_fwd.lengthSq() < 1e-4) _fwd.set(0, 0, -1);
    _fwd.normalize();
    // Tischhöhe: 0,8 m, aber deutlich unter Augenhöhe (auch im Sitzen)
    const floorKnown = p.y > 0.6;
    const y = floorKnown ? Math.max(0.45, Math.min(TABLE_HEIGHT, p.y - 0.5)) : p.y - 0.5;
    _c.set(p.x, y, p.z);
    layoutRing(_c, _fwd, front, { glide: mode === 'move' });
    for (const st of stations) st.chart.visible = true;
    if (mode === 'intro') playIntros(front);
    return true;
  }

  function resetDesktop() {
    layoutRing(DESK_CENTER, DESK_FWD, 0);
    for (const st of stations) st.chart.visible = true;
    focus(active, { instant: true });
  }

  renderer.xr.addEventListener('sessionstart', () => {
    document.body.classList.add('in-xr');
    for (const st of stations) st.chart.visible = false;
    needsPlacement = { mode: 'intro', front: Math.max(0, active) };
    tour.stop();
  });
  renderer.xr.addEventListener('sessionend', () => {
    document.body.classList.remove('in-xr');
    needsPlacement = false;
    resetDesktop();
    playIntros(Math.max(0, active));
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
  // Tour: alle Ansichten aller Stationen, Kamera fährt von Station zu Station und pendelt leicht
  const steps = stations.flatMap((st, si) => st.views.map((v) => ({ si, id: v.id })));
  const tour = {
    on: false, t: 0, i: 0, sway: 0,
    start() {
      this.on = true; this.t = 0; this.sway = 0;
      this.i = Math.max(0, steps.findIndex((s) => s.si === Math.max(0, active) && s.id === stations[Math.max(0, active)].view));
      if (active < 0) focus(0);
      controls.autoRotate = true;
      document.body.classList.add('touring');
    },
    stop() { this.on = false; controls.autoRotate = false; document.body.classList.remove('touring'); },
    update(dt) {
      if (!this.on) return;
      this.t += dt;
      this.sway += dt;
      controls.autoRotateSpeed = fly.t < 1 ? 0 : 0.9 * Math.cos(this.sway * 0.35);
      if (this.t > 6.5) {
        this.t = 0;
        this.i = (this.i + 1) % steps.length;
        const s = steps[this.i];
        if (s.si !== active) { focus(s.si); this.sway = 0; }
        showView(stations[s.si], s.id);
      }
    },
  };

  window.addEventListener('keydown', (e) => {
    if (e.target.closest?.('button') && (e.key === 'Enter' || e.key === ' ')) return;
    const st = stations[Math.max(0, active)];
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= st.views.length) {
      if (active < 0) focus(0);
      showView(st, st.views[n - 1].id);
    } else if (e.key === '0' && N > 1) { tour.stop(); focus(-1); }
    else if (e.key === 'ArrowRight' && N > 1) { tour.stop(); focus((active + 1) % N); }
    else if (e.key === 'ArrowLeft' && N > 1) { tour.stop(); focus(((active < 0 ? 0 : active) - 1 + N) % N); }
    else if (e.key === 'r' || e.key === 'R') st.chart.playIntro();
    else if (e.key === 't' || e.key === 'T') (tour.on ? tour.stop() : tour.start());
    else if (e.key === 'Escape') interaction.deselectAll();
  });

  window.addEventListener('resize', () => {
    fitCamera();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Falls die Kamera doch einmal ungültig wurde: neu auf die aktive Station ausrichten
    if (!renderer.xr.isPresenting && !Number.isFinite(camera.position.x + camera.position.y + camera.position.z)) focus(active, { instant: true });
  });

  // ---------- Schleife ----------
  const timer = new THREE.Timer();
  const camPos = new THREE.Vector3();
  renderer.setAnimationLoop((time, frame) => {
    timer.update(time);
    const dt = Math.min(timer.getDelta(), 0.05);
    if (frame && needsPlacement) {
      if (placeAround(frame, needsPlacement)) needsPlacement = false;
    }
    if (!renderer.xr.isPresenting) {
      updateFly(dt);
      controls.update();
      tour.update(dt);
    }
    camera.getWorldPosition(camPos);
    interaction.update(dt);
    for (const st of stations) {
      st.chart.update(dt, camPos);
      st.panel.update(dt);
    }
    renderer.render(scene, camera);
  });

  document.body.classList.add('ready');
  // Für automatisierte Tests
  window.__app = {
    stations, showView, focus, renderer, camera, THREE,
    get active() { return active; },
    get station() { return stations[Math.max(0, active)]; },
    get chart() { return this.station.chart; },
    get panel() { return this.station.panel; },
    get views() { return this.station.views; },
    get view() { return this.station.view; },
  };
}

main().catch((err) => {
  console.error(err);
  ui.error.hidden = false;
  ui.error.textContent = `Fehler beim Start: ${err.message}. Tipp: Die Seite muss über einen Webserver laufen (npm run serve), nicht als Datei.`;
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
