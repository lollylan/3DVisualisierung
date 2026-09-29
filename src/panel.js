// Schwebende Buttons neben dem Diagramm (Ansicht umschalten + Werkzeuge).

import * as THREE from 'three';
import { CanvasPanel, roundRect } from './text.js';
import { COLORS, FONT } from './theme.js';

const PX_PER_M = 2800;

export class ButtonPanel extends THREE.Group {
  constructor(items) {
    super();
    this.name = 'buttons';
    this.buttons = [];
    this.active = null;
    this.hovered = null;
    this.fade = 1;
    this.raycaster = new THREE.Raycaster();

    let y = 0;
    let row = [];
    const flushRow = () => {
      if (!row.length) return;
      const gap = 0.01;
      const totalW = 0.24;
      const w = (totalW - gap * (row.length - 1)) / row.length;
      row.forEach((it, i) => this.addButton(it, -totalW / 2 + w / 2 + i * (w + gap), y, w, 0.046));
      y -= 0.046 + 0.012;
      row = [];
    };
    for (const it of items) {
      if (it.gap) { flushRow(); y -= it.gap; continue; }
      if (it.small) { row.push(it); continue; }
      flushRow();
      this.addButton(it, 0, y, 0.24, 0.056);
      y -= 0.056 + 0.012;
    }
    flushRow();
  }

  addButton(item, x, y, w, h) {
    const panel = new CanvasPanel(Math.round(w * PX_PER_M), Math.round(h * PX_PER_M), w);
    panel.position.set(x, y - h / 2, 0);
    panel.mesh.userData.buttonId = item.id;
    this.add(panel);
    const b = { ...item, panel, w, h, press: 0, state: '' };
    this.buttons.push(b);
    this.redraw(b);
  }

  setActive(id) {
    this.active = id;
    for (const b of this.buttons) this.redraw(b);
  }

  setHover(id) {
    if (id === this.hovered) return;
    this.hovered = id;
    for (const b of this.buttons) this.redraw(b);
  }

  press(id) {
    const b = this.buttons.find((x) => x.id === id);
    if (b) b.press = 1;
  }

  redraw(b) {
    const active = b.toggle === undefined ? b.id === this.active : !!b.toggle;
    const hover = b.id === this.hovered;
    const state = `${active}|${hover}|${b.label}`;
    if (state === b.state) return;
    b.state = state;
    b.panel.draw((ctx, w, h) => {
      const r = h * 0.3;
      ctx.fillStyle = active ? COLORS.panelActive : hover ? COLORS.panelHover : COLORS.panel;
      roundRect(ctx, 3, 3, w - 6, h - 6, r);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = hover ? 'rgba(228,138,82,0.95)' : active ? 'rgba(160,232,245,0.55)' : COLORS.panelEdge;
      ctx.stroke();

      const fs = b.small ? h * 0.36 : h * 0.4;
      ctx.font = `${active ? 700 : 600} ${fs}px ${FONT.family}`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = active || hover ? COLORS.ink : '#CFE7ED';
      if (b.small) {
        ctx.textAlign = 'center';
        ctx.fillText(b.label, w / 2, h / 2 + fs * 0.05);
      } else {
        ctx.textAlign = 'left';
        const dotX = h * 0.42;
        if (active) {
          ctx.fillStyle = COLORS.accent;
          ctx.beginPath();
          ctx.arc(dotX, h / 2, h * 0.085, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = COLORS.ink;
        }
        ctx.fillText(b.label, h * 0.72, h / 2 + fs * 0.05);
      }
    });
  }

  hitTest(origin, dir) {
    if (this.fade < 0.5) return null;
    this.raycaster.set(origin, dir);
    const hits = this.raycaster.intersectObjects(this.buttons.map((b) => b.panel.mesh), false);
    if (!hits.length) return null;
    return { type: 'button', id: hits[0].object.userData.buttonId, t: hits[0].distance };
  }

  setFade(f) {
    this.fade = f;
    for (const b of this.buttons) b.panel.setOpacity(f);
  }

  update(dt) {
    for (const b of this.buttons) {
      if (b.press > 0) b.press = Math.max(0, b.press - dt * 4);
      const push = Math.sin(b.press * Math.PI) * 0.012;
      b.panel.position.z = -push;
      const s = 1 - push * 1.5;
      b.panel.scale.set(s, s, 1);
    }
  }
}
