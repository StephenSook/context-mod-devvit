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
| 0.10 | Image-decode + blockhash spike | `experiments/image-spike/` | **Vinh** | ⬜ | 0.8 | ⚠️ GO/NO-GO gate for Phase 4 image hashing. Day 0–2 max. → Vinh |

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
| 2.5.2 | `dryRun` config flag — NON-NEGOTIABLE per Council SRE | `src/core/runAction.ts` | **Vinh** | ✅ 2026-05-16 | 2.1 | Per-action `dryRun` overrides `ctx.config.dryRun`. `ActionContext.config` is REQUIRED on the type — gate cannot silently regress (tsc breaks if dropped). Verified live: repost-watch dry-run returned `wouldHaveCalled: 'remove'`, no Reddit side-effect. Commit 9532cf4. |
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

### Phase 4 — Stretch (Day 11–13, ~14h) — image hashing gated by 0.10

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 4.1 | URL-dedupe Repost rule | `src/rules/repost.ts` | **Vinh** | ⬜ | 1.6 | Cheap: sha256(url) + Redis SET w/ 30d TTL |
| ~~4.2~~ | ~~MHSRule (HTTP fetch toxicity)~~ | ~~`src/rules/mhs.ts`~~ | — | ✂️ CUT | — | **CUT 2026-05-13 per Reddit PR #96** — HTTP fetch policy AI-provider allowlist locked to OpenAI + Gemini only; `api.moderatehatespeech.com` falls outside. See `docs/submission/devvit-app-settings.md` + `policies/privacy.md`. |
| 4.3 | History infrastructure (author cache) | `src/state/authorHistory.ts` | **Vinh** | ⬜ | 1.1 | Cache shape: hash `cm:author:{name}` w/ fields `lastFetched` (epoch ms), `submissionCount`, `commentCount`, `linkKarma`, `commentKarma`, `accountAge` (epoch ms), `verified` (bool), `subs` (JSON array of recent active sub names). TTL 1h (3600s). Fetch via `reddit.getUser(name)` + `reddit.getUserSubmissions({username, limit: 100})` lazily on first rule access. Shared by 4.4–4.6 — build once, all three rules read from same cache key. |
| 4.4 | HistoryRule | `src/rules/history.ts` | **Vinh** | ⬜ | 4.3 | Criteria: `{submissionCount: {greaterThan, lessThan}, commentCount: {...}, linkKarma: {...}, commentKarma: {...}, accountAge: {olderThan, youngerThan} }` — durations parsed via `parseDuration('1d' \| '30d' \| '1y')` → seconds. Threshold = AND across all configured criteria (any unconfigured criterion = pass). |
| 4.5 | AttributionRule | `src/rules/attribution.ts` | **Vinh** | ⬜ | 4.3 | For each url submission in author's recent history (cached `subs` field) count domain frequency. Criteria: `{domain: string \| string[], threshold: number, window: '7d' \| '30d' \| 'all'}`. Fires when ≥ threshold submissions to specified domain in window. Useful for "spammer hitting r/X 5 times this week" detection. |
| 4.6 | RecentActivityRule | `src/rules/recentActivity.ts` | **Vinh** | ⬜ | 4.3 | Criteria: `{subs: string[], threshold: number, window: '7d' \| '30d'}`. Fires when author has ≥ threshold posts/comments to any sub in `subs` list within window. Use case: "this user posted to r/banned-list-sub" auto-action. |
| 4.7 | Image-hash port + worker + multi-index LSH | `src/image/*`, `src/rules/imageRepost.ts` | **Vinh** | ⬜ | 0.10 | ⚠️ GATED on 0.10 spike GO. If GO: blockhash 16x16 perceptual hash (256-bit BigInt); LSH = split into 4×64-bit bands, index each band → Redis hash `cm:repost:img:band{n}:{hexBand}` member-set. On new image: compute hash, query each band, intersect candidates, Hamming-distance ≤ threshold (default 10) → repost. Worker queue: cron `image-hash-worker` runs every 5min, dequeues `cm:image:pending` ZSET. Spike result (GO/NO-GO) ships at `experiments/image-spike/RESULT.md`. |
| 4.8 | DispatchAction | — | — | ✂️ | — | Cut per Codex+ultraplan synthesis |
| 4.9 | SentimentRule | — | — | ✂️ | — | Cut — NLP libs won't bundle in Devvit runtime |
| 4.10 | Full RepostRule w/ YouTube | — | — | ✂️ | — | Cut — 4.1+4.7 cover MVP |
| 4.11 | RepeatActivityRule | — | — | ✂️ | — | Cut — defer post-hackathon |

### Phase 5 — Tests + demo + submission (Day 13–15, ~10h)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 5.1 | AJV schema golden tests | `tests/config.test.ts` | **Vinh** | ⬜ | 1.2 | Fixture corpus from real CM configs |
| 5.2 | Rule eval unit tests | `tests/rules/*.test.ts` | **Vinh** | ⬜ | 1.6, 4.* | Each rule covered |
| 5.3 | E2E scenarios A–H on test sub | manual | **Stephen** | ⬜ | All prior | GIFs/screenshots → docs/demo-scenarios/ |
| 5.4 | README polish + Fetch Domains section | `README.md` | **Stephen** | ⬜ | 5.3 | Devvit Rules requirement for fetch apps |
| 5.5 | 60s demo video | YouTube unlisted | **Stephen** | ⬜ | 5.3 | OBS + Audacity + ffmpeg |
| 5.6 | Submission writeup (Devpost) | devpost.com | **Stephen** | ⬜ | 5.5 | First-person build notes per D10 |

### Phase 6 — Ship (Day 15–16, ~6h)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 6.1 | `npx devvit publish --public --bump minor` | terminal | **Stephen** | ⬜ | All prior | 1–7 day review window |
| 6.2 | Devpost submission filed | devpost.com | **Stephen** | ⬜ | 6.1 | Before May 27 6 PM PT |

---

## Shared Contracts

> Drift = integration bugs. Modify these only after pinging the other person. `⚠️ CONTRACT` commit prefix on changes.

| Contract | Owner | Consumers | Definition |
|---|---|---|---|
| Redis key schema | Vinh | Both | `src/state/keys.ts` const K namespace |
| AJV config schema | Vinh | Both | `src/server/schema/app.schema.json` (trimmed from CM `Schema/App.json` — see `docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:110` for the trim list) |
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

- [ ] **Q1:** Image-hash spike outcome — GO or NO-GO? (Task 0.10 result). **Decides:** finalize D8, sets Phase 4 shape. Owner: Vinh.
- [ ] **Q2:** Does `i.redd.it` fetch work post-approval? CDN auth/referer behavior unknown. Test in playtest. **Decides:** image-hash viability even if blockhash decode works. Owner: Vinh during 0.10 spike.
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

_Last updated: 2026-05-16 by Stephen._
