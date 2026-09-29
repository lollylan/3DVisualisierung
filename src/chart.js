// Das 3D-Säulendiagramm: Sockel, Balken (InstancedMesh), Achsen, Titel, Tooltip, Griff.
// Alle Maße in Metern. Lokaler Ursprung = Mitte der Sockeloberfläche.

import * as THREE from 'three';
import { createBarMaterial } from './barMaterial.js';
import { CanvasPanel, TextLabel, roundRect, drawTrendArrow, faceCamera } from './text.js';
import { COLORS, FONT } from './theme.js';

export const DIM = {
  pitchX: 0.07,
  maxH: 0.42,
  plateW: 0.9,
  plateD: 0.38,
  discR: 0.53,
  handleZ: 0.585,
};

const LAYOUTS = {
  months: { pitchZ: 0.11, w: 0.044, d: 0.064 },
  heatmap: { pitchZ: 0.066, w: 0.062, d: 0.058 },
};

const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// Pro Instanz: x, y0, z, w, h, d, r, g, b
const STRIDE = 9;

export class Chart extends THREE.Group {
  constructor(poolSize) {
    super();
    this.name = 'chart';
    this.poolSize = poolSize;
    this.model = null;
    this.selected = -1;
    this.hovered = -1;
    this.introT = -1; // <0: kein Intro aktiv
    this.spin = 0; // Drehimpuls vom Drehring (rad/s)

    this.buildBase();
    this.buildBars();
    this.buildAxes();
    this.buildTitle();
    this.buildTooltip();
    this.buildHandle();
    this.setIntroProgress(1);
  }

  // ---------- Aufbau ----------

  buildBase() {
    const g = new THREE.Group();
    this.baseGroup = g;
    this.add(g);

    // weicher Lichtschein unter dem Diagramm
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(46,176,202,0.55)');
    grd.addColorStop(0.55, 'rgba(20,110,132,0.18)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 256, 256);
    const glowTex = new THREE.CanvasTexture(c);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.5),
      new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
    );
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.y = -0.016;
    g.add(this.glow);

    this.disc = new THREE.Mesh(
      new THREE.CircleGeometry(DIM.discR, 96),
      new THREE.MeshBasicMaterial({ color: COLORS.base, transparent: true, opacity: 0.62, depthWrite: false, toneMapped: false })
    );
    this.disc.rotation.x = -Math.PI / 2;
    this.disc.position.y = -0.013;
    g.add(this.disc);

