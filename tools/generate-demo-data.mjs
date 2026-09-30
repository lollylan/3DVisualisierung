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

// ---------- Weitere Stationen ----------
// Eigener Zufallsgenerator, damit die Werte oben unverändert bleiben.
const rand2 = rng(20260930);
const jit = (amp) => 1 + (rand2() * 2 - 1) * amp;
const r1 = (v) => Math.round(v * 100) / 100;

// HZV-Einschreibungen nach Kasse (Bestand am Monatsende).
// Ab April 2024 bietet die Praxis auch den Ersatzkassen-Vertrag aktiv an.
const hzv = { aok: 522, ek: 168, bkk: 92, sonstige: 28 };

// Personal in Vollzeitäquivalenten. t = Monatsindex ab Januar 2023.
function staff(t) {
  // Inhaber 1,0; Weiterbildungsassistentin ab April 2024 (0,75), ab Juli 2025 Vollzeit
  const aerzte = 1 + (t >= 30 ? 1 : t >= 15 ? 0.75 : 0);
  // MFA: Aufstockung Sep 2023; Kündigung Ende Mai 2024, Nachbesetzung erst im September;
  // August 2025 wird die Auszubildende übernommen.
  let mfa = t >= 8 ? 5 : 4.5;
  if (t >= 17 && t <= 19) mfa = 4;
  if (t >= 31) mfa = 5.5;
  // Auszubildende: eine bis Juli 2025, zweite ab September 2024, neue ab September 2025
  const azubi = (t <= 30 ? 1 : 0) + (t >= 20 ? 1 : 0) + (t >= 32 ? 1 : 0);
  const verwaltung = t >= 24 ? 0.75 : 0.5;
  return { aerzte, mfa, azubi, verwaltung };
}

monthly.forEach((r) => {
  const y = YEARS.indexOf(r.year);
  const t = y * 12 + r.month - 1;
  const einnahmen = r.umsatz_hzv + r.umsatz_kv + r.umsatz_privat;

  // HZV: Neueinschreibungen hängen an den Kontakten; Quartalsanfang (Chroniker) stärker.
  const qStart = (r.month - 1) % 3 === 0 ? 1.25 : 0.92;
  const neu = Math.round(r.scheine * 0.0175 * qStart * (1 + 0.08 * y) * jit(0.2));
  const ekShare = t >= 15 ? 0.36 : 0.22;
  const split = { aok: 0.56 * (1 - ekShare) / 0.78, ek: ekShare, bkk: 0.16 * (1 - ekShare) / 0.78, sonstige: 0 };
  split.sonstige = 1 - split.aok - split.ek - split.bkk;
  const bestand = hzv.aok + hzv.ek + hzv.bkk + hzv.sonstige;
  const abgaenge = Math.round(bestand * 0.0052 * jit(0.35)); // Tod, Umzug, Kassen- oder Arztwechsel
  let restNeu = neu, restAb = abgaenge;
  for (const k of ['aok', 'ek', 'bkk']) {
    const n = Math.round(neu * split[k]);
    const a = Math.round(abgaenge * (hzv[k] / bestand));
    hzv[k] += n - a;
    restNeu -= n; restAb -= a;
  }
  hzv.sonstige += restNeu - restAb;

  // Patienten im Monat: GKV-Fälle aufgeteilt nach HZV-Teilnahme (Eingeschriebene kommen öfter),
  // dazu Privatversicherte (im Sommer etwas weniger, leicht steigend).
  const eingeschrieben = hzv.aok + hzv.ek + hzv.bkk + hzv.sonstige;
  const hzvQuote = Math.min(0.75, (eingeschrieben / 2360) * 1.12 * jit(0.015));
  const pat_hzv = Math.round(r.scheine * hzvQuote);
  const pat_gkv = r.scheine - pat_hzv;
  const privSeason = r.month === 7 || r.month === 8 ? 0.9 : 1;
  const pat_privat = Math.round(r.scheine * (0.1 + 0.004 * y) * privSeason * jit(0.05));

  // Personal & Kosten (Tarifsteigerung je Jahr, Jahressonderzahlung im November).
  // Weiterbildungsassistenz netto nach Förderzuschuss.
  const s = staff(t);
  const tarif = 1 + 0.05 * y;
  const xmas = r.month === 11 ? 1.4 : 1;
  const kosten_personal = Math.round(
    (s.mfa * 3100 * xmas + s.verwaltung * 2900 * xmas) * tarif * jit(0.02) +
    (s.aerzte - 1) * 1800 * (1 + 0.03 * y) + s.azubi * 1250 * (1 + 0.04 * y)
  );
  const kosten_raum = Math.round((y === 0 ? 3900 : 4060) + (r.month === 3 ? 1150 * jit(0.3) : 0) + (y === 2 ? 180 : 0));
  const kosten_material = Math.round(r.scheine * 2.55 * (1 + 0.03 * y) * jit(0.08));
  const kosten_it = Math.round(1650 + y * 120 + (y === 2 ? 340 : 0) + (y === 2 && r.month === 2 ? 4800 : 0) + (y === 1 && r.month === 10 ? 2900 : 0));
  const kosten_beitraege = Math.round(r.umsatz_kv * 0.023 + 380 + (r.month === 1 ? 2600 : 0));
  const kosten_sonstige = Math.round(2250 * (1 + 0.03 * y) * jit(0.12) + (r.month === 5 ? 1400 : 0));
  const kosten = kosten_personal + kosten_raum + kosten_material + kosten_it + kosten_beitraege + kosten_sonstige;
  if (kosten >= einnahmen) throw new Error(`Ausgaben übersteigen Einnahmen: ${r.year}-${r.month}`);

  // Termine: Online-Buchung seit März 2023, wächst schnell; SMS-Erinnerung ab Juli 2024 senkt Ausfälle.
  const termine_gesamt = Math.round(r.scheine * 1.32 * jit(0.03));
  const onlineShare = t < 2 ? 0 : Math.min(0.58, 0.08 + 0.46 * (1 - Math.exp(-(t - 2) / 11))) * jit(0.04);
  const termine_online = Math.round(termine_gesamt * onlineShare);
  const ausfallShare = (t >= 18 ? 0.047 : 0.078) * (r.month === 12 || r.month === 8 ? 1.2 : 1) * jit(0.1);
  const termine_ausfall = Math.round(termine_gesamt * ausfallShare);

  Object.assign(r, {
    hzv_aok: hzv.aok, hzv_ek: hzv.ek, hzv_bkk: hzv.bkk, hzv_sonstige: hzv.sonstige,
    hzv_neu: neu, hzv_abgaenge: abgaenge,
    pat_hzv, pat_gkv, pat_privat,
    vza_aerzte: r1(s.aerzte), vza_mfa: r1(s.mfa), vza_azubi: r1(s.azubi), vza_verwaltung: r1(s.verwaltung),
    kosten_personal, kosten_raum, kosten_material, kosten_it, kosten_beitraege, kosten_sonstige,
    termine_gesamt, termine_online, termine_ausfall,
  });
});

