# Devpost Submission Draft — context-mod-devvit

> **Voice rule (per Codex D10 + Watchful1 lesson):** write in first person, scrappy, sound like a real builder. No "sophisticated ecosystem" / "revolutionary platform" marketing prose. Mention specific bugs you hit, specific cuts you made, specific frustrations. Stephen rewrites every word before submission — this is structural scaffolding, not final copy.

---

## Section 1 — Tool Overview

> **What Devpost asks:** "Describe in detail the functionality of the bot. Include all capabilities and how moderators and users are intended to use the app."

**Suggested opener** (Stephen's voice — rewrite):

> ContextMod is a rule-engine moderation bot. Mods write JSON5 config in their sub's wiki — define what counts as spam, what flairs to require, what posts to remove, what comments to leave, what users to ban. The bot reads every new post and comment, runs the rules, takes the actions. No central server, no Heroku token, no shared rate limits — Devvit handles all of that.

> **Why now:** Reddit's CEO said on the Q1 2026 earnings call that they're "porting good bots to the developer platform." Reddit's own r/Devvit team is deprecating the older Blocks framework. The $1,000 App Migration Bounty is explicitly scoped to PRAW→Devvit moves — ContextMod is exactly that. FoxxMD's last ContextMod release was November 2022, weeks before Reddit's paid Data API tier launched in July 2023. The bot has been frozen at the pre-blackout boundary ever since, with 15+ operators stuck running it on dying infrastructure. This port unblocks all of them on the platform Reddit is actively recommending.

**Capabilities (bullet list):**

- **3 MVP rule kinds shipped** in v0.1.0: `regex` (multi-field threshold matching), `author` (basic criteria — age, karma, flair, isMod, isContributor, verified, shadowBanned), `ruleSet` (AND/OR composition).
- **7 MVP actions**: `remove`, `approve`, `lock`, `comment`, `report`, `ban`, `userFlair`. All support Mustache templates over `{{item}}`, `{{author}}`, `{{rules.<name>.data}}` context.
- **5 stretch rule kinds** in Phase 4: `history`, `attribution`, `recentActivity`, `repost` (URL + image-hash variants), `mhs` (toxicity classification).
- **Filters** (`authorIs` / `itemIs`) gate Rule/Check/Action execution by author + item attributes. Same criteria set as upstream ContextMod.
- **Flow control**: `postBehavior` per Check (`next` / `nextRun` / `stop` / `goto:<run>.<check>`).
- **Named rules** for DRY composition.
- **Observatory dashboard** (custom-post webview): live action telemetry, 24h sparkline, last 50 events with color-coded action chips, stat cards (actions today, mod time saved estimate, active rules, top rule).
- **Wiki-based config** with 5-min refresh cron + manual reload from mod menu. Atomic publish via revision pointer so handleActivity always reads a consistent snapshot mid-event.
- **Dry-run rule tester** mod menu action — point at any post/comment to see which rules would fire without taking action.
- **Per-effect idempotency**: every action has a 5-min `pending` reservation + 7d `done` marker, so Devvit's at-least-once trigger delivery never double-applies the same mod action.

**How mods use it:**

1. Install via the App Directory (`developers.reddit.com/apps/cm-devvit`) → click "Add to community."
2. Write JSON5 rules in `r/<sub>/wiki/contextmod`. Starter config seeded on install.
3. View live action telemetry via the Observatory dashboard post (created via mod menu).
4. Dry-run rules on specific posts before letting them go live. Reload on every wiki edit (manual or 5-min auto).

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
- **Per-action user-history checks take ~5-10 minutes manually**. If CM-class bots offload 1 incremental hour per mod per week beyond AutoMod's reach, the labor-equivalent value unlocked is **60K × 52 × $20 ≈ $62.4M/yr at full capture** — even 10% capture is $6M+/yr.

### Sookra Pillar alignment

- **Pillar 1 — Real problem, named person:** FoxxMD (creator, ContextMod) + SampleOfNone (production operator at r/piercing) both named in conversation. No hypotheticals.
- **Pillar 2 — Structural gap:** Reddit's July 2023 paid Data API tier ($12K+/yr commercial, 100 QPM free) closed the PRAW path. Devvit is the only migration target. CM has 15+ operators stuck on dying infra.
- **Pillar 3 — Human-scale stat:** 466 hr/day mod labor measured; 60K mods scaled; 73% bot-driven; 9–94% of mod work is "invisible" context-gathering — exactly the gap CM fills.
- **Pillar 4 — Tech inevitable:** Reddit's own r/Devvit posts say it: *"deprecating Devvit Blocks renderer"* ([1r3xcm2](https://www.reddit.com/r/Devvit/comments/1r3xcm2/)), *"strongly recommend Devvit Web for all new apps"* ([1pcm13z](https://www.reddit.com/r/Devvit/comments/1pcm13z/)), 80-day countdown to Blocks cutover ([1shophd](https://www.reddit.com/r/Devvit/comments/1shophd/)). The $1K Migration Bounty is *explicitly* scoped to PRAW→Devvit ([1sgwkm7](https://www.reddit.com/r/Devvit/comments/1sgwkm7/)) — ContextMod is the textbook target. ContextMod's release timing seals it: last release v0.13.4 / 2022-11-29, weeks before the API price wall; workflows being disabled 2026-05-12 — the maintainer is winding it down.
- **Pillar 5 — Business case:** Reddit's CEO Steve Huffman on the Q1 2026 earnings call: *"We have what we call good bots on Reddit... we're porting those over to our developer platform."* Reddit Q1 2026: $663M revenue / $311M FCF — Developer Funds is rounding error. Realistic 12-mo direct-cash envelope $19.5K–$25K (Migration Bounty $1K + Hackathon $10K + Install tier cap $3.5K + DQE tier 3–4 ladder $5K–$10.5K). $50K+ stretch if DQE compounds. Discord parallel: Reddit at Year 1 of where Discord's mod-bot economy was at Year 3.

---

## Section 3 — Port Completion (Ported track required)

> **What Devpost asks:** "Describe any differences, improvements, or gaps between your new app and the original bot. Could this app be installed today and serve the original function of the app?"

### Ported faithfully (works today, v0.1.0)

- Rule/Check/Action concept model + `postBehavior` flow control + `goto:` jumps
- Filter system (authorIs/itemIs)
- 3 MVP rule kinds + 7 MVP actions
- Wiki-based JSON5 config with AJV validation + atomic publish
- Named rules + Mustache action templating
- Per-effect idempotency (5min pending + 7d done) — improvement over upstream (CM didn't have explicit retry-safety primitives)

### Improvements over upstream

- **Per-subreddit isolation** via Devvit Redis (vs upstream's shared central DB)
- **Observatory dashboard** as a native custom post (upstream has only a self-hosted web UI)
- **One-click install** via App Directory (vs upstream's Docker + reverse-proxy setup)
- **Mod-menu dry-run rule tester** (upstream had no equivalent)
- **No central rate-limit bottleneck** — every install runs against its own per-sub Reddit API quota

### Gaps vs upstream (deferred to Phase 4)

- `history`, `attribution`, `recentActivity`, `repost`, `mhs` rules — landing in Phase 4
- Image-hash repost detection — gated on a Day-0 spike (decode + blockhash in pure JS within Devvit's 30s/no-native-deps env)

### Gaps vs upstream (explicitly cut)

- `RepeatActivityRule`, `SentimentRule`, full `RepostRule` w/ YouTube — explicitly cut. Sentiment needs NLP libs that don't bundle in Devvit; YouTube API exceeds scope.
- `DispatchAction` (defer-and-replay) — cut; not load-bearing for MVP, defer to v2 if operators ask.
- Multi-bot orchestration (CM's "shared streams" pattern) — Devvit's per-sub install model replaces this architecturally.
- Full Express dashboard with Monaco editor — replaced with the lighter Observatory custom post + wiki editing.

### Can this be installed today and serve the original function?

**Yes, for the MVP scope.** Subreddits using the original CM primarily for regex-based spam removal, mod-flair gating, author-criteria filtering, and named-rule composition will see feature parity at install. Subs using CM specifically for repost detection or hate-speech filtering will need to wait for Phase 4 (currently in active development).

---

## Section 4 — Required submission fields

- **App link:** `developers.reddit.com/apps/cm-devvit`
- **Repo link:** `github.com/StephenSook/context-mod-devvit`
- **Original bot username:** `u/ContextModBot` (FoxxMD's primary instance — confirm w/ FoxxMD before submission)
- **Reddit username (entrant):** `u/CowSufficient3840` (Stephen Sookra)
- **Demo video:** [insert YouTube unlisted link — see `demo-video-script.md`]
- **Helper nomination:** SampleOfNone (publicly flagged the image-parsing challenge in r/Devvit Discord; informed scope decision)

---

## Section 5 — Pre-submission checklist

- [ ] FoxxMD confirms bot username for "Original bot" field
- [ ] All written permission documentation captured (Discord screenshots + GitHub issue 152 link)
- [ ] App `--public` flag set + Devvit app review passed
- [ ] `policies/privacy.md` + `policies/terms.md` URLs live on GitHub Pages
- [ ] Repo flipped to public
- [ ] Phase 4 image-hash either shipped OR explicitly downgraded in writeup (don't overstate)
- [ ] Demo video uploaded to YouTube (unlisted)
- [ ] Stephen rewrites every section of this draft in his own voice