    // Drehring am Rand – dient zum Drehen des Diagramms
    this.ringMat = new THREE.MeshBasicMaterial({ color: COLORS.glow, transparent: true, opacity: 0.85, toneMapped: false, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(DIM.discR - 0.007, DIM.discR, 128), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = -0.011;
    g.add(this.ring);

    // Markierungen auf dem Ring (zeigen, dass er sich drehen lässt)
    const tickPos = [];
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const r0 = DIM.discR - 0.02, r1 = DIM.discR - 0.011;
      const long = i % 6 === 0;
      tickPos.push(Math.cos(a) * (long ? r0 - 0.008 : r0), -0.011, Math.sin(a) * (long ? r0 - 0.008 : r0), Math.cos(a) * r1, -0.011, Math.sin(a) * r1);
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(tickPos, 3));
    this.ringTicks = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: COLORS.glow, transparent: true, opacity: 0.4, toneMapped: false }));
    g.add(this.ringTicks);

    this.plate = new THREE.Mesh(
      new THREE.BoxGeometry(DIM.plateW, 0.01, DIM.plateD),
      new THREE.MeshBasicMaterial({ color: '#06303C', transparent: true, opacity: 0.82, toneMapped: false })
    );
    this.plate.position.y = -0.005;
    g.add(this.plate);

    // Gitter: Rückwand + linke Wand (Wertelinien) + Umriss des Sockels
    const pos = [];
    const hw = DIM.plateW / 2, hd = DIM.plateD / 2;
    for (let i = 0; i <= 5; i++) {
      const y = (i / 5) * DIM.maxH;
      pos.push(-hw, y, -hd, hw + 0.022, y, -hd);
      pos.push(-hw, y, -hd, -hw, y, hd);
    }
    pos.push(-hw, 0, -hd, -hw, DIM.maxH, -hd);
    pos.push(hw, 0, -hd, hw, DIM.maxH * 0.12, -hd);
    pos.push(-hw, 0, hd, -hw, DIM.maxH * 0.12, hd);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.gridMat = new THREE.LineBasicMaterial({ color: COLORS.grid, transparent: true, opacity: 0.32, depthWrite: false, toneMapped: false });
    this.grid = new THREE.LineSegments(lineGeo, this.gridMat);
    g.add(this.grid);

    const plateLines = [];
    const y = 0.0006;
    plateLines.push(-hw, y, -hd, hw, y, -hd, hw, y, -hd, hw, y, hd, hw, y, hd, -hw, y, hd, -hw, y, hd, -hw, y, -hd);
    for (let i = 1; i < 12; i++) {
      const x = (i - 6) * DIM.pitchX;
      plateLines.push(x, y, -hd, x, y, hd);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(plateLines, 3));
    this.plateLinesMat = new THREE.LineBasicMaterial({ color: COLORS.grid, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false });
    g.add(new THREE.LineSegments(pg, this.plateLinesMat));
  }

  buildBars() {
    const n = this.poolSize;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    this.colorAttr = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.glowAttr = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    this.colorAttr.setUsage(THREE.DynamicDrawUsage);
    this.glowAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aColor', this.colorAttr);
    geo.setAttribute('aGlow', this.glowAttr);

    this.bars = new THREE.InstancedMesh(geo, createBarMaterial(), n);
    this.bars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bars.frustumCulled = false;
    this.add(this.bars);

    this.cur = new Float32Array(n * STRIDE);
    this.from = new Float32Array(n * STRIDE);
    this.to = new Float32Array(n * STRIDE);
    this.delay = new Float32Array(n);
    this.glowCur = new Float32Array(n);
    this.cellOf = new Int32Array(n).fill(-1); // Instanz -> Zelle
    this.animT = 1e9;
    this.animDur = 0.85;
    this.animEase = easeInOutCubic;
    this.animDone = true;
    this.writeInstances();
  }

  buildAxes() {
    this.xLabels = [];
    this.zLabels = [];
    this.tickLabels = [];
    for (let i = 0; i < 16; i++) {
      const l = new TextLabel('', { size: 0.021, color: COLORS.inkMuted, weight: 600 });
      l.show(false);
      l.fade = 0;
      this.xLabels.push(l);
      this.add(l);
    }
    for (let i = 0; i < 8; i++) {
      // Zeilenbeschriftung liegt schräg auf dem Sockel – überlappt so nicht mit den Nachbarzeilen
      const l = new TextLabel('', { size: 0.028, color: COLORS.ink, weight: 700, align: 'left', billboard: false });
      l.rotation.x = -Math.PI * 0.36;
      l.show(false);
      l.fade = 0;
      this.zLabels.push(l);
      this.add(l);
    }
    for (let i = 0; i <= 5; i++) {
      const l = new TextLabel('', { size: 0.021, color: COLORS.inkMuted, weight: 600, align: 'left' });
      l.position.set(DIM.plateW / 2 + 0.03, (i / 5) * DIM.maxH, -DIM.plateD / 2);
      l.show(false);
      l.fade = 0;
      this.tickLabels.push(l);
      this.add(l);
    }
  }

  buildTitle() {
    this.title = new CanvasPanel(1600, 300, 0.8);
    this.title.position.set(-DIM.plateW / 2 + 0.4, DIM.maxH + 0.105, -DIM.plateD / 2);
    this.titleFade = 0;
    this.titleTarget = 1;
    this.titlePending = null;
    this.add(this.title);
  }

  buildTooltip() {
    this.tip = new CanvasPanel(640, 290, 0.28, { depthTest: false, renderOrder: 20 });
    this.tip.setOpacity(0);
    this.tipFade = 0;
    this.add(this.tip);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 0], 3));
    this.leader = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: COLORS.accent, transparent: true, opacity: 0, depthTest: false, toneMapped: false }));
    this.leader.renderOrder = 19;
    this.leader.frustumCulled = false;
    this.add(this.leader);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 16, 12), new THREE.MeshBasicMaterial({ color: COLORS.accent, transparent: true, opacity: 0, depthTest: false, toneMapped: false }));
    dot.renderOrder = 19;
    this.leaderDot = dot;
    this.add(dot);
  }

  buildHandle() {
    const geo = new THREE.CapsuleGeometry(0.012, 0.16, 6, 16);
    geo.rotateZ(Math.PI / 2);
    this.handleMat = new THREE.MeshBasicMaterial({ color: COLORS.glow, transparent: true, opacity: 0.9, toneMapped: false });
    this.handle = new THREE.Mesh(geo, this.handleMat);
    this.handle.position.set(0, -0.012, DIM.handleZ);
    this.add(this.handle);
    this.handleState = 'idle';
    this.handleScale = 1;

    this.hint = new TextLabel('Hier greifen: verschieben & drehen', { size: 0.017, color: COLORS.inkMuted, weight: 500 });
    this.hint.position.set(0, -0.05, DIM.handleZ);
    this.hint.fade = 0;
    this.hint.show(false);
    this.add(this.hint);
    this.hintUntil = 0;
  }

  // ---------- Ansichten ----------

  layoutPos(model, cell) {
    const L = LAYOUTS[model.layout];
    const nx = model.xLabels.length;
    const nz = model.zLabels.length;
    const x = (cell.x - (nx - 1) / 2) * DIM.pitchX;
    const z = (nz - 1 - cell.z - (nz - 1) / 2) * L.pitchZ;
    return { x, z, L };
  }

  setView(model, { instant = false } = {}) {
    const prevLayout = this.model?.layout;
    this.model = model;
    const n = this.poolSize;
    const cells = model.cells;
    const nc = cells.length;

    // Ausgangszustand = aktueller Zustand
    this.from.set(this.cur);
    // Ziel: Standard = in sich zusammenfallen
    for (let i = 0; i < n; i++) {
      const o = i * STRIDE;
      this.to.set(this.cur.subarray(o, o + STRIDE), o);
      this.to[o + 4] = 0;
      this.cellOf[i] = -1;
    }

    const tmp = new THREE.Color();
    cells.forEach((cell, ci) => {
      const { x, z, L } = this.layoutPos(model, cell);
      let y0 = 0;
      cell.segments.forEach((seg, si) => {
        const i = si * nc + ci;
        if (i >= n) return;
        const o = i * STRIDE;
        const h = Math.max(0, (seg.value / model.axisMax) * DIM.maxH);
        if (seg.heat !== undefined) heatColor(seg.heat, tmp);
        else tmp.set(seg.color);
        this.to[o] = x; this.to[o + 1] = y0; this.to[o + 2] = z;
        this.to[o + 3] = L.w; this.to[o + 4] = h; this.to[o + 5] = L.d;
        this.to[o + 6] = tmp.r; this.to[o + 7] = tmp.g; this.to[o + 8] = tmp.b;
        this.cellOf[i] = ci;
        y0 += h;
      });
    });

    // Instanzen ohne Zelle behalten Farbe/Position und schrumpfen; Breite von Nachbarn
    for (let i = 0; i < n; i++) {
      if (this.cellOf[i] >= 0) continue;
      const o = i * STRIDE;
      if (this.from[o + 3] === 0) { // noch nie benutzt
        const L = LAYOUTS[model.layout];
        this.from[o + 3] = this.to[o + 3] = L.w;
        this.from[o + 5] = this.to[o + 5] = L.d;
      }
    }

    // Staffelung: Welle von links nach rechts
    const layoutChange = prevLayout && prevLayout !== model.layout;
    for (let i = 0; i < n; i++) {
      const o = i * STRIDE;
      const xn = (this.to[o] + DIM.plateW / 2) / DIM.plateW;
      this.delay[i] = clamp01(xn) * (layoutChange ? 0.45 : 0.28) + (i % 3) * 0.015;
    }
    this.animDur = layoutChange ? 1.0 : 0.85;
    this.animEase = easeInOutCubic;
    this.animT = instant ? 1e9 : 0;
    this.animDone = false;

    this.updateAxes(model, !this.hasShownAxes);
    this.setTitle(model);
    if (this.selected >= 0 && (this.selected >= nc || layoutChange)) this.select(-1);
    else if (this.selected >= 0) this.drawTooltip();
  }

  // Intro: Balken wachsen gestaffelt aus dem Sockel (ca. 1,5 s)
  playIntro() {
    this.introT = 0;
    this.setIntroProgress(0);
    const n = this.poolSize;
    for (let i = 0; i < n; i++) {
      const o = i * STRIDE;
      this.from.set(this.to.subarray(o, o + STRIDE), o);
      this.from[o + 4] = 0;
      this.from[o + 1] = 0;
      const ci = this.cellOf[i];
      const cell = ci >= 0 ? this.model.cells[ci] : null;
      const seg = i >= this.model.cells.length ? 1 : 0;
      this.delay[i] = cell ? 0.35 + cell.x * 0.045 + cell.z * 0.1 + seg * 0.12 : 0;
    }
    this.cur.set(this.from);
    this.animT = 0;
    this.animDur = 0.8;
    this.animEase = easeOutExpo;
    this.animDone = false;
    this.select(-1);
    for (const l of [...this.xLabels, ...this.zLabels, ...this.tickLabels]) l.fade = 0;
    this.hasShownAxes = false;
    this.titleFade = 0;
    this.hintUntil = 16;
    this.writeInstances();
  }

  setIntroProgress(p) {
    this.introP = p;
    const e = easeOutExpo(clamp01(p / 0.4));
    const s = 0.2 + 0.8 * e;
    this.baseGroup.scale.set(s, 1, s);
    this.disc.material.opacity = 0.62 * e;
    this.ringMat.opacity = 0.85 * e;
    this.ringTicks.material.opacity = 0.4 * e;
    this.glow.material.opacity = e;
    const f = clamp01((p - 0.15) / 0.35);
    this.plate.material.opacity = 0.82 * f;
    this.gridMat.opacity = 0.32 * f;
    this.plateLinesMat.opacity = 0.22 * f;
    this.handleMat.opacity = 0.9 * f;
  }

  updateAxes(model, hidden) {
    const L = LAYOUTS[model.layout];
    const nx = model.xLabels.length;
    const nz = model.zLabels.length;
    this.xLabels.forEach((l, i) => {
      if (i < nx) {
        l.position.set((i - (nx - 1) / 2) * DIM.pitchX, 0.012, DIM.plateD / 2 + 0.03);
        if (hidden) { l.setText(model.xLabels[i]); l.show(false); } else { l.transitionTo(model.xLabels[i]); }
      } else l.show(false);
    });
    this.zLabels.forEach((l, i) => {
      if (i < nz) {
        l.position.set(DIM.plateW / 2 + 0.035, 0.004, (nz - 1 - i - (nz - 1) / 2) * L.pitchZ);
        if (hidden) { l.setText(model.zLabels[i], model.zColors[i]); l.show(false); } else l.transitionTo(model.zLabels[i], model.zColors[i]);
      } else l.show(false);
    });
    this.tickLabels.forEach((l, i) => {
      const t = model.ticks[i];
      if (hidden) { l.setText(t.text); l.show(false); } else if (i > 0) l.transitionTo(t.text);
    });
  }

  showAxes() {
    this.hasShownAxes = true;
    const m = this.model;
    this.xLabels.forEach((l, i) => l.show(i < m.xLabels.length));
    this.zLabels.forEach((l, i) => l.show(i < m.zLabels.length));
    this.tickLabels.forEach((l, i) => l.show(i > 0));
  }

  setTitle(model) {
    this.titlePending = model;
    this.titleTarget = 0;
  }

  drawTitle(model) {
    this.title.draw((ctx, w, h) => {
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = COLORS.ink;
      ctx.font = `700 104px ${FONT.family}`;
      ctx.fillText(model.title, 8, 118);
      ctx.fillStyle = COLORS.inkMuted;
      ctx.font = `500 50px ${FONT.family}`;
      ctx.fillText(model.subtitle, 10, 196);
      let x = 10;
      if (model.legend) {
        ctx.font = `600 48px ${FONT.family}`;
        for (const item of model.legend) {
          ctx.fillStyle = item.color;
          roundRect(ctx, x, 234, 40, 40, 8);
          ctx.fill();
          ctx.fillStyle = COLORS.ink;
          ctx.fillText(item.name, x + 56, 270);
          x += 56 + ctx.measureText(item.name).width + 48;
        }
      }
    });
  }

  // ---------- Auswahl & Tooltip ----------

  select(ci) {
    if (ci === this.selected) ci = -1;
    this.selected = ci;
    if (ci >= 0) this.drawTooltip();
  }

  setHover(ci) { this.hovered = ci; }

  drawTooltip() {
    const cell = this.model.cells[this.selected];
    if (!cell) return;
    const info = cell.tooltip();
    this.tip.draw((ctx, w, h) => {
      const pad = 30;
      ctx.fillStyle = COLORS.panel;
      roundRect(ctx, 3, 3, w - 6, h - 6, 28);
      ctx.fill();
      ctx.strokeStyle = 'rgba(228,138,82,0.75)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = COLORS.inkMuted;
      ctx.font = `600 38px ${FONT.family}`;
      ctx.fillText(info.heading, pad, 64);
      ctx.fillStyle = COLORS.ink;
      ctx.font = `700 78px ${FONT.family}`;
      ctx.fillText(info.value, pad - 2, 146);

      let y = 200;
      for (const line of info.lines.slice(0, 2)) {
        ctx.font = `600 34px ${FONT.family}`;
        if (line.chips) {
          let x = pad;
          for (const chip of line.chips) {
            ctx.fillStyle = chip.color;
            roundRect(ctx, x, y - 26, 26, 26, 6);
            ctx.fill();
            ctx.fillStyle = COLORS.ink;
            ctx.fillText(chip.text, x + 38, y);
            x += 38 + ctx.measureText(chip.text).width + 34;
          }
        } else if (line.trend !== undefined) {
          const up = line.trend >= 0;
          const col = up ? COLORS.glow : COLORS.accent;
          drawTrendArrow(ctx, pad + 12, y - 12, 24, up, col);
          ctx.fillStyle = col;
          ctx.fillText(line.text, pad + 38, y);
        } else {
          ctx.fillStyle = line.muted ? COLORS.inkFaint : COLORS.ink;
          ctx.font = `500 32px ${FONT.family}`;
          ctx.fillText(line.text, pad, y);
        }
        y += 50;
      }
    });
  }

  // Oberkante einer Zelle (lokal), aus dem aktuellen Animationszustand
  cellTop(ci, out) {
    const nc = this.model.cells.length;
    let top = 0, x = 0, z = 0;
    for (let s = 0; s < 2; s++) {
      const i = s * nc + ci;
      if (i >= this.poolSize || this.cellOf[i] !== ci) continue;
      const o = i * STRIDE;
      x = this.cur[o]; z = this.cur[o + 2];
      top = Math.max(top, this.cur[o + 1] + this.cur[o + 4]);
    }
    return out.set(x, top, z);
  }

  // ---------- Treffer-Tests (Strahl in Weltkoordinaten) ----------

  toLocalRay(origin, dir) {
    this.updateWorldMatrix(true, false);
    _inv.copy(this.matrixWorld).invert();
    _o.copy(origin).applyMatrix4(_inv);
    _d.copy(dir).transformDirection(_inv);
    return { o: _o, d: _d };
  }

  hitTest(origin, dir) {
    const { o, d } = this.toLocalRay(origin, dir);
    let best = null;

    // Griff (großzügige Box)
    const hz = DIM.handleZ;
    const th = rayBox(o, d, -0.13, -0.05, hz - 0.05, 0.13, 0.03, hz + 0.05);
    if (th !== null) best = { type: 'handle', t: th };

    // Balken (leicht vergrößerte Boxen = leichter zu treffen)
    if (this.model && this.introT < 0) {
      const pad = 0.006;
      const n = this.poolSize;
      for (let i = 0; i < n; i++) {
        const ci = this.cellOf[i];
        if (ci < 0) continue;
        const k = i * STRIDE;
        const h = this.cur[k + 4];
        if (h < 0.002) continue;
        const x = this.cur[k], y0 = this.cur[k + 1], z = this.cur[k + 2];
        const hw = this.cur[k + 3] / 2 + pad, hd = this.cur[k + 5] / 2 + pad;
        const t = rayBox(o, d, x - hw, y0, z - hd, x + hw, y0 + h + pad, z + hd);
        if (t !== null && (!best || t < best.t)) best = { type: 'bar', index: ci, t };
      }
    }

    // Drehring: Schnitt mit der Sockelebene
    if (Math.abs(d.y) > 1e-4) {
      const t = (-0.011 - o.y) / d.y;
      if (t > 0) {
        const px = o.x + d.x * t, pz = o.z + d.z * t;
        const r = Math.hypot(px, pz);
        if (Math.abs(r - DIM.discR) < 0.045 && (!best || t < best.t)) best = { type: 'ring', t, angle: Math.atan2(pz, px) };
      }
    }
    return best;
  }

  // Winkel auf der Sockelebene (für Drehring-Ziehen)
  ringAngle(origin, dir) {
    const { o, d } = this.toLocalRay(origin, dir);
    if (Math.abs(d.y) < 1e-4) return null;
    const t = (-0.011 - o.y) / d.y;
    if (t <= 0) return null;
    return Math.atan2(o.z + d.z * t, o.x + d.x * t);
  }

  setHandleState(state) { this.handleState = state; }
  setRingHover(on) { this.ringHover = on; }

  // ---------- Pro Frame ----------

  update(dt, camPos) {
    // Intro-Fortschritt (Sockel, Linien)
    if (this.introT >= 0) {
      this.introT += dt;
      this.setIntroProgress(clamp01(this.introT / 1.1));
      if (this.introT > 1.2 && !this.hasShownAxes) this.showAxes();
      if (this.introT > 1.7) this.introT = -1;
    } else if (!this.hasShownAxes && this.model) {
      this.showAxes();
    }

    // Balken animieren
    if (!this.animDone) {
      this.animT += dt;
      let done = true;
      const n = this.poolSize;
      for (let i = 0; i < n; i++) {
        const t = clamp01((this.animT - this.delay[i]) / this.animDur);
        if (t < 1) done = false;
        const e = this.animEase(t);
        const o = i * STRIDE;
        for (let k = 0; k < STRIDE; k++) this.cur[o + k] = this.from[o + k] + (this.to[o + k] - this.from[o + k]) * e;
      }
      this.animDone = done;
      this.writeInstances();
    }

    // Glühen für Auswahl/Hover
    let glowChanged = false;
    const n = this.poolSize;
    for (let i = 0; i < n; i++) {
      const ci = this.cellOf[i];
      const target = ci >= 0 && ci === this.selected ? 1 : ci >= 0 && ci === this.hovered ? 0.45 : 0;
      const g = this.glowCur[i];
      if (Math.abs(g - target) > 0.001) {
        this.glowCur[i] = g + (target - g) * Math.min(1, dt * 14);
        glowChanged = true;
      }
    }
    if (glowChanged) {
      this.glowAttr.array.set(this.glowCur);
      this.glowAttr.needsUpdate = true;
    }

    // Titel überblenden
    if (this.titlePending && this.titleFade <= 0.001) {
      this.drawTitle(this.titlePending);
      this.titlePending = null;
      this.titleTarget = 1;
    }
    const titleGate = this.introT >= 0 ? clamp01((this.introT - 0.6) / 0.4) : 1;
    this.titleFade = approach(this.titleFade, this.titleTarget, dt * 5);
    this.title.setOpacity(this.titleFade * titleGate);

    // Beschriftungen
    for (const l of this.xLabels) l.update(dt, camPos);
    for (const l of this.zLabels) l.update(dt, camPos);
    for (const l of this.tickLabels) l.update(dt, camPos);

    // Tooltip folgt der Balkenoberkante
    const showTip = this.selected >= 0;
    this.tipFade = approach(this.tipFade, showTip ? 1 : 0, dt * 7);
    this.tip.setOpacity(this.tipFade);
    this.leader.material.opacity = this.tipFade * 0.9;
    this.leaderDot.material.opacity = this.tipFade;
    if (this.selected >= 0 || this.tipFade > 0) {
      if (this.selected >= 0) this.cellTop(this.selected, this.tipAnchor || (this.tipAnchor = new THREE.Vector3()));
      const a = this.tipAnchor;
      if (a) {
        const lift = 0.07;
        this.tip.position.set(a.x, a.y + lift + this.tip.meterH / 2, a.z);
        faceCamera(this.tip, camPos, 'y');
        const p = this.leader.geometry.attributes.position;
        p.setXYZ(0, a.x, a.y + 0.004, a.z);
        p.setXYZ(1, a.x, a.y + lift, a.z);
        p.needsUpdate = true;
        this.leaderDot.position.set(a.x, a.y + 0.004, a.z);
      }
    }

    // Griff & Ring
    const hs = this.handleState;
    const targetScale = hs === 'grab' ? 1.25 : hs === 'hover' ? 1.15 : 1;
    this.handleScale = approach(this.handleScale, targetScale, dt * 4);
    this.handle.scale.setScalar(this.handleScale);
    this.handleMat.color.set(hs === 'idle' ? COLORS.glow : COLORS.accent);
    this.ringMat.color.set(this.ringHover ? COLORS.accent : COLORS.glow);
    this.ringTicks.material.color.set(this.ringHover ? COLORS.accent : COLORS.glow);

    // Hinweis unter dem Griff
    if (this.hintUntil > 0) {
      this.hintUntil -= dt;
      this.hint.show(this.hintUntil > 0 && this.introT < 0);
    } else this.hint.show(false);
    this.hint.update(dt, camPos);

    // Drehimpuls vom Ring
    if (Math.abs(this.spin) > 0.001) {
      this.rotation.y += this.spin * dt;
      this.spin *= Math.exp(-dt * 2.2);
    }
  }

  dismissHint() { this.hintUntil = 0; }

  writeInstances() {
    const n = this.poolSize;
    const col = this.colorAttr.array;
    for (let i = 0; i < n; i++) {
      const o = i * STRIDE;
      const h = this.cur[o + 4];
      if (h < 0.0004) {
        _m4.makeScale(0, 0, 0);
      } else {
        _m4.makeScale(this.cur[o + 3], h, this.cur[o + 5]);
        _m4.setPosition(this.cur[o], this.cur[o + 1], this.cur[o + 2]);
      }
      this.bars.setMatrixAt(i, _m4);
      col[i * 3] = this.cur[o + 6];
      col[i * 3 + 1] = this.cur[o + 7];
      col[i * 3 + 2] = this.cur[o + 8];
    }
    this.bars.instanceMatrix.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
  }
}

