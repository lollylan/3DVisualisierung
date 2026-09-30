// Die Stationen im Raum und ihre Ansichten. Jede Station ist ein eigenes Diagramm
// mit eigenen Buttons; die Stationen stehen im Kreis um den Betrachter.
//
// Eine Monatsansicht beschreibt nur, welche Werte ein Monat liefert (segments) und
// wie sie beschriftet werden; das Diagramm-Modell baut data.js daraus.
// Stationen oder Ansichten, deren Felder in data.json fehlen, werden ausgeblendet.

import { fmt } from './theme.js';
import { num, sum, seriesColor, legendColor, trendLine, chipLines } from './data.js';

const umsatz = (r) => num(r.umsatz_hzv) + num(r.umsatz_kv) + num(r.umsatz_privat);
const kosten = (r) => num(r.kosten_personal) + num(r.kosten_raum) + num(r.kosten_material) +
  num(r.kosten_it) + num(r.kosten_beitraege) + num(r.kosten_sonstige);
const hzvBestand = (r) => num(r.hzv_aok) + num(r.hzv_ek) + num(r.hzv_bkk) + num(r.hzv_sonstige);
const vza = (r) => num(r.vza_aerzte) + num(r.vza_mfa) + num(r.vza_azubi) + num(r.vza_verwaltung);
const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);
const pctText = (v) => `${fmt.one(v)} %`;
const pctTick = (v) => `${fmt.int(v)} %`;

// ---------- Station 1: Umsatz & Fälle ----------

const UMSATZ = {
  id: 'umsatz',
  name: 'Umsatz',
  views: [
    {
      id: 'umsatz', label: 'Umsatz gesamt', title: 'Umsatz gesamt', subtitle: 'Euro pro Monat',
      requires: ['umsatz_kv'], indexable: true,
      segments: (r) => [umsatz(r)],
      format: fmt.euro, tick: fmt.kEuro,
    },
    {
      id: 'scheine', label: 'Scheinzahlen', title: 'Scheinzahlen', subtitle: 'Behandlungsfälle pro Monat',
      requires: ['scheine'], indexable: true,
      segments: (r) => [num(r.scheine)],
      format: (v) => `${fmt.int(v)} Scheine`, tick: fmt.int,
    },
    {
      id: 'hzv', label: 'HZV vs. KV', title: 'Anteil HZV vs. KV', subtitle: 'Umsatz nach Abrechnungsweg',
      requires: ['umsatz_hzv', 'umsatz_kv'], indexable: true,
      segments: (r) => [num(r.umsatz_hzv), num(r.umsatz_kv)],
      names: ['HZV', 'KV'],
      compare: { of: (s) => pct(s[0], sum(s)), kind: 'points', label: 'HZV-Anteil' },
      format: fmt.euro, tick: fmt.kEuro,
    },
    {
      id: 'fallwert', label: 'Umsatz je Schein', title: 'Umsatz je Schein', subtitle: 'Euro pro Behandlungsfall',
      requires: ['scheine', 'umsatz_kv'], indexable: true,
      segments: (r) => [num(r.scheine) > 0 ? umsatz(r) / r.scheine : 0],
      format: (v) => `${fmt.one(v)} €`, tick: (v) => `${fmt.int(v)} €`,
    },
    {
      id: 'heatmap', label: 'Kontakte je Stunde', title: 'Patientenkontakte',
      subtitle: 'Wochentag × Uhrzeit, Ø pro Woche · Stoßzeiten in Kupfer',
      layout: 'heatmap', gapBefore: true,
      available: (d) => !!d.heatmap,
    },
  ],
};

// ---------- Station 2: HZV-Einschreibungen ----------

