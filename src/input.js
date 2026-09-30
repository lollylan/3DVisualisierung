// Eingabe: Hände (Pinch), Controller (Trigger/Grip/Stick) und Maus am Desktop.
// Alle Eingaben werden zu "Zeigern" mit Strahl + select-Start/-Ende vereinheitlicht.
// Mehrere Stationen: Jeder Treffer weiß, zu welcher Station (Diagramm + Buttons) er gehört.

import * as THREE from 'three';
import { COLORS } from './theme.js';

const NEAR_GRAB = 0.11; // m – Hand direkt am Griff greift ohne Strahl

export class Interaction {
  constructor({ renderer, scene, camera, stations, onButton, onTouch, domElement }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.stations = stations; // [{ chart, panel }]
    this.onButton = onButton; // (station, id)
    this.onTouch = onTouch || (() => {}); // (station) – jede Interaktion mit einer Station
    this.pointers = [];
    this.grab = null; // { pointer, chart, mode: 'move'|'ring', ... }
    this.enabled = true;
    for (const st of stations) st.hover = { bar: -1, button: null, handle: false, ring: false };

    this.setupXR();
    this.setupMouse(domElement);
  }

  // ---------- XR ----------

  setupXR() {
    const xr = this.renderer.xr;
    for (let i = 0; i < 2; i++) {
      const ctrl = xr.getController(i);
      this.scene.add(ctrl);
      const p = this.makePointer(ctrl, 'xr');
      // Hand-Gelenke bzw. Griffposition – für "direkt anfassen"
      p.hand = xr.getHand(i);
      p.grip = xr.getControllerGrip(i);
      this.scene.add(p.hand, p.grip);
      ctrl.addEventListener('connected', (e) => {
        p.source = e.data;
        p.isHand = !!e.data.hand;
        p.connected = true;
        p.ray.visible = true;
      });
      ctrl.addEventListener('disconnected', () => {
        if (this.grab?.pointer === p) this.endGrab();
        p.connected = false;
        p.source = null;
        p.ray.visible = false;
        p.reticle.visible = false;
      });
      ctrl.addEventListener('selectstart', () => this.onSelectStart(p));
      ctrl.addEventListener('selectend', () => this.onSelectEnd(p));
      ctrl.addEventListener('squeezestart', () => this.onSqueezeStart(p));
      ctrl.addEventListener('squeezeend', () => this.onSelectEnd(p));
      this.pointers.push(p);
    }
  }

  makePointer(object, kind) {
    const p = { object, kind, connected: kind === 'mouse', isHand: false, source: null, hit: null, origin: new THREE.Vector3(), dir: new THREE.Vector3() };

    // Strahl: dünner Zylinder mit Verlauf
    const geo = new THREE.CylinderGeometry(0.0011, 0.0011, 1, 6, 1, true);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -0.5);
    const mat = new THREE.MeshBasicMaterial({ color: COLORS.glow, transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false });
    p.ray = new THREE.Mesh(geo, mat);
    p.ray.visible = false;
    p.ray.renderOrder = 30;
    if (kind === 'xr') object.add(p.ray);

