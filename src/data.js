// Lädt data.json und baut aus Ansichts-Definitionen (siehe stations.js) die Modelle,
// die ein Diagramm darstellt. Eigene Daten: nur data.json austauschen – Format siehe README.

import { COLORS, fmt, MONTHS_LONG, MONTHS_SHORT, DAYS_LONG } from './theme.js';

export async function loadData(url = './data.json') {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`data.json konnte nicht geladen werden (HTTP ${res.status})`);
  const raw = await res.json();
  return normalize(raw);
}

function normalize(raw) {
  const monthly = Array.isArray(raw.monthly) ? raw.monthly : [];
  const years = (raw.years && raw.years.length ? raw.years : [...new Set(monthly.map((r) => r.year))])
    .map(Number)
    .sort((a, b) => a - b);
  if (!years.length) throw new Error('data.json enthält keine Monatswerte ("monthly").');

  const byKey = new Map();
  for (const r of monthly) byKey.set(`${r.year}-${r.month}`, r);
  const fields = new Set();
  for (const r of monthly) for (const k of Object.keys(r)) if (typeof r[k] === 'number') fields.add(k);

  const params = new URLSearchParams(location.search);
  let indexMode = !!raw.settings?.indexMode;
  if (params.has('index')) indexMode = params.get('index') !== '0';

  const heat = raw.heatmap && Array.isArray(raw.heatmap.values) ? raw.heatmap : null;
  const age = raw.altersstruktur && Array.isArray(raw.altersstruktur.jahre) && raw.altersstruktur.gruppen ? raw.altersstruktur : null;
  const fallwerte = raw.fallwerte && Array.isArray(raw.fallwerte.jahre) && raw.fallwerte.kassen ? raw.fallwerte : null;
  const benchmark = raw.benchmark && Array.isArray(raw.benchmark.reihen) && raw.benchmark.felder ? raw.benchmark : null;

  return {
    meta: raw.meta || {},
    indexMode,
    years,
    record: (year, month) => byKey.get(`${year}-${month}`) || null,
    has: (field) => fields.has(field),
    heatmap: heat,
    altersstruktur: age,
    fallwerte,
    benchmark,
  };
}

// ---------- Hilfen ----------

export const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
export const sum = (a) => a.reduce((x, y) => x + y, 0);

export function niceScale(max, count = 5) {
  if (!(max > 0)) return { max: count, step: 1 };
  const raw = (max * 1.03) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const step = mag * steps.find((s) => s * mag >= raw - 1e-9);
  return { max: step * count, step };
}

// Farbe einer Datenreihe (Slot 0–3) für ein Jahr: ältestes Jahr am dunkelsten
export function seriesColor(slot, yi, n) {
  const pal = COLORS.series[slot] || COLORS.series[0];
  return pal[Math.max(0, pal.length - n + yi)];
}
export const legendColor = (slot) => (COLORS.series[slot] || COLORS.series[0])[2];

function axis(max, tick, fixed) {
  const ns = fixed || niceScale(max);
  const ticks = [];
  for (let i = 0; i <= 5; i++) ticks.push({ value: ns.step * i, text: tick(ns.step * i) });
  return { axisMax: ns.max, ticks };
}

// Vergleichszeile zum Vorjahr. kind: 'percent' (relativ), 'points' (Prozentpunkte), 'abs' (mit eigener Einheit)
export function trendLine(cur, prev, { kind = 'percent', label = '', unit = '' } = {}) {
  const pre = label ? `${label} ` : '';
  if (kind === 'points') { const d = cur - prev; return { trend: d, text: `${pre}${fmt.signedPoints(d)} zum Vorjahr` }; }
  if (kind === 'abs') { const d = cur - prev; return { trend: d, text: `${pre}${fmt.signedNum(d)} ${unit} zum Vorjahr` }; }
  if (!(prev > 0)) return null;
  const d = (cur / prev - 1) * 100;
  return { trend: d, text: `${pre}${fmt.signedPercent(d)} zum Vorjahr` };
}

// Chips (Farbfeld + Text), höchstens `perLine` je Zeile
export function chipLines(items, perLine = 2) {
  const lines = [];
  for (let i = 0; i < items.length; i += perLine) lines.push({ chips: items.slice(i, i + perLine) });
  return lines;
}

// ---------- Ansichten bauen ----------

export function viewAvailable(data, view) {
  if (view.available) return view.available(data);
  return (view.requires || []).every((f) => data.has(f));
}

export function buildView(data, view) {
  if (view.layout === 'heatmap') return buildHeatmap(data, view);
  if (view.build) return finishModel(view, view.build(data));
  return buildMonths(data, view);
}

// Gemeinsamer Abschluss für frei gebaute Modelle (Kategorien × Jahre)
function finishModel(view, m) {
  return {
    id: view.id,
    title: view.title,
    subtitle: view.subtitle,
    legend: m.legend || null,
    layout: view.layout || 'categories',
    xLabels: m.xLabels,
    zLabels: m.zLabels,
    zColors: m.zColors,
    ...axis(m.max, view.tick, m.scale),
    cells: m.cells,
  };
}

