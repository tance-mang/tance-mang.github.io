/*
 * tools/serve.mjs — dependency-free static server for local checking.
 *
 *   node tools/serve.mjs            # http://localhost:8080
 *   node tools/serve.mjs 9000       # another port
 *
 * It serves the repo root exactly the way GitHub Pages does: directory URLs
 * resolve to index.html, unknown paths return the real 404.html, and files are
 * read from disk on every request so edits show up on reload.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon'
};

const port = Number(process.argv[2] || 8080);

async function resolveTarget(pathname) {
  const decoded = decodeURIComponent(pathname);
  if (decoded.includes('..')) return null;
  const base = join(ROOT, normalize(decoded).replace(/^(\.\.[/\\])+/, ''));
  const candidates = [base];
  if (decoded.endsWith('/')) candidates.push(join(base, 'index.html'));
  else if (!extname(base)) candidates.push(join(base, 'index.html'));
  for (const file of candidates) {
    try {
      const info = await stat(file);
      if (info.isFile()) return file;
    } catch { /* try the next candidate */ }
  }
  return null;
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = await resolveTarget(url.pathname);
  let status = 200;

  if (!file) {
    const notFound = join(ROOT, '404.html');
    const is404Page = url.pathname === '/404.html';
    if (is404Page || !(await stat(notFound).catch(() => null))) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    file = notFound;
    status = 404;
  }

  const body = await readFile(file);
  res.writeHead(status, {
    'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store'
  });
  res.end(body);
}).listen(port, () => {
  console.log(`TANCE static server → http://localhost:${port}/  (root: ${ROOT})`);
});
