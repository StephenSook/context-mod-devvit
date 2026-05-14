# Demo Video Script — context-mod-devvit

> **Constraints:** Devpost rules cap judging at the 60-second mark. Judges are NOT required to watch past 1 minute. So everything load-bearing has to be in the first 60s.
>
> **Voice rule:** Stephen records the voiceover in his own voice. Tight, scrappy, no AI cadence. Rehearse twice before the take. Don't sound like a sponsor read.
>
> **Tooling:** OBS Studio for screen capture, Audacity for the voiceover layer, ffmpeg to stitch. Bake captions for accessibility (judges may watch muted).

---

## Beat sheet (60.0s total)

### 0.0 – 8.0s — Cold open (problem)

**Visual:** Fast-cut montage of:
- r/AskReddit modqueue overflowing
- Tweet/news headline about the 2023 API blackout (8,800 subs went private)
- Reddit Q1 2026 earnings number on screen ($663M)

**Caption / VO:**
> "Reddit's volunteer mods do 466 hours of unpaid labor a day. 73% of mod actions are already performed by bots. The bot infrastructure they depend on got killed in 2023."

> Source: Li, Hecht, Chancellor — ICWSM 2022.

---

### 8.0 – 22.0s — The bot (history + permission)

**Visual:** Cut to:
- `github.com/FoxxMD/context-mod` repo page
- Screenshot of the 2021 r/AssistantBOT capacity-wall message (or similar — find one from FoxxMD's account)
- Screenshot of FoxxMD's Discord message granting permission

**Caption / VO:**
> "ContextMod is the rule-engine mod bot 15+ communities run — including r/mealtimevideos at 60K weekly visitors and r/piercing at 600K. Last release was 2022. I got written permission from FoxxMD to port it to Devvit."

---

### 22.0 – 50.0s — The demo (live install → wiki → action → dashboard)

**Visual sequence** (~28s, ~7s per beat):

**Beat 1 (22-29s) — Install:**
- Mod on `developers.reddit.com/apps/cm-devvit`
- Clicks "Add to community"
- Picks their sub (e.g. r/cm_devvit_test)

**VO:** "One click to install on any subreddit. No hosting. No tokens."

**Beat 2 (29-36s) — Write a rule:**
- Open `r/cm_devvit_test/wiki/contextmod`
- Paste a tiny JSON5 config: regex on title `/spam|scam/i` → remove + comment
- Click save

**VO:** "Write rules in JSON5 in your sub's wiki. Composable rules. Mustache-templated action messages. The full ContextMod concept model, ported faithfully."

**Beat 3 (36-43s) — Trigger an action:**
- Submit a test post titled "free crypto giveaway scam"
- Cut to the Observatory dashboard (already pinned)
- New event row appears at top: REMOVE + COMMENT chips for the spam-filter rule

**VO:** "Every trigger runs through a three-stage idempotency gate — Devvit's at-least-once delivery never double-applies actions."

> Note: if Phase 1 backend isn't live by recording day, swap this beat for `?demo=1` synthetic-data dashboard tour + this VO line: *"This is the dashboard and event model rendering seeded demo data. The live trigger pipeline — `handleActivity` → rule engine → action → `events:recent` — ships in Phase 1 post-hackathon. The truth caption stays on-screen from this beat through the dashboard tour."* The synthetic-data truth caption (`captions.srt` N=4 per `demo-video-runbook.md`) MUST arrive at the 36s mark — not delayed to the 50s wedge — so the disclosure starts the moment seeded data is shown.

**Beat 4 (43-50s) — Dashboard tour:**
- Pan across stat cards (Actions today, Mod time saved, Active rules, Top rule)
- Sparkline drawing
- Mention the "Test rules on this item" dry-run mod menu
- Mention image-hash repost detection (if Phase 4 shipped — gated on Day-2 spike)

**VO:** "Telemetry stream: stats, recent actions, hourly volume. Plus a dry-run rule tester for testing config before it goes live."

> If Phase 3 dashboard wiring is shipped by recording day, swap "Telemetry stream" → "Live telemetry" — claim live only when the dashboard is reading real `events:recent` ZSET data, not `?demo=1` synthetic. If Phase 3 isn't shipped, the synthetic-data fallback from Beat 3 carries through here too.
>
> If Phase 4's image-hash repost detection ships before recording day, append: *"And perceptual-hash repost detection — image blockhash in pure JS within Devvit's 30-second execution window."* Otherwise leave out — don't claim what isn't running.

---

### 50.0 – 58.0s — The wedge (why this matters / why now)

**Visual:** Title card "Migration ready" — text only, dark background.

**Caption / VO:**
> "FoxxMD's instance and 15+ other ContextMod operators are stuck on dying PRAW infrastructure. This port unblocks them. Eligible for Reddit's $1,000 Migration Bounty plus the Developer Funds program — realistic 12-month direct-cash envelope is $19.5K–$25K (bounty + Install-side cap + DQE Tier 3–4). The $75K figure is the Developer Funds Tier-8 DQE ceiling, not expected capture."

---

### 58.0 – 60.0s — Close

**Visual:** Three lines, centered, fade-up:

```
context-mod-devvit
github.com/StephenSook/context-mod-devvit
developers.reddit.com/apps/cm-devvit
```

**VO:** "ContextMod, on Devvit. Now."

---

## Production notes

- **Total runtime: 60.0s.** Trim any beat that overflows. 60.0 is the hard cap because Devpost says judges don't have to watch past that.
- **Captions baked in** (not auto-generated by YouTube). Judges may watch muted.
- **No music** OR a single subtle bed at low volume. Don't compete with VO.
- **No video transitions** (cuts only). Saves time + reads more like a real demo than a marketing reel.
- **Avoid AI-generated b-roll.** Use real screenshots from the test sub, the GitHub repo, the Devvit dashboard, the Observatory.
- **Pre-roll OBS** so the cursor is already on the right element when each beat starts. Saves seconds of "where do I click" footage.

## Voiceover guidance for Stephen

- Read 1 beat at a time, then move on. Don't try to nail the whole thing in one take.
- Read **slower than feels natural** — the script is dense. ~150 words for 60s = ~2.5 words/sec.
- Don't read the captions verbatim. Captions = key claims. VO = paraphrase + transitions.
- Don't say "amazing" / "revolutionary" / "powerful" / "sophisticated." Trips the AI-tone radar that burned us on the Watchful1 thread. <!-- AITONE_IGNORE -->
- Sound like you're telling a fellow dev about a project, not pitching a VC.

## Deliverable

- Upload final cut to YouTube as **unlisted**.
- Paste URL into Devpost submission form.
- Save raw OBS recording + Audacity project files in `docs/submission/_video-source/` (gitignored).