const HZV = {
  id: 'hzv',
  name: 'HZV',
  views: [
    {
      id: 'hzv-bestand', label: 'Eingeschriebene', title: 'HZV-Einschreibungen',
      subtitle: 'Eingeschriebene Patienten nach Kasse, Monatsende',
      requires: ['hzv_aok'],
      segments: (r) => [num(r.hzv_aok), num(r.hzv_ek), num(r.hzv_bkk), num(r.hzv_sonstige)],
      names: ['AOK', 'Ersatzkassen', 'BKK', 'Sonstige'],
      short: ['AOK', 'EK', 'BKK', 'Sonst.'],
      chips: 'value',
      format: (v) => `${fmt.int(v)} Patienten`, tick: fmt.int,
    },
    {
      id: 'hzv-neu', label: 'Neueinschreibungen', title: 'Neueinschreibungen',
      subtitle: 'Neu in die HZV eingeschrieben pro Monat',
      requires: ['hzv_neu'],
      segments: (r) => [num(r.hzv_neu)],
      lines: (r) => [{ text: `Abgänge ${fmt.int(num(r.hzv_abgaenge))} · netto ${fmt.signedInt(num(r.hzv_neu) - num(r.hzv_abgaenge))}` }],
      format: (v) => `${fmt.int(v)} neu`, tick: fmt.int,
    },
    {
      id: 'hzv-quote', label: 'HZV-Quote', title: 'HZV-Quote',
      subtitle: 'Anteil Eingeschriebener an den GKV-Patienten im Monat',
      requires: ['pat_hzv', 'pat_gkv'],
      segments: (r) => [pct(num(r.pat_hzv), num(r.pat_hzv) + num(r.pat_gkv))],
      lines: (r) => [{ muted: true, text: `${fmt.int(num(r.pat_hzv))} von ${fmt.int(num(r.pat_hzv) + num(r.pat_gkv))} GKV-Patienten` }],
      compare: { kind: 'points' },
      format: pctText, tick: pctTick,
    },
    {
      id: 'hzv-fallwert', label: 'Fallwert je Kasse', title: 'HZV-Fallwert je Kasse',
      subtitle: 'Euro je Fall und Quartal, im Vergleich zum KV-Schein',
      layout: 'categories',
      available: (d) => !!d.fallwerte,
      build: buildFallwerte,
      tick: (v) => `${fmt.int(v)} €`,
    },
  ],
};

// HZV-Fallwert je Kasse, dazu der KV-Schein als Vergleichsspalte (letzte Spalte, Kupfer)
function buildFallwerte(data) {
  const f = data.fallwerte;
  const years = data.years.filter((y) => f.jahre.some((j) => j.year === y));
  const n = years.length;
  const kv = f.kassen.length - 1;
  const cells = [];
  let max = 0;
  years.forEach((year, yi) => {
    const j = f.jahre.find((x) => x.year === year);
    const pj = f.jahre.find((x) => x.year === year - 1);
    const kvWert = num(j.werte[kv]);
    f.kassen.forEach((kasse, ki) => {
      const v = num(j.werte[ki]);
      const isKv = ki === kv;
      max = Math.max(max, v);
      cells.push({
        x: ki, z: yi,
        segments: [{ value: v, color: seriesColor(isKv ? 1 : 0, yi, n) }],
        tooltip: () => ({
          heading: `${isKv ? 'KV-Schein ohne HZV' : `HZV ${kasse}`} · ${year}`,
          value: `${fmt.int(v)} € je Fall`,
          lines: [
            isKv ? { muted: true, text: 'Vergleichswert im Kollektivvertrag' }
              : { text: `${fmt.one(kvWert > 0 ? v / kvWert : 0)}-facher KV-Fallwert` },
            pj ? trendLine(v, num(pj.werte[ki])) : { muted: true, text: 'Erstes Jahr – kein Vorjahreswert' },
          ].filter(Boolean),
        }),
      });
    });
  });
  return {
    xLabels: f.kassen,
    zLabels: years.map(String),
    zColors: years.map((_, yi) => seriesColor(0, yi, n)),
    legend: [{ name: 'HZV je Kasse', color: legendColor(0) }, { name: 'KV zum Vergleich', color: legendColor(1) }],
    max,
    cells,
  };
}

// ---------- Station 3: Einnahmen & Ausgaben ----------

const COST_KEYS = ['kosten_personal', 'kosten_raum', 'kosten_material', 'kosten_it', 'kosten_beitraege', 'kosten_sonstige'];
const COST_NAMES = ['Personal', 'Raum', 'Material', 'IT', 'Beiträge', 'Sonstiges'];
const COST_LONG = ['Personalkosten', 'Raumkosten', 'Material & Labor', 'IT & Geräte', 'Beiträge & Versicherungen', 'Sonstige Kosten'];

