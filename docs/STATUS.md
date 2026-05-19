# ContextMod Devvit — Status

> **Why this lives in `docs/`, not the README hero:** the README pitches what
> ContextMod is + how to install it. This doc is the verbose audit trail —
> phase-by-phase ship state, component readiness, test/CI/Lighthouse snapshots,
> what was cut and why. Useful for hackathon judges who want depth + for
> contributors mapping their work onto the wave history.

**As of:** 2026-05-19 · v0.6.7 tagged · `cm-devvit@0.6.7` in App Directory review.

---

## Shipped phases

| Phase | State | Notes |
|-------|-------|-------|
| **Phase 0** — Scaffold | ✅ Shipped | `devvit.json` + routes + idempotency primitives + Observatory dashboard chrome |
| **Phase 1** — Rule engine | ✅ Shipped | regex + author + ruleSet + named rules + Mustache + filters + run state machine + NOT combinator |
| **Phase 2** — Actions + handleActivity | ✅ Shipped | 8 actions (remove · approve · lock · comment · report · ban · userFlair · distinguish) + handleActivity orchestrator + URL-dedupe repost rule (promoted from Phase 4) |
| **Phase 3** — Config UX + live dashboard | ✅ Shipped | wiki loader cron + reload-config menu + onAppInstall seed + onAppUpgrade migrations + live `/api/recent` ZRANGE |
| **Step 3.6** — Dry-run rule tester | ✅ Shipped | mod menu → form → toast bullets; non-contract `dryRunActivity` sibling preserves read-once config invariant |
| **Phase 4** — `history` / `attribution` / `recentActivity` rules | ✅ Shipped 2026-05-18 | Vinh's author-history cache + 3 stretch rules. Live-verified on `r/contextmod_vinh_dev` |
| **Phase 4.7** — Image-mode `repost` (perceptual blockhash) | ✅ Shipped 2026-05-18 | Pure-JS pipeline (`upng-js` + `jpeg-js` + `blockhash-core`), preview.redd.it variants, 256-bit hash, Hamming distance, per-sub lock |

## Hackathon mod-UX features (Wave S+T, all shipped v0.3.0+)

| Feature | Notes |
|---------|-------|
| **S1 Rule simulation against history** ⭐ | Demo money shot — mod opens mod menu → clicks "Simulate rule against history" → form modal → pastes JSON5 → toast "Would have fired N/25 (X%) on recent items. Examples: t3_a, t3_b, t3_c" |
| **S2 Per-event drill-down** | Click an event row → expand → run/check/rule context + matched substring + actions list w/ status markers |
| **S4 Onboarding tour** | First-visit 3-step walkthrough w/ localStorage gate (Wave U fail-open fix for restricted iframes) |
| **S5 AI rule explainer** | mod menu → "Explain a rule with AI" → form → OpenAI gpt-4o-mini → plain-English 2-3 sentence summary |
| **S6 Filter chips** | All / remove / comment / approve / lock / report / ban / flair / distinguish / failed / dry-run |
| **S7 Mobile-responsive** | EventRow grid 44/60 → 32/48 sub-sm + drop activityId; ActionBar flex-col |
| **S10 Mute/unmute rule** | Redis hash store + 3 API endpoints w/ mod-auth gate. Hard-mute wired into `runCheck` v0.6.x AE CRITICAL #4 |
| **S12 E2E Playwright CI** | 7 dashboard scenarios across chromium + firefox + webkit. Trace + artifact upload on failure |
| **V7 AI summary per event** | Drill-down "Explain with AI" button → OpenAI summarizes the firing reason. 24h response cache |
| **Wave Y mod-UX detail** | Per-rule stats table · mod-activity attribution feed · config rev diff viewer modal · keyboard shortcuts (`?`/`r`/`h`/`a`/`esc`) · light-mode toggle |

## Adversarial-review hardening waves

| Wave | Findings closed | Spec / agent rotation |
|------|----------------|-----------------------|
| Codex initial | 2 CRITICAL + 10 HIGH | idempotency double-action · dry-run authority · repost SET NX · atomic INCR config publish · read-once invariant · Mustache markdown injection · filter regex try/catch · parsed-config invariant |
| Wave U code review | 5 BLOCKER + 1 CRITICAL + 11 WARN | Codex + Explore + silent-failure-hunter + test-coverage-analyzer + comment-analyzer (5 parallel sub-agents) |
| Wave W + X deep review | 30+ atomic fixes | requireModerator on every mutation/cost endpoint · OpenAI rate-limit + circuit-breaker · configStore parse-fail surfacing · structured JSON logger · deep-health probe · `THREAT-MODEL.md` + `API.md` + `PRIVACY.md` + `data-retention.md` · ErrorBoundary · CodeQL workflow · `.devcontainer` |
| Wave AE Critical + Polish #1–#86 | 70+ findings closed (latest 2026-05-19) | silent-failure-hunter (×2) · code-reviewer · type-design-analyzer · gemini-agent (×2 — pre-AE + brutal-audit) · codex-rescue · vercel:performance-optimizer · repo-sentinel |

## Per-component ship state

