// Minimaler statischer Webserver für die Entwicklung: node tools/serve.mjs [port]
// Hinweis: WebXR braucht HTTPS – localhost gilt als sicher, andere Geräte im WLAN nicht.
// Für die Quest deshalb die GitHub-Pages-Adresse nutzen (siehe README).

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.argv[2] || process.env.PORT || 8080);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.csv': 'text/csv; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(root, path));
    if (!file.startsWith(normalize(root))) { res.writeHead(403).end(); return; }
    const s = await stat(file);
    if (s.isDirectory()) { res.writeHead(302, { Location: path + '/' }).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Nicht gefunden');
  }
}).listen(port, () => console.log(`http://localhost:${port}/`));
