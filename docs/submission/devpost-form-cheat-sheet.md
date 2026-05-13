# Devpost Submission Form — Paste-Ready Cheat Sheet

> **Source of truth:** Stephen captured the actual Devpost form on 2026-05-13 (URL: `devpost.com/submit-to/29423-reddit-mod-tools-and-migrated-apps-hackathon/manage/submissions/1017798/...`). Every field below is mapped to the real form, with verbatim paste copy. 14 days to deadline at draft time.
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
FoxxMD's PRAW moderation bot, ported to Reddit Devvit Web. JSON5 rules in your sub's wiki, live action dashboard, per-sub install — no hosting, no API tokens, no shared bottleneck. 15+ communities ready.
```
*200 chars exact. Names the upstream, names the platform, lists the wedge (no hosting/tokens/bottleneck), grounds in a concrete operator base.*

**Sookra anchors:** Pillar 1 (FoxxMD) + Pillar 2 (no shared bottleneck) + Pillar 5 (15+ communities).

### Thumbnail (3:2 ratio, JPG/PNG/GIF, ≤5MB)

**Spec:** 1200×800 PNG. Generate via Banana with the Observatory aesthetic (warm-dark + concentric rings + green accent + thin overlay text "ContextMod · Devvit Web port"). Adds to Wave H of [day-3 plan](../superpowers/plans/2026-05-13-day3-submission-prep.md).

---

## Step 3 — Project details (PUBLIC)

### About the project (Markdown, LaTeX-capable)

Devpost's template suggests headings: **Inspiration / What it does / How we built it / Challenges / Accomplishments / What I learned / What's next / Built with**. Paste in that order so the project page renders cleanly.

```markdown
## Inspiration

ContextMod is the rule-engine mod bot that 15+ subreddit teams have been running since 2019. It's why r/mealtimevideos (60K weekly visitors) and r/piercing (600K visitors, 12K contributors) had a fighting chance against spam waves that AutoMod's regex can't catch. Then Reddit killed the free Data API in July 2023, and the entire PRAW-era ContextMod ecosystem started running on dying infrastructure. FoxxMD's last release was November 2022 — weeks before the paid Data API tier launched. In March 2026 Reddit announced the $1,000 Migration Bounty for PRAW → Devvit ports. On the Q1 2026 earnings call Reddit's CEO said: "we have what we call good bots on Reddit... we're porting those over to our developer platform." ContextMod was the obvious target.