function approach(v, target, step) {
  const d = target - v;
  return Math.abs(d) <= step ? target : v + Math.sign(d) * step;
}

// Heatmap: Petrol-Verlauf, Stoßzeiten (oberes Viertel) in Kupfer – ohne graue Mischtöne
const _heat = [new THREE.Color(COLORS.heatLow), new THREE.Color(COLORS.heatMid), new THREE.Color(COLORS.heatHot), new THREE.Color(COLORS.heatHigh)];
const HOT = 0.75;
function heatColor(t, out) {
  if (t < HOT) return out.copy(_heat[0]).lerp(_heat[1], t / HOT);
  return out.copy(_heat[2]).lerp(_heat[3], (t - HOT) / (1 - HOT));
}

// Strahl-Box-Schnitt (Slab-Methode). Liefert Abstand oder null.
function rayBox(o, d, x0, y0, z0, x1, y1, z1) {
  let tmin = -Infinity, tmax = Infinity;
  const lo = [x0, y0, z0], hi = [x1, y1, z1], oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(dd[a]) < 1e-9) {
      if (oo[a] < lo[a] || oo[a] > hi[a]) return null;
    } else {
      let t1 = (lo[a] - oo[a]) / dd[a], t2 = (hi[a] - oo[a]) / dd[a];
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  if (tmax < 0) return null;
  return Math.max(0, tmin);
}

const _inv = new THREE.Matrix4();
const _o = new THREE.Vector3();
const _d = new THREE.Vector3();
const _m4 = new THREE.Matrix4();