// Jahresrechnung als Wasserfall: Einnahmen, dann jede Kostenart als schwebender Block, am Ende der Überschuss
function buildWaterfall(data) {
  const { years } = data;
  const n = years.length;
  const tot = years.map((year) => {
    const t = { e: 0, k: COST_KEYS.map(() => 0), months: 0 };
    for (let m = 1; m <= 12; m++) {
      const r = data.record(year, m);
      if (!r) continue;
      t.months++;
      t.e += umsatz(r);
      COST_KEYS.forEach((key, i) => { t.k[i] += num(r[key]); });
    }
    t.u = t.e - sum(t.k);
    return t;
  });

  const xLabels = ['Einnahmen', ...COST_NAMES, 'Überschuss'];
  const cells = [];
  let max = 0;
  years.forEach((year, yi) => {
    const t = tot[yi];
    const p = tot[yi - 1];
    max = Math.max(max, t.e);
    const partial = t.months < 12 ? ` (${t.months} Monate)` : '';
    const tip = (name, value, share, prevValue) => () => ({
      heading: `${name} ${year}${partial}`,
      value: fmt.euro(value),
      lines: [
        share,
        p && prevValue > 0 ? trendLine(value, prevValue) : { muted: true, text: 'Erstes Jahr – kein Vorjahreswert' },
      ].filter(Boolean),
    });
    if (!t.months) return;

    cells.push({ x: 0, z: yi, segments: [{ value: t.e, color: seriesColor(0, yi, n) }],
      tooltip: tip('Einnahmen', t.e, { muted: true, text: `Ausgaben ${fmt.euro(sum(t.k))}` }, p?.e) });
    let level = t.e;
    t.k.forEach((k, i) => {
      level -= k;
      cells.push({ x: i + 1, z: yi, base: level, segments: [{ value: k, color: seriesColor(1, yi, n) }],
        tooltip: tip(COST_LONG[i], k, { text: `${fmt.one(pct(k, t.e))} % der Einnahmen` }, p?.k[i]) });
    });
    cells.push({ x: 7, z: yi, segments: [{ value: Math.max(0, t.u), color: seriesColor(0, yi, n) }],
      tooltip: tip('Überschuss', t.u, { text: `Marge ${fmt.one(pct(t.u, t.e))} %` }, p?.u) });
  });

  return {
    xLabels,
    zLabels: years.map(String),
    zColors: years.map((_, yi) => seriesColor(0, yi, n)),
    legend: [{ name: 'Einnahmen & Überschuss', color: legendColor(0) }, { name: 'Ausgaben', color: legendColor(1) }],
    max,
    cells,
  };
}

const FINANZEN = {
  id: 'finanzen',
  name: 'Finanzen',
  views: [
    {
      id: 'eur-monat', label: 'Einnahmen & Ausgaben', title: 'Einnahmen und Ausgaben',
      subtitle: 'Balken = Einnahmen, geteilt in Ausgaben und Überschuss',
      requires: ['kosten_personal', 'umsatz_kv'],
      segments: (r) => { const e = umsatz(r); const k = kosten(r); return [Math.min(e, k), Math.max(0, e - k)]; },
      names: ['Ausgaben', 'Überschuss'],
      slots: [1, 0],
      chips: false,
      lines: (r) => {
        const e = umsatz(r), k = kosten(r);
        return chipLines([
          { color: legendColor(1), text: `Ausgaben ${fmt.euro(k)}` },
          { color: legendColor(0), text: `Überschuss ${fmt.euro(e - k)} (${fmt.int(pct(e - k, e))} %)` },
        ], 1);
      },
      compare: { of: (s) => s[1], label: 'Überschuss' },
      headingSuffix: 'Einnahmen',
      format: fmt.euro, tick: fmt.kEuro,
    },
    {
      id: 'eur-jahr', label: 'Jahresrechnung', title: 'Jahresrechnung',
      subtitle: 'Von den Einnahmen über die Kostenarten zum Überschuss',
      layout: 'categories',
      requires: ['kosten_personal', 'umsatz_kv'],
      build: buildWaterfall,
      tick: fmt.kEuro,
    },
  ],
};

// ---------- Station 4: Personal ----------

const PERSONAL = {
  id: 'personal',
  name: 'Personal',
  views: [
    {
      id: 'team', label: 'Team (VZÄ)', title: 'Team',
      subtitle: 'Vollzeitäquivalente nach Berufsgruppe',
      requires: ['vza_mfa'],
      segments: (r) => [num(r.vza_aerzte), num(r.vza_mfa), num(r.vza_azubi), num(r.vza_verwaltung)],
      names: ['Ärzt:innen', 'MFA', 'Auszubildende', 'Verwaltung'],
      short: ['Ärzt:innen', 'MFA', 'Azubis', 'Verw.'],
      chips: 'value', chipFormat: fmt.dec,
      compare: { kind: 'abs', unit: 'VZÄ' },
      format: (v) => `${fmt.dec(v)} VZÄ`, tick: fmt.dec,
    },
    {
      id: 'personalquote', label: 'Personalkostenquote', title: 'Personalkostenquote',
      subtitle: 'Personalkosten in Prozent der Einnahmen',
      requires: ['kosten_personal', 'umsatz_kv'],
      segments: (r) => [pct(num(r.kosten_personal), umsatz(r))],
      lines: (r) => [{ muted: true, text: `Personalkosten ${fmt.euro(num(r.kosten_personal))}` }],
      compare: { kind: 'points' },
      format: pctText, tick: pctTick,
    },
    {
      id: 'faelle-mfa', label: 'Fälle je MFA', title: 'Fälle je MFA-Vollzeitstelle',
      subtitle: 'Behandlungsfälle pro Monat geteilt durch MFA-VZÄ',
      requires: ['vza_mfa', 'scheine'],
      segments: (r) => [num(r.vza_mfa) > 0 ? num(r.scheine) / r.vza_mfa : 0],
      lines: (r) => [{ muted: true, text: `${fmt.int(num(r.scheine))} Fälle, ${fmt.dec(num(r.vza_mfa))} MFA-VZÄ` }],
      format: (v) => `${fmt.int(v)} Fälle`, tick: fmt.int,
    },
  ],
};