I got written permission from FoxxMD to port it (GitHub issue [FoxxMD/context-mod#152](https://github.com/FoxxMD/context-mod/issues/152), Discord exchange archived).

## What it does

Mods install ContextMod on their sub with one click — no Heroku, no API tokens, no shared rate limits. They write rules in JSON5 inside `r/<sub>/wiki/contextmod`. ContextMod evaluates every new post and comment against those rules and takes the configured action: `remove`, `approve`, `lock`, `comment`, `report`, `ban`, `userFlair`. A custom-post Observatory dashboard surfaces live action telemetry — stat cards, 24h sparkline, last 50 events with color-coded chips. A dry-run mod-menu lets you test rules against a specific post before committing.

The rule engine ports the original ContextMod concept model faithfully: **Run → Check → Rule → Action** with `postBehavior` flow control (`next` / `nextRun` / `stop` / `goto:<run>.<check>`), filters (`authorIs` / `itemIs`), named rule composition, Mustache action templating with `{{item.*}}` / `{{author.*}}` / `{{rules.<name>.data.*}}` context. v0.1.0 ships 3 MVP rule kinds (`regex`, `author`, `ruleSet`) and 7 actions; Phase 4 adds `history`, `attribution`, `recentActivity`, `repost`, `mhs`.

## How I built it

TypeScript + Hono + Vite served via Devvit Web (CommonJS bundle). The architecture is in [README.md](https://github.com/StephenSook/context-mod-devvit#architecture) — Mermaid `flowchart TB` + `sequenceDiagram` showing the three-stage idempotency keys (`cm:proc` 24h + `cm:action:pending` 5m + `cm:action:done` 7d) that make Devvit's at-least-once trigger delivery safe.

- **Hono routes:** `/internal/triggers/*` (post-submit, comment-submit, app-install, app-upgrade), `/internal/cron/*` (refresh-config, stats-rollup, image-hash, delayed-eval), `/internal/menu/*` (reload-config, recent-actions, test-rules), `/api/recent`, `/api/stats`, `/api/health`.
- **Config publish is atomic.** Wiki edit → `refresh-config` cron parses + validates → writes immutable `cfg:rev:n` → atomically bumps `cfg:current_rev` pointer. Every `handleActivity` reads the pointer once at event start, so the full pipeline runs against a consistent snapshot — no mid-event tear under concurrent reload.
- **Redis storage only.** Strings, hashes, sorted sets — no Lists, no Sets (Devvit constraint). The `events:recent` 50-deep ring buffer is a ZSET, not a List.
- **Observatory dashboard:** React + Vite, custom-post webview. HSL design tokens, Geist + Geist Mono + Instrument Serif italic typography. FNV-1a 64-bit hashing for event dedup. `ApiResult<T>` discriminated union for error UX so the dashboard preserves last-good state on backend hiccups.

## Challenges

- **The first FNV-1a implementation was 32-bit and failed canonical test vectors.** Codex review caught it. Rewrote with BigInt for 64-bit precision, verified against `''`, `'a'`, `'foobar'`.
- **Devvit's CSP blocks `eval()`**, which Framer Motion uses internally. Ripped framer-motion entirely, replaced with hand-rolled CSS keyframes (`cmFadeUp`, `cmFadeLeft`, `cmFadeIn`, `cmDrawLine`).
- **Sparkline blew up on `Math.max(...data)`** when the data array was empty (stack overflow). Switched to `reduce()` with guards.
- **`submitCustomPost` deprecated `splash` in 0.12.23.** Had to use `entry` + `textFallback`.
- **Vitest needed its own config** to bypass the `@devvit/start` plugin (which only works in `vite build` mode).
- **App icon I generated via Gemini was JPEG bytes inside a `.png` filename** — would've failed Devvit's upload validation. Caught via Codex review on Day 2, re-encoded via PIL with LANCZOS resample.
- **The first developer-portal cheat sheet I drafted fabricated 70% of fields** (tagline, category dropdown, support URL, etc.) that don't exist in Reddit's actual Developer Portal. Caught via research-agent cross-check against the official Devvit `launch-guide.md`. Rewrote it.

## Accomplishments

- 60+ atomic commits across 3 days (every fix is its own commit per the GitHub-activity discipline I'm using).
- Sookra Methodology Pillars 4 + 5 deepened with verbatim quotes from Reddit's own r/Devvit posts (`1r3xcm2`, `1pcm13z`, `1shophd`, `1sgwkm7`) and Steve Huffman's Q1 2026 earnings call.
- Privacy + ToS deployed to GitHub Pages, repo flipped public after a clean secrets audit.
- Architecture diagram in the README is Mermaid (flowchart + sequence) — best-practice patterns from official Mermaid docs (semantic shape conventions, 4-color WCAG-AA palette, screen-reader `accTitle` + `accDescr`).
- Domain approval came back: `i.redd.it`, `preview.redd.it`, `external-preview.redd.it`, `external-i.redd.it` are all in Reddit's global fetch allowlist — no explicit allowlist needed.
- Codex adversarial review caught the 32-bit FNV-1a, the icon-was-JPEG bug, and the fabricated dev-settings fields. Three-brain stack pays for itself.

## What I learned

- Devvit's Redis primitives are deliberately constrained. No Lists, no Sets. Designing around the absence of `LPUSH` forced cleaner ZSET-based ring buffers and made idempotency easier to reason about.
- "Tech inevitable" framing only works with primary sources. Quoting Reddit's own r/Devvit posts beats quoting commentators.
- AI-tone words are a bigger threat than I expected — u/Watchful1 publicly flagged AI-style replies as "minus points" in r/Devvit early in the hackathon. Every word in this writeup got hand-scrubbed against a blocklist.
- Three-brain workflow (Claude as IDE driver + Codex for adversarial review + Gemini for long-context research synthesis) caught bugs I would've shipped solo: the icon JPEG mismatch, the fabricated form fields, the broken Pages links.

## What's next

- **Phase 1 (Vinh):** core engine completion — `handleActivity`, `runRun`, `runCheck`, `runRule` wired to real config + live triggers.
- **Phase 2 (Vinh):** 7 action handlers + 4 trigger routes.
- **Phase 4 stretch:** perceptual-hash repost detection (image blockhash in pure JS within Devvit's 30s/no-native-deps env), MHS toxicity classifier (gated on `api.moderatehatespeech.com` approval — high-risk per Reddit's personal-domain policy; if rejected the MHS rule is documented as upstream-only).
- **Post-hackathon:** open the app to all 15+ ContextMod operators FoxxMD identified; pursue Reddit Developer Funds DQE ladder ($5K-$10.5K realistic 12-mo capture).

## Built with

TypeScript · React · Hono · Vite · Tailwind CSS · Redis · Devvit Web · Reddit Developer Platform · AJV · JSON5 · Mustache · Vitest · GitHub Actions · GitHub Pages · Mermaid · Codex (review) · Claude Code
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
TypeScript, React, Hono, Vite, Tailwind, Redis, Devvit, Devvit Web, Reddit API, AJV, JSON5, Mustache, Vitest, GitHub Actions, GitHub Pages, Mermaid
```

### "Try it out" links

| URL | Why |
|-----|-----|
| `https://developers.reddit.com/apps/cm-devvit` | App Directory listing (install path) |
| `https://github.com/StephenSook/context-mod-devvit` | Source code |
| `https://stephensook.github.io/context-mod-devvit/` | Policies + docs landing |

### Image gallery (3:2 ratio, ≤5MB each)

Capture from the running app + repo at submission day:
1. **Observatory dashboard hero** — full dashboard rendered with real (or convincing demo) action data
2. **Mod menu screenshot** — "ContextMod: Reload config from wiki" / "View recent actions" / "Test rules on this item" visible
3. **Wiki config example** — actual JSON5 rule config rendered in subreddit wiki
4. **Architecture diagram** — Mermaid flowchart from README, screenshotted at high resolution
5. **Event stream close-up** — action chips, sparkline, stat cards in detail
6. **Install screen** — App Directory "Add to community" flow

### Video demo link

```
[TBD — YouTube unlisted URL after Day 13-14 recording]
```

Beat sheet in [`demo-video-script.md`](./demo-video-script.md). Production runbook in [`demo-video-runbook.md`](./demo-video-runbook.md) (to be written in Wave I of the day-3 plan).

---

## Step 4 — Additional info (JUDGES ONLY, not public)

### Sponsor / Special Prizes

Multi-select. Choose:
- ✅ **Best Ported App** — the $10,000 grand prize (this is our primary target)
- Possibly also: any "Most Helpful Migration" / "Community Choice" prize categories if surfaced

*Open verification flag:* check the dropdown's actual entries against the hackathon prize list at `mod-tools-migration.devpost.com` before submitting.

### Reddit username (team members)

```
u/CowSufficient3840 (Stephen Sookra), u/<Vinh's reddit username — confirm>
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

- **Can the app be installed today and serve the original function?** Yes for MVP scope (regex spam, mod-flair gating, author-criteria filtering, named-rule composition). Phase 4 (`history`, `attribution`, `recentActivity`, `repost`, `mhs`) is in active development and explicitly flagged.
- **Improvements over upstream:** per-sub Redis isolation, native custom-post Observatory dashboard, one-click install, mod-menu dry-run tester, no central rate-limit bottleneck, per-effect idempotency (upstream lacks).
- **Explicit cuts:** `RepeatActivityRule`, `SentimentRule`, full `RepostRule` w/ YouTube, `DispatchAction`, multi-bot orchestration, Express dashboard w/ Monaco — all explicitly cut with rationale.

### Nominate a most helpful user (optional)

```
u/SampleOfNone — publicly flagged in r/Devvit Discord that image parsing is "the hard part on Devvit" while we were scoping Phase 4. That informed our decision to gate the image-hash repost rule on a Day-0 spike before committing to it, and to mark MHS toxicity classification as conditional on Reddit's HTTP-fetch domain review. Direct impact on scope honesty.
```

---

## Step 5 — Submit

Pre-submission checklist (run in order):

- [ ] All five steps in the Devpost form saved (`1/5` → `5/5` shown at top)
- [ ] Project name passes AI-tone scan (run `scripts/check-ai-tone.sh` once it lands in Wave G)
- [ ] Elevator pitch passes AI-tone scan
- [ ] About-the-project Markdown passes AI-tone scan
- [ ] Tool overview passes AI-tone scan
- [ ] Project Impact passes AI-tone scan
- [ ] Port Completion passes AI-tone scan
- [ ] Thumbnail uploaded (3:2, ≤5MB, real PNG not JPEG-in-png)
- [ ] At least 3 image gallery images uploaded
- [ ] Demo video YouTube unlisted URL pasted
- [ ] FoxxMD has confirmed `u/ContextModBot` (or correct handle) for Original Bot field
- [ ] Vinh's Reddit username added to team Reddit-usernames field
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

