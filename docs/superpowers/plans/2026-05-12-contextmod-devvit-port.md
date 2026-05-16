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

> **✅ PHASE 1 COMPLETE — 2026-05-16, commit `6694109`.** All 11 sub-steps from the Vinh-owned execution plan (`docs/superpowers/plans/2026-05-14-vinh-backend-plan.md`) shipped. Type-check green (strict + exactOptionalPropertyTypes); 93/93 unit tests across 13 files. PLAN.md rows 1.1–1.8 flipped to ✅. Path note: files landed at `src/{state,shared,core,rules,schema}/` (without the `src/server/` prefix the v1 spec used) — confirmed alignment with PLAN.md's File(s) column.

See PLAN.md tasks 1.1–1.8.

### Task 1.1 — Central Redis key schema (Vinh, 1–2h) — ✅ 2026-05-16

**Files:** Shipped at `src/state/keys.ts` + `tests/state/keys.test.ts` (4 tests).

- [x] Test verifies every K helper produces correct namespaced string
- [x] Implement `const K = { proc, actionDone, actionPending, lock, cfgRev, cfgCurrentRev, cfgLastWikiRev, eventsRecent, installSubname, authorHist, statsRollup, schemaVersion, currentInstallId }` — every key sub-segmented (default `_` sentinel) for multi-tenant safety (Council 21:30 fix). `installSubname` keyed by installId, not sub (4th-pass Long-Term Architect).
- [x] Δ C1 honored: only string/hash/zset key types referenced
- [x] Commit: bundled into `feat(phase-1): ContextMod rule engine — 11 steps, 93 tests green` (`6694109`)

### Task 1.2 — Config loader: JSON5 + AJV + named-rule expansion (Vinh, 2–3h) — ✅ 2026-05-16

**Files:** Shipped at `src/schema/app.schema.json` (trimmed defs — MVP: RegexRule, AuthorRule, RuleSetRule, NamedRuleRef, plus the 7 actions Approve/Remove/Lock/Comment/Report/Ban/UserFlair). HistoryRule/AttributionRule/RecentActivityRule/MHSRule/RepostRule deferred to Phase 4 per PLAN.md cut list. `schema_version` field not added — versioning lives on the RecentEvent shape per Step 3.5 instead; revisit at Phase 3 if config-shape migrations are needed.

- [x] `src/core/namedRules.ts` — `expandNamedRules` walks the config tree, inlines named refs, breaks cycles via visited-set + short-circuit to empty AND-ruleset (logged at error level)
- [x] `src/core/config.ts` — `parseConfig(json5Text): {ok, config|errors}` using JSON5 + Ajv + named-rule expansion + computed `needsAuthorEnrichment` short-circuit
- [x] Tests: `tests/core/config.test.ts` (8) + `tests/core/namedRules.test.ts` (4)
- [x] Commit: bundled into `feat(phase-1): ContextMod rule engine — 11 steps, 93 tests green` (`6694109`)

### Task 1.3 — Atomic config publish via revision pointer (Vinh, 1–2h, Δ C3) — ✅ 2026-05-16

**Files:** Shipped at `src/state/configStore.ts`. Sub-threaded via `K.cfgRev` / `K.cfgCurrentRev`.

- [x] `getCurrentRev(sub?)`: GET `cm:{sub}:cfg:current_rev` → parse int n → GET `cm:{sub}:cfg:rev:{n}` → JSON.parse → returns `{rev, config} | null`
- [x] `publish(config, sub?)`: read current rev, SET `cfg:rev:{n+1}` immutable, then bump `cfg:current_rev` to `n+1` (Devvit Redis has no Lua / multi-key txn — pointer-as-synchronization-point pattern documented in source)
- [ ] In-process cache invalidation — deferred to Phase 2 when `handleActivity` lands; for now every read goes to Redis
- [x] handleActivity contract: reads `current_rev` once at event start, threads `rev` through `ActionContext` (Phase 2). `ActionContext.config` is REQUIRED per type contract (Council 23:00 — prevents Phase 2.5 dry-run gate from being a silent no-op).
- [x] Tests: `tests/state/configStore.test.ts` (4) with mocked redis Map — covers fresh publish, rev bump, null when unpublished, multi-tenant sub isolation
- [x] Commit: bundled into `feat(phase-1): ContextMod rule engine — 11 steps, 93 tests green` (`6694109`)

