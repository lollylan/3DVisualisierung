// Text im Raum: auf Canvas gezeichnet, als Textur auf eine Fläche gelegt.
// Keine zusätzliche Bibliothek nötig, scharf genug für 1–1,5 m Leseabstand.

import * as THREE from 'three';
import { COLORS, FONT } from './theme.js';

const PLANE = new THREE.PlaneGeometry(1, 1);
let maxAniso = 4;
export function setMaxAnisotropy(v) { maxAniso = Math.min(8, v || 4); }

function makeTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

// Frei zeichenbare Fläche mit fester Pixelgröße und Breite in Metern.
export class CanvasPanel extends THREE.Group {
  constructor(pxW, pxH, meterW, { depthTest = true, renderOrder = 0 } = {}) {
    super();
    this.canvas = document.createElement('canvas');
    this.canvas.width = pxW;
    this.canvas.height = pxH;
    this.ctx = this.canvas.getContext('2d');
    this.texture = makeTexture(this.canvas);
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture, transparent: true, depthWrite: false, depthTest, toneMapped: false,
    });
    this.mesh = new THREE.Mesh(PLANE, this.material);
    this.mesh.scale.set(meterW, (meterW * pxH) / pxW, 1);
    this.mesh.renderOrder = renderOrder;
    this.add(this.mesh);
    this.meterW = meterW;
    this.meterH = (meterW * pxH) / pxW;
    this.opacity = 1;
  }
  draw(fn) {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fn(ctx, canvas.width, canvas.height);
    this.texture.needsUpdate = true;
  }
  setOpacity(o) {
    this.opacity = o;
    this.material.opacity = o;
    this.visible = o > 0.002;
  }
}

// Einzeilige Beschriftung. `size` = Schriftgröße in Metern.
export class TextLabel extends THREE.Group {
  constructor(text, { size = 0.024, color = COLORS.ink, weight = 600, align = 'center', vAlign = 'middle', billboard = 'y', family = FONT.family } = {}) {
    super();
    this.opts = { size, color, weight, align, vAlign, family };
    this.billboard = billboard;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.texture = makeTexture(this.canvas);
    this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false, toneMapped: false });
    this.mesh = new THREE.Mesh(PLANE, this.material);
    this.add(this.mesh);
    this.fade = 1;
    this.fadeTarget = 1;
    this.pending = null;
    this.setText(text);
  }

  setText(text, color) {
    if (text === this.text && (!color || color === this.opts.color)) return;
    this.text = text;
    if (color) this.opts.color = color;
    const { size, weight, family, align, vAlign } = this.opts;
    const px = 88;
    const font = `${weight} ${px}px ${family}`;
    const ctx = this.ctx;
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + px * 0.5;
    const h = Math.ceil(px * 1.3);
    this.canvas.width = Math.max(4, w);
    this.canvas.height = h;
    ctx.font = font;
    ctx.fillStyle = this.opts.color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, this.canvas.width / 2, h / 2 + px * 0.04);
    this.texture.dispose();
    this.texture = makeTexture(this.canvas);
    this.material.map = this.texture;
    this.material.needsUpdate = true;

    const mPerPx = size / px;
    const mw = this.canvas.width * mPerPx;
    const mh = h * mPerPx;
    this.mesh.scale.set(mw, mh, 1);
    this.mesh.position.x = align === 'left' ? mw / 2 - px * 0.25 * mPerPx : align === 'right' ? -mw / 2 + px * 0.25 * mPerPx : 0;
    this.mesh.position.y = vAlign === 'top' ? -mh / 2 : vAlign === 'bottom' ? mh / 2 : 0;
    this.width = mw;
  }

  // Weicher Textwechsel: ausblenden, Text tauschen, einblenden
  transitionTo(text, color) {
    if (text === this.text && !this.pending) return;
    this.pending = { text, color };
    this.fadeTarget = 0;
  }

  show(on) { this.fadeTarget = on ? 1 : 0; }

  update(dt, cam) {
    const speed = 6;
    if (this.fade !== this.fadeTarget) {
      const d = this.fadeTarget - this.fade;
      this.fade += Math.sign(d) * Math.min(Math.abs(d), dt * speed);
    }
    if (this.pending && this.fade <= 0.001) {
      this.setText(this.pending.text, this.pending.color);
      this.pending = null;
      this.fadeTarget = 1;
    }
    this.material.opacity = this.fade;
    this.visible = this.fade > 0.002;
    if (this.visible && this.billboard && cam) faceCamera(this, cam, this.billboard);
  }
}

const _v = new THREE.Vector3();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qp = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);

// Dreht ein Objekt zur Kamera – 'y': nur um die Hochachse, 'full': vollständig.
export function faceCamera(obj, camPos, mode = 'y') {
  obj.getWorldPosition(_p);
  if (mode === 'y') {
    _v.set(camPos.x, _p.y, camPos.z);
  } else {
    _v.copy(camPos);
  }
  if (_v.distanceToSquared(_p) < 1e-6) return;
  _m.lookAt(_v, _p, _up);
  _q.setFromRotationMatrix(_m);
  // Welt-Rotation in lokale Rotation umrechnen
  if (obj.parent) {
    obj.parent.getWorldQuaternion(_qp);
    _q.premultiply(_qp.invert());
  }
  obj.quaternion.copy(_q);
}

// Hilfsfunktion: abgerundetes Rechteck
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Kleiner Trendpfeil (gezeichnet, kein Unicode)
export function drawTrendArrow(ctx, x, y, s, up, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  if (up) {
    ctx.moveTo(x, y - s * 0.55);
    ctx.lineTo(x + s * 0.5, y + s * 0.35);
    ctx.lineTo(x - s * 0.5, y + s * 0.35);
  } else {
    ctx.moveTo(x, y + s * 0.55);
    ctx.lineTo(x + s * 0.5, y - s * 0.35);
    ctx.lineTo(x - s * 0.5, y - s * 0.35);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
