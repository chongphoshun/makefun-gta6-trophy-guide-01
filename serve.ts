// Development server for the codex: serves app/ on localhost so the guide
// can be tried in a desktop browser and screenshotted. Nothing fancy — it
// only reads files under app/, answers with the right MIME type, and refuses
// anything that would walk out of the folder.
//
//   node serve.ts            -> http://localhost:8080
//   node serve.ts --port 8901 -> http://localhost:8901

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

function pickPort() {
  const flagAt = process.argv.indexOf('--port');
  const wanted = flagAt === -1 ? NaN : Number(process.argv[flagAt + 1]);
  return Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;
}

const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.htm', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
]);

function safePath(rawPath) {
  let cleaned;
  try {
    cleaned = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (cleaned.endsWith('/')) cleaned += 'index.html';
  const target = resolve(join(appRoot, cleaned));
  if (target !== appRoot && !target.startsWith(appRoot + sep)) return null;
  return target;
}

const port = pickPort();
const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const file = safePath(url.pathname);
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found\n');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES.get(extname(file).toLowerCase()) || 'application/octet-stream',
    'content-length': statSync(file).size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Leonida Trophy Codex on http://localhost:${port}`);
});