| Component | State | Notes |
|-----------|-------|-------|
| Observatory dashboard (React + Vite + Tailwind, 24h sparkline + event stream + dry-run mod menu + AI explainer + config-diff viewer + mod activity feed) | **Production** | Live `/api/recent` ZSET + `?demo=1` synthetic fixture path for screenshots |
| Rule engine — `handleActivity` → `runRun` → `runCheck` → `runRule` (regex / author / ruleSet / history / attribution / recentActivity / repost / imageRepost) | **Production** | 8 rule kinds, named-rule expansion, AND/OR/NOT combinators, postBehavior state machine w/ 100-iter safety break |
| Action handlers (`remove` / `approve` / `lock` / `comment` / `report` / `ban` / `userFlair` / `distinguish`) | **Production** | 8 MVP actions, Reddit-API signatures verified live; Mustache markdown sanitizer; ThingId-branded ids (Polish #81) |
| `handleActivity` orchestrator + `runAction` w/ idempotency wrap | **Production** | Read-once config invariant (D5); per-run + per-action try/catch + wall-clock timeouts (Polish #42/#47/#48); non-retryable 4xx slot-seal (Polish #82) |
| Idempotency primitives (`src/lib/idem.ts`) | **Production** | 13 unit tests · 3-stage (firstSeen + reserveAction + commitAction) · FNV-1a + BigInt · lease owner tokens · compare-and-delete · 60s cron lock · retry budgets aligned (Polish #85) |
| Dry-run rule tester | **Production** | `dryRunActivity` sibling, mod-menu form, idempotency-safe via `bypassIdempotency` |
| URL-dedupe repost rule (`cm:{sub}:repost:url:{hash}`) | **Production** | FNV-1a hash, race-safe SET NX, fail-OPEN on Redis outage |
| Image-hash repost rule (`cm:{sub}:img:hash:recent`) | **Production** | Pure-JS perceptual blockhash, 256-bit hash, Hamming threshold, per-sub lock around findSimilar+recordHash (Polish #61), shape-validated entries (Polish #64) |
| Config UX — wiki loader cron + reload-config menu + onAppInstall default-config seed + onAppUpgrade migrations | **Production** | `loadFromWiki()` 5-min cron, atomic publish via rev pointer w/ PublishError typed, regex cache cleared on publish (Polish #83) |
| `routes/api.ts` `/api/recent` + `/api/stats` + `/api/explain-event` + `/api/explain-rule` + `/api/simulate-rule` + `/api/config-history` + `/api/mod-activity` + `/api/muted-rules` + `/api/health[/deep]` | **Production** | All defensively wrapped (Polish #68); shared `extractServerError` surfaces structured errors to dashboard (Polish #58/#69) |
| `routes/scheduler.ts` cron (`refresh-config`, `stats-rollup`, `image-hash-worker`) | **Production** | Single-flight `acquireLock`; refresh-config logs+returns ignored on PublishError (Polish #63) |
| Devvit configuration (`devvit.json`, fetch allowlist, post entry, scheduler tasks, menu items, forms) | **Production** | 3 menu items + dry-run form + simulate + explain-rule forms declared |
| Hono server routing (`src/index.ts`, `/api/*`, `/internal/*`) | **Production** | Mod-auth gate on every mutation/cost endpoint (Wave W); rate-limit + circuit-breaker on AI endpoints |

## Test + CI snapshot

- **777 tests passing** (Phase 1+2+3+4+4.7 + Step 3.6 + Codex regression + Waves S/T/U/V/W/X/Y/Z/AA/AB/AC/AD/AE hardening + Polish #1-#86)
- `tsc --build` clean · `npm run lint` clean
- **Production npm-audit: 0 vulnerabilities** (devDependencies show 36 transitive vulns via `@devvit/*` SDK; not shipped)
- CI all-green across 8 jobs: validate (Node 20/22/24) + ai-tone (soft) + e2e Playwright (chromium/firefox/webkit) + CodeQL + Semgrep + axe-core + dependency-cruiser + release-drafter
- Lighthouse CLI v13.3.0 (mobile, 4× CPU throttle, Slow 4G): **Performance 84, Accessibility 100, Best Practices 100, CLS 0.04 (good), TBT 0 ms**

## Cut + deferred

| Item | State | Why |
|------|-------|-----|
| **MHSRule** (ModerateHateSpeech toxicity HTTP fetch) | ✂️ Cut | Reddit PR #96 (2026-05-08) — HTTP fetch policy AI-provider allowlist excludes ModerateHateSpeech (only OpenAI + Gemini permitted). Subs using upstream CM for hate-speech keep running PRAW. |
| Post-hackathon AI moderation classifier | Deferred | Anthropic via OpenAI-compatible adapter on the roadmap. Gated on Reddit's fetch policy adding a moderation-classifier carve-out. |
| DispatchAction (upstream CM event-bus side-effect) | Cut | Upstream-only pattern; not needed for the Devvit per-sub model. |
| Multi-bot operator pool | Cut | Upstream CM model. Devvit per-install isolation makes a single shared bot pool architecturally moot. |

---

For the implementation timeline, see [`CHANGELOG.md`](../CHANGELOG.md). For the team-coordination
plan + Stephen+Vinh split, see [`PLAN.md`](../PLAN.md). For the architecture diagram + request
lifecycle, see [`README.md` § Architecture](../README.md#architecture).
