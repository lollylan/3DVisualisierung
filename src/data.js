// Lädt data.json und baut daraus die Ansichten (Views), die das Diagramm darstellt.
// Wer eigene Daten einspielen will, muss nur data.json austauschen – Format siehe README.

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

  const params = new URLSearchParams(location.search);
  let indexMode = !!raw.settings?.indexMode;
  if (params.has('index')) indexMode = params.get('index') !== '0';

  const heat = raw.heatmap && Array.isArray(raw.heatmap.values) ? raw.heatmap : null;

  return {
    meta: raw.meta || {},
    indexMode,
    years,
    record: (year, month) => byKey.get(`${year}-${month}`) || null,
    heatmap: heat,
  };
}

// ---------- Ansichten ----------

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
const total = (r) => num(r.umsatz_hzv) + num(r.umsatz_kv) + num(r.umsatz_privat);

// Monatsansichten: Jede liefert pro Monat 1–2 Segmente (gestapelt).
export const MONTH_VIEWS = [
  {
    id: 'umsatz',
    label: 'Umsatz gesamt',
    title: 'Umsatz gesamt',
    subtitle: 'Euro pro Monat',
    segments: (r) => [total(r)],
    format: fmt.euro,
    tick: fmt.kEuro,
  },
  {
    id: 'scheine',
    label: 'Scheinzahlen',
    title: 'Scheinzahlen',
    subtitle: 'Behandlungsfälle pro Monat',
    segments: (r) => [num(r.scheine)],
    format: (v) => `${fmt.int(v)} Scheine`,
    tick: fmt.int,
  },
  {
    id: 'hzv',
    label: 'HZV vs. KV',
    title: 'Anteil HZV vs. KV',
    subtitle: 'Umsatz nach Abrechnungsweg',
    segments: (r) => [num(r.umsatz_hzv), num(r.umsatz_kv)],
    segmentNames: ['HZV', 'KV'],
    format: fmt.euro,
    tick: fmt.kEuro,
  },
  {
    id: 'fallwert',
    label: 'Umsatz je Schein',
    title: 'Umsatz je Schein',
    subtitle: 'Euro pro Behandlungsfall',
    segments: (r) => [num(r.scheine) > 0 ? total(r) / r.scheine : 0],
    format: (v) => `${fmt.one(v)} €`,
    tick: (v) => `${fmt.int(v)} €`,
  },
];

export const HEATMAP_VIEW = {
  id: 'heatmap',
  label: 'Kontakte je Stunde',
  title: 'Patientenkontakte',
  subtitle: 'Wochentag × Uhrzeit, Ø pro Woche · Stoßzeiten in Kupfer',
};

export function availableViews(data) {
  return data.heatmap ? [...MONTH_VIEWS, HEATMAP_VIEW] : [...MONTH_VIEWS];
}

export function niceScale(max, count = 5) {
  if (!(max > 0)) return { max: count, step: 1 };
  const raw = (max * 1.03) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const step = mag * steps.find((s) => s * mag >= raw - 1e-9);
  return { max: step * count, step };
}

function yearColor(palette, yi, n) {
  return palette[Math.max(0, palette.length - n + yi)];
}

// Liefert ein vollständiges Modell für das Diagramm.
export function buildView(data, view) {
  return view.id === 'heatmap' ? buildHeatmap(data) : buildMonths(data, view);
}