    // Zielmarke am Trefferpunkt
    const rg = new THREE.RingGeometry(0.006, 0.0095, 32);
    p.reticle = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, toneMapped: false }));
    p.reticle.renderOrder = 31;
    p.reticle.visible = false;
    this.scene.add(p.reticle);
    return p;
  }

  // ---------- Maus (Desktop) ----------

  setupMouse(el) {
    const cam = this.camera;
    const pointerObj = new THREE.Object3D();
    const p = this.makePointer(pointerObj, 'mouse');
    p.reticle.visible = false;
    this.mouse = p;
    this.pointers.push(p);
    const ndc = new THREE.Vector2();
    const rc = new THREE.Raycaster();
    let hasPos = false;

    const updateFromEvent = (e) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      rc.setFromCamera(ndc, cam);
      pointerObj.position.copy(rc.ray.origin);
      pointerObj.lookAt(_tmp.copy(rc.ray.origin).add(rc.ray.direction));
      // lookAt richtet +z auf das Ziel aus; Zeiger schauen entlang -z
      pointerObj.rotateY(Math.PI);
      pointerObj.updateMatrixWorld(true);
      hasPos = true;
    };

    // Muss vor OrbitControls registriert werden, damit wir Ziehen am Griff abfangen können
    el.addEventListener('pointerdown', (e) => {
      if (this.renderer.xr.isPresenting || e.button !== 0) return;
      updateFromEvent(e);
      this.updatePointer(p);
      if (p.hit) {
        this.controls && (this.controls.enabled = false);
        el.setPointerCapture?.(e.pointerId);
      }
      this.onSelectStart(p);
    });
    let downX = 0, downY = 0;
    el.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
    el.addEventListener('pointermove', (e) => {
      if (this.renderer.xr.isPresenting) return;
      updateFromEvent(e);
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) p.pendingDeselect = false;
    });
    const up = () => {
      if (this.renderer.xr.isPresenting) return;
      if (p.pendingDeselect) this.deselectAll();
      p.pendingDeselect = false;
      this.onSelectEnd(p);
      this.controls && (this.controls.enabled = true);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', () => { hasPos = false; p.hit = null; });
    p.hasPos = () => hasPos;
  }

  // ---------- Logik ----------

  pointerRay(p) {
    p.object.updateMatrixWorld(true);
    p.origin.setFromMatrixPosition(p.object.matrixWorld);
    p.dir.set(0, 0, -1).transformDirection(p.object.matrixWorld);
  }

  // Nächster Treffer über alle Stationen (Buttons, Balken, Griff, Ring)
  updatePointer(p) {
    this.pointerRay(p);
    let best = null;
    for (const st of this.stations) {
      if (!st.chart.visible) continue;
      for (const h of [st.panel.hitTest(p.origin, p.dir), st.chart.hitTest(p.origin, p.dir)]) {
        if (h && (!best || h.t < best.t)) best = { ...h, station: st };
      }
    }
    p.hit = best;
  }

  deselectAll() {
    for (const st of this.stations) st.chart.select(-1);
  }

  onSelectStart(p) {
    if (!this.enabled || this.grab) return;
    if (p.kind === 'xr') this.updatePointer(p);

    // Hand/Controller direkt am Griff?
    const near = p.kind === 'xr' ? this.nearHandle(p) : null;
    if (near) return this.startMove(p, near, true);

    const hit = p.hit;
    if (!hit) {
      // Maus: erst beim Loslassen ohne Ziehen abwählen (Ziehen = Kamera drehen)
      if (p.kind === 'mouse') p.pendingDeselect = true;
      else this.deselectAll();
      return;
    }
    const st = hit.station;
    this.onTouch(st);
    if (hit.type === 'button') {
      st.panel.press(hit.id);
      this.pulse(p, 0.5, 40);
      this.onButton(st, hit.id);
    } else if (hit.type === 'bar') {
      st.chart.select(hit.index);
      this.pulse(p, 0.3, 25);
    } else if (hit.type === 'handle') {
      this.startMove(p, st, false);
    } else if (hit.type === 'ring') {
      this.startRing(p, st);
    }
  }

  onSqueezeStart(p) {
    // Grip-Taste am Controller: Diagramm von überall greifen
    if (!this.enabled || this.grab) return;
    this.updatePointer(p);
    const near = this.nearHandle(p);
    if (near) return this.startMove(p, near, true);
    if (p.hit && p.hit.type !== 'button') this.startMove(p, p.hit.station, false);
  }

  onSelectEnd(p) {
    if (this.grab && this.grab.pointer === p) this.endGrab();
  }

  // Punkt, an dem die Hand/der Controller "anfasst"
  nearPoint(p, out) {
    const j = p.hand?.joints;
    const a = j?.['index-finger-tip'], b = j?.['thumb-tip'];
    if (p.isHand && a && b && a.visible !== false) {
      return out.copy(a.getWorldPosition(_a)).add(b.getWorldPosition(_b)).multiplyScalar(0.5);
    }
    if (p.grip) return p.grip.getWorldPosition(out);
    return out.copy(p.origin);
  }

  // Station, deren Griff Hand oder Controller gerade direkt berührt (sonst null)
  nearHandle(p) {
    this.nearPoint(p, _near);
    let best = null, bestD = NEAR_GRAB;
    for (const st of this.stations) {
      if (!st.chart.visible) continue;
      const d = _near.distanceTo(st.chart.handle.getWorldPosition(_tmp));
      if (d < bestD) { best = st; bestD = d; }
    }
    return best;
  }

  startMove(p, st, near) {
    const chart = st.chart;
    this.onTouch(st);
    chart.updateMatrixWorld(true);
    p.object.updateMatrixWorld(true);
    // Versatz Zeiger -> Diagramm merken (starre Kopplung, nur Gierwinkel)
    const offset = new THREE.Matrix4().copy(p.object.matrixWorld).invert().multiply(chart.matrixWorld);
    this.grab = {
      pointer: p, chart, mode: 'move', near, offset,
      startTwist: this.twistAngle(p),
    };
    chart.spin = 0;
    chart.glide = null;
    chart.setHandleState('grab');
    chart.dismissHint();
    this.pulse(p, 0.6, 50);
  }

  startRing(p, st) {
    const chart = st.chart;
    const a = chart.ringAngle(p.origin, p.dir);
    if (a === null) return;
    this.grab = { pointer: p, chart, mode: 'ring', lastAngle: a, lastT: performance.now(), vel: 0 };
    chart.spin = 0;
    chart.glide = null;
    chart.dismissHint();
    this.pulse(p, 0.4, 30);
  }

  endGrab() {
    const g = this.grab;
    if (!g) return;
    if (g.mode === 'ring') g.chart.spin = THREE.MathUtils.clamp(g.vel, -4, 4);
    g.chart.setHandleState('idle');
    this.grab = null;
  }

  // Drehung des Handgelenks um die Zeigerachse (für Drehen beim Strahl-Greifen)
  twistAngle(p) {
    const m = p.object.matrixWorld;
    _fwd.set(0, 0, -1).transformDirection(m);
    _up.set(0, 1, 0).transformDirection(m);
    // Referenz: Welt-Oben auf Ebene senkrecht zum Strahl projiziert
    _ref.set(0, 1, 0).addScaledVector(_fwd, -_fwd.y);
    if (_ref.lengthSq() < 1e-6) return 0;
    _ref.normalize();
    _up.addScaledVector(_fwd, -_up.dot(_fwd)).normalize();
    const s = _tmp.crossVectors(_ref, _up).dot(_fwd);
    return Math.atan2(s, _ref.dot(_up));
  }

  updateGrab(dt) {
    const g = this.grab;
    const chart = g.chart;
    const p = g.pointer;
    p.object.updateMatrixWorld(true);

    if (g.mode === 'move') {
      _m.copy(p.object.matrixWorld).multiply(g.offset);
      _pos.setFromMatrixPosition(_m);
      _fwd.set(0, 0, 1).transformDirection(_m);
      let yaw = Math.atan2(_fwd.x, _fwd.z);
      if (!g.near) {
        // Beim Greifen aus der Distanz: Handgelenk drehen = Diagramm drehen
        let tw = this.twistAngle(p) - g.startTwist;
        tw = Math.atan2(Math.sin(tw), Math.cos(tw));
        yaw -= tw * 1.4;
      }
      // Nicht unter den Boden / nicht zu hoch
      _pos.y = THREE.MathUtils.clamp(_pos.y, 0.25, 2.2);
      const k = 1 - Math.exp(-dt * (p.isHand ? 14 : 22));
      chart.position.lerp(_pos, k);
      let dy = yaw - chart.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      chart.rotation.y += dy * k;
    } else if (g.mode === 'ring') {
      this.pointerRay(p);
      const a = chart.ringAngle(p.origin, p.dir);
      if (a !== null) {
        let d = a - g.lastAngle;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        // Ringwinkel ist lokal; Drehung des Diagramms verschiebt ihn um -d
        chart.rotation.y -= d;
        const now = performance.now();
        const dtS = Math.max(1e-3, (now - g.lastT) / 1000);
        g.vel = g.vel * 0.7 + (-d / dtS) * 0.3;
        g.lastT = now;
        g.lastAngle = chart.ringAngle(p.origin, p.dir) ?? a;
      }
    }
  }

  pulse(p, intensity, ms) {
    const act = p.source?.gamepad?.hapticActuators?.[0];
    try { act?.pulse?.(intensity, ms); } catch { /* nicht unterstützt */ }
  }

  update(dt) {
    const xrActive = this.renderer.xr.isPresenting;
    for (const st of this.stations) st.hover = { bar: -1, button: null, handle: false, ring: false };
    let anyHover = false;

    for (const p of this.pointers) {
      const active = p.kind === 'xr' ? xrActive && p.connected : !xrActive && p.hasPos?.();
      if (!active) {
        p.reticle.visible = false;
        p.hit = null;
        continue;
      }
      this.updatePointer(p);
      const hit = this.grab?.pointer === p ? null : p.hit;

      if (hit) {
        const h = hit.station.hover;
        if (hit.type === 'bar') h.bar = hit.index;
        if (hit.type === 'button') h.button = hit.id;
        if (hit.type === 'handle') h.handle = true;
        if (hit.type === 'ring') h.ring = true;
        anyHover = true;
      }
      if (p.kind === 'xr') {
        const near = this.nearHandle(p);
        if (near) near.hover.handle = true;
      }

      // Strahl & Zielmarke
      if (p.kind === 'xr') {
        const len = hit ? hit.t : p.isHand ? 0.3 : 0.6;
        p.ray.scale.set(1, 1, Math.max(0.01, len));
        p.ray.material.color.set(hit && hit.type !== 'bar' ? COLORS.accent : COLORS.glow);
        p.ray.material.opacity = hit ? 0.7 : 0.3;
        p.ray.visible = !this.grab || this.grab.pointer !== p || this.grab.mode === 'ring' ? true : !this.grab.near;
      }
      if (hit && p.kind === 'xr') {
        p.reticle.visible = true;
        p.reticle.position.copy(p.origin).addScaledVector(p.dir, hit.t - 0.002);
        p.reticle.lookAt(p.origin);
        const s = 0.6 + hit.t * 0.9;
        p.reticle.scale.setScalar(s);
      } else p.reticle.visible = false;

      // Controller-Stick: das angezielte Diagramm drehen
      const axes = p.source?.gamepad?.axes;
      if (axes && axes.length >= 4 && Math.abs(axes[2]) > 0.2 && !p.isHand && p.hit) {
        p.hit.station.chart.rotation.y -= axes[2] * dt * 1.6;
      }
    }

    if (this.grab) {
      this.updateGrab(dt);
      const h = this.stations.find((st) => st.chart === this.grab.chart)?.hover;
      if (h) { if (this.grab.mode === 'move') h.handle = true; else h.ring = true; }
    }

    for (const st of this.stations) {
      const h = st.hover;
      st.chart.setHover(h.bar);
      st.panel.setHover(h.button);
      if (this.grab?.chart !== st.chart) st.chart.setHandleState(h.handle ? 'hover' : 'idle');
      st.chart.setRingHover(h.ring);
    }

    // Mauszeiger am Desktop
    const el = this.renderer.domElement;
    const cursor = anyHover ? 'pointer' : '';
    if (el.style.cursor !== cursor) el.style.cursor = cursor;
  }
}

const _tmp = new THREE.Vector3();
const _near = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3();
const _ref = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _m = new THREE.Matrix4();
