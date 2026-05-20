# context-mod-devvit — Plan & Coordination

> Living status doc for Stephen + Vinh. Updated on every task change and pushed to `main`. Single source of truth for who is working on what. **Atomic commits — never bundle a status change with code.**

**Project:** Devvit Web port of FoxxMD's context-mod rule-engine moderation bot. Reddit Mod Tools and Migrated Apps Hackathon — Best Ported App ($10K) target.
**Team:** **Stephen** — frontend, custom post, mod UX, demo video, submission writeup. **Vinh** — backend rules engine, actions, idempotency layer, image hashing.
**Deadline:** 2026-05-27 6:00 PM PT (~15 days from today)
**Repo:** github.com/StephenSook/context-mod-devvit (private, push pending Stephen's `gh repo create` OK)
**Upstream:** github.com/FoxxMD/context-mod (collab access granted to StephenSook 2026-05-12, MIT)
**Master spec:** `docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md` (572-line architecture doc — read first)
**Reviews triangulated:** Claude manual + Codex adversarial + ultraplan PR. Consensus baked into Decisions D1–D10.

---

## Status Dashboard

Legend: ✅ done · 🟡 in progress · ⬜ not started · ⛔ blocked · ✂️ cut
**Stale lock TTL: 4 hours** (hackathon pace). 🟡 task without a fresh timestamp in Notes is claimable.

### Phase 0 — Scaffold & plumbing (Day 0–1)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 0.1 | Devvit Web template clone | repo root | **Stephen** | ✅ | — | from `devvit-template-mod-tool-devvit-web` |
| 0.2 | devvit.json — triggers, scheduler, menu, settings, http | `devvit.json` | **Stephen** | ✅ | 0.1 | 5 fetch domains declared |
| 0.3 | README + LICENSE (MIT) + NOTICES.md | root | **Stephen** | ✅ | 0.1 | FoxxMD credit prominent |
| 0.4 | Privacy Policy + ToS drafted | `policies/` | **Stephen** | ✅ | 0.3 | GH Pages host pending repo push |
| 0.5 | Mop template removed, ContextMod route stubs | `src/routes/*` | **Stephen** | ✅ | 0.2 | All devvit.json paths wired, no 404s |
| 0.6 | Dual idempotency + cron lock helpers | `src/lib/idem.ts` | **Stephen** | ✅ | 0.5 | firstSeen + reserveAction + acquireLock + FNV-1a |
| 0.7 | First playtest + domain approval submit | terminal | **Stephen** | ✅ | 0.5, 0.8 | Run `npx devvit playtest <sub>`. Triggers Reddit domain approval review. |
| 0.8 | Create private test sub | reddit.com | **Stephen** | ✅ | — | <200 members per hackathon rule. e.g., r/cowsufficient_cm_test |
| 0.9 | GitHub repo create + push | github.com | **Stephen** | ✅ | 0.1 | Private; flip public before submission. Needs explicit Bash permission. |
| 0.10 | Image-decode + blockhash spike | `experiments/image-spike/` | **Vinh** | ✅ 2026-05-18 **GO** | 0.8 | Pure-JS pipeline (upng-js + jpeg-js + blockhash-core) verified end-to-end. **Gap 3 (preview-variant verification):** `preview.redd.it` resized variants @ 320/640/1080 px produce blockhashes within **0–2 bits of 256** vs full-res — safely below the 5–8 bit "same image" threshold; decode time <50ms, peak RSS <5MB above baseline. **Gap 1 (bundler smoke):** `npm run build` (vite + @devvit/start) accepts all 3 packages cleanly — 0 errors, 0 new warnings, +88KB to `dist/server/index.cjs`, 7.8s build. **Gap 2 skipped** (interactive Devvit playtest) — preview-path peak RSS is implausibly close to OOM; belongs in 4.7 impl, not spike. Full numbers + 4.7 design notes in `experiments/image-spike/RESULTS.md` (gitignored). |

### Phase 1 — Core engine (Day 2–5, ~24h)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 1.1 | Redis key schema (central) | `src/state/keys.ts` | **Vinh** | ✅ 2026-05-16 | 0.5 | Shipped `K.*` factories, every key sub-segmented (default `_` sentinel) — multi-tenant safe per Council 21:30. idem.ts migrated. Commit 6694109. |
| 1.2 | Config loader: JSON5 + AJV + named-rule expand | `src/core/{config,namedRules}.ts` | **Vinh** | ✅ 2026-05-16 | 1.1 | JSON5 → AJV → typed AppConfig. `expandNamedRules` runs at parse time w/ cycle break. Trimmed schema at `src/schema/app.schema.json`. Commit 6694109. |
| 1.3 | Atomic config publish via revision pointer | `src/state/configStore.ts` | **Vinh** | ✅ 2026-05-16 | 1.2 | `publish()` writes immutable `cfg:rev:{n}` then bumps `cfg:current_rev` (D5). `getCurrentRev()` returns snapshot. Sub-threaded. Commit 6694109. |
| 1.4 | Filter eval (authorIs + itemIs) | `src/core/filters.ts` | **Vinh** | ✅ 2026-05-16 | — | `passesFilters({authorIs, itemIs}, item, author)` — full predicate set (name/karma/age/flair/mod + over18/locked/score/regex matches). Used by Step 1.7 as pre-check gate. Commit 6694109. |
| 1.5 | Mustache renderer | `src/core/template.ts` | **Vinh** | ✅ 2026-05-16 | — | `render()` w/ HTML escape disabled. `escapeMarkdown()` (\b-anchored) added for Phase 2.5 — defangs `u/`/`r/` pings + brackets/parens without mangling URLs. Commit 6694109. |
| 1.6 | Rule dispatcher + Regex + Author + RuleSet | `src/core/runRule.ts`, `src/rules/*` | **Vinh** | ✅ 2026-05-16 | 1.4 | 3 MVP rule kinds: regex (title/body/url + flags), author (reuses authorIs filter), ruleset (nested AND/OR). Named-ref throws if not pre-expanded. Commit 6694109. |
| 1.7 | Check eval (AND/OR aggregation) | `src/core/runCheck.ts` | **Vinh** | ✅ 2026-05-16 | 1.6 | AND/OR short-circuit + pre-filter gate (Step 1.4). Return shape: `{triggered, checkName, actions}`. Empty rules → not triggered. Commit 6694109. |
| 1.8 | Run state machine (postBehavior + goto) | `src/core/runRun.ts` | **Vinh** | ✅ 2026-05-16 | 1.7 | postBehavior `next`/`stop`/`{goto}`; 100-iter safety break → `terminated:'iteration-limit'` + `lastCheckName` (Council Software Lead). Commit 6694109. |

### Phase 2 — Actions + handleActivity (Day 5–8, ~20h)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 2.1 | Action dispatcher + per-action idempotency wrap | `src/core/runAction.ts` | **Vinh** | ✅ 2026-05-16 | 0.6, 1.5 | reserve→side-effect→commit/release per D4. Stale-lease → `{status: 'skipped-locked'}` so handleActivity records it (Council Software Lead). Dry-run gate (per-action overrides config). Uses exported `actionId(thingId, kind, payload)` — pipe-separated to prevent (`t3_a`,`ban`,`x`) vs (`t3_ab`,`an`,`x`) collisions. Commit 9532cf4. |
| 2.2 | 7 MVP actions — remove/approve/lock/comment/report/ban/userFlair | `src/actions/*.ts` | **Vinh** | ✅ 2026-05-16 | 2.1 | Reddit signatures verified against `@devvit/reddit/RedditClient.d.ts`. `ban.ts` omits `duration` when 0/unset (plan's "0=permanent" was wrong against actual Reddit API — 0 days = same-day unban; permanent = omit field). `lock.ts` routes via `getPostById`/`getCommentById` (not on `reddit.*`). `comment.ts` threads `*Safe` markdown-escaped variants through Mustache. 16 action tests green. Commit 9532cf4. |
| 2.3 | handleActivity orchestrator | `src/core/handleActivity.ts` | **Vinh** | ✅ 2026-05-16 | 1.8, 2.1 | Reads config rev ONCE at event start (D5). Aggregates `ActionResult.status === 'ok'` into `{kind, ok}[]` per Council fix (v1 plan would have shipped `actions: undefined`). Brought Step 3.5 `recordEvent` forward (`v:1`+nonce, `events:recent50` ZSET, last 50). Commit 9532cf4. |
| 2.4 | onPostSubmit handler wire-up | `src/routes/triggers.ts` | **Vinh** | ✅ 2026-05-16 | 2.3 | Routes through handleActivity. Kept D0.1 null-safety/recursion-guard/firstSeen idioms. Reality-correction: `reddit.getCurrentSubredditName()` doesn't exist in `@devvit/reddit` — using `(await reddit.getCurrentSubreddit()).name` instead. Verified live on `r/contextmod_vinh_dev`: "free crypto giveaway" → remove + Mustache comment fired with escaped username. Commit 9532cf4. |
| 2.5 | onCommentSubmit handler wire-up | `src/routes/triggers.ts` | **Vinh** | ✅ 2026-05-16 | 2.3 | Same pattern as 2.4 with `normalizeComment` + `comment.id` null-gate. Commit 9532cf4. |
| 2.5.1 | URL-dedupe Repost rule (promoted from Phase 4 per Council Expansionist) | `src/rules/repost.ts` | **Vinh** | ✅ 2026-05-16 | 2.1 | FNV-1a64 hash, sub-scoped key, 30d TTL refresh on hit, fail-OPEN on Redis error (no mass false-positives during outage). Threaded optional `sub` through runRule/runCheck/runRun/runRuleSet. Schema `RepostRule` added to `app.schema.json`. Verified live: same URL submitted twice → first set marker, second triggered with dry-run gate. Commit 9532cf4. |
| 2.5.2 | `dryRun` config flag — NON-NEGOTIABLE per Council SRE | `src/core/runAction.ts` | **Vinh** | ✅ 2026-05-16 | 2.1 | Global `ctx.config.dryRun` is AUTHORITATIVE (Codex H1 hotfix 274aef6 2026-05-16): per-action `dryRun` can only PROMOTE a live config to dry-run, never demote a globally-safe config to live. `ActionContext.config` is REQUIRED on the type — gate cannot silently regress (tsc breaks if dropped). Verified live: repost-watch dry-run returned `wouldHaveCalled: 'remove'`, no Reddit side-effect. Commits 9532cf4 + 274aef6. |
| 2.5.3 | Mustache markdown-injection sanitizer — NON-NEGOTIABLE per Council Security | `src/core/template.ts` | **Vinh** | ✅ 2026-05-16 | 1.5 | Phase 1 shipped `escapeMarkdown` w/ \b-anchored u/r-ping defang. Phase 2 added 4 mandatory fixture tests (YouTube URL auto-link survives, u/r pings defanged, link-injection `[click](evil)` neutralized, empty no-crash). Verified live in playtest: bot reply to "free crypto giveaway" rendered username + title as plain text. Commit 9532cf4. |

### Phase 3 — Config UX + dashboard (Day 9–11, ~16h)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 3.1 | onAppInstall seeds default config | `src/routes/triggers.ts`, `src/config/default-config.ts` | **Vinh** | ✅ 2026-05-16 | 1.3 | `DEFAULT_CONFIG_JSON5` lives in `src/config/default-config.ts` (stored as JSON5 string so install exercises the same parseConfig → AJV pipeline a wiki edit hits). Re-install no-op via `cfg:current_rev` SETNX-equivalent check. Commit c867143. |
| 3.2 | Wiki config loader + refresh-config cron | `src/core/configSource.ts`, `src/routes/scheduler.ts` | **Vinh** | ✅ 2026-05-16 | 1.3 | `loadFromWiki()` returns discriminated `{ok, revisionId, config}` / `{ok:false, reason}`; never throws. Cron short-circuits on unchanged revisionId via `cfg:last-wiki-rev` so steady-state ticks cost one redis.get + one wiki read. Verified live in r/contextmod_vinh_dev. Commit c867143. |
| 3.3 | Reload-config mod menu action | `src/routes/menu.ts` | **Vinh** | ✅ 2026-05-16 | 3.2 | Same loader pipeline as cron, on demand. Toast shows rule count on success or actionable parse-error msg on failure. Verified live: banana-bread test post removed + bot comment rendered via Mustache. Commit c867143. |
| 3.4 | Recent events ZSET + /api/recent | `src/state/recentEvents.ts`, `src/routes/api.ts` | **Vinh** | ✅ 2026-05-16 | 2.3 | `readRecent()` reads `events:recent50` ZSET via `zRange ... { by: 'rank', reverse: true }`. `migrate()` switches on `v` for forward-compat — corrupt / future-version members dropped loudly. Server-internal `v` + `nonce` stripped at wire. Observatory dashboard renders 5 real events end-to-end (no ?demo=1). Commit c867143. |
| 3.5 | Dashboard custom post (Vite + React) | `src/client/*` | **Stephen** | ✅ 2026-05-16 | 3.4 | Wave A–F shipped 2026-05-12 → 2026-05-14: stat cards + sparkline + event stream + CSV export + rule hit-count chips + empty-state w/ starter-config snippet. a11y polish (aria-live, prefers-reduced-motion, semantic `<time>`). `demo=1` synthetic-fixture path per Codex M6 production-safety; now ALSO rendering live data via Vinh's 3.4 `/api/recent` ZRANGE wiring (commit c867143). Last client commit 8218016. |
| 3.6 | Dry-run rule tester menu + form | `src/routes/{menu,forms}.ts`, `src/core/dryRunActivity.ts` | **Stephen** | ✅ 2026-05-16 | 2.3 | Non-contract sibling `dryRunActivity()` mirrors handleActivity but forces dryRun on every action + returns structured `DryRunResult` (skips ZSET write). Menu `/test-rules` returns `showForm` w/ thingId pre-filled. Form `/test-rules-submit` fetches via `reddit.getPostById`/`getCommentById` (routed by thingId prefix), constructs inline Item/Author, invokes dryRunActivity, renders triggered runs as toast bullets. 8 new tests (4 dryRunActivity + 2 menu + 4 form). 162 total green. Last commit 50bda17. |
| 3.7 | onAppUpgrade migrations | `src/state/migrations.ts` | **Vinh** | ✅ 2026-05-16 | 1.1 | `SCHEMA_VERSION='0.1'` + `runMigrations(from, to)` seam. v0.1 → v0.1 is a no-op as specified; the seam exists so a future shape change can land without breaking existing installs. Also added BACKFILL of the install pointer in `/app-upgrade` — install fires once but upgrade fires on every redeploy, so pre-Step-3.1 installs self-heal on next rebuild (synthesizes stable `sub:<subname>` id since V2 trigger payload does not actually carry installId — plan was speculative there). Commit c867143. |

### Phase 4 + 4.7 — ALL SHIPPED 2026-05-18

> **Status (2026-05-19 — T-8 from deadline):** Phase 4 (history/attribution/recentActivity) shipped Wave S v0.5.x. Phase 4.7 (imageRepost — pure-JS perceptual blockhash) shipped v0.6.0 2026-05-18 per Stephen's 5/18 GO. AE Critical wave + 86 polishes (Polish #1–#104) closed Tier-1/2/3/4 punch list + 5 adversarial-review rounds (silent-failure-hunter, code-reviewer, gemini-agent ×2, codex-rescue, vercel:performance-optimizer, type-design-analyzer, repo-sentinel). **820 tests green.** Lighthouse CLI v13.3.0: Performance 84, Accessibility 100, Best Practices 100, CLS 0.04 (good). 12 example configs in `examples/`. v0.6.7 published; awaiting Devvit App Directory review. Production npm-audit: 0 vulnerabilities (verified 2026-05-19; full audit shows 36 transitive vulns through `@devvit/*` toolchain — not shipped).
>
> **Remaining for Stephen** (T-2 / T-3 / T-0):
> - T-2 (2026-05-25): final `npm run launch` to push v0.6.x to Reddit
> - T-3 to T-1: record demo video (OBS, 60s cap, voice-over per `docs/submission/demo-video-script.md`)
> - T-0 (2026-05-27 18:00 PT): Devpost submission click


| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| ~~4.1~~ | ~~URL-dedupe Repost rule~~ | ~~`src/rules/repost.ts`~~ | — | ✅ PROMOTED | — | Promoted to Phase 2.5.1 + shipped 2026-05-16 (commit 9532cf4) + Codex H7 hardened to atomic SET NX (commit 8f6d608). See row 2.5.1 above. |
| ~~4.2~~ | ~~MHSRule (HTTP fetch toxicity)~~ | ~~`src/rules/mhs.ts`~~ | — | ✂️ CUT | — | **CUT 2026-05-13 per Reddit PR #96** — HTTP fetch policy AI-provider allowlist locked to OpenAI + Gemini only; `api.moderatehatespeech.com` falls outside. See `docs/submission/devvit-app-settings.md` + `policies/privacy.md`. |
| 4.3 | History infrastructure (author cache) | `src/state/authorHistory.ts` | **Vinh** | ✅ 2026-05-18 | 1.1 | Sub-scoped 1h Redis cache around `reddit.getPostsByUser` + `getCommentsByUser` (FETCH_LIMIT=100 each). Stored as JSON blob at `cm:{sub}:author:hist:{name}` (Devvit Redis has no hash-with-TTL primitive — JSON-in-a-string is the only atomic write+expire shape). Fail-OPEN on Redis OR Reddit errors. Shared by 4.4–4.6 — all three rules import `getAuthorHistory` from this module. Commit 62a0985. |
| 4.4 | HistoryRule | `src/rules/history.ts` | **Vinh** | ✅ 2026-05-18 | 4.3 | Flat OR-of-thresholds: `postCountLt/Gt`, `commentCountLt/Gt`, `linkKarmaLt/Gt`, `commentKarmaLt/Gt`. Karma reads off enriched `Author` (forces `needsAuthorEnrichment` when karma thresholds present); counts off the cache. Diverged from PLAN's nested `{greaterThan, lessThan}` shape — flat is simpler and the demo storyline uses `commentKarmaLt: 100` + `postCountLt: 3` for the "fresh low-karma account" beat. Commit 62a0985. Verified live 2026-05-18 in `r/contextmod_vinh_dev`: rule matched + action dispatched on fresh-account test post (comment write Reddit-rate-limited mid-burst — not a rule failure). Template gotcha caught during verification: `{{author}}` crashes Mustache w/ `TypeError: e.replace`; templates must use `{{author.nameSafe}}` (already the Phase 2.5 default). |
| 4.5 | AttributionRule | `src/rules/attribution.ts` | **Vinh** | ✅ 2026-05-18 | 4.3 | % of cached posts matching a domain list (case-insensitive substring on `post.domain`). `minPosts` floor (default 5) guards against the 1/1=100% tiny-sample false-positive trap. No `window` param in v1 — rules operate over whatever's in the 1h cache. Commit 62a0985. Not exercised live 2026-05-18 (needs YouTube-dominant author) but uses the same `getAuthorHistory` substrate as 4.4 + 4.6 which both verified live — 9 unit tests cover the projection logic. |
| 4.6 | RecentActivityRule | `src/rules/recentActivity.ts` | **Vinh** | ✅ 2026-05-18 | 4.3 | Per-target-sub count from cached posts + comments (case-insensitive sub-name match). `postCountGt` / `commentCountGt` independent triggers. No `window` param in v1. Commit 62a0985. ✅ Verified live 2026-05-18 in `r/contextmod_vinh_dev`: wiki config `subreddits: ['AskReddit'], commentCountGt: 0` triggered after the test author dropped one r/AskReddit comment — bot reply landed on the test post. End-to-end: trigger → handleActivity → cached history → rule match → comment action. |
| 4.7 | Image-hash port + worker + LSH | `src/image/*`, `src/rules/imageRepost.ts`, `src/state/imageHashStore.ts` | **Stephen** (impl) + **Vinh** (spike) | ✅ SHIPPED 2026-05-18 (v0.6.0) | 0.10 ✅ | 0.10 spike landed clean GO (Vinh commits 00feca5 + 19e94f0). Implementation shipped (Stephen commits dca7db5 + dec8cd6) — full pipeline: src/image/decode.ts (UPNG + jpeg-js w/ 6MB cap + 8s timeout + Accept-header WebP-exclude), src/image/hash.ts (blockhash-core 16-bit grid → 256-bit hex + Brian Kernighan Hamming util), src/state/imageHashStore.ts (JSON-list per-sub w/ 500 entry cap + 30d TTL + dedupe by postId, fail-OPEN), src/rules/imageRepost.ts (skip non-image → fetch+decode → blockhash → findSimilar → record AFTER lookup → trigger if match), schema entry for hammingThreshold + windowDays, worker fill-in for backfill path at scheduler.ts /image-hash-worker. examples/repost-image-watch.json5 ships behind `dryRun: true` per RepostRule precedent. 23 tests across hash + store + rule. v1 uses linear O(N) Hamming scan (~30-50ms per query at 500 entries per Vinh's measurement) — LSH band-index can layer on top of the same key shape post-MVP without schema change. |
| 4.8 | DispatchAction | — | — | ✂️ | — | Cut per Codex+ultraplan synthesis |
| 4.9 | SentimentRule | — | — | ✂️ | — | Cut — NLP libs won't bundle in Devvit runtime |
| 4.10 | Full RepostRule w/ YouTube | — | — | ✂️ | — | Cut — 4.1+4.7 cover MVP |
| 4.11 | RepeatActivityRule | — | — | ✂️ | — | Cut — defer post-hackathon |

### Phase 5 — Tests + demo + submission (Day 13–15, ~10h)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 5.1 | AJV schema golden tests | `tests/core/config.test.ts`, `tests/config/default-config.test.ts`, `tests/config/starter-snippet.test.ts` | **Vinh** | ✅ 2026-05-19 | 1.2 | Stale-status backfill. Schema validates via parseConfig pipeline; covered by tests/core/config.test.ts + tests/config/default-config.test.ts (default install seed) + tests/config/starter-snippet.test.ts (EmptyState snippet pin, Polish #28). |
| 5.2 | Rule eval unit tests | `tests/rules/*.test.ts` | **Vinh** | ✅ 2026-05-19 | 1.6, 4.* | Stale-status backfill. 8 rule test files green: attribution, author, history, imageRepost, recentActivity, regex, repost, ruleset. Plus filter tests + namedRules tests + handleActivity orchestrator tests. 749 total tests session-wide. |
| 5.3 | E2E scenarios A–H on test sub | manual | **Stephen** | ⬜ | All prior | GIFs/screenshots → docs/demo-scenarios/ |
| 5.4 | README polish + Fetch Domains section | `README.md` | **Stephen** | ⬜ | 5.3 | Devvit Rules requirement for fetch apps |
| 5.5 | 60s demo video | YouTube unlisted | **Stephen** | ⬜ | 5.3 | OBS + Audacity + ffmpeg |
| 5.6 | Submission writeup (Devpost) | devpost.com | **Stephen** | ⬜ | 5.5 | First-person build notes per D10 |

### Phase 6 — Ship (Day 15–16, ~6h)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 6.1 | `npx devvit publish --public --bump minor` | terminal | **Stephen** | 🟡 IN REVIEW 2026-05-16 | All prior | App slug renamed back to `cm-devvit` (commit 77f5ed0). Terms + Privacy + Description filled on Dev Portal. **Version 0.2.0 submitted for review** 2026-05-16 — Reddit gates "Creates custom posts" + http fetch. Email-on-approval expected within 1–7d. Track status at https://developers.reddit.com/apps/cm-devvit/app-versions. |
| 6.2 | Devpost submission filed | devpost.com | **Stephen** | ⬜ | 6.1 | Before May 27 6 PM PT |

---

## Shared Contracts

> Drift = integration bugs. Modify these only after pinging the other person. `⚠️ CONTRACT` commit prefix on changes.

| Contract | Owner | Consumers | Definition |
|---|---|---|---|
| Redis key schema | Vinh | Both | `src/state/keys.ts` const K namespace |
| AJV config schema | Vinh | Both | `src/schema/app.schema.json` (trimmed from CM `Schema/App.json` — see `docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:110` for the trim list) |
| Internal `Item` shape | Vinh | Both | `src/shared/types.ts` — id, title, body, url, author, age, score, isSelf, over18, removed, approved, locked, stickied, linkFlairText, depth?, op? |
| Internal `Author` shape | Vinh | Both | `src/shared/types.ts` — name, id, age, linkKarma, commentKarma, flairText, isMod, isContributor, verified, shadowBanned |
| Trigger event normalizer | Vinh | Both | Maps PostV2/CommentV2/UserV2 → `Item`/`Author` |
| Recent events shape | Vinh | Stephen (client) | `{ts, activityId, runName, checkName, triggered, actions:[{kind,ok}]}` JSON |
| `/api/recent` contract | Vinh | Stephen | Last 50 events newest-first, JSON `{events: [...]}` |
| Mustache template context | Vinh | Both | `{ item, author, manager, rules, actions }` |
| `devvit.json` triggers/cron/menu | Stephen | Both | Adding new endpoint requires both src/ stub AND devvit.json declaration |
| Fetch domain allowlist | Stephen | Both | `devvit.json.permissions.http.domains` — re-review on change |

---

## Decisions

### D1 — Devvit Web (not Blocks)
Blocks dies June 30, 2026. Devvit Web is the only forward path. **Locked 2026-05-12 by Stephen.**

### D2 — CommonJS server bundle
`package.json` has `"type":"module"` but Vite outputs `dist/server/index.cjs`. Devvit Web requires CJS. Template confirms. **Locked 2026-05-12.**

### D3 — Redis primitives: strings + hashes + sorted sets only
NO Lists (LPUSH/LRANGE) — not in Devvit Redis surface. NO Sets (SADD) — same. Recent events use ZADD score=timestamp, NOT LPUSH list. Per Codex CRITICAL #1. **Locked 2026-05-12.**

### D4 — Dual idempotency
`cm:proc:{thingId}` 24h TTL for trigger dedupe + `cm:action:{hash}` 7d TTL for per-effect dedupe. Implemented in `src/lib/idem.ts`. Per ultraplan H2 + Codex HIGH. **Locked 2026-05-12.**

### D5 — Atomic config publish via revision pointer
Each loaded config writes immutable `cfg:rev:{n}` then atomically bumps `cfg:current_rev` pointer. handleActivity reads pointer once at event start, carries `n` through entire pipeline. Per Codex HIGH #3. **Locked 2026-05-12.**

### D6 — Cron single-flight via `acquireLock`
Every cron handler MUST `acquireLock(taskName)` at top, release on completion. 60s TTL. Already wired in `src/routes/scheduler.ts`. Per ultraplan M1. **Locked 2026-05-12.**

### D7 — Path B scope: MVP + select stretch
MVP = Regex/Author/RuleSet + 7 actions + filters + Mustache + named rules + wiki config + dashboard + dry-run tester. Stretch = URL repost + HistoryRule + AttributionRule + RecentActivityRule + image-hash (gated). CUT = MHSRule (per Reddit PR #96, 2026-05-13), DispatchAction, SentimentRule, full RepostRule w/ YouTube, RepeatActivityRule, Web UI w/ Monaco, multi-bot. **Locked 2026-05-12 after triple review; MHS cut layered in 2026-05-13.**

### D8 — Image hashing gated on Day 0–2 spike
If 0.10 shows fetch+decode+hash works in Devvit within 5s and <100MB peak memory, image-hash repost ships. Otherwise feature stubs in `4.7`. **Decision deadline: end of Day 2.**

### D9 — Wiki page name: `botconfig/contextmod`
Matches CM convention. Mods write JSON5 config to `reddit.com/r/<sub>/wiki/botconfig/contextmod`. **Locked 2026-05-12.**

### D10 — Submission writeup voice: first-person build notes
No AI-tone marketing prose. Specific bugs hit, exact cuts made, screenshots. Concrete FoxxMD credit. Watchful1 lesson informs this. **Locked 2026-05-12.**

### D11 — Reddit handle for app
u/CowSufficient3840 (Stephen's logged-in account on devvit). Reflected in `policies/*.md` contact info. **Locked 2026-05-12.**

---

## Open Questions

- [x] **Q1:** Image-hash spike outcome — GO or NO-GO? **GO 2026-05-18.** Preview-variant path produces hashes 0–2 bits off full-res (out of 256 — well below same-image threshold), <100ms decode, <5MB peak RSS. Devvit/Vite bundler accepts all 3 spike packages with 0 errors / 0 warnings / +88KB bundle / 7.8s build. See `experiments/image-spike/RESULTS.md` (gitignored).
- [x] **Q2:** Does `i.redd.it` fetch work? Already PASS — public CDN, no auth headers needed, already in `devvit.json` allowlist + powering observatory dashboard in prod. Confirmed during 0.10 Stage 1: 3/3 fetches succeeded with default `User-Agent`, 28–268ms latency.
- [ ] **Q3:** Submission framing — "Devvit-native full port" vs "spiritual successor + dashboard"? Lean former if Phase 4 ships clean. **Decides:** Stephen by Day 14.
- [x] **Q4:** Custom post height in `devvit.json.post.entrypoints` — set to `tall` in `devvit.json`. Observatory dashboard needs the vertical room for the action stream + stat cards + sparkline. Decided May 13, 2026 by Stephen.

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Domain approval delayed past Day 8 | Submit Day 0 via 0.7. Escalate r/Devvit modmail Day 5 if pending. Fallback: external Lambda hasher on s3.amazonaws.com (allow-listed). |
| Phase 4 image-hash burns 3+ days w/o GO | Hard gate at 0.10 EOD Day 2. NO-GO → stub feature, reclaim time for polish. |
| Vinh capacity (~5–10 hr/wk previously assumed; back on board now) | If actual capacity below estimate, cut 4.4–4.6 history-based rules first, then 4.7 image-hash, then 4.2 MHS. Ship MVP cleanly. |
| AI-tone burn in submission writeup (Watchful1 lesson) | Per D10. Stephen writes from build notes. AI for outline only. |
| Reddit's app review backed up past May 27 | `npx devvit publish --public` no later than Day 14. Backup contingency: submit Devpost with unlisted listing + repo + video. |
| PLAN.md drift between Stephen + Vinh | Atomic plan commits per protocol. 4h stale-lock TTL. Daily sync ping. |

---

## Coordination Protocol

1. **Before starting a task:** set status to 🟡, add timestamp in Notes, commit PLAN.md only, push. This is your lock.
2. **After finishing:** flip to ✅, commit PLAN.md, push.
3. **If blocked:** set to ⛔, add one-line note. Ping the other person.
4. **Before starting ANY task:** `git pull` and re-read PLAN.md. If someone else has 🟡 on overlapping files, coordinate.
5. **Hotfixes:** skip the protocol — commit the fix, update PLAN.md after. Don't let process block real emergencies.
6. **PLAN.md commits are atomic.** Never bundle a status change with code. One-line status edit → commit → push.
7. **Commit messages:**
   - PLAN.md updates: `status: [task #] [emoji] [description]` (e.g., `status: 2.1 🟡 starting action dispatcher`)
   - Code commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`)
   - Contract changes: `⚠️ CONTRACT: [field] — [reason]`
8. **Handoffs:** when your part is done and someone else continues, add `→ [Name]` in Notes column.
9. **Stale locks (hackathon TTL = 4 hours):** 🟡 requires a fresh timestamp. No code/PLAN.md commit within 4h → lock is stale, other person can claim by replacing owner + bumping timestamp.
10. **Contract changes require announcement.** Modifying anything in Shared Contracts → ping the other person BEFORE committing. Mark with `⚠️ CONTRACT` prefix. Contract drift is the #1 small-team integration bug.
11. **CLI helper:** `./scripts/plan claim 2.1`, `./scripts/plan done 2.1`, `./scripts/plan block 2.1 "reason"`, `./scripts/plan ls --mine`. Avoid manual table editing errors.

---

_Last updated: 2026-05-18 by Stephen — **Phase 4.7 enters scope** post Vinh's clean-GO 0.10 spike. Ship target T-7 (2026-05-20). Phase 5 buffer remains tight; Critical-Submission Tier docs concurrent w/ 4.7 impl._
