#!/usr/bin/env node
/**
 * Mock dev server for the Observatory dashboard.
 *
 * Lets anyone who clones the repo run the dashboard locally without
 * Devvit auth — `npm run dev:web` builds + spins this server.
 *
 * Returns 200 + empty payloads on the two API routes. The client
 * App.tsx DEMO_ENABLED fallback seeds synthetic data when ?demo=1
 * is in the URL + the API is reachable + returns empty (Codex M6
 * production-safety pattern).
 *
 * Security: binds 127.0.0.1 explicitly — local loopback only, never
 * LAN-exposed. Static-file directory locked to dist/client/ with
 * explicit path-traversal guard.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const HOST = '127.0.0.1';
const DIST = path.resolve(__dirname, '..', '..', 'dist', 'client');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function sendJson(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': buf.length,
  });
  res.end(buf);
}

function sendFile(res, filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
    });
    fs.createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${HOST}`);

  // API shims — both routes return empty so the client DEMO_ENABLED
  // fallback engages when ?demo=1 is in the dashboard URL.
  if (url.pathname.startsWith('/api/recent')) return sendJson(res, 200, { events: [] });
  if (url.pathname.startsWith('/api/stats')) return sendJson(res, 200, { counters: {} });
  if (url.pathname.startsWith('/api/health'))
    return sendJson(res, 200, { ok: true, name: 'cm-devvit-mock', ts: Date.now() });

  // Static file serving from dist/client/ with path-traversal guard.
  const safePath = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
  const candidate = path.join(DIST, safePath === '/' ? 'index.html' : safePath);
  if (!candidate.startsWith(DIST)) {
    res.writeHead(403);
    return res.end('forbidden');
  }
  if (sendFile(res, candidate)) return;

  // SPA fallback: route unknown paths back to index.html so client
  // routing handles the rest.
  if (sendFile(res, path.join(DIST, 'index.html'))) return;

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, HOST, () => {
  console.log(`[cm-dev] dashboard at http://${HOST}:${PORT}/?demo=1`);
  console.log('[cm-dev] ctrl-c to stop');
});

process.on('SIGINT', () => {
  console.log('\n[cm-dev] shutting down');
  server.close(() => process.exit(0));
});
