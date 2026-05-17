# Devpost Submission Form — Paste-Ready Cheat Sheet

> **Source of truth:** Stephen captured the actual Devpost form on May 13, 2026 (URL: `devpost.com/submit-to/29423-reddit-mod-tools-and-migrated-apps-hackathon/manage/submissions/1017798/...`). Every field below is mapped to the real form, with verbatim paste copy. Drafted May 13, 2026; **refreshed 2026-05-16 after Vinh shipped Phase 1+2+3 + Stephen shipped Step 3.6 + Codex CRITICAL/HIGH hotfixes + v0.2.0 submitted for Reddit review**. Hackathon deadline May 27, 2026 at 6pm PT.
>
> **Voice:** Stephen edits every paragraph in his own voice before submission. This is structural scaffolding, not final copy. No AI-tone words (`powerful`, `sophisticated`, `revolutionary`, `seamless`, `leverage`, `robust`, `cutting-edge`, `intuitive`, `amazing`, `easily`, `simply`, `effortlessly`, `transform`). <!-- AITONE_IGNORE -->

---

## Step 1 — Manage team (already complete)

Stephen + Vinh as team members.

---

## Step 2 — Project overview (PUBLIC)

### Project name (≤60 chars)

**Recommended (primary):**
```
ContextMod — Devvit port of FoxxMD's PRAW mod bot
```
*49 chars. Informative, names the upstream, names the platform.*

**Alternatives:**
- `ContextMod (Devvit Web port)` — 28 chars, minimal
- `ContextMod Observatory` — 22 chars, matches the dashboard name
- `cm-devvit — ContextMod ported to Reddit Devvit Web` — 50 chars, technical

**Sookra anchor:** Pillar 1 (named upstream — FoxxMD).

### Elevator pitch (≤200 chars)

**Recommended:**
```
FoxxMD's PRAW mod bot, ported to Reddit Devvit Web. JSON5 wiki rules, live Observatory dashboard, per-sub install — no hosting, no tokens, no shared bottleneck. Codex-hardened. 15+ communities ready.
```
*197 characters (Devpost cap is 200). Names the upstream, names the platform, lists the wedge (no hosting/tokens/bottleneck), credits the adversarial-review hardening, grounds in a concrete operator base.*

**Sookra anchors:** Pillar 1 (FoxxMD) + Pillar 2 (no shared bottleneck) + Pillar 5 (15+ communities).

### Try locally (judge-friction reducer)

Any technical judge can verify the dashboard renders in <2 min — paste this into the public-facing About-the-project Markdown or surface it as the second paragraph after the elevator pitch:

```bash
git clone https://github.com/StephenSook/context-mod-devvit.git
cd context-mod-devvit
npm ci && npm run dev:web
```

Then `http://localhost:5173/?demo=1` in a browser. Renders the Observatory dashboard against synthetic seed data — exercises every component (stat cards, sparkline, event stream, status-aware action chips, ApiResult discriminated union) without needing a Devvit playtest install. No Reddit auth required. Zero risk to anyone's sub.

### Thumbnail (3:2 ratio, JPG/PNG/GIF, ≤5MB)

**Spec:** 1200×800 PNG. Generate via Banana with the Observatory aesthetic (warm-dark + concentric rings + green accent + thin overlay text "ContextMod · Devvit Web port"). Adds to Wave H of [day-3 plan](../superpowers/plans/2026-05-13-day3-submission-prep.md).

---

## Step 3 — Project details (PUBLIC)

### About the project (Markdown, LaTeX-capable)

Devpost's template suggests headings: **Inspiration / What it does / How I built it / Challenges / Accomplishments / What I learned / What's next / Built with**. Paste in that order so the project page renders cleanly.

