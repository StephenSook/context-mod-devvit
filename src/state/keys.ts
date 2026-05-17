/**
 * Single source of truth for every Redis key the engine touches.
 *
 * Every factory takes a `sub` segment so the namespace is multi-tenant-safe from
 * day 0 (Council 2026-05-14 21:30, Long-Term Architect — unanimous 5/5
 * devil's-advocate pick). Today the app installs per-sub via
 * `cm:install:{installId}:subname`, so per-sub keying looks unnecessary — but
 * the moment the app gets adopted by 2+ subs sharing an install scope, or
 * per-sub config overrides land, every flat key collides. `reserveAction` in
 * sub-A would alias sub-B's pending lease (cross-tenant privilege-escalation
 * primitive, not a hygiene issue).
 *
 * Default to sentinel `'_'` so callsites that don't yet thread the sub through
 * (D0.1 skeleton, cron pre-Step-3.1) still work. Step 2.1 threads the real
 * `subredditName` through `ActionContext`.
 */

const SUB_DEFAULT = '_';

export const K = {
  // Idempotency — paired with src/lib/idem.ts (migrated to thread `sub`).
  proc: (id: string, sub: string = SUB_DEFAULT) => `cm:${sub}:proc:${id}`,
  actionDone: (id: string, sub: string = SUB_DEFAULT) => `cm:${sub}:action:done:${id}`,
  actionPending: (id: string, sub: string = SUB_DEFAULT) => `cm:${sub}:action:pending:${id}`,
  lock: (task: string, sub: string = SUB_DEFAULT) => `cm:${sub}:lock:${task}`,

  // Config — D5 atomic publish via immutable rev + pointer flip.
  cfgRev: (n: number, sub: string = SUB_DEFAULT) => `cm:${sub}:cfg:rev:${n}`,
  cfgCurrentRev: (sub: string = SUB_DEFAULT) => `cm:${sub}:cfg:current_rev`,
  cfgLastWikiRev: (sub: string = SUB_DEFAULT) => `cm:${sub}:cfg:last-wiki-rev`,
  // Codex H2 fix 2026-05-16: atomic INCR counter for rev allocation —
  // closes the read-modify-write race in publish() where two concurrent
  // writers could both pick the same N+1 and silently last-writer-wins.
  cfgRevCounter: (sub: string = SUB_DEFAULT) => `cm:${sub}:cfg:rev-counter`,

  // Events — versioned name so future "last 500" ZSET lands beside without renaming.
  eventsRecent: (sub: string = SUB_DEFAULT) => `cm:${sub}:events:recent50`,

  // Install-scope state — keyed by installId so two installs cannot
  // last-writer-wins each other's mapping (Council 4th pass, Long-Term Architect).
  installSubname: (installId: string) => `cm:install:${installId}:subname`,

  // Author cache (Phase 4).
  authorHist: (name: string, sub: string = SUB_DEFAULT) => `cm:${sub}:author:hist:${name}`,

  // Stats rollup (Phase 4).
  statsRollup: (sub: string = SUB_DEFAULT) => `cm:${sub}:stats:rollup:7d`,

  // Schema version (used by Step 3.6 app-upgrade migrations).
  schemaVersion: () => `cm:schema-version`,

  // Stable pointer to the current install's installId so cron handlers (no
  // inbound request context) can resolve the install-scope state.
  currentInstallId: () => `cm:current-install-id`,
};

export const SUB_SENTINEL = SUB_DEFAULT;