// ---------- Station 5: Patienten ----------

function buildAge(data) {
  const a = data.altersstruktur;
  const years = data.years.filter((y) => a.jahre.some((j) => j.year === y));
  const n = years.length;
  const cells = [];
  let max = 0;
  years.forEach((year, yi) => {
    const j = a.jahre.find((x) => x.year === year);
    const pj = a.jahre.find((x) => x.year === year - 1);
    const total = sum(j.frauen.map(num)) + sum(j.maenner.map(num));
    a.gruppen.forEach((g, gi) => {
      const w = num(j.frauen[gi]), m = num(j.maenner[gi]);
      max = Math.max(max, w + m);
      const pv = pj ? num(pj.frauen[gi]) + num(pj.maenner[gi]) : 0;
      cells.push({
        x: gi, z: yi,
        segments: [{ value: w, color: seriesColor(0, yi, n) }, { value: m, color: seriesColor(2, yi, n) }],
        tooltip: () => ({
          heading: `${g} Jahre · ${year}`,
          value: `${fmt.int(w + m)} Patienten`,
          lines: [
            ...chipLines([{ color: legendColor(0), text: `Frauen ${fmt.int(w)}` }, { color: legendColor(2), text: `Männer ${fmt.int(m)}` }]),
            { muted: true, text: `${fmt.one(pct(w + m, total))} % aller Patienten` },
            pv > 0 ? trendLine(w + m, pv) : null,
          ].filter(Boolean).slice(0, 3),
        }),
      });
    });
  });
  return {
    xLabels: a.gruppen,
    zLabels: years.map(String),
    zColors: years.map((_, yi) => seriesColor(0, yi, n)),
    legend: [{ name: 'Frauen', color: legendColor(0) }, { name: 'Männer', color: legendColor(2) }],
    max,
    cells,
  };
}

const PATIENTEN = {
  id: 'patienten',
  name: 'Patienten',
  views: [
    {
      id: 'versicherung', label: 'Versichertenstatus', title: 'Patienten nach Versicherung',
      subtitle: 'Behandelte Patienten pro Monat',
      requires: ['pat_hzv', 'pat_gkv', 'pat_privat'],
      segments: (r) => [num(r.pat_hzv), num(r.pat_gkv), num(r.pat_privat)],
      names: ['GKV mit HZV', 'GKV ohne HZV', 'Privat'],
      short: ['HZV', 'GKV', 'Privat'],
      slots: [0, 1, 2],
      chipsPerLine: 3,
      format: (v) => `${fmt.int(v)} Patienten`, tick: fmt.int,
    },
    {
      id: 'privatanteil', label: 'Privatpatienten', title: 'Anteil Privatpatienten',
      subtitle: 'Privatversicherte an allen Patienten im Monat',
      requires: ['pat_privat', 'pat_gkv'],
      segments: (r) => [pct(num(r.pat_privat), num(r.pat_hzv) + num(r.pat_gkv) + num(r.pat_privat))],
      slots: [2],
      lines: (r) => [{ muted: true, text: `Anteil am Umsatz ${fmt.one(pct(num(r.umsatz_privat), umsatz(r)))} %` }],
      compare: { kind: 'points' },
      format: pctText, tick: pctTick,
    },
    {
      id: 'alter', label: 'Altersstruktur', title: 'Altersstruktur',
      subtitle: 'Patienten je Altersgruppe und Jahr',
      layout: 'categories',
      available: (d) => !!d.altersstruktur,
      build: buildAge,
      tick: fmt.int,
    },
  ],
};

// ---------- Station 6: Benchmark & Digitales ----------

