# Devpost Submission Draft — context-mod-devvit

> **Voice rule (per Codex D10 + Watchful1 lesson):** write in first person, scrappy, sound like a real builder. No "sophisticated ecosystem" / "revolutionary platform" marketing prose. Mention specific bugs you hit, specific cuts you made, specific frustrations. Stephen rewrites every word before submission — this is structural scaffolding, not final copy. <!-- AITONE_IGNORE -->

---

## Section 1 — Tool Overview

> **What Devpost asks:** "Describe in detail the functionality of the bot. Include all capabilities and how moderators and users are intended to use the app."

**Suggested opener** (Stephen's voice — rewrite):

> ContextMod is a rule-engine moderation bot. Mods write JSON5 config in their sub's wiki — define what counts as spam, what flairs to require, what posts to remove, what comments to leave, what users to ban. The bot reads every new post and comment, runs the rules, takes the actions. No central server, no Heroku token, no shared rate limits — Devvit handles all of that. **v0.5.5** ships the full Phase 1+2+3+4 stack PLUS 16 user-facing mod-UX features (filter chips, per-event drill-down w/ AI summary, keyboard shortcuts, mobile responsive, onboarding tour, per-rule statistics table, config rev diff viewer, mod activity attribution feed, mute/unmute rule HARD-MUTE wired into runCheck, light-mode toggle) PLUS the two killer demos: **rule simulation against history** (paste a rule, see "would have fired N/25 (X%)" on recent posts) and **AI rule explainer** (paste JSON5, get plain-English explanation via OpenAI). **Reddit cm-devvit@0.2.4 approved unlisted 2026-05-18**; final code (v0.5.5) re-uploaded T-2 before submission. **Phase 4 history/attribution/recentActivity rules SHIPPED + live-verified on r/contextmod_vinh_dev 2026-05-18** (Vinh's commits 62a0985 + e0abd86). Multi-wave adversarial review across 13 distinct waves (S through AE) closed 70+ findings: 5 BLOCKERs + 8 CRITICAL + 50+ HIGH/WARN/MED surfaced by 6 parallel sub-agent reviews + Codex/Gemini/silent-failure-hunter/type-design-analyzer/comment-analyzer/pr-test-analyzer rotations, all atomic-committed before submission.

> **Why now:** Reddit's CEO said on the Q1 2026 earnings call that they're "porting good bots to the developer platform." Reddit's own r/Devvit team is deprecating the older Blocks framework. The $1,000 App Migration Bounty is explicitly scoped to PRAW→Devvit moves — ContextMod is exactly that. FoxxMD's last ContextMod release was November 2022, weeks before Reddit's paid Data API tier launched in July 2023. The bot has been frozen at the pre-blackout boundary ever since, with 15+ operators stuck running it on dying infrastructure. This port unblocks all of them on the platform Reddit is actively recommending.

