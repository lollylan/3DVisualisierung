// Eigene Zahlen aus einer CSV-Datei (z. B. Excel-Export) in data.json übernehmen.
//
//   node tools/csv-to-json.mjs monatswerte.csv [--heatmap kontakte.csv]
//
// Monatswerte-CSV (Trennzeichen ; oder , – Kopfzeile Pflicht, Reihenfolge egal):
//   jahr;monat;umsatz_hzv;umsatz_kv;umsatz_privat;scheine
//   2023;1;28650;38472;8299;1265
// Zahlen dürfen deutsch formatiert sein ("28.650" oder "28650,50").
//
// Heatmap-CSV (optional): erste Spalte Wochentag, weitere Spalten = Stunden
//   tag;7;8;9;10;11;12;13;14;15;16;17;18
//   Mo;17;41;44;...
//
// Heatmap, Einstellungen (indexMode) und Titel aus der bestehenden data.json bleiben erhalten,
// sofern keine neue Heatmap angegeben wird.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const monthsFile = args.find((a) => !a.startsWith('--'));
const hmIdx = args.indexOf('--heatmap');
const heatFile = hmIdx >= 0 ? args[hmIdx + 1] : null;
if (!monthsFile) {
  console.error('Aufruf: node tools/csv-to-json.mjs monatswerte.csv [--heatmap kontakte.csv]');
  process.exit(1);
}

function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const sep = lines[0].includes(';') ? ';' : ',';
  return lines.map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, '')));
}

function num(s) {
  if (s === undefined || s === '') return null;
  let t = String(s).replace(/\s|€/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

const target = fileURLToPath(new URL('../data.json', import.meta.url));
const data = existsSync(target) ? JSON.parse(readFileSync(target, 'utf8')) : { meta: {}, settings: { indexMode: false } };

// Monatswerte
const rows = parseCsv(readFileSync(monthsFile, 'utf8'));
const head = rows[0].map((h) => h.toLowerCase());
const col = (name, ...alt) => [name, ...alt].map((n) => head.indexOf(n)).find((i) => i >= 0);
const iYear = col('jahr', 'year');
const iMonth = col('monat', 'month');
if (iYear === undefined || iMonth === undefined) {
  console.error('Die CSV braucht die Spalten "jahr" und "monat".');
  process.exit(1);
}
const fields = ['umsatz_hzv', 'umsatz_kv', 'umsatz_privat', 'scheine'];
const monthly = rows.slice(1).map((r, n) => {
  const rec = { year: num(r[iYear]), month: num(r[iMonth]) };
  if (!rec.year || !(rec.month >= 1 && rec.month <= 12)) {
    console.error(`Zeile ${n + 2}: Jahr/Monat ungültig – übersprungen.`);
    return null;
  }
  for (const f of fields) {
    const i = head.indexOf(f);
    rec[f] = i >= 0 ? num(r[i]) ?? 0 : 0;
  }
  return rec;
}).filter(Boolean);

data.monthly = monthly;
data.years = [...new Set(monthly.map((r) => r.year))].sort((a, b) => a - b);

// Heatmap
if (heatFile) {
  const h = parseCsv(readFileSync(heatFile, 'utf8'));
  const hours = h[0].slice(1).map((x) => num(x));
  data.heatmap = {
    ...(data.heatmap || { title: 'Patientenkontakte je Stunde', unit: 'Kontakte (Ø pro Woche)' }),
    days: h.slice(1).map((r) => r[0]),
    hours,
    values: h.slice(1).map((r) => hours.map((_, i) => num(r[i + 1]) ?? 0)),
  };
}

writeFileSync(target, JSON.stringify(data, null, 2) + '\n');
console.log(`data.json aktualisiert: ${monthly.length} Monatswerte (${data.years.join(', ')})${heatFile ? ', Heatmap ersetzt' : ''}.`);