// Monate × Jahre, je Zelle 1–4 gestapelte Segmente
function buildMonths(data, view) {
  const { years } = data;
  const n = years.length;
  const indexMode = data.indexMode && view.indexable;

  let base = 1;
  if (indexMode) {
    const vals = [];
    for (let m = 1; m <= 12; m++) {
      const r = data.record(years[0], m);
      if (r) vals.push(sum(view.segments(r)));
    }
    base = vals.length ? sum(vals) / vals.length / 100 : 1;
  }
  const format = indexMode ? (v) => `${fmt.one(v)} %` : view.format;
  const tick = indexMode ? (v) => `${fmt.int(v)} %` : view.tick;
  const slots = view.slots || [0, 1, 2, 3];
  // Reihenfolge der Jahre in der Tiefe: normal das älteste vorne; bei fallenden Werten das aktuelle
  const order = (a) => (view.latestFront ? [...a].reverse() : a);

  const cells = [];
  let max = 0;
  years.forEach((year, yi) => {
    for (let m = 1; m <= 12; m++) {
      const r = data.record(year, m);
      const segs = r ? view.segments(r).map((v) => Math.max(0, v / base)) : [];
      max = Math.max(max, sum(segs));
      cells.push({
        x: m - 1,
        z: view.latestFront ? n - 1 - yi : yi,
        segments: segs.map((v, si) => ({ value: v, color: seriesColor(slots[si], yi, n) })),
        tooltip: () => monthTooltip(data, view, year, m, format, base),
      });
    }
  });

  return {
    id: view.id,
    title: view.title + (indexMode ? ' (Index)' : ''),
    subtitle: indexMode ? `Index, Ø ${years[0]} = 100 %` : `${view.subtitle}, ${years[0]}–${years[n - 1]}`,
    legend: view.names ? view.names.map((name, i) => ({ name, color: legendColor(slots[i]) })) : null,
    layout: 'months',
    xLabels: MONTHS_SHORT,
    zLabels: order(years.map(String)),
    zColors: order(years.map((_, yi) => seriesColor(slots[0], yi, n))),
    ...axis(max, tick),
    cells,
  };
}

function monthTooltip(data, view, year, m, format, base) {
  const r = data.record(year, m);
  const heading = `${MONTHS_LONG[m - 1]} ${year}${view.headingSuffix ? ` · ${view.headingSuffix}` : ''}`;
  if (!r) return { heading, value: 'keine Daten', lines: [] };

  const segs = view.segments(r);
  const total = sum(segs);
  const prev = data.record(year - 1, m);
  const slots = view.slots || [0, 1, 2, 3];
  let lines = [];

  // Aufteilung der Segmente
  if (view.names && view.chips !== false) {
    const items = segs.map((v, i) => ({
      color: legendColor(slots[i]),
      text: `${(view.short || view.names)[i]} ${view.chips === 'value' ? (view.chipFormat || fmt.int)(v) : fmt.int(total > 0 ? (v / total) * 100 : 0) + ' %'}`,
    }));
    lines.push(...chipLines(items, view.chipsPerLine || 2));
  }
  if (view.lines) lines.push(...view.lines(r, prev, data).filter(Boolean));

  if (prev) {
    const cmp = view.compare || {};
    const pick = cmp.of || sum;
    const t = trendLine(pick(segs, r), pick(view.segments(prev), prev), cmp);
    if (t) lines.push(t);
    // Vorjahreswert, wenn noch Platz ist
    if (!cmp.kind && !view.names && lines.length < 3) {
      const pv = sum(view.segments(prev)) / base;
      lines.push({ muted: true, text: `${MONTHS_SHORT[m - 1]} ${year - 1}: ${format(pv)}` });
    }
  } else if (lines.length < 3) {
    lines.push({ muted: true, text: 'Erstes Jahr – kein Vorjahreswert' });
  }

  return { heading, value: (view.valueText || format)(total / base, r), lines };
}

// Wochentag × Uhrzeit
function buildHeatmap(data, view) {
  const h = data.heatmap;
  const days = h.days;
  const hours = h.hours;
  let max = 0;
  for (const row of h.values) for (const v of row) max = Math.max(max, num(v));

  let peak = { v: -1 };
  h.values.forEach((row, di) => row.forEach((v, hi) => { if (num(v) > peak.v) peak = { v: num(v), di, hi }; }));

  const cells = [];
  days.forEach((day, di) => {
    hours.forEach((hour, hi) => {
      const v = num(h.values[di]?.[hi]);
      cells.push({
        x: hi,
        z: di,
        segments: [{ value: v, color: null, heat: max > 0 ? v / max : 0 }],
        tooltip: () => ({
          heading: `${DAYS_LONG[day] || day}, ${hour}–${hour + 1} Uhr`,
          value: `${fmt.one(v)} Kontakte`,
          lines: [
            { muted: true, text: h.unit || 'Ø pro Woche' },
            ...(peak.di === di && peak.hi === hi ? [{ trend: 1, text: 'Spitzenstunde der Woche' }] : []),
          ],
        }),
      });
    });
  });

  return {
    id: view.id,
    title: h.title || view.title,
    subtitle: view.subtitle,
    legend: null,
    layout: 'heatmap',
    xLabels: hours.map((x, i) => (i === hours.length - 1 ? `${x} Uhr` : `${x}`)),
    zLabels: days,
    zColors: days.map(() => COLORS.inkMuted),
    ...axis(max, fmt.int),
    cells,
  };
}