> **What mods actually want:** The top-upvoted comment (94 upvotes, u/Aeroncastle) on the May 2026 r/modnews "Mod Monthly" thread is *"I want stronger tools to fight AI, not in person events"* (verified at [r/modnews/comments/1t6jggp](https://www.reddit.com/r/modnews/comments/1t6jggp/), top 6 sampled 2026-05-13). The next three top comments echo the same ask: u/critacle (34 upvotes) — *"Stop the AI bot spam. It's dominating /r/all. This is killing Reddit"*; u/GamingYouTube14 (21) — *"can you guys look into these new ai bots that adapt to the conversation? they're pretty much undetectable by any kind of algorithm"*; u/OMGWTFBBQUE (15) — *"If I have to remove another AI post I'm going to lose my shit. Fucking do something about it."* ContextMod is anti-AI-spam tooling by construction — `regex` catches the generic phrasings AI-generated spam reuses, `author` filters flag new-account / low-karma / no-verified-email patterns AI bot farms produce, `history` (Phase 4) detects cross-sub posting cadence that no human author would maintain. Plus the Observatory dashboard is the "reason-chain audit" r/TrustAndSafety asked for — every action chip surfaces the rule that fired, the activityId, and the context. ContextMod doesn't replace AutoMod (regex-only); it's the moderator's investigation workbench that runs alongside.

**Capabilities (bullet list — all SHIPPED in v0.3.0 unless flagged):**

- **🚀 S1 Rule simulation against history** — mod pastes a proposed rule JSON5 → mod menu "Simulate rule against history" → backend fetches last 25 sub posts via `reddit.getNewPosts`, normalizes via the same path live triggers use, runs the proposed rule against each, returns toast: *"Rule would fire on N/25 (X%) recent items. Examples: t3_a, t3_b, t3_c."* Lets mods preview impact BEFORE saving wiki. **Demo money shot.**
- **🤖 S5 AI rule explainer** — mod pastes a rule JSON5 → mod menu "Explain a rule with AI" → OpenAI gpt-4o-mini returns plain-English 2-3 sentence explanation. Devvit HTTP allowlist updated for `api.openai.com` per Reddit PR #96 (AI-provider scope). Each install supplies their own `openai_api_key` via Devvit settings.
- **🔇 S10 Mute/unmute rule MVP** — Redis hash store + 3 API endpoints (`/api/mute-rule`, `/api/unmute-rule`, `/api/muted-rules`) w/ moderator-auth gate via `reddit.getModerators()` check. v0 soft-mute (dashboard filters muted-rule events); hard-mute integration in `runCheck` is Vinh's Phase 4 follow-up.
- **📊 S11 Per-rule statistics table** — dashboard aggregates events:recent50 client-side per `runName / checkName` key. Shows fired count (largest desc) + ok / err / dry-run breakdown. Top 8 rules.
- **👤 S3 Mod activity attribution feed** — captures every mod-menu action (`reload-config`, `recent-actions`, `test-rules`, `simulate-rule`, `explain-rule`, `mute-rule`, `unmute-rule`) w/ `{ts, actor, kind, detail}` to a 50-deep ZSET ring buffer. Dashboard renders top-5 "u/X ran reload-config 5m ago" provenance feed.
- **📚 S9 Config rev diff viewer** — `h` keyboard shortcut opens modal listing last 10 published config revisions. Click a rev → LCS-based positional line diff against next-older rev. Wave U CRITICAL fix replaced the original set-diff (which collapsed duplicates + showed reordered as "same") w/ O(n*m) LCS so order changes surface correctly.
- **🔍 S2 Per-event drill-down** — click any event row in the stream → expands to show full rule context (runName / checkName / matchedRule / runPath / matchedSubstring), per-action breakdown w/ status markers + wouldHaveCalled, raw event JSON in collapsible. V7 adds "Explain with AI" button — OpenAI summarizes why the event fired in 2 sentences.
- **⌨️ S8 Keyboard shortcuts** — `?` toggles overlay · `r` reloads data · `h` opens config history · `a` clears filter · `esc` closes. Ignored when focus is in INPUT/TEXTAREA + modifier keys held. Handler wrapped in try/catch so a throw doesn't kill the listener.
- **🎯 S6 Filter chips** — 8 chips above event stream: all / remove / comment / approve / lock / report / failed / dry-run. Active chip styled w/ signal-ok border. Counter shows "N of M events" when non-trivial. "show all" reset button on empty-filtered state.
- **📱 S7 Mobile-responsive** — EventRow grid 44/60 → 32/48 sub-sm + drop activityId text. ActionBar flex-col on sub-sm. Devvit custom-post webviews DO render on mobile so this matters for mods triaging on phone.
- **👋 S4 Onboarding tour** — first-visit 3-step walkthrough w/ localStorage gate. Wave U BUG fix made it fail-OPEN on restricted iframes (Safari/Firefox enhanced tracking + 3rd-party storage blocks) so first-time mods in those browsers STILL see the tour. In-memory session flag suppresses re-show even when localStorage.setItem fails.
- **🧪 S12 E2E Playwright tests + CI** — `tests/e2e/dashboard.spec.ts` w/ 7 scenarios (page loads, 5 demo rows, filter narrows count, ? opens overlay, expand row, header tick, no console errors). Headless chromium in GitHub Actions w/ trace + artifact upload on failure.

**Capabilities shipped earlier (still applies in v0.3.0):**

- **3 MVP rule kinds shipped**: `regex` (`pattern` + `flags` + `target: 'title'|'body'|'url'`), `author` (`filter`: age + karma + flair + isMod + isContributor + verified + shadowBanned), `ruleset` (AND/OR composition with nested rules + named-rule references).
- **URL-dedupe `repost` rule** promoted from Phase 4 to Phase 2.5.1 — atomic SET NX (Codex H7-hardened, no race), 30d TTL refresh on hit, fail-OPEN on Redis outage.
- **7 MVP action handlers**: `remove`, `approve`, `lock`, `comment`, `report`, `ban`, `userFlair`. Reddit-API signatures verified against the actual `@devvit/reddit` surface in live playtest — caught 3 spec mismatches Vinh corrected (ban duration 0 ≠ permanent, lock routes via `getPostById().lock()`, `getCurrentSubredditName` doesn't exist).
- **Mustache action templates** over `{{item.*}}`, `{{author.*}}`, `{{rules.<name>.data.*}}` context. Codex H4 hardening: `Mustache.escape` defaults to `escapeMarkdown` so raw `{{item.title}}` can't re-enable u/-ping or `[click](evil)` injection. Triple-stash `{{{...}}}` bypass for explicitly-raw moderator-authored fields.
- **3 Phase 4 stretch rules SHIPPED + live-verified 2026-05-18**: `history`, `attribution`, `recentActivity` (author-cache infrastructure backing all three, +179 tests). Vinh's commits `62a0985` + `e0abd86` end-to-end verified on `r/contextmod_vinh_dev`. `repost` URL-dedupe variant shipped earlier (above); image-hash repost (Phase 4.7) deferred — Day-0 feasibility spike not yet run. Upstream `mhs` toxicity classifier **cut** from the Devvit port per Reddit's `reddit/devvit-docs` PR #96 (2026-05-08) — HTTP fetch policy AI-provider allowlist restricted to OpenAI + Gemini only; `api.moderatehatespeech.com` falls outside that carve-out.
- **Filters** (`authorIs` / `itemIs`) on Check short-circuit BEFORE rule evaluation — fast-fail when the post obviously can't trip the rule. Same predicate set as upstream ContextMod. Codex H5 fix: invalid regex in `titleMatches`/`bodyMatches`/`urlMatches` returns false instead of throwing.
- **Flow control**: `postBehavior` per Check (`next` (default) / `stop` / `{goto: '<check-name>'}`). 100-iter safety break against circular goto.
- **Named rules** for DRY composition. Declare once under top-level `namedRules`, reference via `{kind: 'named', name: '...'}`. Codex H6: unresolved name returns structured `{ok: false, errors}` not 500.
- **Observatory dashboard** (custom-post webview): 4 stat cards (actions today, mod time saved estimate, active rules, top rule), 24h hourly sparkline, last 50 events with status-aware chips (green/blue/red/gray per `status: 'ok'|'dry-run'|'error'|'skipped-locked'`). Live data via `/api/recent` ZRANGE on the `events:recent50` ZSET. `?demo=1` synthetic-fixture path retained for screenshot capture.
- **Wiki-based config** at `r/<sub>/wiki/botconfig/contextmod` with 5-min refresh cron + manual "Reload config from wiki" mod menu action. **Atomic publish via INCR-allocated revision pointer** — Codex H2 hardening closes the concurrent-publisher race that let two simultaneous writers silently overwrite each other's rev. Triggers pass the pre-read snapshot through to `handleActivity` (Codex H3 read-once invariant) so a publish between trigger normalization and rule execution cannot split a single event across revs.
- **Dry-run rule tester** mod menu action — right-click any post/comment, modal pre-fills the thing ID, submit invokes the sibling `dryRunActivity()` pipeline that mirrors `handleActivity` but forces dry-run on every action. Toast bullets show which rules would fire. Zero Reddit side effects.
- **Per-effect idempotency** (Devvit's trigger delivery is at-least-once): `cm:proc:{thingId}` 24h trigger dedupe + `cm:action:pending:{hash}` 5m reserve lease (with owner token, Codex CRITICAL #2) + `cm:action:done:{hash}` 7d done marker. **commitAction retries done-write 3× w/ backoff and refuses to release pending on persistent failure** (Codex CRITICAL #1) — prevents double mod-action when Redis hiccups mid-commit.

**How mods use it:**

1. Install via the App Directory (`developers.reddit.com/apps/cm-devvit`) → click "Add to community."
2. Write JSON5 rules in `r/<sub>/wiki/botconfig/contextmod`. Starter config auto-seeded on install. 3 example configs in repo `examples/` covering simple spam removal, fresh-account spam combo, and namedRules-based trusted-author auto-approve.
3. From the mod menu: **ContextMod: Reload config from wiki** to publish edits — toast confirms rule count (`Loaded N rules (rev M).`). Or wait 5 min for cron auto-refresh.
4. **ContextMod: Test rules on this item** (right-click any post or comment in mod overflow menu) → modal pre-fills thing ID → submit runs the full pipeline with dry-run forced → toast shows which rules would fire + which action chain would run. Zero side effects.
5. **ContextMod: View recent actions** → Observatory custom post → dashboard renders live `events:recent50` ZSET data with status-aware action chips, 24h sparkline, stat cards.

---

## Section 2 — Project Impact

> **What Devpost asks:** "List 1-3 communities that you think would find this app useful and how you see moderators/communities benefiting. We're looking for community impact, time savings for moderators, etc."

### Communities served (real, not hypothetical)

1. **[r/mealtimevideos](https://reddit.com/r/mealtimevideos)** — 60K weekly visitors. FoxxMD's primary ContextMod instance. Currently running on his self-hosted PRAW infrastructure; this port lets him migrate to per-sub Devvit and stop paying for hosting.

2. **[r/piercing](https://reddit.com/r/piercing)** — 600K visitors, 12K contributors. Run by SampleOfNone who publicly flagged in r/Devvit Discord that "image parsing is the hard part on Devvit" — this port has perceptual-hash repost detection (Phase 4) specifically targeting that gap.

3. **The 15+ third-party operators** FoxxMD identified running ContextMod across their own subs (several in the 10K–1M subscriber range, ~150 NSFW subs). Each of them gets the same one-click install path the moment the app is published — no more central server, no more shared rate limits.

### Time savings — the defensible claim

> **Don't overclaim.** Per Codex review: "no published 'X hours saved per mod' study exists. Don't invent numbers."

What CAN be defended (every number citation-traceable in [`pillar-5-numbers.md`](./pillar-5-numbers.md)):

- **466 hours/day of moderation labor measured across 21,500 active mods in 126 subreddits** — Li, Hecht, Chancellor (ICWSM 2022). At $20/hr median that's $3.4M/yr unpaid in the measured population. Linear-scaled to Reddit's stated 60K active mods: **~$9.5M/yr in volunteer-labor-equivalent value** (flag this as scaling math).
- **73% of mod actions are already performed by bots** — same paper.
- ContextMod adds a **second axis** to the bot stack: AutoMod is regex-only; CM adds context-gathering (author history, sub-distribution, image-hash repost) that today only humans can do.
- **Per-action user-history checks take ~5-10 minutes manually**. If CM-class bots offload 1 incremental hour per mod per week beyond AutoMod's reach, the labor-equivalent value offloaded is **60K × 52 × $20 ≈ $62.4M/yr at full capture** — even 10% capture is $6M+/yr.

### Sookra Pillar alignment

- **Pillar 1 — Real problem, named person:** FoxxMD (creator, ContextMod) + SampleOfNone (production operator at r/piercing) both named in conversation. No hypotheticals.
- **Pillar 2 — Structural gap:** Reddit's July 2023 paid Data API tier ($12K+/yr commercial, 100 QPM free) closed the PRAW path. Devvit is the only migration target. CM has 15+ operators stuck on dying infra.
- **Pillar 3 — Human-scale stat:** 466 hr/day mod labor measured; 60K mods scaled; 73% bot-driven; 9–94% of mod work is "invisible" context-gathering — exactly the gap CM fills.
- **Pillar 4 — Tech inevitable:** Reddit's own r/Devvit posts say it: *"deprecating Devvit Blocks renderer"* ([1r3xcm2](https://www.reddit.com/r/Devvit/comments/1r3xcm2/)), *"strongly recommend Devvit Web for all new apps"* ([1pcm13z](https://www.reddit.com/r/Devvit/comments/1pcm13z/)), 80-day countdown to Blocks cutover ([1shophd](https://www.reddit.com/r/Devvit/comments/1shophd/)). The $1K Migration Bounty is *explicitly* scoped to PRAW→Devvit ([1sgwkm7](https://www.reddit.com/r/Devvit/comments/1sgwkm7/)) — ContextMod is the textbook target. ContextMod's release timing seals it: last release v0.13.4 / 2022-11-29, weeks before the API price wall; on 2026-05-12 FoxxMD disabled the upstream CI workflows for PRAW publish/pages — same week he added Stephen + Vinh as collaborators on the Devvit port and shared the project board. The maintainer isn't abandoning the codebase; he's redirecting energy to the port.
- **Pillar 5 — Business case:** Reddit's CEO Steve Huffman on the Q1 2026 earnings call: *"We have what we call good bots on Reddit... we're porting those over to our developer platform."* Reddit Q1 2026: $663M revenue / $311M FCF — Developer Funds is rounding error. Realistic 12-mo direct-cash envelope $19.5K–$25K (Migration Bounty $1K + Hackathon $10K + Install tier cap $3.5K + DQE tier 3–4 ladder $5K–$10.5K). $50K+ stretch if DQE compounds. Discord parallel: Reddit at Year 1 of where Discord's mod-bot economy was at Year 3.

---

## Section 3 — Port Completion (Ported track required)

> **What Devpost asks:** "Describe any differences, improvements, or gaps between your new app and the original bot. Could this app be installed today and serve the original function of the app?"

### Ported faithfully (Phase 1+2+3+4 + Step 3.6 + Waves S through AE shipped in v0.5.5; Reddit cm-devvit@0.2.4 approved unlisted 2026-05-18, final v0.5.5 re-upload at T-2)

The concept model + rule semantics + wiki-config publish pipeline + dashboard + 3 Phase 4 stretch rules + 16 mod-UX features all ship. Live-trigger wiring verified end-to-end on Vinh's `r/contextmod_vinh_dev` (commit `0bd59aa` Phase 4.4-4.6 live-verification). What that means concretely:

- Rule/Check/Action concept model + `postBehavior` flow control + `goto:` jumps — ported
- Filter system (authorIs/itemIs) — ported
- 3 MVP rule kinds + 7 MVP action handlers — full integration shipped Phase 1+2 (Vinh's commits 6694109 + 9532cf4), Reddit-API signatures verified live in playtest
- Wiki-based JSON5 config with AJV validation + atomic publish — working
- Named rules + Mustache action templating — working
- Per-effect idempotency (5min pending + 7d done) — improvement over upstream (CM didn't have explicit retry-safety primitives)
- Observatory dashboard — working with `?demo=1` synthetic data; live data wires up at Phase 3

### Improvements over upstream

- **Per-subreddit isolation** via Devvit Redis (vs upstream's shared central DB)
- **Observatory dashboard** as a native custom post (upstream has only a self-hosted web UI)
- **One-click install** via App Directory (vs upstream's Docker + reverse-proxy setup)
- **Mod-menu dry-run rule tester** (upstream had no equivalent)
- **No central rate-limit bottleneck** — every install runs against its own per-sub Reddit API quota

### Gaps vs upstream (status as of v0.5.5)

- `history`, `attribution`, `recentActivity` rules — ✅ SHIPPED 2026-05-18 (Vinh, +179 tests, live-verified)
- `repost` URL-dedupe variant — ✅ SHIPPED earlier in Phase 2.5.1 (atomic SET NX, Codex H7-hardened)
- Image-hash repost detection (Phase 4.7) — ⛔ deferred. Day-0 perceptual-blockhash spike gated GO/NO-GO never ran; ROADMAP §4.7 keeps it as the post-hackathon target. Even a measured NO-GO writeup credibly closes it.

### Gaps vs upstream (explicitly cut)

- `mhs` (ModerateHateSpeech toxicity classifier) — explicitly cut. Reddit's `reddit/devvit-docs` PR #96 (2026-05-08) locked the HTTP fetch policy's AI-provider allowlist to OpenAI + Gemini only; `api.moderatehatespeech.com` falls outside that carve-out. Available in upstream ContextMod's PRAW build; not available in the Devvit port. Documented honestly rather than worked around.
- `RepeatActivityRule`, `SentimentRule`, full `RepostRule` w/ YouTube — explicitly cut. Sentiment needs NLP libs that don't bundle in Devvit; YouTube API exceeds scope.
- `DispatchAction` (defer-and-replay) — cut; not load-bearing for MVP, defer to v2 if operators ask.
- Multi-bot orchestration (CM's "shared streams" pattern) — Devvit's per-sub install model replaces this architecturally.
- Full Express dashboard with Monaco editor — replaced with the lighter Observatory custom post + wiki editing.

### Can this be installed today and serve the original function?

**Yes, for nearly the entire upstream MVP.** As of v0.5.5 (2026-05-18) the port covers: regex/author/ruleSet rules, all 7 MVP actions, Mustache action templates with markdown sanitization, named-rule composition, atomic wiki-config publish + 5-min refresh cron + manual reload, mod-menu dry-run rule tester, per-effect idempotency (5-min pending + 7d done w/ retry-safe commits), Phase 4 history/attribution/recentActivity author-history rules + URL-dedupe repost, AI rule explainer + AI event summary, Observatory dashboard w/ live ZSET data + 24h sparkline + per-event drill-down + mod activity attribution + config rev diff viewer + hard-mute (wired into runCheck v0.5.5 AE CRITICAL #4), mute/unmute, keyboard shortcuts, filter chips, mobile-responsive, light-mode toggle, onboarding tour.

Subs that depend on image-hash repost detection (Phase 4.7) will need to wait — the perceptual-blockhash spike is gated on Stephen's Vinh GO/NO-GO call. Subs using CM for hate-speech filtering will need to keep running the upstream PRAW build — the Devvit `mhs` port is cut per PR #96.

### Build journal (first-person per D10 — Stephen to rewrite)

**2026-05-16 (Day 4): the whole backend shipped in one day.** Vinh got back on board after a quiet stretch and pushed Phase 1 (rule engine, 11 steps, 93 tests), Phase 2 (7 actions + handleActivity orchestrator + URL-dedupe repost promoted from Phase 4, 137 tests), and Phase 3 (config UX + live dashboard data, 147 tests) in three consecutive feature commits within roughly 12 hours. 3,670 line additions across 53 files. No code-review rounds, just one giant atomic ship per phase + a PLAN.md flip after each.

**Reddit-API surprises Vinh caught in playtest** (and that the plan would have shipped wrong):
- Plan said "ban duration 0 = permanent." Actual Reddit API: 0 days = same-day unban. Permanent = omit the field entirely. `src/actions/ban.ts` now omits when 0/unset.
- Plan said `reddit.getCurrentSubredditName()`. That method doesn't exist in `@devvit/reddit`. It's `(await reddit.getCurrentSubreddit()).name`.
- Plan said `reddit.lock(thingId)`. Actual: lock routes via `getPostById(thingId).lock()` or `getCommentById(thingId).lock()`.

**Council fixes that survived the v1 plan:**
- `handleActivity` would have shipped `actions: undefined` in every event row (the plan wrote `actions: ...` literal but action results were never aggregated). Caught + fixed pre-ship.
- `ActionContext.config` was non-required in the v1 type — the Phase 2.5 dry-run gate reads `ctx.config.dryRun`; without it, the safety net silently evaluates `undefined → false` and every action goes live. Marked REQUIRED so tsc breaks if anyone drops it.

**Codex adversarial review pass (same-day, post-Vinh-ship).** 2 CRITICAL + 7 HIGH + 5 MED + 3 LOW. The two CRITICAL were both in the idempotency layer:
1. `commitAction` swallowed Redis errors. If the Reddit side-effect succeeded but the `done` marker write failed, `releaseAction` deleted the `pending` lease and the next retry fired the same mod-action again. Fixed by adding 3x retry w/ backoff + throwing on persistent failure + never releasing pending unless done was actually written.
2. `pending` lease had no owner token. If worker A's 5-min TTL expired and worker B took over, worker A's late `releaseAction` would delete worker B's valid lease, allowing a third execution. Fixed by storing a random token per reservation + compare-and-delete in commit/release.

Four non-contract hotfixes shipped as separate atomic commits the same session (274aef6 dry-run authority, 8f6d608 repost SET NX, dafe050 commit retries, fc3851a lease token), plus 5 contract-touching fixes via ⚠️ CONTRACT commits (parseConfig wraps expandNamedRules, Mustache.escape default, filter regex try/catch, configStore atomic INCR, handleActivity ConfigSnapshot). v0.2.0 submitted to Reddit App Directory review same-session.

**Wave S + T + U + V (2026-05-17):** 5-agent parallel adversarial code review of the 15 user-facing features shipped this session caught 5 BLOCKERs + 1 CRITICAL + 11 WARNs across Codex / Explore / silent-failure-hunter / test-coverage-analyzer / comment-analyzer. All closed as atomic hotfixes before this writeup updated: mod-auth gate on /api/mute-rule (Codex BLOCKER), simulateRule per-sample error surface (CR3 BLOCKER #1), muteSet Result-typed signatures (CR3 BLOCKER #2), API endpoints 500 on infra-failure (CR3 BLOCKER #3), simpleDiff LCS rewrite (CR4 CRITICAL — was set-diff collapsing duplicates + showing reordered as "same"), OnboardingTour fail-OPEN on localStorage exception (CR3 BUG #9), OpenAI error body parse + AbortError branch (WARN), modActivity structured warn (WARN), forms phase-prefix toast (WARN), ConfigDiff stack log (WARN), ModActivityFeed unavailable-caption (WARN), keyboard handler try/catch (WARN), dryRunActivity AI-tone wording (WARN), configStore.getRecentRevs gap-walk continue-not-break (WARN). **324 tests green, tsc + lint + ai-tone all clean, npm audit 0 vulnerabilities, repo-sentinel pre-submit scan clean across 5 surfaces (secrets/CI/deps/licenses/gitignore).**

**Dry-run rule tester (Step 3.6) design choice.** The handleActivity contract was Vinh's; modifying its `void` return type to accept a `dryRun: true` option that returns structured results would have needed a `⚠️ CONTRACT` PR roundtrip per the team coordination protocol. Instead, shipped a sibling `src/core/dryRunActivity.ts` (~30 line duplication) that mirrors the pipeline but forces `dryRun: true` on every action and returns a structured `DryRunResult` for the form UI to render as toast bullets. Non-contract, no coordination needed, ships immediately.

**Wave W + X (2026-05-18 ~01-02am):** second deep-review pass — 30+ atomic commits across security/observability/reliability/docs/DX. Highlights: per-sub circuit breaker bucket on OpenAI (was global, one sub's bad key opened the breaker for every sub); smart failure classifier (only 5xx/timeout/429 trip breaker, not auth errors); cost-gate parity on 3 endpoints; structured JSON logger w/ traceId + err.stack capture; deep-health probe; THREAT-MODEL.md + API.md + PRIVACY.md + data-retention.md shipped; React.memo on EventRow + RuleStatsTable; runRun goto-missing surfaces to dashboard. v0.3.1 + v0.3.2 tagged.

**Wave Y (2026-05-18 ~02am-3pm):** "leave nothing on the table" finalize pass. Stats-rollup cron + real /api/stats counters; live Playwright AI explain button + 429 rate-limit click-through; README Mermaid security-chain sequence diagram; ARCHITECTURE.md w/ 10 ADR-style sections; Semgrep OWASP workflow; log.newTraceId per-request trace IDs; retry-with-jitter helper; sortable RuleStatsTable columns; vitest hot-path benchmarks; mobile-viewport Playwright; Node 20/22/24 matrix; release-drafter; preflight script. v0.4.0 tagged.

**Wave Z (2026-05-18 ~3-4pm):** brain-dump completion. Print stylesheet; empty-state polish; fast-check fuzz; toast queue; Playwright cache; lazy-ready exports; dependency-cruiser layer rules; axe-core integration; Lighthouse audit; migration guide polish; light-mode MVP toggle; social preview SVG; banner image. v0.5.0 tagged.

**Wave AA (2026-05-18 ~4pm):** husky pre-commit hook (scoped to staged eslint, opt-out via HUSKY=0); commitlint w/ Conventional Commits; .editorconfig; dependabot auto-merge for patch + dev-dep minor; depcruise in CI; coverage thresholds gate; react-window dep installed (deferred until events ring grows past ~100 OR a "show all" view lands). v0.5.1 tagged.

**Wave AB review batch (2026-05-18 ~4:45pm):** 6 hardening fixes — light-mode CSS restored from a prettier reformat that ate it; rl.degraded on 3 cost endpoints; breaker NX probe lease (10s TTL); statsRollup persist return discriminator; retry default skip 401/AbortError; log.ts stack capture.

**Wave AC (2026-05-18 ~5pm):** test-gap close — forms-simulate-rule + configSource breaker + ErrorBoundary + axe-toggle + log/retry edges + shared Result<T,E> type extracted (eliminated 8 hand-rolled discriminated-union duplicates). v0.5.2 tagged.

**Wave AD (2026-05-18 ~5:15pm):** brutally-honest punch-list zero-out — 4 Tier-1 fixes (fetchRecentPostsSafe Result refactor + per-post skip counter; /api/explain-event catch classifier; /api/health/deep moderator auth gate); demo-fixture username obfuscation (`vinhbin`/`CowSufficient3840` → `demo_mod_alice`/`demo_mod_bob`); log.ts adoption across 5 files (49 console.* sites → structured emit); Result<T,E> adoption for ExplainResult + ValidationResult; husky scope fix to src/; CHANGELOG dup [0.3.2] removal. v0.5.3 tagged.

**Wave AD-review (2026-05-18 ~6pm):** dispatched pr-review-toolkit:code-reviewer + silent-failure-hunter on v0.5.3 in parallel. Found 5 real regressions in v0.5.3: substring bug (`'5'` matched "JSON5" — empty-paste error was tripping the breaker); `'timed out'` vs `'timeout'` (real 30s OpenAI timeouts were NEVER tripping the breaker, defeating X37/X43 entirely); apiKey resolve outside try (Redis throw → silent 500); simulate-rule all-skipped toast contradiction; per-post catch swallowed actual error message. Plus extracted classifier to src/lib/openaiErrors.ts so future fixes can't drift. 11-test regression suite pinning both CRITICAL behaviors. v0.5.4 tagged.

**Wave AE Critical Tier (2026-05-18 ~6-7pm):** dispatched 6 parallel sub-agents (code-explorer + 2 silent-failure-hunters + pr-test-analyzer + gemini-agent + general-purpose) across 6 project sections, surfaced 62 findings. 8 atomic fixes shipped: wiki path /wiki/contextmod → /wiki/botconfig/contextmod (5 surfaces); **hard-mute wiring** (isRuleMuted → runCheck — finally real after being false-advertised since v0.3.0); light-mode .glass override (cards no longer invisible when sun-icon flipped); /api/health/deep regression suite (6 tests pinning auth gate); configStore.publish() PublishError wrap (prevents rev-leak that would break moderation forever); **authorHistory 429-distinguish** (the single worst silent failure in the codebase — Reddit rate-limit blip was making commentCountLt rules fire false-positive on EVERY user, mass mis-moderation prevented); dryRun idempotency marker fix + bypassIdempotency safety flag. v0.5.5 tagged. **538 tests passing.**

**What didn't get done:** Phase 0.10 image-decode + blockhash spike — Stephen has 90 min to take a standalone crack; even a measured NO-GO is writeup credibility. Phase 4.7 image-hash repost remains gated on that spike's GO call.

---

## Section 4 — Required submission fields

- **App link:** `developers.reddit.com/apps/cm-devvit`
- **Repo link:** `github.com/StephenSook/context-mod-devvit`
- **Original bot username:** `u/ContextModBot` (FoxxMD's primary instance — confirmed May 12, 2026 via Discord; transcript in [`outreach-drafts.md`](./outreach-drafts.md) "Resolved already" callout)
- **Reddit username (entrant):** `u/CowSufficient3840` (Stephen Sookra)
- **Demo video:** [insert YouTube unlisted link — see `demo-video-script.md`]
- **Helper nomination:** SampleOfNone (publicly flagged the image-parsing challenge in r/Devvit Discord; informed scope decision)

---

## Section 5 — Pre-submission checklist

- [x] FoxxMD confirms bot username for "Original bot" field (`u/ContextModBot`, confirmed May 12, 2026)
- [x] Written permission documentation captured (Discord transcript in `outreach-drafts.md` + GitHub [issue #152](https://github.com/FoxxMD/context-mod/issues/152))
- [x] Repo flipped to public + GitHub Pages live for privacy/ToS (May 13, 2026)
- [x] App `--public` flag set + Reddit App Review passed — cm-devvit@0.2.4 approved unlisted 2026-05-18
- [x] `mhs` rule cut per `reddit/devvit-docs` PR #96 (2026-05-08) — documented in Section 3 "Gaps vs upstream (explicitly cut)"
- [x] Phase 4 history/attribution/recentActivity SHIPPED 2026-05-18 + live-verified
- [x] Phase 4.7 image-hash repost — explicitly downgraded in writeup (Section 3 "Gaps vs upstream")
- [ ] Demo video recorded + uploaded to YouTube (unlisted) — Stephen records T-3 to T-1 (May 24-26)
- [ ] Final `npm run launch` re-uploads v0.5.5 source as new Devvit version — T-2 (May 25)
- [ ] Stephen rewrites every section of this draft in his own voice
- [ ] Run `./scripts/check-ai-tone.sh --strict` against final pasted text