function buildMonths(data, view) {
  const { years } = data;
  const n = years.length;

  // Index-Basis: Durchschnitt der Monatswerte (Summe der Segmente) im ersten Jahr
  let base = 1;
  if (data.indexMode) {
    const vals = [];
    for (let m = 1; m <= 12; m++) {
      const r = data.record(years[0], m);
      if (r) vals.push(view.segments(r).reduce((a, b) => a + b, 0));
    }
    base = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length / 100 : 1;
  }
  const scale = (v) => v / base;
  const format = data.indexMode ? (v) => `${fmt.one(v)} %` : view.format;
  const tick = data.indexMode ? (v) => `${fmt.int(v)} %` : view.tick;

  const cells = [];
  let max = 0;
  years.forEach((year, yi) => {
    for (let m = 1; m <= 12; m++) {
      const r = data.record(year, m);
      const segs = r ? view.segments(r).map(scale) : [];
      const sum = segs.reduce((a, b) => a + b, 0);
      max = Math.max(max, sum);
      const palettes = [COLORS.years, COLORS.yearsCopper];
      cells.push({
        x: m - 1,
        z: yi,
        segments: segs.map((v, si) => ({ value: v, color: yearColor(palettes[si] || COLORS.years, yi, n) })),
        tooltip: () => monthTooltip(data, view, year, m, format),
      });
    }
  });

  const ns = niceScale(max);
  const ticks = [];
  for (let i = 0; i <= 5; i++) ticks.push({ value: ns.step * i, text: tick(ns.step * i) });

  const legend = view.segmentNames
    ? view.segmentNames.map((name, i) => ({ name, color: [COLORS.years, COLORS.yearsCopper][i][2] }))
    : null;

  return {
    id: view.id,
    title: view.title + (data.indexMode ? ' (Index)' : ''),
    subtitle: data.indexMode ? `Index, Ø ${years[0]} = 100 %` : `${view.subtitle}, ${years[0]}–${years[n - 1]}`,
    legend,
    layout: 'months',
    xLabels: MONTHS_SHORT,
    zLabels: years.map(String),
    zColors: years.map((_, yi) => yearColor(COLORS.years, yi, n)),
    axisMax: ns.max,
    ticks,
    cells,
  };
}

function monthTooltip(data, view, year, m, format) {
  const r = data.record(year, m);
  const heading = `${MONTHS_LONG[m - 1]} ${year}`;
  if (!r) return { heading, value: 'keine Daten', lines: [] };

  const segs = view.segments(r);
  const sum = segs.reduce((a, b) => a + b, 0);
  const shown = data.indexMode ? sum / indexBase(data, view) : sum;
  const lines = [];
  const prev = data.record(year - 1, m);

  if (view.segmentNames) {
    const shareH = sum > 0 ? (segs[0] / sum) * 100 : 0;
    lines.push({
      chips: [
        { color: COLORS.years[2], text: `${view.segmentNames[0]} ${fmt.int(shareH)} %` },
        { color: COLORS.yearsCopper[2], text: `${view.segmentNames[1]} ${fmt.int(100 - shareH)} %` },
      ],
    });
    if (prev) {
      const ps = view.segments(prev);
      const psum = ps.reduce((a, b) => a + b, 0);
      const prevShare = psum > 0 ? (ps[0] / psum) * 100 : 0;
      const d = shareH - prevShare;
      lines.push({ trend: d, text: `HZV-Anteil ${fmt.signedPoints(d)} zum Vorjahr` });
    }
  } else if (prev) {
    const psum = view.segments(prev).reduce((a, b) => a + b, 0);
    if (psum > 0) {
      const d = (sum / psum - 1) * 100;
      lines.push({ trend: d, text: `${fmt.signedPercent(d)} zum Vorjahr` });
      const prevShown = data.indexMode ? psum / indexBase(data, view) : psum;
      lines.push({ muted: true, text: `${MONTHS_SHORT[m - 1]} ${year - 1}: ${format(prevShown)}` });
    }
  }
  if (!prev) lines.push({ muted: true, text: 'Erstes Jahr – kein Vorjahreswert' });

  return { heading, value: format(shown), lines };
}

function indexBase(data, view) {
  const vals = [];
  for (let m = 1; m <= 12; m++) {
    const r = data.record(data.years[0], m);
    if (r) vals.push(view.segments(r).reduce((a, b) => a + b, 0));
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length / 100 : 1;
}

function buildHeatmap(data) {
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

  const ns = niceScale(max);
  const ticks = [];
  for (let i = 0; i <= 5; i++) ticks.push({ value: ns.step * i, text: fmt.int(ns.step * i) });

  return {
    id: 'heatmap',
    title: h.title || HEATMAP_VIEW.title,
    subtitle: HEATMAP_VIEW.subtitle,
    legend: null,
    layout: 'heatmap',
    xLabels: hours.map((x, i) => (i === hours.length - 1 ? `${x} Uhr` : `${x}`)),
    zLabels: days,
    zColors: days.map(() => COLORS.inkMuted),
    axisMax: ns.max,
    ticks,
    cells,
  };
}
