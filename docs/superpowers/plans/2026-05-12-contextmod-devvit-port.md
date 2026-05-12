# ContextMod → Devvit Web Implementation Plan (v2)

> **v2 lock 2026-05-12 EOD.** Supersedes v1. Bakes in findings from triple-review: Claude manual + Codex adversarial + ultraplan PR. Major deltas tagged `Δ from v1` inline.
>
> See `context-mod-devvit/PLAN.md` for day-to-day status board with ownership + 4h stale-lock TTL. This doc is architecture-level reference.

> **For agentic workers:** REQUIRED SUB-SKILL — Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax.

---

## Goal

Port FoxxMD's context-mod (dormant since Apr 2023, MIT-licensed TypeScript rule-engine moderation bot) to Reddit's Devvit Web platform. Ship a polished MVP covering 80% of CM mod value PLUS image-hash repost detection as differentiator (gated on Day-2 spike). Submit to Reddit Mod Tools and Migrated Apps Hackathon by 2026-05-27 6:00 PM PT. Target: Best Ported App ($10K grand prize).

**Status as of v2 lock:**
- Written permission from FoxxMD: CONFIRMED (Discord, May 5–12)
- FoxxMD added Stephen as collab on github.com/FoxxMD/context-mod ✓
- WAU eligibility: CONFIRMED. Primary r/mealtimevideos 60K visitors/wk (FoxxMD's instance). Secondary r/piercing 600K visitors / 12K contributors (SampleOfNone). Tertiary 15+ third-party operators per FoxxMD.
- Public endorsement: FoxxMD posted entry in his Discord + github issue 152
- Vinh: back on board, ~5–10 hr/wk capacity
- Phase 0: COMPLETE. 11 commits on github.com/StephenSook/context-mod-devvit (private, flip public Day 14)
- App registered as `cm-devvit` on Devvit, deployed v0.1.0 to r/cm_devvit_test playtest

---

## Architecture (Δ from v1)

- **Δ Redis primitives constrained:** strings + hashes + sorted sets ONLY. No Lists (LPUSH/LRANGE), no Sets (SADD). Recent events use ZADD score=timestamp. Stats use HINCRBY. Config uses string keys w/ revision pointer.
- **Δ Dual idempotency design** (per ultraplan H2 + Codex HIGH): `cm:proc:{thingId}` 24h TTL for trigger dedupe + `cm:action:{hash}` 7d TTL for per-action side-effect dedupe. Already shipped in `src/lib/idem.ts`.
- **Δ Atomic config publish** (per Codex HIGH): Each loaded config writes immutable `cfg:rev:{n}` then atomically bumps `cfg:current_rev` pointer. handleActivity reads pointer once at event start, carries `n` through entire pipeline. Prevents mid-event tear under concurrent reload.
- **Δ Cron single-flight locks** (per ultraplan M1): `acquireLock(taskName)` at top of every cron handler. 60s lock TTL. Already shipped.
- Devvit Web (Hono + Vite + TypeScript, CommonJS server bundle) per-subreddit installable app
- Activity → Check → Rule → Action pipeline ported as pure functions, replacing CM's class-based engine
- Trigger-driven (onPostSubmit, onCommentSubmit, onAppInstall, onAppUpgrade) replaces CM's continuous polling streams
- Wiki-based config (JSON5, AJV-validated) preserves CM mod muscle memory at `r/<sub>/wiki/botconfig/contextmod`
- Custom post component for recent-actions dashboard (Vite + React)
- Image hashing async via `scheduler.runJob` — never inline in trigger (avoids 30s timeout)

**Tech Stack:**
- Node 22.2+, CommonJS server bundle
- Hono via `@devvit/web/server` (re-exports `reddit`, `redis`, `scheduler`, `settings`, `cache`)
- AJV 8 + JSON5 + Mustache
- Vite + React + Tailwind via `@devvit/start/vite` (client custom post)
- vitest
- `npx devvit playtest` / `npx devvit upload --bump minor` / `npx devvit publish --public`

---

## Critical Changes from v1

| # | Δ | Source | Impact |
|---|---|---|---|
| C1 | Redis: strings + hashes + sorted sets only (no Lists, no Sets) | Codex CRITICAL #1 | Recent events ZSET-backed, not LPUSH list. Dispatch index removed. |
| C2 | Dual idempotency (`cm:proc` + `cm:action`) | ultraplan H2 + Codex HIGH | New helpers in `src/lib/idem.ts` already shipped |
| C3 | Atomic config publish via revision pointer | Codex HIGH | New `configStore.ts` module wraps Redis writes |
| C4 | Cron single-flight via `acquireLock` | ultraplan M1 | Helper shipped; every cron handler wired |
| C5 | Image-hash gated on Day-2 spike | All 3 reviews | If spike NO-GO → stub feature, reclaim ~3 days |
| C6 | Cut DispatchAction | Codex + ultraplan | Saves ~1.5 days |
| C7 | Cut SentimentRule | NLP libs won't bundle in Devvit runtime | Saves ~1 day |
| C8 | Cut full RepostRule w/ YouTube | Out of scope for hackathon | URL-dedupe stub replaces |
| C9 | Cut RepeatActivityRule | Defer post-hackathon | Saves ~1 day |
| C10 | Submission writeup voice: first-person build notes | Watchful1 lesson | Stephen writes from build notes, NO AI prose |
| C11 | Privacy + ToS hosted URL required Day 0 | Devvit Rules for fetch apps | Shipped to `policies/` Day 0; GH Pages host Day 14 |
| C12 | Day-1 priority: submit i.redd.it + preview.redd.it for domain approval | All 3 reviews | DONE — pending status visible on dashboard |
| C13 | Schema versioning + onAppUpgrade migration | Codex MED | Each schema bump → migration step in `src/state/migrations.ts` |
| C14 | Dead-letter queue for failed `reddit.*` calls | Codex MED | `failed_actions:queue` ZSET, retry on next cron |
| C15 | Cache `cfg:current` in process memory | Codex MED | Avoids hot-path Redis read; invalidate on revision bump |

---

## Phase 0 — DONE (recap)

Completed on Day 0 (2026-05-12):

- Devvit Web Mod Tool template cloned + customized
- `devvit.json` configured: 4 triggers, 4 cron tasks, 3 menu items, 1 form, 5 fetch domains
- `package.json` + LICENSE (MIT) + NOTICES.md (BSD-3 + FoxxMD MIT attribution) + README crediting FoxxMD
- `policies/privacy.md` + `policies/terms.md` (Devvit Rules requirement for fetch-enabled apps)
- `src/lib/idem.ts` — dual idempotency (`firstSeen`, `reserveAction`, `releaseAction`) + cron single-flight (`acquireLock`) + FNV-1a 64-bit hash (pure JS)
- `src/routes/{triggers,scheduler,menu,forms,api}.ts` — bulletproof stubs returning empty 200, matching every devvit.json path
- `src/index.ts` — Hono root mounting `/api`, `/internal/{triggers,cron,menu,form}`
- npm deps: hono, ajv, json5, mustache, vitest, devvit 0.12.23, @devvit/web 0.12.23, @devvit/start 0.12.23
- GitHub repo `StephenSook/context-mod-devvit` private, 11 commits pushed
- vinhbin added as push collaborator
- Reddit dev account verified, app slug `cm-devvit` registered
- Private test sub `r/cm_devvit_test` created
- `npx devvit playtest cm_devvit_test` LIVE — v0.1.0.1 deployed, triggers + cron firing
- Domain approval submitted: external-i.redd.it + external-preview.redd.it (Pending)
- `docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md` (this doc, v2)
- `PLAN.md` at project root with status table + decisions + protocol
- `scripts/plan` CLI helper

---

## Phase 1 — Core Engine (Day 2–5, ~24h, Vinh-led)

See PLAN.md tasks 1.1–1.8.

### Task 1.1 — Central Redis key schema (Vinh, 1–2h)

**Files:** Create `src/server/state/keys.ts`, test `tests/state/keys.test.ts`

- [ ] Test verifies every K helper produces correct namespaced string
- [ ] Implement `const K = { configCurrent, configRev, configCurrentRev, seenActivity, authorProfile, authorFlair, recentEvents, recentEventsByActivity, statsTrigger, statsAction, imageHashByPost, imageHashBucket, repostUrl, rateLimit, dashboardPostId, schemaVersion, failedActionsQueue }`
- [ ] Cover Δ C1: no LIST or SET-data-type keys; everything maps to string/hash/zset
- [ ] Commit: `feat(state): central Redis key schema (Δ C1)`

### Task 1.2 — Config loader: JSON5 + AJV + named-rule expansion (Vinh, 2–3h)

**Files:** Copy `/Users/stephensookra/Reddiit Hacks/context-mod/src/Schema/App.json` to `src/server/schema/app.schema.json`. Trim defs for cut rules (SentimentRule, RepeatActivityRule, full RepostRule, DispatchAction, MessageAction, ModNoteAction, UserNoteAction, SubmissionAction, ContributorAction, CancelDispatchAction). Add `schema_version: "1"` required field at root. Keep: RegexRule, AuthorRule, RuleSet, SubmissionCheck, CommentCheck, Run, HistoryRule, AttributionRule, RecentActivityRule, MHSRule, RepostRule (URL-only mode), actions Approve/Remove/Lock/Comment/Report/Ban/UserFlair.

- [ ] `src/server/core/namedRules.ts` — `extractNamedEntities` + `insertNamedEntities` walking config tree
- [ ] `src/server/core/config.ts` — `parseConfig(raw: string): Promise<ValidatedConfig>` using JSON5 + Ajv + named-rule expansion + schema_version check
- [ ] Tests for both modules
- [ ] Commit: `feat(config): JSON5 + AJV + named-rule expansion + schema_version`

### Task 1.3 — Atomic config publish via revision pointer (Vinh, 1–2h, Δ C3)

**Files:** Create `src/server/state/configStore.ts`

- [ ] `loadCurrent()`: GET `cfg:current_rev` → returns int n → GET `cfg:rev:{n}` → parse JSON → return; cache in module-scope w/ revision tag
- [ ] `publish(config)`: get next rev, SET `cfg:rev:{n+1}` immutable, atomically bump `cfg:current_rev` to n+1
- [ ] `invalidateCache()`: clears in-process cached config
- [ ] handleActivity reads `current_rev` ONCE at event start, passes `n` to every downstream call → guarantees single-version semantics per event
- [ ] Tests with mocked redis
- [ ] Commit: `feat(state): atomic config publish via revision pointer (Δ C3)`

### Task 1.4 — Filter evaluation (Vinh, 2–3h)

**Files:** `src/server/core/filters.ts`, `tests/filters.test.ts`

Port from `/Users/stephensookra/Reddiit Hacks/context-mod/src/Common/Infrastructure/Filters/{FilterShapes,FilterCriteria,AuthorCritPropHelper}.ts`. MVP subset only.

- [ ] `evalAuthorIs(filter, author)` — handles include/exclude w/ AuthorCriteria (name, nameMatch, age, linkKarma, commentKarma, totalKarma, flairText, isMod, isContributor, verified, shadowBanned)
- [ ] `evalItemIs(filter, item)` — handles include/exclude w/ ItemCriteria (removed, approved, locked, stickied, score, age, title, over18, isSelf, linkFlairText, depth, op)
- [ ] Helpers: `cmpNum` (handles `>`, `>=`, `<`, `<=`, exact match), `matchString` (handles `/regex/flags` syntax)
- [ ] include semantics: any-criteria-set matches passes. exclude semantics: any-criteria-set match fails.
- [ ] 12+ test cases covering each criteria field
- [ ] Commit: `feat(core): filter evaluation (authorIs + itemIs)`

### Task 1.5 — Mustache renderer (Vinh, 30min)

**Files:** `src/server/core/template.ts`, `tests/template.test.ts`

- [ ] `import Mustache from 'mustache'; Mustache.escape = s => s;` — no-escape mode, Reddit accepts raw text
- [ ] `renderTemplate(tmpl, ctx)` — ctx = `{ item, author, manager, rules, actions }`
- [ ] Tests for nested dot-paths, missing fields, long strings, special chars
- [ ] Cap: truncate output to 10K chars (Reddit comment limit)
- [ ] Commit: `feat(core): Mustache renderer w/ no-escape + 10K truncation`

### Task 1.6 — Rule dispatcher + MVP rules (Vinh, 2–3h)

**Files:** `src/server/core/runRule.ts`, `src/server/rules/{regex,author,ruleSet}.ts`

- [ ] `runRule(cfg, item, author): Promise<RuleResult>` — dispatches by cfg.kind, applies rule-level authorIs/itemIs guards
- [ ] `regex.ts` — RegexRule: matches title/body/url against regex, handles matchThreshold
- [ ] `author.ts` — AuthorRule: thin wrapper over evalAuthorIs
- [ ] `ruleSet.ts` — evalRuleSet AND/OR over child results
- [ ] All tests
- [ ] Commit: `feat(rules): Regex + Author + RuleSet + dispatcher`

### Task 1.7 — Check evaluation (Vinh, 1h)

**Files:** `src/server/core/runCheck.ts`, `tests/core/runCheck.test.ts`

- [ ] `runCheck(check, item, author): Promise<CheckResult>` — applies check-level filters, runs all rules, aggregates via AND (default) or OR
- [ ] Returns `{ triggered, data, rules: RuleResult[] }`
- [ ] Tests
- [ ] Commit: `feat(core): runCheck w/ AND/OR aggregation`

### Task 1.8 — Run state machine — postBehavior + goto (Vinh, 2–3h)

**Files:** `src/server/core/runRun.ts`, `tests/core/runRun.test.ts`

- [ ] `runAllRuns(runs, item, author, exec)` — flat index-based state machine
- [ ] Behaviors: `next` | `nextRun` | `stop` | `goto:RUN.CHECK`
- [ ] 100-iteration safety break w/ warn log + early exit
- [ ] Tests covering each behavior + goto target validation + stale-target fallback
- [ ] Commit: `feat(core): Run state machine w/ postBehavior + goto`

---

## Phase 2 — Actions + handleActivity (Day 5–8, ~20h, Vinh-led)

See PLAN.md tasks 2.1–2.5.

### Task 2.1 — Action dispatcher + per-action idempotency (Vinh, 2h, Δ C2)

**Files:** `src/server/core/runAction.ts`

- [ ] `runAction(actionCfg, ctx, redditClient): Promise<{kind, ok, error?, data?}>` — dispatches by cfg.kind
- [ ] **Critical:** computes `actionId = fnv1a64(thingId|kind|payloadHash)`. Calls `reserveAction(actionId)` BEFORE side-effect. If reserved → skip (retry idempotency). After side-effect: if ok → keep reservation. If fail → `releaseAction(actionId)` so retry can re-attempt.
- [ ] Mustache context = `{ item, author, manager: { subreddit }, rules: ruleNamedResults, actions: priorActionResults }`
- [ ] Dry-run flag: skip reddit.* call, return planned action only
- [ ] Tests with mocked actions
- [ ] Commit: `feat(core): action dispatcher w/ per-action idempotency (Δ C2)`

### Task 2.2 — 7 MVP actions (Vinh, 4–6h)

**Files:** `src/server/actions/{remove,approve,lock,comment,report,ban,userFlair}.ts`

Each action is 5–15 LOC over `reddit.*` client. Same shape: `async (cfg, ctx, reddit) => {ok, data?}`. Test one (remove) thoroughly, others follow same pattern.

- [ ] `remove.ts` — `reddit.remove(ctx.item.id, cfg.spam)` + optional `reddit.submitComment` with Mustache-rendered note
- [ ] `approve.ts` — `reddit.approve(ctx.item.id)`
- [ ] `lock.ts` — `reddit.lock(ctx.item.id)`
- [ ] `comment.ts` — `reddit.submitComment(...)` + optional sticky/distinguish on returned Comment
- [ ] `report.ts` — `reddit.report(ctx.item.id, {reason: rendered})`
- [ ] `ban.ts` — `reddit.banUser` w/ Mustache-rendered message/reason/note + duration
- [ ] `userFlair.ts` — `reddit.setUserFlair`
- [ ] Each commit atomic: `feat(actions): remove`, `feat(actions): approve`, etc.

### Task 2.3 — handleActivity orchestrator (Vinh, 2–3h)

**Files:** `src/server/core/handleActivity.ts`, `tests/core/handleActivity.test.ts`

- [ ] Idempotency guard via `firstSeen(activityId)`
- [ ] Load `cfg:current_rev` ONCE at event start, pass rev through entire pipeline (per Δ C3)
- [ ] `runAllRuns` with executor closure that runs runCheck + dispatches actions
- [ ] On rule trigger: build Mustache ctx, dispatch actions w/ per-action idempotency
- [ ] On action fail: log error, push to `failed_actions:queue` ZSET (per Δ C14)
- [ ] Pushes compact event record to `events:recent` ZSET (ZADD score=ts, ZREMRANGEBYRANK trim to 500 entries)
- [ ] Tests with mocked redis+reddit
- [ ] Commit: `feat(core): handleActivity orchestrator (Δ C3, C14)`

### Task 2.4 — onPostSubmit handler (Vinh, 1–2h)

**Files:** Modify `src/server/routes/triggers.ts`

- [ ] Replace `/post-submit` stub with real impl
- [ ] Parse `OnPostSubmitRequest` → map `PostV2` to internal `Item` shape (id, title, body, url, isSelf, over18, score=0, age=0, removed/approved/locked/stickied=false, linkFlairText)
- [ ] Map `UserV2` → internal `Author` (basic fields from payload)
- [ ] Enrich author via `reddit.getUserByUsername` w/ 1h cache via `authorProfile` Redis key
- [ ] Call `handleActivity({item, author, subreddit}, deps)`
- [ ] Return `c.json({}, 200)` always — never throw back to Devvit gateway
- [ ] Playtest smoke: post in r/cm_devvit_test, verify pipeline executes via logs
- [ ] Commit: `feat(triggers): onPostSubmit real handler`

### Task 2.5 — onCommentSubmit handler (Vinh, 1h)

Mirror 2.4 for `OnCommentSubmitRequest`. Comment-specific fields: depth (from CommentV2), op (compare `comment.author.id === post.author.id`), parentId.

- [ ] Implement w/ same shape as 2.4
- [ ] Playtest smoke
- [ ] Commit: `feat(triggers): onCommentSubmit real handler`

---

## Phase 3 — Config UX + Dashboard (Day 9–11, ~16h, Mixed)

See PLAN.md tasks 3.1–3.7.

### Task 3.1 — onAppInstall seeds default config (Vinh, 1h)

**Files:** Modify `src/server/routes/triggers.ts`

- [ ] Replace `/app-install` stub: SETNX-guarded write of starter JSON5 config to `cfg:rev:1` + set `cfg:current_rev = 1`
- [ ] Starter config: one regex rule on title `/spam|scam/i` → Remove with Mustache-rendered comment note
- [ ] Test in playtest: uninstall + reinstall, verify Redis seeds
- [ ] Commit: `feat(triggers): onAppInstall seeds starter config`

### Task 3.2 — Wiki config loader + refresh-config cron (Vinh, 2–3h)

**Files:** `src/server/core/configSource.ts`, modify `src/server/routes/scheduler.ts`

- [ ] `loadFromSource(reddit, settings, subredditName)`:
  - Read `configSource` setting (`wiki` | `inline`)
  - If wiki: `reddit.getWikiPage(sub, settings.wikiPage ?? 'contextmod')`
  - If inline: `settings.inlineConfig`
  - Parse JSON5 → AJV validate → expand named rules → publish via configStore
  - On failure: log + DO NOT overwrite current revision (fail-safe)
- [ ] Wire `/internal/cron/refresh-config` to call `loadFromSource` every 5min (already cron-scheduled)
- [ ] Manual test: edit wiki, wait 5min, verify cfg:current_rev bumps
- [ ] Commit: `feat(config): wiki loader + refresh cron`

### Task 3.3 — Reload-config mod menu (Vinh, 30min)

**Files:** Modify `src/server/routes/menu.ts`

- [ ] Replace `/reload-config` stub: call `loadFromSource` immediately, return `UiResponse.showToast({text: "Config reloaded — N rules"})`
- [ ] Test in playtest: edit wiki, hit menu, verify toast
- [ ] Commit: `feat(menu): reload-config action`

### Task 3.4 — Recent events ZSET + /api/recent (Vinh, 1–2h, Δ C1)

**Files:** `src/server/state/recentEvents.ts`, modify `src/server/routes/api.ts`

- [ ] `pushEvent(event)`: ZADD `events:recent` score=ts member=JSON.stringify(event), then ZREMRANGEBYRANK 0 -501 (trim to 500 most recent)
- [ ] `getRecent(limit=50)`: ZRANGE `events:recent` 0 limit-1 REV → parse each
- [ ] Wire from handleActivity to push compact event `{ts, activityId, runName, checkName, triggered, actions: [{kind, ok}]}`
- [ ] `GET /api/recent` returns `{events: [...]}` from `getRecent`
- [ ] Tests
- [ ] Commit: `feat(state): recent events ZSET + /api/recent (Δ C1)`

### Task 3.5 — Dashboard custom post — Vite + React (Stephen, 4–5h)

**Files:** `src/client/{main.tsx,App.tsx,api.ts,styles.css,index.html}`

- [ ] Add `post` block to `devvit.json` if not present (entry point for inline custom post)
- [ ] React App: recent-actions table polling `/api/recent` every 10s
- [ ] Table cols: timestamp (relative), thing-id (with reddit.com link), run/check name, actions taken (kind + ✓/✗ icons)
- [ ] Manual refresh button + auto-poll toggle
- [ ] Empty state: "No actions yet — make sure your config is loaded and rules are matching."
- [ ] Tailwind mobile-first responsive
- [ ] Lighthouse ≥ 80 mobile inline (Chrome devtools mobile mode test)
- [ ] Mod menu "Pin dashboard post" creates an interactive custom post once via `reddit.submitCustomPost` — idempotent via `K.dashboardPostId` SETNX
- [ ] Commit: `feat(client): dashboard custom post + pin action`

### Task 3.6 — Dry-run rule tester menu + form (Stephen, 2–3h)

**Files:** Modify `src/server/routes/{menu,forms}.ts`, add `dryRun` flag to runAction

- [ ] Add `dryRun: boolean` to runAction — if true, skip reddit.* call, return planned action only
- [ ] `/internal/menu/test-rules`: takes targetId from MenuItemRequest, fetches via reddit.getPostById/getCommentById, runs pipeline with dryRun=true, returns `UiResponse.showForm` summarizing each rule's outcome + planned actions
- [ ] Form submit handler returns toast: "Dry-run complete. See above."
- [ ] Playtest smoke
- [ ] Commit: `feat(menu): dry-run rule tester`

### Task 3.7 — onAppUpgrade migrations (Vinh, 1–2h, Δ C13)

**Files:** `src/server/state/migrations.ts`, modify `src/server/routes/triggers.ts`

- [ ] Migration table indexed by version: `[{v: 1, run: async () => {...}}, ...]`
- [ ] Read current `K.schemaVersion` from Redis, run pending migrations in order, bump version
- [ ] Add v1 migration: ensures `cfg:current_rev` exists (no-op for fresh installs)
- [ ] Document: schema migrations are FORWARD-ONLY. Downgrades break data.
- [ ] Commit: `feat(state): onAppUpgrade migrations (Δ C13)`

---

## Phase 4 — Stretch Features (Day 11–13, ~14h, Vinh-led, image-hash GATED)

See PLAN.md tasks 4.1–4.7.

**Cut criteria entering Phase 4:** Phase 1–3 done, all MVP tests green, real-sub E2E works on r/cm_devvit_test. If ANY of those fails at Day 11, CUT entire Phase 4 and bank time for polish/demo.

**Image-hash sub-gate:** Task 4.7 requires Task 0.10 spike result = GO. If spike NO-GO → image hashing is OUT, Phase 4 ends at 4.6.

### Task 4.1 — URL-dedupe Repost rule (Vinh, 2h)

**Files:** `src/server/rules/repost.ts`, add `repost` to schema

- [ ] On post submit: compute `sha256(normalize(post.url))`
- [ ] Check `K.repostUrl(hash)` in Redis. If exists → trigger w/ reference to original postId. Else `SET ... EX 30d`
- [ ] Normalize: lowercase, strip utm_*, strip trailing slash, sort query params
- [ ] Tests
- [ ] Commit: `feat(rules): URL-dedupe Repost`

### Task 4.2 — MHSRule (Vinh, 1–2h)

**Files:** `src/server/rules/mhs.ts`, add `mhs` to schema

- [ ] Domain `api.moderatehatespeech.com` already allow-listed in devvit.json
- [ ] POST to MHS API w/ content text, parse `{class, confidence}` response
- [ ] Threshold compare via `cmpNum` on confidence
- [ ] Tests w/ mocked fetch
- [ ] Commit: `feat(rules): MHSRule`

### Task 4.3 — History infrastructure (Vinh, 3h)

**Files:** `src/server/state/authorHistory.ts`

Shared by tasks 4.4–4.6.

- [ ] `getAuthorHistory(username, kind: 'submissions'|'comments', windowDays=90)`:
  - Check cache `author:{name}:history:{kind}` w/ 1h TTL
  - If miss: `reddit.getPostsByUser` or `reddit.getCommentsByUser` paginated
  - Filter by window, aggregate {totalCount, byMonth, bySubreddit, totalKarma}
  - Write cache
- [ ] Pagination cap: 1000 items max per fetch to bound runtime
- [ ] Tests w/ mocked reddit
- [ ] Commit: `feat(state): author history infrastructure`

### Task 4.4 — HistoryRule (Vinh, 1–2h)

**Files:** `src/server/rules/history.ts`, add to schema

- [ ] Use `getAuthorHistory`, evaluate config thresholds (submissionCount, commentCount, totalKarma, subredditDistribution)
- [ ] Tests
- [ ] Commit: `feat(rules): HistoryRule`

### Task 4.5 — AttributionRule (Vinh, 1–2h)

**Files:** `src/server/rules/attribution.ts`, add to schema

- [ ] Use `getAuthorHistory(submissions)`, count posts to a specific domain or aggregateOn-target. Threshold compare.
- [ ] Tests
- [ ] Commit: `feat(rules): AttributionRule`

### Task 4.6 — RecentActivityRule (Vinh, 1–2h)

**Files:** `src/server/rules/recentActivity.ts`, add to schema

- [ ] Use `getAuthorHistory`, count activities per target subreddit list, threshold per-sub
- [ ] No image-detection sub-mode (image features only in 4.7)
- [ ] Tests
- [ ] Commit: `feat(rules): RecentActivityRule`

### Task 4.7 — Image-hash port + worker + multi-index LSH (Vinh, 4–6h, GATED on 0.10)

**Files:** `src/server/image/{blockhash,hashImage}.ts`, `src/server/state/imageHashes.ts`, `src/server/rules/imageRepost.ts`, modify `src/server/routes/scheduler.ts`

**Only proceeds if Task 0.10 spike = GO.**

- [ ] Port CM's `src/Common/blockhash/blockhash.ts` to `src/server/image/blockhash.ts`. Remove Node-only deps. Use pure-JS image decoder (per 0.10 spike result).
- [ ] `hashImage(url): Promise<string>`: fetch via Reddit CDN, decode, blockhash → 64-char hex
- [ ] Skip if URL not in allow-listed Reddit image hosts
- [ ] `src/server/state/imageHashes.ts` — multi-index LSH (per Codex HIGH #5):
  - Split 64-bit hash into 4 × 16-bit segments
  - `storeHash(hash, postId)`: ZADD `imghash:bucket:{segIdx}:{segValue}` postId for each of 4 segments
  - `findSimilar(hash, threshold=8)`: ZRANGE each bucket, union candidates, compute Hamming distance, return matches
- [ ] Image-hash worker at `/internal/cron/image-hash-worker`:
  - Enqueue from onPostSubmit (only `{postId, imageUrl}`, store in `K.imageHashQueue` ZSET)
  - Drain up to 8 items per invocation w/ 25s budget
  - Memory cap: bail if fetch body > 6MB
  - Idempotent via per-postId `cm:imghash:job:{postId}` SETNX guard
- [ ] `imageRepost.ts` rule: on new post, lookup hash if image post, findSimilar against stored hashes, trigger w/ reference to original
- [ ] Tests w/ mocked redis + mocked fetch
- [ ] Commit: `feat(image): blockhash + LSH + async worker + repost rule (Δ C5)`

### Task 4.8–4.11 — CUT (per v2 reviews)

- ✂️ **4.8 DispatchAction** — Cut per Codex + ultraplan. Saves ~1.5d.
- ✂️ **4.9 SentimentRule** — Cut. NLP libs (@nlpjs, vader) won't bundle in Devvit runtime. Saves ~1d.
- ✂️ **4.10 Full RepostRule w/ YouTube** — Cut. 4.1 + 4.7 cover MVP. Saves ~1d.
- ✂️ **4.11 RepeatActivityRule** — Cut. Defer post-hackathon. Saves ~1d.

---

## Phase 5 — Tests + Demo + Submission (Day 13–15, ~10h, Stephen-led)

See PLAN.md tasks 5.1–5.6.

### Task 5.1 — AJV schema golden tests (Vinh, 2–3h)

**Files:** `tests/config.test.ts`, `tests/fixtures/cm-configs/*.json5`

- [ ] Copy 5–10 real CM configs from public subs running ContextMod (FoxxMD can provide)
- [ ] Each fixture: parse + validate, assert passes
- [ ] Plus 5+ negative fixtures: malformed JSON, unknown rule kinds, missing required fields → assert specific error messages
- [ ] Commit: `test(config): golden tests for real CM configs`

### Task 5.2 — Rule eval unit tests (Vinh, 1–2h)

**Files:** `tests/rules/*.test.ts` — fill out beyond MVP tests already shipped

- [ ] Each rule kind: 3+ tests covering trigger, no-trigger, edge cases
- [ ] Coverage ≥ 80% on `src/server/rules/`
- [ ] Commit: `test(rules): unit coverage for all kinds`

### Task 5.3 — E2E scenarios on real test sub (Stephen, 2–3h)

Record GIFs/screenshots → `docs/demo-scenarios/`:
- [ ] A: regex remove + comment note
- [ ] B: AuthorRule age-gate from throwaway acct
- [ ] C: RuleSet AND combining regex + author
- [ ] D: goto two-run config (escalate to warn)
- [ ] E: wiki reload mod menu changes behavior
- [ ] F: dashboard recent-actions populates, mobile view passes
- [ ] G: URL dedupe — submit same URL twice, 2nd triggers
- [ ] H: image-hash repost — submit visually identical image twice, 2nd triggers (if 4.7 shipped)

### Task 5.4 — README polish + Fetch Domains (Stephen, 1h)

- [ ] Project description
- [ ] FoxxMD credit prominent + link to github.com/FoxxMD/context-mod + MIT note
- [ ] Install walkthrough
- [ ] Wiki config schema reference
- [ ] `## Fetch Domains` section explaining each domain (Devvit Rules requirement)
- [ ] Changelog initial release
- [ ] Privacy + Terms of Service links (host on GH Pages after public flip)
- [ ] Migration guide for existing CM operators

### Task 5.5 — 60s demo video (Stephen, 2–3h)

**Script:**
- 0–10s: Reddit mods do 466 hr/day unpaid labor ($3.4M/yr) [Li 2022]. 73% of mod actions are bot-driven. CM is the most sophisticated mod-bot rule engine ever shipped on Reddit.
- 10–25s: r/mealtimevideos 60K wk visitors, r/piercing 600K visitors / 12K contributors, 15+ third-party operators. The 2021 capacity wall on the original PRAW infrastructure. Devvit's per-sub install solves it.
- 25–50s: install on a test sub → wiki config edit → automatic action → dashboard recent-actions populates → image-hash repost detection demo (if shipped)
- 50–60s: $1K migration bounty to FoxxMD, eligible for $75K Developer Funds, ready for r/mealtimevideos + the rest of CM operators today.

**Tooling:** OBS Studio + Audacity + ffmpeg. Hard cap 60s. Upload unlisted YouTube.

### Task 5.6 — Submission writeup (Stephen, 1–2h, Δ C10)

**Voice: first-person build notes. NO AI-tone marketing prose.** Specific bugs hit, exact cuts made, screenshots, concrete FoxxMD credit.

Hit Devpost requirements:
- Tool Overview — capabilities, what mods get
- Project Impact — cite r/mealtimevideos 60K + r/piercing 600K + 15+ operators; tie to 466 hr/day + 73% bot-driven stats
- Original Bot username — `u/ContextModBot` (confirm w/ FoxxMD)
- Port Completion — list what's ported, what's simplified (multi-bot dropped because Devvit per-sub install obsoletes it), what's stretch
- Repo link + App link + Helper nominations

---

## Phase 6 — Ship (Day 15–16, ~6h, Stephen)

See PLAN.md tasks 6.1–6.2.

### Task 6.1 — Public publish (Stephen, 1h + review wait)

- [ ] Final `npm run type-check && npm test` → all green
- [ ] Final playtest sanity: scenarios A–H
- [ ] Flip GitHub repo to **public** (was private during build)
- [ ] Enable GitHub Pages from `policies/` for Privacy + ToS URLs (per Δ C11)
- [ ] Update `developers.reddit.com/apps/cm-devvit/developer-settings` → add Privacy + ToS URLs
- [ ] `npx devvit publish --public --bump minor` (bumps to 0.2.0+)
- [ ] Wait for review (1–7 business days). Premium features (HTTP fetch + Reddit image domains) push toward upper end.
- [ ] Submit on Devpost before May 27 6 PM PT

### Task 6.2 — Backup contingency (Stephen, if needed)

If app review still Pending at submission deadline:
- [ ] Submit Devpost anyway with unlisted listing + repo link + 60s video + clear README explaining "pending public app review"
- [ ] Notify Reddit team via r/Devvit modmail w/ submission link + hackathon context

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Domain approval delayed past Day 8 | MED | Image-hash blocked | Submitted Day 0. Escalate r/Devvit modmail Day 5 if Pending. Fallback: external Lambda hasher on s3.amazonaws.com (allow-listed). |
| Phase 4 image-hash burns 3+ days w/o spike GO | MED | Polish/demo time eaten | Hard gate at Task 0.10 EOD Day 2. NO-GO → cut feature, reclaim time. |
| Vinh capacity below 5–10 hr/wk | MED | Schedule slip | Cut 4.4–4.6 history-based rules first, then 4.7 image-hash, then 4.2 MHS. Ship MVP cleanly. |
| AI-tone burn in submission writeup (Watchful1 lesson) | MED | Lower judging scores | Per Δ C10. Stephen writes from build notes. AI for outline only. |
| Reddit's app review backed up past May 27 | MED | Submission as private | Submit `--public` no later than Day 14. Backup contingency in 6.2. |
| PLAN.md drift between Stephen + Vinh | LOW | Integration bugs | Atomic plan commits, 4h stale-lock TTL, daily sync ping. |
| context-mod-devvit/PLAN.md → main spec divergence | LOW | Stale doc | Master spec (this file) updated at major checkpoints. PLAN.md is daily. |
| GitHub repo flipped to public reveals half-finished code | LOW | Polish perception | Code freeze Day 14 noon. Final commits clean up TODOs + add changelog. |

---

## Decision Log

### D1 — Devvit Web (not Blocks)
Blocks dies June 30, 2026. Devvit Web is the only forward path. **Locked 2026-05-12.**

### D2 — CommonJS server bundle
Devvit Web requires CJS. Template confirms. `package.json type:module` but vite outputs `dist/server/index.cjs`. **Locked 2026-05-12.**

### D3 — Redis primitives: strings + hashes + sorted sets only
NO Lists, NO Sets data type. Per Codex CRITICAL #1. **Locked 2026-05-12.**

### D4 — Dual idempotency
`cm:proc:{thingId}` 24h + `cm:action:{hash}` 7d. Implemented `src/lib/idem.ts`. **Locked 2026-05-12.**

### D5 — Atomic config publish via revision pointer
`cfg:rev:{n}` + `cfg:current_rev` pointer. handleActivity carries `n` through pipeline. **Locked 2026-05-12.**

### D6 — Cron single-flight via acquireLock
60s TTL. Already wired. **Locked 2026-05-12.**

### D7 — Path B scope (post triple-review)
MVP: Regex/Author/RuleSet + 7 actions + filters + named rules + Mustache + wiki config + dashboard + dry-run tester.
Stretch: URL repost + MHSRule + HistoryRule + AttributionRule + RecentActivityRule + image-hash (GATED).
CUT: DispatchAction, SentimentRule, full RepostRule w/ YouTube, RepeatActivityRule, Web UI w/ Monaco, multi-bot. **Locked 2026-05-12.**

### D8 — Image hashing gated on Day-2 spike
If 0.10 shows fetch+decode+hash works <5s and <100MB peak memory, ships. Else stub. **Deadline: end of Day 2.**

### D9 — Wiki page name: `botconfig/contextmod`
Matches CM convention. **Locked 2026-05-12.**

### D10 — Submission writeup voice: first-person build notes
NO AI-tone marketing prose. Watchful1 lesson. **Locked 2026-05-12.**

### D11 — Reddit handle for app
u/CowSufficient3840 (Stephen's logged-in account). Reflected in `policies/*.md`. **Locked 2026-05-12.**

### D12 — App slug: `cm-devvit` (not `context-mod`)
16-char Devvit limit. Also keeps `context-mod` slug open if FoxxMD publishes his own port later. **Locked 2026-05-12.**

### D13 — Repo flip public on Day 14 (not Day 0)
Build private, ship public. Submission requires public listing in App Directory. **Locked 2026-05-12.**

---

## Sookra Pillar 5 — Hard Numbers (for submission writeup + voiceover)

Sourced from `/Users/stephensookra/.claude/plans/purrfect-mapping-dusk-agent-a9717d3cd25506753.md` Pillar 5 dossier. Every claim citation-traceable.

1. **466 hr/day moderation labor on Reddit.** Li/Hecht/Chancellor ICWSM 2022 (arxiv.org/abs/2205.14529). At $20/hr UpWork median = $3.4M/yr unpaid labor.
2. **73% of mod actions performed by bots.** Same paper.
3. **Reddit 127M DAU, 493M WAU Q1 2026, $663M Q1 2026 revenue (+69% YoY).** Q1 2026 earnings transcript.
4. **5.3B posts+comments Reddit H1 2024, 3% removed (1.6% mod-initiated).** Transparency Report H1 2024.
5. **AutoMod "~82% reviewed, ~8% acted on"** — hedge as "per Reddit's own published data" since primary source not directly findable.
6. **138K active subreddits, ~60K active mods, zero paid moderators.** 10-K 2024 + Statista.
7. **App Migration Program $1,000 bounty to FoxxMD** + **Developer Funds up to $75K per app.**
8. **2023 API blackout: 8,800 subs private, 28,606 mods participated, 2.79B subscribers affected.** Frame: "the moment that necessitated this port."
9. **Discord Carl-bot: 14.2M servers, 1.66B users, $5/mo premium.** Latent-demand framing.
10. **Direct citation: r/mealtimevideos 60K visitors/week** (FoxxMD's primary CM instance). **r/piercing 600K visitors / 12K contributors** (SampleOfNone). **15+ third-party CM operators** per FoxxMD.

---

## Multi-Model Handoff

Specific routings, not blanket "ask all models":

- **Gemini 2.5 Pro long-context:** Done Day 0 (context-mod source map). Re-engage Day 12 to review our trimmed AJV schema against CM's original `Schema/App.json` for missed required fields.
- **Codex (GPT-5.5) pre-ship review Day 14:** stage `git diff main..HEAD`, pipe through Codex CLI rescue subcommand for bugs, missing tests, Redis quota risks, idempotency holes.
- **ChatGPT / NotebookLM:** ONLY for Sookra Pillar 5 polish on Day 14. NotebookLM ingests Li et al. paper + Reddit earnings for one killer voiceover quote.
- **DeepSeek:** Skip. No marginal value over the stack above.

Do NOT run Sookra Council — concept locked. Council is pre-build pressure-test, not execution-phase tool.

---

## Done When

- [ ] All Phase 1–3 tests green (`npm test`)
- [ ] `devvit publish --public` accepted in App Directory
- [ ] App installed + working on at least one real subreddit (r/cm_devvit_test minimum)
- [ ] Demo video uploaded, < 60s, unlisted on YouTube
- [ ] Devpost submission filed + submitted before May 27 6:00 PM PT
- [ ] README crediting FoxxMD prominently, MIT license noted
- [ ] All E2E scenarios A–H recorded as evidence
- [ ] PLAN.md status table all-green for shipped tasks, cut tasks marked ✂️
