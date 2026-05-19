#!/usr/bin/env node
/**
 * Mock dev server for the Observatory dashboard.
 *
 * Lets anyone who clones the repo run the dashboard locally without
 * Devvit auth — `npm run dev:web` builds + spins this server.
 *
 * **This is NOT the production surface.** Production uses Hono routes
 * in src/routes/api.ts with c.req.query('demo') server-side branch.
 * This mock returns 200+empty + relies on the client App.tsx
 * DEMO_ENABLED fallback (Codex M6 production-safety pattern) to seed
 * synthetic data when ?demo=1 is in the URL.
 *
 * Security: binds 127.0.0.1 explicitly — local loopback only, never
 * LAN-exposed. Static-file directory locked to dist/client/ with
 * URL-decode + null-byte + path-traversal guards.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 5173;
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
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.wasm': 'application/wasm',
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
    if (!MIME[ext]) {
      console.warn('[cm-dev] unknown MIME for', ext, '— serving as octet-stream');
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
    });
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('[cm-dev] stream error', filePath, err.code);
      if (!res.headersSent) res.destroy();
    });
    stream.pipe(res);
    return true;
  } catch (err) {
    if (err && err.code !== 'ENOENT' && err.code !== 'EISDIR') {
      console.error('[cm-dev] sendFile failed', filePath, err.code || err.message);
    }
    return false;
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${HOST}`);

  // API shims — return empty/safe responses so the client DEMO_ENABLED
  // fallback engages when ?demo=1 is in the dashboard URL.
  //
  // AE Polish #29: the mock server previously stubbed only /api/recent,
  // /api/stats, /api/health — but the client polls /api/mod-activity
  // (ModActivityFeed, every 8s) + /api/config-history (ConfigDiffViewer,
  // user-triggered) + /api/muted-rules (RuleStatsTable, every 8s).
  // Every poll missed the mock + spammed the browser console w/ 404s
  // (47 errors in a 60s session). Now every endpoint the dashboard
  // client touches has a mock that returns the expected JSON shape.
  if (url.pathname.startsWith('/api/recent')) return sendJson(res, 200, { events: [] });
  if (url.pathname.startsWith('/api/stats')) return sendJson(res, 200, { counters: {} });
  if (url.pathname.startsWith('/api/mod-activity')) return sendJson(res, 200, { activity: [] });
  if (url.pathname.startsWith('/api/config-history')) return sendJson(res, 200, { revs: [] });
  if (url.pathname.startsWith('/api/muted-rules')) return sendJson(res, 200, { muted: [] });
  if (url.pathname.startsWith('/api/health'))
    return sendJson(res, 200, { ok: true, name: 'cm-devvit-mock', ts: Date.now() });
  // Mutation endpoints — mock returns ok so click-to-mute / explain
  // buttons don't blow up in dev. POSTs aren't polled so no console spam,
  // but stubbing keeps the dashboard usable for click-through testing.
  if (req.method === 'POST' && url.pathname.startsWith('/api/mute-rule'))
    return sendJson(res, 200, { ok: true });
  if (req.method === 'POST' && url.pathname.startsWith('/api/unmute-rule'))
    return sendJson(res, 200, { ok: true });
  if (req.method === 'POST' && url.pathname.startsWith('/api/explain-event'))
    return sendJson(res, 200, {
      ok: true,
      explanation:
        'Mock explanation — dev:web mock-server returns a stub here. In production this is OpenAI gpt-4o-mini via /api/explain-event.',
    });

  // Unknown /api/* paths return JSON 404 — not HTML — so the client
  // gets a parseable error instead of crashing on "Unexpected token <".
  if (url.pathname.startsWith('/api/')) {
    console.warn('[cm-dev] unknown /api route', url.pathname);
    return sendJson(res, 404, { error: 'unknown api route', path: url.pathname });
  }

  // Static-file serving from dist/client/ with hardening:
  //   1. Reject null-byte injection (\0 in pathname)
  //   2. URL-decode the pathname so %2e%2e doesn't bypass the regex
  //   3. Normalize + strip leading ../ sequences
  //   4. startsWith(DIST) guard catches anything that escaped above
  if (url.pathname.includes('\0')) {
    console.warn('[cm-dev] rejecting null-byte path', JSON.stringify(url.pathname));
    res.writeHead(400);
    return res.end('bad request');
  }
  let decoded;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    return res.end('bad request');
  }
  const safePath = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const candidate = path.join(DIST, safePath === '/' ? 'index.html' : safePath);
  if (!candidate.startsWith(DIST)) {
    console.warn('[cm-dev] path traversal blocked', JSON.stringify(decoded));
    res.writeHead(403);
    return res.end('forbidden');
  }
  if (sendFile(res, candidate)) return;

  // SPA fallback: route unknown non-/api paths back to index.html so
  // client routing handles the rest.
  if (sendFile(res, path.join(DIST, 'index.html'))) return;

  res.writeHead(404);
  res.end('not found');
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[cm-dev] port ${PORT} already in use — stop other dev server or PORT=5174 npm run dev:web`);
    process.exit(1);
  }
  console.error('[cm-dev] server error', err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`[cm-dev] MOCK SERVER (production uses Hono routes; this is dev-only)`);
  console.log(`[cm-dev] dashboard at http://${HOST}:${PORT}/?demo=1`);
  console.log('[cm-dev] ctrl-c to stop');
});

const shutdown = (sig) => {
  console.log(`\n[cm-dev] ${sig} — shutting down`);
  server.close(() => process.exit(0));
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
