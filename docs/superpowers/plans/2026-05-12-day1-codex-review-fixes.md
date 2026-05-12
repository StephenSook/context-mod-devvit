# Day 1 Codex Review — Fix Plan

> Lock 2026-05-12 post-review. Codex + silent-failure-hunter both ran against the 19-commit Day 1 build. Real bugs found, not aesthetic.

## Verdict
SHIP-WITH-CHANGES. 3 CRITICAL + 4 HIGH need fixing before Phase 1 starts.

## Fix order (priority by blast radius)

### Stage 1 — Correctness (CRITICAL)
- [ ] **1.1 Replace `fnv1a64` with BigInt impl + golden tests.**
  - Current impl fails `fnv1a64('a')` test vector
  - All action-idempotency keys are wrong → fake collisions in cm:action:* namespace
  - Use BigInt 64-bit math (no native deps, runs in Devvit)
  - Add vitest unit test against published FNV-1a 64 test vectors
- [ ] **1.2 Rewrite `safeHandle` to fail-open on unknown errors.**
  - Current: catches everything, returns 200 → Devvit never retries
  - New: catch only known-recoverable (JSON parse, Redis transient) and return success; rethrow unknown so Devvit retries
  - Add error ID + `subreddit`+`thingId` context to logs
- [ ] **1.3 Make `firstSeen` fail-closed on Redis error.**
  - Current: throws → caller's catch processes anyway → double-processing
  - New: return `false` on Redis error (treat as "already seen", skip processing)
  - Remove caller-side try/catch around `firstSeen` — let it speak
  - Log Redis error w/ counter

### Stage 2 — Defensive correctness (HIGH)
- [ ] **2.1 Sparkline `Math.max(...data)` → reduce.**
  - One-line fix prevents RangeError on large arrays
- [ ] **2.2 API discriminated union.**
  - `fetchRecent`/`fetchStats` return `{ status: 'ok'|'error', data, error? }`
  - `App.tsx` branches on error → red banner "Telemetry API unreachable"
  - DEMO state only kicks in on success+empty, never on error
- [ ] **2.3 Menu toast surfaces real err.message.**
  - Branch on `err?.name` for permission/rate-limit/sub-not-found
  - At minimum pass `err.message` through to toast

### Stage 3 — ESLint + deploy gate (HIGH)
- [ ] **3.1 Fix lint errors blocking `npm run deploy`.**
  - Floating-promise on `refresh()` in App.tsx
  - `window`/`document` undefined → add browser globals to eslint.config.js
  - `React` undefined → JSX runtime config
  - `any` → tighten types or `unknown`
- [ ] **3.2 Verify `npm run deploy` passes after fixes.**

### Stage 4 — Idempotency semantics (MED)
- [ ] **4.1 `reserveAction` pending/done pattern.**
  - Write `cm:action:pending:{hash}` with 5-min TTL BEFORE side-effect
  - After success: promote to `cm:action:done:{hash}` with 7d TTL + delete pending
  - On crash: pending TTL expires in 5min, next retry attempts the action
- [ ] **4.2 `acquireLock` release defensive.**
  - Wrap release body in try/catch; log; rethrow original error from caller's try-block

### Stage 5 — Devvit API hygiene (LOW)
- [ ] **5.1 `submitCustomPost` use `entry` not `splash`.**
  - `splash` field deprecated in @devvit/reddit 0.12.23
  - Use `entry: 'default'` + `textFallback: 'Open ContextMod Observatory'`
- [ ] **5.2 Gate DEMO data behind `import.meta.env.DEV`.**
  - Production builds get an "API not ready" banner instead of fake actions
  - Per Codex: invented data in production is risky for Devvit app review

### Out of scope (defer)
- TODO Phase X markers — they're roadmap, keep
- npm audit: 35 vulns, mostly devDep transitive (tmp, inquirer in @devvit/start) — no runtime exploit surface
- CSP eval warning: comes from Vite dev React Refresh, not production bundle
- Visibility-aware polling — Day 14 polish
- Structured logger w/ error IDs — Day 14 polish
- devvit.json schema deep validation — verified working via successful playtest deploys

## Test plan
- `npm run type-check` — must pass
- `npm run lint` — must pass (was failing)
- `npm test` — runs vitest, must pass (including new fnv1a64 golden tests)
- `npm run build` — must pass
- Playtest deploy — Observatory still renders, mod menu still works
- Manual: post in test sub → check no duplicate handler runs (idempotency)
