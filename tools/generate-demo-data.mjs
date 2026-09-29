// Erzeugt fiktive, aber plausible Demodaten einer Hausarztpraxis -> data.json
// Aufruf: node tools/generate-demo-data.mjs
// Deterministisch (fester Seed), damit jeder Lauf dieselben Zahlen liefert.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const YEARS = [2023, 2024, 2025];

// Mulberry32 – kleiner, deterministischer Zufallsgenerator
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20250317);
const jitter = (amp) => 1 + (rand() * 2 - 1) * amp;

// Saisonfaktor für Behandlungsfälle: Infektwelle im Winter, Sommerloch Juli/August,
// Dezember etwas gedämpft durch Feiertage/Praxisurlaub.
const SEASON = [1.14, 1.12, 1.04, 0.99, 0.95, 0.93, 0.86, 0.79, 0.97, 1.05, 1.10, 1.03];
// Stärke der Infektwelle schwankt je Winter (Jan/Feb bzw. Nov/Dez)
const WAVE_EARLY = [1.02, 0.96, 1.07];
const WAVE_LATE = [0.97, 1.06, 1.02];

const monthly = [];
YEARS.forEach((year, y) => {
  const hzvShareBase = [0.38, 0.42, 0.46][y];
  for (let m = 1; m <= 12; m++) {
    const quarterMonth = (m - 1) % 3; // 0 = erster Monat im Quartal
    let season = SEASON[m - 1];
    if (m <= 2) season *= WAVE_EARLY[y];
    if (m >= 11) season *= WAVE_LATE[y];

    // Behandlungsfälle: Quartalsanfang bringt Chroniker (neuer Schein, Rezepte)
    const quarterScheine = [1.07, 0.98, 0.95][quarterMonth];
    const scheine = Math.round(1040 * (1 + 0.035 * y) * season * quarterScheine * jitter(0.025));

    // Umsatz je Schein: Pauschalen fallen beim ersten Kontakt im Quartal an,
    // Akutbesuche im Winter sind "günstiger", Punktwert steigt jährlich.
    const quarterValue = [1.10, 0.97, 0.94][quarterMonth];
    const seasonValue = m <= 2 || m === 12 ? 0.96 : m === 7 || m === 8 ? 1.03 : 1;
    const perSchein = 55.5 * (1 + 0.038 * y) * quarterValue * seasonValue * jitter(0.02);

    const total = scheine * perSchein;
    const hzvShare = hzvShareBase + (m - 6) * 0.002 + (rand() * 2 - 1) * 0.01;
    const privatShare = 0.11 * jitter(0.08);

    const umsatz_hzv = Math.round(total * hzvShare);
    const umsatz_privat = Math.round(total * privatShare);
    const umsatz_kv = Math.round(total - umsatz_hzv - umsatz_privat);

    monthly.push({ year, month: m, umsatz_hzv, umsatz_kv, umsatz_privat, scheine });
  }
});

// Heatmap: durchschnittliche Patientenkontakte je Stunde und Wochentag (inkl. Telefon).
// Mi und Fr nachmittags geschlossen, Mittag = Hausbesuche.
const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const HOUR_PROFILE = [14, 34, 36, 31, 26, 12, 4, 6, 17, 21, 19, 9];
const DAY_FACTOR = [1.22, 1.0, 0.96, 0.98, 0.9];
const heatmap = DAYS.map((d, di) =>
  HOURS.map((h, hi) => {
    const closedAfternoon = (d === 'Mi' || d === 'Fr') && h >= 13;
    const base = closedAfternoon ? 2.5 : HOUR_PROFILE[hi];
    return Math.round(base * DAY_FACTOR[di] * jitter(0.08) * 10) / 10;
  })
);

const data = {
  meta: {
    title: 'Hausarztpraxis – Demodaten',
    note: 'Fiktive Zahlen, keine echten Praxisdaten.',
    currency: 'EUR',
  },
  settings: {
    // true: Werte als Index anzeigen (Durchschnitt des ersten Jahres = 100 %)
    indexMode: false,
  },
  years: YEARS,
  monthly,
  heatmap: {
    title: 'Patientenkontakte je Stunde',
    unit: 'Kontakte (Ø pro Woche)',
    days: DAYS,
    hours: HOURS,
    values: heatmap,
  },
};

const out = fileURLToPath(new URL('../data.json', import.meta.url));
writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
console.log(`data.json geschrieben: ${monthly.length} Monatswerte, Heatmap ${DAYS.length}×${HOURS.length}`);