### Task 1.4 — Filter evaluation (Vinh, 2–3h) — ✅ 2026-05-16

**Files:** Shipped at `src/core/filters.ts` + `tests/core/filters.test.ts` (20 cases).

Port simplified from upstream — MVP predicate set, idiomatic TypeScript rather than 1:1 port. `passesFilters(spec, item, author)` is a pure boolean over `FilterSpec = {authorIs?, itemIs?}`.

- [x] AuthorFilter predicates: `nameIn`/`nameNotIn`, `flairTextIn`/`flairTextNotIn`, `ageMinSec`/`ageMaxSec`, `linkKarmaMin`/Max, `commentKarmaMin`/Max, `isMod`, `isContributor`, `verified`, `shadowBanned`
- [x] ItemFilter predicates: `over18`, `locked`, `stickied`, `removed`, `approved`, `isSelf`, `scoreMin`/Max, `linkFlairTextIn`/`linkFlairTextNotIn`, `titleMatches`/`bodyMatches`/`urlMatches` (regex source as string)
- [x] Number comparisons use explicit Min/Max fields (vs upstream `cmpNum` w/ string operators) — simpler AJV schema, same expressiveness
- [x] Short-circuits on first failed predicate; called from `runCheck` as pre-rule-eval gate
- [x] 20 tests (vs spec's 12+ target) covering: empty/null filter passes everything, each predicate kind positive + negative, combined item+author intersection
- [x] Commit: bundled into `feat(phase-1): ContextMod rule engine — 11 steps, 93 tests green` (`6694109`)

### Task 1.5 — Mustache renderer (Vinh, 30min) — ✅ 2026-05-16

**Files:** Shipped at `src/core/template.ts` + `tests/core/template.test.ts` (8 cases).

- [x] `Mustache.escape = (s) => s` — no-escape mode (Reddit is markdown, not HTML)
- [x] `render(tmpl, ctx)` — `ctx = { item: Item & {titleSafe, bodySafe}, author: Author & {nameSafe}, manager?, rules?, actions? }`
- [x] Bonus per Phase 2.5 Council fix: `escapeMarkdown(s)` defangs markdown-active chars + `u/`/`r/` pings, anchored on `\b` word boundary so `https://youtu.be/...` URLs are not mangled (regression test included)
- [ ] 10K truncation cap — deferred to Phase 2 when `comment` action lands; Mustache itself is unbounded but the cap is action-level, not template-level
- [x] 8 tests: substitution, no-HTML-escape regression, escapeMarkdown char set + ping defangs + URL preservation + link-injection neutralization + empty-string safety
- [x] Commit: bundled into `feat(phase-1): ContextMod rule engine — 11 steps, 93 tests green` (`6694109`)

### Task 1.6 — Rule dispatcher + MVP rules (Vinh, 2–3h) — ✅ 2026-05-16

**Files:** Shipped at `src/core/runRule.ts` + `src/rules/{regex,author,ruleset}.ts` + tests under `tests/rules/`.

- [x] `runRule(rule, item, author)` — dispatches by `rule.kind`. Throws loud on un-expanded `named` ref (Step 1.7 must run at config-parse time, not here).
- [x] `regex.ts` — title (default) / body / url targets + flags; invalid pattern treated as non-match without crashing
- [x] `author.ts` — thin wrapper over `passesFilters({authorIs: rule.filter}, ...)` — CM treats author predicates as rules so the trigger state machine sees author decisions in sequence
- [x] `ruleset.ts` — AND/OR short-circuit; recurses into `runRule` for nested rulesets; empty ruleset = never triggers (namedRules cycle break depends on this)
- [ ] `matchThreshold` for regex — not yet implemented; current `regex.ts` is binary match. Add in Phase 2 if any MVP config needs N-count semantics.
- [x] Tests: `regex.test.ts` (6), `author.test.ts` (3), `ruleset.test.ts` (6) — 15 total
- [x] Commit: bundled into `feat(phase-1): ContextMod rule engine — 11 steps, 93 tests green` (`6694109`)

### Task 1.7 — Check evaluation (Vinh, 1h) — ✅ 2026-05-16

**Files:** Shipped at `src/core/runCheck.ts` + `tests/core/runCheck.test.ts` (5 cases).

- [x] `runCheck(check, item, author): Promise<CheckResult>` — applies check-level filters as a pre-gate (short-circuits to `triggered:false, actions:[]` when filter fails), runs rules in sequence with AND/OR aggregation
- [x] Returns `{ triggered, checkName, actions }` — `actions` populated from `check.actions` only when triggered (caller `runRun` collects across triggered checks). `data` / per-rule trace dropped from v1 spec — `RuleResult` is just `{triggered}` in the MVP; Phase 3.5 RecentEvent shape covers the trace need separately.
- [x] Empty rule list → not triggered (matches Run state-machine expectations)
- [x] Tests: AND with 2 hits, OR with 1 hit + 1 miss, filter mismatch short-circuits, checkName echo, empty rules
- [x] Commit: bundled into `feat(phase-1): ContextMod rule engine — 11 steps, 93 tests green` (`6694109`)

### Task 1.8 — Run state machine — postBehavior + goto (Vinh, 2–3h) — ✅ 2026-05-16

**Files:** Shipped at `src/core/runRun.ts` + `tests/core/runRun.test.ts` (6 cases).

- [x] `runRun(run, item, author): Promise<RunResult>` — flat index-based state machine over a single run's checks. `handleActivity` (Phase 2) iterates across runs.
- [x] Behaviors: `'next'` (default) | `'stop'` | `{goto: 'checkName'}` — `goto:RUN.CHECK` cross-run jumps deferred; cross-run flow happens at the `handleActivity` level
- [x] 100-iteration safety break → `{ terminated: 'iteration-limit', lastCheckName }` + `console.error` (Council Software Lead — visible config bug instead of silently-stopped bot)
- [x] Tests: linear collection, `stop` halts after first trigger, `goto` jumps forward (skipping intermediate checks), goto to unknown name bails gracefully, 100-iter limit terminates a circular goto, no-trigger path returns `triggered:false`
- [x] Commit: bundled into `feat(phase-1): ContextMod rule engine — 11 steps, 93 tests green` (`6694109`)

---

## Phase 2 — Actions + handleActivity (Day 5–8, ~20h, Vinh-led)

> **✅ PHASE 2 COMPLETE — 2026-05-16, commit `9532cf4`.** All 5 PLAN.md rows (2.1–2.5) shipped, plus the three Phase 2.5 council-promoted items (2.5.1 repost rule, 2.5.2 dry-run gate, 2.5.3 markdown sanitizer fixtures). 137/137 tests across 18 files (was 93 after Phase 1, +44 net). `tsc --noEmit` clean. ESLint clean (typed-server glob extended to `src/actions/`). Verified live on `r/contextmod_vinh_dev` playtest — spam-removal post triggered remove + Mustache comment with escaped username; same-URL re-submission triggered repost-watch with dry-run gate (no Reddit side-effect). Path note: files landed at `src/{core,actions,rules,state,routes}/` (no `src/server/` prefix — same convention as Phase 1). PLAN.md rows 2.1–2.5 + 2.5.1–2.5.3 flipped to ✅.

See PLAN.md tasks 2.1–2.5.

### Task 2.1 — Action dispatcher + per-action idempotency (Vinh, 2h, Δ C2) — ✅ 2026-05-16

**Files:** Shipped at `src/core/runAction.ts` + `tests/core/runAction.test.ts` (7 tests).

- [x] `runAction(action, ctx): Promise<ActionResult>` — dispatches by `action.kind` to `src/actions/{kind}.ts`
- [x] **Critical:** computes `actionId = actionId(thingId, kind, payloadDigest(action))` using the exported helper at `src/lib/idem.ts:123` — pipe-separated to prevent (`t3_a`,`ban`,`x`) vs (`t3_ab`,`an`,`x`) collisions (Council Software Lead). reserve → side-effect → commit; release on throw. Stale-lease returns `{status: 'skipped-locked'}` so handleActivity records it explicitly (Council Software Lead — was a silent 5-min drop in plan v1)
- [x] Dry-run gate (Phase 2.5): per-action `dryRun` overrides `ctx.config.dryRun`; gated branch returns `{status: 'dry-run', wouldHaveCalled: kind}` BEFORE reserving, so a flipped-to-live config can still fire later
- [x] `ActionContext.config` REQUIRED on the type contract so the gate cannot silently regress (`tsc` breaks if dropped)
- [x] Mustache context construction lives in `src/actions/comment.ts` (per-action) rather than the dispatcher — keeps the dispatcher generic
- [x] Tests: reserve order, throw→release, stale-lease, dry-run (global + per-action), `dryRun: false` override
- [x] Commit: bundled into `feat(phase-2): ContextMod actions + handleActivity` (`9532cf4`)

### Task 2.2 — 7 MVP actions (Vinh, 4–6h) — ✅ 2026-05-16

**Files:** Shipped at `src/actions/{remove,approve,lock,comment,report,ban,userFlair}.ts` + `tests/actions/actions.test.ts` (16 tests).

Reddit signatures verified against `node_modules/@devvit/reddit/RedditClient.d.ts`. Departures from the v1 spec are reality-corrections, not scope drift.

- [x] `remove.ts` — `reddit.remove(item.id, action.isSpam ?? false)` (no chained comment — that's the separate `comment` action per the executable plan's flatter shape)
- [x] `approve.ts` — `reddit.approve(item.id)`
- [x] `lock.ts` — NOT on `reddit.*`; routes via `reddit.getPostById(t3_...).lock()` or `reddit.getCommentById(t1_...).lock()` (verified against `RedditClient.d.ts` — `reddit.lock` does not exist)
- [x] `comment.ts` — `reddit.submitComment({id, text})`. Threads `*Safe` markdown-escaped variants (`author.nameSafe`, `item.titleSafe`, `item.bodySafe`) into the Mustache context per Step 2.5.3 — see template.ts:33 rationale
- [x] `report.ts` — resolves the Post/Comment model (`reddit.report(thing, {reason})` takes the model, not the ID) then calls report
- [x] `ban.ts` — `reddit.banUser(BanUserOptions)`. **Reality-correction:** the v1 plan said `duration: 0 = permanent`; actual Reddit API treats `duration: 0` as a same-day unban. Permanent = omit the field. Implementation omits `duration` when 0 or unset. Optional fields (`reason`, `note`, `message`) also omitted-when-unset for `exactOptionalPropertyTypes` compliance
- [x] `userFlair.ts` — `reddit.setUserFlair(SetUserFlairOptions)`; optional `text`/`cssClass` omitted-when-unset
- [x] Bundled into the single `feat(phase-2): ContextMod actions + handleActivity` commit rather than per-file atomic commits (the actions are too coupled to be useful in isolation; bundling tests + dispatcher together gave a green checkpoint)
- [x] Commit: `9532cf4`

### Task 2.3 — handleActivity orchestrator (Vinh, 2–3h) — ✅ 2026-05-16

**Files:** Shipped at `src/core/handleActivity.ts` + `tests/core/handleActivity.test.ts` (6 tests).

- [x] Idempotency guard via `firstSeen(activityId, sub)` — lives in the trigger handlers (`src/routes/triggers.ts`), called BEFORE normalize so a re-delivered trigger doesn't burn the expensive `getUserByUsername` call
- [x] Load `cfg:current_rev` ONCE at event start via `configStore.getCurrentRev(sub)`, threads `rev` + the full `config` through every `runAction` call via `ActionContext` (per Δ C3 + Council fix for the Phase 2.5 dry-run gate)
- [x] Iterates `current.config.runs`, calls `runRun(run, item, author, sub)`, collects `result.actions` only on `result.triggered`
- [x] On rule trigger: dispatches actions, aggregates `ActionResult.status === 'ok'` into `{kind, ok}[]` per Council Software Lead fix — plan v1 wrote `actions: ...` literal which would have serialized as `undefined`
- [x] `failed_actions:queue` ZSET deferred to Phase 4 — the events ZSET already records `ok: false` per action, which the dashboard surfaces. No retry primitive needed before MVP demo
- [x] Pushes compact event record to `events:recent50` ZSET via `recordEvent` (brought forward from Step 3.5; `v:1` + crypto.randomUUID nonce; trimmed to last 50 via `zRemRangeByRank` with rank `-51`)
- [x] Tests: no-config no-op, regex→remove happy path, action error→`ok:false` recorded, no-trigger no-event, multi-run ordering, global `dryRun` records `ok: false`
- [x] Commit: `9532cf4`

### Task 2.4 — onPostSubmit handler (Vinh, 1–2h) — ✅ 2026-05-16

**Files:** Modified `src/routes/triggers.ts`. Local payload shapes live in `src/shared/normalize.ts` (`PostSubmitPayload`) — verified 2026-05-15 against real Devvit v0.12.23 runtime payload (PowerShell log capture).

- [x] Replaced `/post-submit` stub with full pipeline routing through `handleActivity`
- [x] **Reality-correction:** `OnPostSubmitRequest` is NOT exported from `@devvit/web/server` (the barrel re-exports `@devvit/reddit` etc.; the shared types live in `@devvit/shared-types` which the barrel does not re-export). Using local `PostSubmitPayload` instead, defined inline at the top of `normalize.ts`
- [x] **Reality-correction:** Devvit payload field is `author.name`, NOT `author.username` (the plan's "Verified API Surface" was wrong). Author ID lives at `post.authorId` not `author.id` when present at the post level
- [x] **Reality-correction:** `reddit.getCurrentSubredditName()` does NOT exist on the `@devvit/reddit` RedditClient (TS catches it). Using `(await reddit.getCurrentSubreddit()).name` instead
- [x] Guard order: null-safety bail (no `post.id`) → recursion guard (`reddit.getAppUser()` null-checked) → `firstSeen(post.id, subName)` → `normalizePost(input, config)` → `handleActivity(item, author, subName)`
- [x] If `authorName` is missing (Devvit anomaly), the recursion guard is SKIPPED rather than bailing — worst case the bot reacts to its own post on a private test sub, which is harmless; bailing kills all trigger work
- [x] Returns `c.json({status: 'ok'})` on all paths (never throws back to the Devvit gateway)
- [x] **Live playtest gate:** submitted "free crypto giveaway" on `r/contextmod_vinh_dev` → post removed → bot replied with "Hi Outside-Research-772, your post 'free crypto giveaway' was removed as suspected spam." Markdown escaper rendered the hyphenated username correctly (Reddit treats escaped `\-` as a literal dash). All logged on playtest v0.0.1.30+
- [x] Commit: `9532cf4`

### Task 2.5 — onCommentSubmit handler (Vinh, 1h) — ✅ 2026-05-16

Mirrors 2.4 for `CommentSubmitPayload`. Same guard order + same `handleActivity` dispatch; `normalizeComment` produces a flat `Item` with `title: ''` and `body: comment.body`.

- [x] Implemented w/ same shape as 2.4 (null-gate on `comment.id`; recursion guard; `firstSeen(comment.id, subName)`)
- [x] `depth` / `op` / `parentId` fields from V2 CommentV2 are not yet exposed on the `CommentSubmitPayload` shape — `depth?` / `op?` on `Item` stay optional. Defer to Phase 4 if a rule actually needs them
- [x] Live playtest covered via the existing seed config — comment-submit handler was not exercised in the gate because the playtest sub had no comment-targeting rules yet (the spam-removal rule fires on post-submit). Comment-side path is unit-tested via the same handleActivity tests; live coverage will land naturally in Phase 3 when wiki-loaded configs include comment rules
- [x] Commit: `9532cf4`

### Task 2.5.1 — URL-dedupe Repost rule (Vinh, ~1h, Council Expansionist promotion) — ✅ 2026-05-16

**Files:** Shipped at `src/rules/repost.ts` + `tests/rules/repost.test.ts` (7 tests). Schema: added `RepostRule` to `src/schema/app.schema.json`.

Promoted from PLAN.md Phase 4 task 4.1 to MVP because it's the "screenshot moment" that judges remember (council 2026-05-14 second pass). Ship-time non-negotiables (council SRE + Security) baked in:

- [x] FNV-1a64 hash of `item.url` → 30d-TTL Redis seen-marker. First submission sets, second triggers
- [x] **Sub-scoped key** (`cm:{sub}:repost:url:{hash}`) — threaded an optional `sub` parameter through `runRule` → `runCheck` → `runRun` → `runRuleSet` so the rule can read the subreddit context without ripping up the existing rule call signature
- [x] TTL **refresh** on hit so an active repost loop doesn't expire mid-window and re-allow itself
- [x] **Fail-OPEN** on Redis error (no mass false-positives during outage — repost is a soft signal, not a safety gate)
- [x] Empty/missing URL → no-op (regex rules can chain for non-link posts)
- [x] **Live playtest gate:** submitted "https://example.com/repost-test" twice on `r/contextmod_vinh_dev` → first set marker, third submission triggered with `redis.get = t3_1tem8bs` (correct prior activity ID), `runAction` hit dry-run branch with `wouldHaveCalled: remove`, no Reddit side-effect
- [x] Commit: `9532cf4`

### Task 2.5.2 — `dryRun` config flag (Vinh, ~15min, NON-NEGOTIABLE per Council SRE) — ✅ 2026-05-16

**Files:** Logic lives in `src/core/runAction.ts` (gate); type contract in `src/shared/types.ts` (`AppConfig.dryRun`, per-action `dryRun?` on every action interface, `ActionContext.config` REQUIRED).

Repost rule blast radius is high — false positives nuke legitimate crossposts, news threads, weekly recurring posts. Ship behind `dryRun: true` until mods watch the dry-run feed for a few days.

- [x] Per-action `action.dryRun ?? ctx.config.dryRun ?? false` — per-action overrides config (allows opting one specific action live while keeping the rest dry-run)
- [x] Gate branch returns `{status: 'dry-run', wouldHaveCalled: action.kind}` BEFORE `reserveAction` so flipping to live mode in a later event can still fire
- [x] `ActionContext.config` REQUIRED on the type — `tsc --noEmit` fails if dropped, so the gate cannot silently regress (Council Software Lead — the v1 plan's omission would have made `ctx.config.dryRun` evaluate to `undefined → false`, the OPPOSITE of the claimed safety contract)
- [x] Schema: every action variant in `app.schema.json` accepts an optional `dryRun: boolean` field
- [x] Unit test: `runAction({...}, {ctx with config.dryRun: true}) → status === 'dry-run'` (per Council 23:00 — without the test the safety gate is never demonstrated, only asserted)
- [x] Live playtest gate covered as part of Task 2.5.1 — dry-run remove fired, no Reddit side-effect
- [x] Commit: `9532cf4`

### Task 2.5.3 — Mustache markdown-injection sanitizer (Vinh, ~30min, NON-NEGOTIABLE per Council Security) — ✅ 2026-05-16

**Files:** `escapeMarkdown` ships in `src/core/template.ts` (Phase 1, Step 1.5 row). Phase 2 added the 4 mandatory fixture tests + live playtest coverage. Per-rule plumbing in `src/shared/normalize.ts` produces `safe: {authorName, itemTitle, itemBody}` for templates.

User-controlled fields embedded in a bot's `submitComment` are an XSS-equivalent surface (Reddit strips HTML but renders markdown live): ping-storms (`u/x u/y u/z`), fake mod quotes (`> as a mod, I...`), deceptive `[click](malicious)` links.

- [x] General regex escapes the markdown-active char set: `[\\` `*_{}[\]()#+\-.!|>]`
- [x] `\b`-anchored `u\/` and `r\/` defang — anchors u/ and r/ to a word boundary so `https://youtu.be/...` does NOT mangle to `yo*u\/*tu.be/...` (a v1 bug that the v2 council caught and fixed)
- [x] Goal pinned to "Reddit renders the link correctly," NOT "string is byte-identical" — escaped `.` in URLs renders as a literal dot via Reddit's auto-linker
- [x] 4 mandatory fixture unit tests under `tests/core/template.test.ts > Phase 2.5 mandatory fixtures`:
  - `https://youtu.be/abc` → `https://youtu\.be/abc` (auto-link survives)
  - `u/spammer pinged you` → `u\/spammer pinged you` (defanged)
  - `check r/funny` → `check r\/funny` (defanged)
  - `[click](javascript:alert(1))` → brackets + parens escaped (link-injection neutralized)
- [x] Empty input → empty string, no crash
- [x] Template README direction: **always use `{{author.nameSafe}}` not `{{author.name}}` in any field that goes back to Reddit via `submitComment`**
- [x] **Live playtest verification:** bot's reply to "free crypto giveaway" rendered `Outside-Research-772` and `"free crypto giveaway"` as plain text. The hyphenated username's `\-` was rendered by Reddit as a literal dash (auto-linker behavior). Confirms "Reddit renders correctly" goal holds in production renderer, not just unit tests
- [x] Commit: `9532cf4`

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

Sourced from internal planning notes (private). Every claim citation-traceable.

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