// Reifegrad 0–100: vorne der Durchschnitt (Petrol dunkel), dahinter die besten 15 % (Petrol hell),
// hinten die Praxis in Kupfer – so verdeckt die Praxis nie die Vergleichswerte und ragt sichtbar heraus.
function buildBenchmark(data) {
  const b = data.benchmark;
  const rows = b.reihen.slice(0, 3);
  const depth = (ri) => (rows.length === 3 ? [2, 0, 1][ri] : ri);
  const rowColor = (ri) => (ri === 0 ? seriesColor(1, 2, 3) : seriesColor(0, ri === 1 ? 0 : 2, 3));
  const cells = [];
  b.felder.forEach((feld, fi) => {
    rows.forEach((row, ri) => {
      const v = num(row.werte[fi]);
      cells.push({
        x: fi, z: depth(ri),
        segments: [{ value: v, color: rowColor(ri) }],
        tooltip: () => {
          const lines = [{ muted: true, text: rows.filter((_, i) => i !== ri).map((o) => `${o.name} ${fmt.int(num(o.werte[fi]))}`).join(' · ') }];
          const pv = num(rows[0].werte[fi]);
          if (ri === 0) {
            if (rows[1]) { const avg = num(rows[1].werte[fi]); lines.push({ trend: v - avg, text: `${fmt.signedInt(v - avg)} Punkte zu ${rows[1].name}` }); }
            if (rows[2]) { const top = num(rows[2].werte[fi]); lines.push({ trend: v - top, text: v >= top ? `auf Niveau ${rows[2].name}` : `${fmt.int(top - v)} Punkte bis ${rows[2].name}` }); }
          } else {
            lines.push({ trend: pv - v, text: `${rows[0].name} ${fmt.signedInt(pv - v)} Punkte` });
          }
          return { heading: `${feld} · ${row.name}`, value: `${fmt.int(v)} von 100`, lines };
        },
      });
    });
  });
  return {
    xLabels: b.kurz || b.felder,
    zLabels: rows.map((_, zi) => rows[rows.findIndex((__, ri) => depth(ri) === zi)].name),
    zColors: rows.map((_, zi) => rowColor(rows.findIndex((__, ri) => depth(ri) === zi))),
    legend: rows.map((r, ri) => ({ name: r.name, color: rowColor(ri) })),
    max: 100,
    scale: { max: 100, step: 20 },
    cells,
  };
}

const BENCHMARK = {
  id: 'benchmark',
  name: 'Benchmark',
  views: [
    {
      id: 'reifegrad', label: 'Reifegrad-Vergleich', title: 'Reifegrad im Vergleich',
      subtitle: 'Punkte von 0 bis 100 je Feld',
      layout: 'categories',
      available: (d) => !!d.benchmark,
      build: buildBenchmark,
      tick: fmt.int,
    },
    {
      id: 'online', label: 'Online-Buchung', title: 'Online gebuchte Termine',
      subtitle: 'Anteil an allen Terminen im Monat',
      requires: ['termine_online', 'termine_gesamt'],
      segments: (r) => [pct(num(r.termine_online), num(r.termine_gesamt))],
      lines: (r) => [{ muted: true, text: `${fmt.int(num(r.termine_online))} von ${fmt.int(num(r.termine_gesamt))} Terminen` }],
      compare: { kind: 'points' },
      format: pctText, tick: pctTick,
    },
    {
      id: 'ausfall', label: 'Terminausfälle', title: 'Nicht wahrgenommene Termine',
      subtitle: 'Anteil an allen Terminen, SMS-Erinnerung seit Juli 2024',
      requires: ['termine_ausfall', 'termine_gesamt'],
      segments: (r) => [pct(num(r.termine_ausfall), num(r.termine_gesamt))],
      slots: [1],
      latestFront: true, // Werte sinken: aktuelles Jahr vorne, sonst verdecken es die Vorjahre
      lines: (r) => [{ muted: true, text: `${fmt.int(num(r.termine_ausfall))} von ${fmt.int(num(r.termine_gesamt))} Terminen` }],
      compare: { kind: 'points' },
      format: pctText, tick: pctTick,
    },
  ],
};

export const STATIONS = [UMSATZ, HZV, FINANZEN, PERSONAL, PATIENTEN, BENCHMARK];

// Nur Stationen und Ansichten, für die data.json Werte enthält
export function availableStations(data, viewAvailable) {
  return STATIONS
    .map((s) => ({ ...s, views: s.views.filter((v) => viewAvailable(data, v)) }))
    .filter((s) => s.views.length);
}
