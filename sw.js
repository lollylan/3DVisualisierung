// Service Worker: hält die App nach dem ersten Laden offline verfügbar
// (Absicherung gegen wackeliges WLAN im Vortragssaal).
// Eigene Dateien: erst Netz, dann Cache. CDN (three.js): erst Cache, dann Netz.

const CACHE = 'praxis-3d-v2';
const CORE = [
  './',
  './index.html',
  './data.json',
  './src/main.js',
  './src/chart.js',
  './src/barMaterial.js',
  './src/data.js',
  './src/stations.js',
  './src/input.js',
  './src/panel.js',
  './src/text.js',
  './src/theme.js',
  './fonts/barlow-latin-500-normal.woff2',
  './fonts/barlow-latin-600-normal.woff2',
  './fonts/barlow-latin-700-normal.woff2',
  './fonts/merriweather-latin-700-normal.woff2',
];
const CDN = [
  'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.core.js',
  'https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/controls/OrbitControls.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    await Promise.all(CDN.map((u) => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && url.hostname !== 'cdn.jsdelivr.net') return;

  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    if (sameOrigin) {
      try {
        const res = await fetch(req, { cache: 'no-cache' });
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch {
        return (await c.match(req, { ignoreSearch: true })) || Response.error();
      }
    }
    const hit = await c.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) c.put(req, res.clone());
    return res;
  })());
});
