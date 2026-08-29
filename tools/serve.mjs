/**
 * Static dev server that does not cache.
 *
 * `python -m http.server` sends Last-Modified and lets the browser cache ES
 * modules, which on a phone means you edit a file, reload, and are still
 * running the old build — silently. That cost real time here: touch handlers
 * were live on the server and stale in the tab, and the symptom looked like the
 * feature simply not working.
 *
 * No dependencies; Node's http and fs only.
 *
 *   node tools/serve.mjs [port]
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || 8099);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ogg': 'audio/ogg',
  '.ttf': 'font/ttf',
  '.md': 'text/markdown; charset=utf-8'
};

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = path.join(ROOT, url === '/' ? 'index.html' : url);

  // Never serve outside the project, however the path is spelled.
  if (!path.resolve(file).startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, 'index.html');
  }
  fs.readFile(file, (err, body) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found: ' + url);
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      // The whole point of this file.
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    });
    res.end(body);
  });
}).listen(PORT, () => {
  console.log(`serving ${ROOT} on http://127.0.0.1:${PORT} (no-store)`);
  console.log('phone:  adb reverse tcp:%d tcp:%d', PORT, PORT);
});