// Altersstruktur: Patienten je Altersgruppe und Jahr (die Praxis altert mit ihren Patienten).
const GROUPS = ['0–17', '18–29', '30–39', '40–49', '50–59', '60–69', '70–79', '80+'];
const WOMEN = [58, 176, 188, 196, 262, 284, 246, 188];
const MEN = [63, 164, 172, 188, 248, 262, 204, 112];
const drift = [-0.02, -0.01, 0, -0.005, 0.01, 0.03, 0.045, 0.06];
const altersstruktur = {
  gruppen: GROUPS,
  jahre: YEARS.map((year, y) => ({
    year,
    frauen: WOMEN.map((v, i) => Math.round(v * (1 + drift[i] * y) * jit(0.03))),
    maenner: MEN.map((v, i) => Math.round(v * (1 + drift[i] * y) * jit(0.03))),
  })),
};

// HZV-Fallwert je Kasse (Euro je Fall und Quartal) im Vergleich zum KV-Schein ohne HZV.
const fallwerte = {
  kassen: ['AOK', 'Ersatzkassen', 'BKK', 'Sonstige', 'KV'],
  jahre: YEARS.map((year, y) => ({
    year,
    werte: [148, 126, 94, 132, 59].map((v) => Math.round(v * (1 + 0.035 * y) * jit(0.03))),
  })),
};

// Benchmark: Reifegrad 0–100 in acht Feldern – Praxis, Durchschnitt Deutschland, beste 15 %.
const benchmark = {
  felder: ['Digitalisierung', 'HZV', 'Privatumsatz', 'Heimversorgung', 'Palliativ', 'Prävention', 'IGeL', 'Recall'],
  kurz: ['Digital', 'HZV', 'Privat', 'Heime', 'Palliativ', 'Prävention', 'IGeL', 'Recall'],
  reihen: [
    { name: 'Praxis', werte: [86, 66, 78, 84, 72, 58, 34, 42] },
    { name: 'Ø Deutschland', werte: [36, 40, 34, 26, 18, 42, 30, 38] },
    { name: 'Top 15 %', werte: [78, 76, 74, 68, 58, 74, 68, 76] },
  ],
};

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
  altersstruktur,
  fallwerte,
  benchmark,
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
console.log(`data.json geschrieben: ${monthly.length} Monatswerte, Altersstruktur, Heatmap ${DAYS.length}×${HOURS.length}`);