```markdown
## Inspiration

ContextMod is the rule-engine mod bot that 15+ subreddit teams have been running since 2019. It's why r/mealtimevideos (60K weekly visitors) and r/piercing (600K visitors, 12K contributors) had a fighting chance against spam waves that AutoMod's regex can't catch. Then Reddit killed the free Data API in July 2023, and PRAW-era ContextMod installs started running on dying infrastructure. FoxxMD's last release was November 2022 — weeks before the paid Data API tier launched. In March 2026 Reddit announced the $1,000 Migration Bounty for PRAW → Devvit ports. On the Q1 2026 earnings call Reddit's CEO said: "we have what we call good bots on Reddit... we're porting those over to our developer platform." ContextMod is exactly what that statement names.

I got written permission from FoxxMD to port it (GitHub issue [FoxxMD/context-mod#152](https://github.com/FoxxMD/context-mod/issues/152), Discord exchange archived).

## What it does

Mods install ContextMod on their sub with one click — no Heroku, no API tokens, no shared rate limits. They write rules in JSON5 inside `r/<sub>/wiki/botconfig/contextmod`. ContextMod evaluates every new post and comment against those rules and takes the configured action: `remove`, `approve`, `lock`, `comment`, `report`, `ban`, `userFlair`. A custom-post Observatory dashboard surfaces action telemetry live via the `events:recent50` ZSET — stat cards, 24h sparkline, last 50 events with color-coded chips. v0.2.0 ships the full Run → Check → Rule → Action engine + 7 action handlers + atomic config publish + wiki cron + live dashboard data + dry-run rule tester — Phase 1+2+3 complete. A mod-menu dry-run lets you test rules against a specific post before committing them live.

The rule engine ports the original ContextMod concept model faithfully: **Run → Check → Rule → Action** with `postBehavior` flow control (`next` / `nextRun` / `stop` / `goto:<run>.<check>`), filters (`authorIs` / `itemIs`), named rule composition, Mustache action templating with `{{item.*}}` / `{{author.*}}` / `{{rules.<name>.data.*}}` context. v0.2.0 ships 3 MVP rule kinds (`regex`, `author`, `ruleSet`) + URL-dedupe repost rule promoted from Phase 4 + 7 actions; remaining Phase 4 stretch (`history`, `attribution`, `recentActivity`, image-hash) in progress. Upstream `mhs` toxicity classifier was cut per Reddit PR #96 (HTTP fetch allowlist restricted to OpenAI + Gemini only).

## How I built it

TypeScript + Hono + Vite served via Devvit Web (CommonJS bundle). Two-person team: Vinh on backend (rule engine, actions, handleActivity, config UX), Stephen on frontend + scaffolding + idempotency + submission. The architecture is in [README.md](https://github.com/StephenSook/context-mod-devvit#architecture) — Mermaid `flowchart TB` + `sequenceDiagram` showing the three-stage idempotency keys + atomic config publish + dashboard webview.

- **Hono routes:** `/internal/triggers/*` (post-submit, comment-submit, app-install, app-upgrade), `/internal/cron/*` (refresh-config, stats-rollup, image-hash-worker), `/internal/menu/*` (reload-config, recent-actions, test-rules), `/internal/form/test-rules-submit`, `/api/recent`, `/api/stats`, `/api/health`.
- **Config publish is atomic via INCR-allocated rev pointer.** Mod edits wiki → `refresh-config` cron parses JSON5 + AJV-validates → atomic INCR allocates next rev → writes immutable `cfg:rev:n` → bumps `cfg:current_rev` pointer. Triggers pass the pre-read snapshot through to `handleActivity` so a publish between trigger normalization and rule execution cannot split a single event across revs (Codex H3 read-once invariant).
- **Redis storage only.** Strings, hashes, sorted sets — no Lists, no Sets (Devvit constraint). The `events:recent50` ring buffer is a ZSET with `ZREMRANGEBYRANK` trim. Per-action idempotency: `cm:action:pending` lease holds a random owner token so a slow worker's late `releaseAction` can't delete a successor's valid lease (Codex C2). `commitAction` retries done-write 3× w/ backoff and refuses to release pending on persistent failure (Codex C1) — prevents double-action on Devvit's at-least-once trigger delivery.
- **Observatory dashboard:** React + Vite, custom-post webview. HSL design tokens, Geist + Geist Mono + Instrument Serif italic typography. Live event data via `/api/recent` ZRANGE. `?demo=1` synthetic-fixture path retained for screenshots/recordings. `ApiResult<T>` discriminated union for error UX so the dashboard preserves last-good state on backend hiccups.
- **Dry-run rule tester** (Step 3.6): mod right-clicks any post/comment → menu `Test rules on this item` → form pre-fills thingId → submit invokes a sibling `dryRunActivity()` pipeline that mirrors `handleActivity` but forces dry-run on every action and returns a structured `DryRunResult` for the toast bullets. Non-contract design choice: keeps `handleActivity`'s `void` signature stable while giving the form UI structured data.
- **Codex adversarial review** ran end-to-end on both phases (Phase 1+2 ship and full-session retrospective). 2 CRITICAL + 7 HIGH idempotency/safety findings shipped as atomic hotfixes in-session: dry-run global authority, repost SET NX race-elimination, commitAction retries, lease owner tokens, plus 5 contract-touching fixes (publish INCR, handleActivity ConfigSnapshot, Mustache.escape default, filter regex try/catch, ParseResult wraps expandNamedRules).

## Challenges

- **The first FNV-1a implementation was 32-bit and failed canonical test vectors.** Codex review caught it. Rewrote with BigInt for 64-bit precision, verified against `''`, `'a'`, `'foobar'`.
- **Devvit's CSP blocks `eval()`**, which Framer Motion uses internally. Ripped framer-motion entirely, replaced with hand-rolled CSS keyframes (`cmFadeUp`, `cmFadeLeft`, `cmFadeIn`, `cmDrawLine`).
- **Sparkline blew up on `Math.max(...data)`** when the data array was empty (stack overflow). Switched to `reduce()` with guards.
- **`submitCustomPost` deprecated `splash` in 0.12.23.** Had to use `entry` + `textFallback`.
- **Vitest needed its own config** to bypass the `@devvit/start` plugin (which only works in `vite build` mode).
- **App icon I generated via Gemini was JPEG bytes inside a `.png` filename** — would've failed Devvit's upload validation. Caught via Codex review on Day 2, re-encoded via PIL with LANCZOS resample.
- **The first developer-portal cheat sheet I drafted invented 8 of 13 fields** (tagline, category dropdown, support URL, etc.) that don't exist in Reddit's actual Developer Portal. Caught via research-agent cross-check against the official Devvit `launch-guide.md`. Rewrote it.
- **Reddit-API reality vs plan.** Vinh shipped Phase 2 actions and caught 3 spec mismatches in live playtest: `ban` duration 0 = same-day unban (not permanent — permanent = omit field); `lock` routes via `getPostById().lock()` not `reddit.lock(thingId)`; `reddit.getCurrentSubredditName()` doesn't exist (use `(await reddit.getCurrentSubreddit()).name`). All 3 fixed against the actual Reddit API surface, not the docs assumption.
- **Codex CRITICAL idempotency edges.** Adversarial review caught two double-action risks: `commitAction` could swallow done-marker write failures and let `releaseAction` re-open the gate; pending lease had no owner token so a slow worker's late release could delete a successor's valid lease (third-execution race). Shipped 2 atomic hotfixes same session — retry-with-backoff + lease-owner-tokens.
- **Dry-run form submit returned thingId=undefined in live playtest.** Devvit's form submission envelope is FLAT (`{thingId: '...'}`) not the doc-convention nested `{values: {thingId}}` we assumed. Caught by adding a RAW BODY log, shipped a defensive multi-shape parse, fix landed same session.

## Accomplishments

- **300+ atomic commits across 5 days** (every fix is its own commit per the GitHub-activity discipline I'm using). Vinh shipped Phase 1+2+3 (3,670+ lines, 6 phase commits) in a single day; Stephen shipped Step 3.6 dry-run tester + 4 Codex CRITICAL/HIGH hotfixes + 5 contract-touching fixes the same evening.
- **173 tests green** end-to-end across rule engine, actions, handleActivity orchestrator, idempotency, configStore, recentEvents, dryRunActivity, menu + form routes. `tsc --build` clean.
- **v0.2.0 submitted to Reddit App Directory review** ([cm-devvit](https://developers.reddit.com/apps/cm-devvit)). Email-on-approval within 1–7 days per Reddit SLA.
- **Codex adversarial review ran end-to-end** on both phases (Phase 1+2 ship review + full-session retrospective). 2 CRITICAL + 7 HIGH + 5 MED + 3 LOW first round; 3 HIGH + 4 MED + 3 LOW second round; ALL CRITICAL + HIGH addressed in atomic commits. Caught real safety regressions (double-action idempotency edges, dry-run safety-gate bypass, repost SET-NX race) that would have been worst in production.
- Sookra Methodology Pillars 4 + 5 deepened with verbatim quotes from Reddit's own r/Devvit posts (`1r3xcm2`, `1pcm13z`, `1shophd`, `1sgwkm7`) and Steve Huffman's Q1 2026 earnings call.
- Privacy + ToS deployed to GitHub Pages, repo flipped public after a clean secrets audit.
- Architecture diagram in the README is Mermaid (flowchart + sequence) — best-practice patterns from official Mermaid docs (semantic shape conventions, 4-color WCAG-AA palette, screen-reader `accTitle` + `accDescr`).
- Domain approval came back: `i.redd.it`, `preview.redd.it`, `external-preview.redd.it`, `external-i.redd.it` are all in Reddit's global fetch allowlist — no explicit allowlist needed.
- **Live e2e scenarios captured** on Stephen's test sub `r/cm_devvit_test` against playtest-deployed v0.2.0.8: Scenario G (reload-config toast w/ rule count), Scenario F (dry-run form modal + toast bullets), Scenario H (Observatory dashboard webview render). Screenshots in `docs/screenshots/scenario-*.png`.

## What I learned

- Devvit's Redis primitives are deliberately constrained. No Lists, no Sets. Designing around the absence of `LPUSH` forced cleaner ZSET-based ring buffers and made idempotency easier to reason about.
- "Tech inevitable" framing only works with primary sources. Quoting Reddit's own r/Devvit posts beats quoting commentators.
- AI-tone words are a bigger threat than I expected — u/Watchful1 publicly flagged AI-style replies as "minus points" in r/Devvit early in the hackathon. Every word in this writeup got hand-scrubbed against a blocklist.
- Three-brain workflow (Claude as IDE driver + Codex for adversarial review + Gemini for long-context research synthesis) caught bugs I would've shipped solo: the icon JPEG mismatch, the fabricated form fields, the broken Pages links.

## What's next

- **Phase 4 stretch (Vinh, capacity-permitting before 5/27):** `history`, `attribution`, `recentActivity` rules — author-cache infrastructure backing all three. Cuts in stretch order if capacity slips per the risk register.
- **Phase 4.7 image-hash repost detection:** perceptual blockhash in pure JS within Devvit's 30s/no-native-deps env. Gated on a Day-0 feasibility spike that wasn't run; effectively NO-GO for this hackathon, deferred post-submission.
- **`mhs` toxicity rule explicitly cut** per `reddit/devvit-docs` PR #96 (2026-05-08) — Reddit locked the HTTP fetch policy's AI-provider allowlist to OpenAI + Gemini only; `api.moderatehatespeech.com` falls outside the carve-out. Subs using upstream CM specifically for hate-speech filtering keep running the PRAW build.
- **Post-hackathon:** open the app to all 15+ ContextMod operators FoxxMD identified; pursue Reddit Developer Funds DQE ladder ($5K-$10.5K realistic 12-mo capture); evaluate parse-time regex catastrophic-backtracking validator (Codex MED finding deferred — `safe-regex` npm dep adds bundling weight not worth the hackathon-window cost).

## Built with

TypeScript · React · Hono · Vite · Tailwind CSS · Lucide React · Redis · Devvit Web · Reddit Developer Platform · AJV · JSON5 · Mustache · Vitest · ESLint · Prettier · GitHub Actions · GitHub Pages · Mermaid · Codex (review) · Claude Code
```

**Sookra anchors per section:**
- Inspiration → Pillars 1 + 2 + 4 (named upstream, structural gap, Reddit-pushed inevitability)
- What it does → Pillar 1 (concrete capabilities, no hypotheticals)
- How I built it → engineering depth (judges' "is this real?" filter)
- Challenges → honesty + Codex/three-brain visibility
- Accomplishments → Pillars 4 + 5 (deepened evidence)
- What I learned → reflexive honesty about AI-tone, three-brain wins
- What's next → roadmap honesty (Phase 4 gated on domain approval — don't overclaim)
- Built with → engineering surface

### Built with (comma-separated tags)

```
TypeScript, React, Hono, Vite, Tailwind, Lucide, Redis, Devvit, Devvit Web, Reddit API, AJV, JSON5, Mustache, Vitest, ESLint, Prettier, GitHub Actions, GitHub Pages, Mermaid
```

### "Try it out" links

| URL | Why |
|-----|-----|
| `https://developers.reddit.com/apps/cm-devvit` | App Directory listing (install path) |
| `https://github.com/StephenSook/context-mod-devvit` | Source code |
| `https://stephensook.github.io/context-mod-devvit/` | Policies + docs landing |

### Image gallery (3:2 ratio, ≤5MB each)

Two parallel sources available — pick the mix that tells the strongest story. Live captures (from playtest 2026-05-16/17 on `r/cm_devvit_test`) are MORE AUTHENTIC; banana mockups (`assets/gallery-*.png`, 1200×800 PNG) are more POLISHED. Recommend hybrid: lead with the live dashboard, follow with live dry-run flow, finish with banana hero shots for polish.

**Recommended upload order (5 slots — judges land on first image):**

1. **`docs/screenshots/dashboard-desktop.png`** — Observatory dashboard hero (Wave F Playwright capture against `?demo=1` synthetic; rich event stream + populated stat cards)
   - **Caption + alt-text:** *"Observatory dashboard: 4 stat cards (Actions today, Mod time saved, Active rules, Top rule), 24-hour hourly-actions sparkline, recent moderation events with REMOVE / COMMENT / APPROVE / LOCK action chips. Rendered with ?demo=1 synthetic for screenshot capture; production renders live events:recent50 ZSET data."*

2. **`docs/screenshots/scenario-g-reload-toast.png`** — LIVE mod-menu reload toast `Loaded 3 rules (rev 1).`
   - **Caption + alt-text:** *"Mod menu action 'ContextMod: Reload config from wiki' firing live on r/cm_devvit_test. Toast confirms 3 rules loaded from the sub's wiki JSON5 config at rev 1, after the loadFromWiki() pipeline parsed + AJV-validated + atomically published the snapshot."*

3. **`docs/screenshots/scenario-f-dryrun-form.png`** — LIVE Step 3.6 dry-run modal `ContextMod — Dry-run rules` w/ Thing ID pre-filled
   - **Caption + alt-text:** *"Dry-run rule tester modal from the post mod menu. Thing ID pre-filled; submit runs the full rule pipeline against this item with zero Reddit side-effects so mods can validate config before going live."*

4. **`docs/screenshots/scenario-f-dryrun-toast.png`** — LIVE dry-run result toast `No rules triggered. Evaluated 3 run(s) at rev 1.`
   - **Caption + alt-text:** *"Dry-run result rendered as a Reddit toast. Pipeline evaluated all 3 rule runs against the selected item, reported zero triggers (Observatory post by mod-bot → authorIs filters short-circuit), all without firing a single mod action."*

5. **`assets/gallery-modmenu.png`** OR **`docs/screenshots/scenario-h-dashboard-empty.png`** — choose your finisher
   - Gallery-modmenu (banana mockup): polished menu-overflow showing the 3 ContextMod entries
   - Scenario-h dashboard-empty (live capture): empty-state UX showing the starter-config snippet + copy-clipboard button (proves the cold-start experience works)

**Plus thumbnail** (separate slot, Step 2): **`assets/thumbnail.png`** already generated via Banana (1200×800, Observatory aesthetic — warm-dark + concentric rings + green accent + "ContextMod · Devvit Web port" overlay).

Bonus options in `assets/` (banana mockups) if Stephen wants more polished slides:
- `gallery-dashboard.png` — Observatory hero (banana version, polished composition)
- `gallery-wiki.png` — JSON5 wiki rendering
- `gallery-install.png` — App Directory install flow
- `gallery-trigger.png` — event-stream close-up
- `gallery-dryrun.png` — 4-card dry-run mockup
- `install-flow.png` — 3-panel install composite

### Video demo link

```
[TBD — YouTube unlisted URL after Day 13-14 recording]
```

Beat sheet in [`demo-video-script.md`](./demo-video-script.md). Production runbook in [`demo-video-runbook.md`](./demo-video-runbook.md).

---

## Step 4 — Additional info (JUDGES ONLY, not public)

### Sponsor / Special Prizes

Multi-select. Choose:
- ✅ **Best Ported App** — the $10,000 grand prize (this is my primary target)
- Possibly also: any "Most Helpful Migration" / "Community Choice" prize categories if surfaced

*Open verification flag:* check the dropdown's actual entries against the hackathon prize list at `mod-tools-migration.devpost.com` before submitting.

### Reddit username (team members)

```
u/CowSufficient3840 (Stephen Sookra), u/Outside-Research-772 (Vinh)
```

### developers.reddit.com app page

```
https://developers.reddit.com/apps/cm-devvit
```

### Tool overview (required, judges-only)

Paste from [`writeup-draft.md`](./writeup-draft.md) Section 1, including the deepened "Why now" paragraph that opens with Huffman's CEO quote.

### Project Impact (required, judges-only)

Paste from [`writeup-draft.md`](./writeup-draft.md) Section 2, including the deepened Time savings math ($9.5M scaled / $62.4M addressable / $6M+ conservative capture) and the rewritten Sookra Pillar alignment box.

### Is this a new app or a migrated app?

Dropdown:
- ✅ **Migrated app** (Ported track — eligible for Best Ported App $10K grand prize)

### [For Ported Projects] Original Bot username

```
u/ContextModBot
```

⚠️ **Open verification flag:** confirm the exact bot handle with FoxxMD before submission. See `outreach-drafts.md` ping #2 (Wave I of day-3 plan).

### [For Ported Projects] Port Completion

Paste from [`writeup-draft.md`](./writeup-draft.md) Section 3. Key honest claims to preserve:

- **Can the app be installed today and serve the original function?** Yes for MVP scope (regex spam, mod-flair gating, author-criteria filtering, named-rule composition). Phase 4 (`history`, `attribution`, `recentActivity`, `repost`) is in active development and explicitly flagged. `mhs` rule is cut per PR #96 — subs using CM for hate-speech filtering keep running the upstream PRAW build.
- **Improvements over upstream:** per-sub Redis isolation, native custom-post Observatory dashboard, one-click install, mod-menu dry-run tester, no central rate-limit bottleneck, per-effect idempotency (upstream lacks).
- **Explicit cuts:** `RepeatActivityRule`, `SentimentRule`, full `RepostRule` w/ YouTube, `DispatchAction`, multi-bot orchestration, Express dashboard w/ Monaco — all explicitly cut with rationale.

### Nominate a most helpful user (optional)

Devpost field accepts ONE primary nominee + free-form reasoning.

**✅ CONFIRMED 2026-05-17 — Primary nomination is u/SampleOfNone** (Stephen pinged via Reddit Devs Discord; consent granted to be nominated + cited):

```
u/SampleOfNone — moderator of r/piercing (600K visitors, 12K contributors). Publicly flagged in the Reddit Devs Discord (May 12, 2026) that image parsing is "the hard part on Devvit" while I was scoping Phase 4, which directly informed my decision to gate the image-hash repost rule on a Day-0 feasibility spike before committing scope. Also asked a real technical compatibility question ("For subs that already run CM, you plan on using their existing wiki pages?") that improved the port's operator-migration story. Honest scope and operator credibility — both directly attributable to her early engagement.
```

**Alternate kept on file (not needed — SampleOfNone confirmed): u/FoxxMD:**
```
u/FoxxMD — author of the original PRAW ContextMod that 15+ communities have run since 2019, including r/mealtimevideos (60K weekly visitors). Gave explicit written permission to port (issue #152), added Stephen + Vinh as repo collaborators on May 12, set up the shared GitHub Projects v2 kanban for cross-team coordination on May 13. Without his permission this port wouldn't exist; without his engagement throughout the hackathon it wouldn't be defensible as "ported faithfully."
```

> **Status (2026-05-17):** ping sent, consent granted, no fallback needed. Paste the SampleOfNone block into the Devpost Helper-nomination field.

### [Optional] Developer Platform feedback

Devpost has a $200 Feedback Award (×10 winners) for "detailed, candid, actionable, and constructive feedback" on the Devvit platform. Submission is via Reddit's developer satisfaction survey at [forms.gle/d9jY3szEzRzmKPwL8](https://forms.gle/d9jY3szEzRzmKPwL8) per the Devpost overview.

```
Submit the survey 5/19 (T-1) — independent of the project Devpost form. Free entry to the Feedback Award pool. Specific topics to cover:
- Devvit Redis primitive limitations (no Lists/Sets, no Lua/transactions) and the TOCTOU mitigation pattern we had to invent
- vite plugin blocking `vite dev`/`vite preview` — workaround via mock Python http server documented in this repo
- HTTP fetch policy PR #96 impact on legitimate third-party APIs (MHS cut)
- Devvit Web vs Devvit Blocks deprecation timing clarity
- Documentation gaps on the App Migration Program bounty workflow
- Custom-post webview iframe URL not being a shareable OG-crawlable surface
```

---

## Step 4.5 — Rubric alignment (paste into the optional "judges' notes" if Devpost surfaces it)

Per the [hackathon page](https://mod-tools-migration.devpost.com/) judging criteria, here is how this submission maps to each scoring dimension. Stephen pastes this into the "Notes for judges" field if Devpost has one; otherwise it lives here as the internal sanity check before submit.

| Devpost criterion | Our evidence | Source-of-truth document |
|-------------------|--------------|---------------------------|
| **Community Impact** | 466 hr/day measured mod labor (Li et al. 2022) + 73% bot-driven actions; 94-upvote anti-AI-tooling ask in May 2026 r/modnews; r/mealtimevideos 60K weekly + r/piercing 600K + 15 other CM subs as named beneficiaries; CM-class tools offload the "context tier" AutoMod can't reach | [`writeup-draft.md`](./writeup-draft.md) §1+§2 · [`pillar-5-numbers.md`](./pillar-5-numbers.md) §1+§5+§9.5+§11 |
| **Polish** | CI green, type-check clean, lint clean, 9/9 tests passing; AI-tone strict scanner gating all paste-day text; Mermaid architecture + sequence diagrams; CONTRIBUTING + CODE_OF_CONDUCT + SECURITY + CHANGELOG + LICENSE all shipped; per-component Status table in README distinguishes Production vs Scaffolded vs Phase-N pending | `README.md` Status table · `.github/workflows/ci.yml` · `scripts/check-ai-tone.sh` · `CHANGELOG.md` |
| **Reliable UX** | One-click install via App Directory; Observatory custom-post dashboard renders on mobile webview; mod-menu items work today (View recent actions = production); `?demo=1` synthetic path provides reviewer-installable preview without Phase 1+2+3 backend; AJV validation with last-known-good fallback (designed behavior, lands Phase 1) ensures a bad config never breaks moderation | `README.md` "Quick start" + "Observatory dashboard preview" + Validation section · `docs/screenshots/dashboard-desktop.png` |
| **Port Completion** | Phase 1+2+3 SHIPPED 2026-05-16: regex / author / ruleSet rules + 7 action handlers + filters + Mustache + named-rule composition + wiki config + atomic publish (INCR-allocated rev) + handleActivity orchestrator + read-once snapshot + Observatory live data + dry-run rule tester. URL-dedupe repost promoted from Phase 4 to Phase 2. 173 tests green; tsc clean; v0.2.0 in Reddit review. Live e2e captured on Stephen's test sub. Codex-hardened (2 CRITICAL + 10 HIGH safety findings closed). Phase 4 stretch in progress; cuts (MHS per PR #96; DispatchAction; SentimentRule; full RepostRule; multi-bot) documented with rationale | [`writeup-draft.md`](./writeup-draft.md) §3 "Ported faithfully" + Build Journal · `examples/` 3 working JSON5 configs · README "Comparison" + Status table · `docs/screenshots/scenario-*.png` live captures · `docs/superpowers/codex-reviews/*.md` audit trail |

The **Port Completion** criterion is the most-checkable. Devpost's question is *"Could this app be installed today and serve the original function?"*. Honest answer post-Phase-1+2+3 ship: **YES for MVP scope** — regex / author / ruleSet rules, all 7 action handlers, atomic config publish, wiki cron, dry-run rule tester, live Observatory dashboard, idempotency primitives all shipped + Codex-hardened + verified live on `r/cm_devvit_test`. Subs using the original CM for regex spam removal, mod-flair gating, author-criteria filtering, and named-rule composition see feature parity at install today. Subs using upstream CM specifically for hate-speech filtering (`mhs`) keep running the PRAW build — that rule is cut from this port per PR #96. Image-hash repost detection (4.7) is deferred post-hackathon. Everything else either ships in v0.2.0 (in Reddit review, email-on-approval 1–7 days) or is Phase 4 stretch in active development.

---

## Step 5 — Submit

Pre-submission checklist (run in order):

- [ ] All five steps in the Devpost form saved (`1/5` → `5/5` shown at top)
- [ ] Project name passes AI-tone scan (run `./scripts/check-ai-tone.sh --strict`)
- [ ] Elevator pitch passes AI-tone scan
- [ ] About-the-project Markdown passes AI-tone scan
- [ ] Tool overview passes AI-tone scan
- [ ] Project Impact passes AI-tone scan
- [ ] Port Completion passes AI-tone scan
- [ ] Thumbnail uploaded (`assets/thumbnail.png` — verified PNG, ≤5MB, 3:2)
- [ ] 4–5 image gallery images uploaded (recommended: dashboard-desktop + 3 live scenario captures + 1 gallery mockup; see Image gallery section above)
- [ ] Demo video YouTube unlisted URL pasted (gated on Wave I recording)
- [ ] FoxxMD has confirmed `u/ContextModBot` (or correct handle) for Original Bot field
- [ ] Vinh's Reddit username added to team Reddit-usernames field
- [ ] **v0.2.0 Reddit App Directory review status checked** at `https://developers.reddit.com/apps/cm-devvit/app-versions` — Devpost form can be SUBMITTED before review approves (review SLA 1–7 days; Devpost-submit cutoff is the binding deadline)
- [ ] Codex adversarial review on this entire draft (final pass before submit)
- [ ] Stephen rewrites every paragraph in his own voice (don't sound like AI; Watchful1 lesson)
- [ ] Preview the project page via Devpost's "Preview" button
- [ ] Click Submit

---

## Form-to-source-document map

| Devpost field | Source in repo |
|---------------|----------------|
| Project name | This file (top) |
| Elevator pitch | This file (Step 2) |
| Thumbnail | `assets/thumbnail.png` (TBD via Banana, Wave H day-3) |
| About the project Markdown | This file (Step 3 fenced block) |
| Built with | This file (Step 3 tags) |
| Try it out URLs | This file (Step 3 table) |
| Image gallery | Captured at submission day, see Step 3 list |
| Video demo | YouTube unlisted, recorded per `demo-video-script.md` |
| Tool overview | [`writeup-draft.md`](./writeup-draft.md) Section 1 |
| Project Impact | [`writeup-draft.md`](./writeup-draft.md) Section 2 |
| Port Completion | [`writeup-draft.md`](./writeup-draft.md) Section 3 |
| Original Bot | This file (Step 4) — confirm w/ FoxxMD |
| Helper nomination | This file (Step 4) |
| Permissions reference | [`devvit-app-settings.md`](./devvit-app-settings.md) |
| Pillar evidence backing every claim | [`pillar-5-numbers.md`](./pillar-5-numbers.md) |

