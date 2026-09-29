// Farben, Schriften und Zahlenformate an einer Stelle.
// Basis ist das Praxis-CI (Petrol #025669, Kupfer #BB4E26). Für den dunklen,
// halbtransparenten Raum werden hellere, "leuchtende" Abstufungen derselben Farbtöne genutzt.

export const CI = {
  petrol: '#025669',
  petrolLight: '#03758F',
  petrolDark: '#013D4B',
  copper: '#BB4E26',
  copperLight: '#D4713F',
  copperDark: '#8E3A1B',
};

export const COLORS = {
  // Balken je Jahr: ältestes Jahr am dunkelsten, aktuelles Jahr am hellsten
  years: ['#0F6E84', '#1B97B1', '#46C9E1'],
  // Zweites Segment (KV) in Kupfer-Abstufungen
  yearsCopper: ['#8E3A1B', '#B9582C', '#E48A52'],
  heatLow: '#0B4656',
  heatMid: '#2BB0CA',
  heatHot: '#B9582C',
  heatHigh: '#F09A5E',

  glow: '#46C9E1',
  accent: '#E48A52',

  // Text & Flächen (CSS-Strings für Canvas)
  ink: '#E9F5F8',
  inkMuted: '#9CC7D2',
  inkFaint: '#6D9CA8',
  panel: 'rgba(3, 28, 36, 0.94)',
  panelHover: 'rgba(4, 72, 88, 0.92)',
  panelActive: 'rgba(3, 117, 143, 0.95)',
  panelEdge: 'rgba(70, 201, 225, 0.35)',

  grid: '#2A8FA6',
  base: '#04202A',
};

export const FONT = {
  family: 'Barlow, "Segoe UI", sans-serif',
  display: 'Merriweather, Georgia, serif',
};

export async function loadFonts() {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`500 80px Barlow`),
      document.fonts.load(`600 80px Barlow`),
      document.fonts.load(`700 80px Barlow`),
    ]);
  } catch {
    // Fallback-Schrift reicht; kein Abbruch
  }
}

const nf0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmt = {
  int: (v) => nf0.format(v),
  one: (v) => nf1.format(v),
  euro: (v) => `${nf0.format(v)} €`,
  percent: (v) => `${nf0.format(v)} %`,
  signedPercent: (v) => `${v >= 0 ? '+' : '−'}${nf1.format(Math.abs(v))} %`,
  signedPoints: (v) => `${v >= 0 ? '+' : '−'}${nf1.format(Math.abs(v))} Pp.`,
  kEuro: (v) => (v === 0 ? '0' : `${nf0.format(v / 1000)} T€`),
};

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
export const MONTHS_LONG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export const DAYS_LONG = { Mo: 'Montag', Di: 'Dienstag', Mi: 'Mittwoch', Do: 'Donnerstag', Fr: 'Freitag', Sa: 'Samstag', So: 'Sonntag' };
