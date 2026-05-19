# Demo Video Script — context-mod-devvit

> **Constraints:** Devpost rules cap judging at the 60-second mark. Judges are NOT required to watch past 1 minute. So everything load-bearing has to be in the first 60s.
>
> **Voice rule:** Stephen records the voiceover for the 60s primary cut in his own voice. Tight, scrappy, no AI cadence. Rehearse twice before the take. Don't sound like a sponsor read.
>
> **Co-narrator option (Polish #88 — recording-day plan):** Vinh covers the Phase-4 / Phase-4.7 backend beats in the 90-sec alt cut (see production notes below). The 60s primary cut is single-voice (Stephen) so the cadence stays consistent; the alt cut splits Stephen → install/wiki/dashboard, Vinh → image-repost + author-history demonstrations, since Vinh wrote those rules and can speak to them in his own voice. Recording approach: record everything once at full length, then trim to 60s.
>
> **Tooling:** OBS Studio for screen capture, Audacity for the voiceover layer, ffmpeg to stitch. Bake captions for accessibility (judges may watch muted).
>
> **Pre-record rehearsal checklist** (Stephen-actionable, run T-3 → T-1):
> 1. Test sub `r/cm_devvit_test` has v0.6.7 installed + wiki config seeded
> 2. App's `npm run launch` completed + version visible at developers.reddit.com/apps/cm-devvit
> 3. Three browser windows queued in order: (a) Devvit App Directory listing, (b) `r/cm_devvit_test/wiki/botconfig/contextmod` in edit mode, (c) Observatory dashboard pinned in the sub
> 4. Mod account logged in w/ wiki + posts permissions (Stephen's primary or `u/CowSufficient3840` co-mod)
> 5. Test post draft ready in clipboard: title `free crypto giveaway scam`, body `test`
> 6. Dashboard timezone matches Stephen's (so the timestamps on the live event row read clean)
> 7. OBS preset: 1920×1080 capture, 30 fps, h.264. Audacity input gain checked. Captions track open.

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
- Open `r/cm_devvit_test/wiki/botconfig/contextmod`
- Paste a tiny JSON5 config: regex on title `/spam|scam/i` → remove + comment
- Click save

**VO:** "Write rules in JSON5 in your sub's wiki. Composable rules. Mustache-templated action messages. The full ContextMod concept model, ported faithfully."

**Beat 3 (36-43s) — Trigger an action:**
- Submit a test post titled "free crypto giveaway scam"
- Cut to the Observatory dashboard (already pinned)
- New event row appears at top: REMOVE + COMMENT chips for the spam-filter rule

**VO:** "Every trigger runs through a three-stage idempotency gate — Devvit's at-least-once delivery never double-applies actions. Lease tokens prevent third-execution races on slow workers."

> Note (was a Phase-1-slip fallback): Phase 1+2+3 shipped 2026-05-16 so this beat now captures LIVE action data via `handleActivity` → rule engine → `events:recent` ZSET → dashboard. The `?demo=1` synthetic path remains as a backup if the test sub is rate-limited during recording, but the canonical capture is live.

**Beat 4 (43-50s) — Dashboard tour + S1 rule simulation (money shot):**
- Pan across stat cards (Actions today, **Mod time saved (est.)**, Active rules, Top rule) reading LIVE values. Polish #46: the time-saved card shows `(est.)` qualifier — heuristic estimate, not measurement; voiceover MUST say "estimate" to match the label.
- Filter chips strip across top of event stream (S6)
- Click an event row → drill-down expands → shows runName / checkName / matchedRule / actions list w/ status markers (S2)
- Click "Explain with AI" button in drill-down → OpenAI summary renders inline (V7)
- ⭐ **Money shot:** mod-menu "Simulate rule against history" → paste a regex JSON5 → submit → toast "Rule would fire on 7/25 (28%) recent items. Examples: t3_a, t3_b, t3_c." (S1)

**VO:** "Live telemetry — filter, drill-down, AI summary on any event. Time-saved card shows the heuristic estimate. And the killer feature: open the mod menu, click Simulate, paste a proposed rule, see how often it would have fired on the last 25 posts. Preview rule impact before saving the wiki."

---

### 50.0 – 58.0s — The wedge (why this matters / why now)

**Visual:** Title card "Migration ready" — text only, dark background.

**Caption / VO:**
> "FoxxMD's instance and 15+ other ContextMod operators are stuck on dying PRAW infrastructure. This port unblocks them — same wiki schema, no central server, one-click install. Community value first; the monetization math lives in the writeup."

> AE Polish #75 (gemini brutal-audit P1-1) — the original voiceover quoted the $19.5K–$25K direct-cash envelope. That math is real (see [`pillar-5-numbers.md`](./pillar-5-numbers.md) §12), but reading it aloud over a public 60-second demo trains the wrong narrative: judges + mods watching will hear "they're in it for the cash" before they hear "they're in it for the operators." The payout math stays in the written writeup where context (Developer Funds program, Migration Bounty terms, eligibility) lives — the video keeps the community-value pitch only.

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

- **v0.6.7 features to MAYBE squeeze in if pacing allows** (or use for the 90-sec alt cut):
  - S9 config rev diff viewer (`h` shortcut) — show side-by-side LCS diff between rev N and rev N-1
  - S11 per-rule statistics table — "fired count" breakdown below event stream
  - S3 mod activity attribution feed — "u/X ran reload-config 5m ago" provenance signal
  - S10 mute rule from dashboard — click mute icon on an event row, rule muted instantly
  - S8 keyboard shortcuts overlay — `?` opens overlay listing bindings
  - S5 AI rule explainer — paste JSON5, get plain-English explanation
  - **Phase 4.7 image-repost** (v0.6.0) — submit same image twice, second triggers "would have reported" in dashboard. Demo on a 4K JPEG to flex the preview-variant memory optimization (~5MB peak instead of 180MB for full-res). Pure-JS pipeline, no native deps.
  - **History / Attribution / RecentActivity** (Phase 4 v0.5.x) — author-history-aware rules. Show one of them firing on a fresh-burner profile.
- **Capture priority:** S1 + V7 are the MONEY SHOTS — get those rock-solid first. Phase 4.7 image-repost is the strongest "we shipped something genuinely new" bonus shot. Everything else is bonus B-roll if pacing has room.
- **Total runtime: 60.0s.** Trim any beat that overflows. 60.0 is the hard cap because Devpost says judges don't have to watch past that.
- **Captions baked in** (not auto-generated by YouTube). Judges may watch muted.
- **No music** OR a single subtle bed at low volume. Don't compete with VO.
- **No video transitions** (cuts only). Saves time + reads more like a real demo than a marketing reel.
- **Avoid AI-generated b-roll.** Use real screenshots from the test sub, the GitHub repo, the Devvit dashboard, the Observatory.
- **Pre-roll OBS** so the cursor is already on the right element when each beat starts. Saves seconds of "where do I click" footage.

## Voiceover guidance — Stephen (60s primary cut)

- Read 1 beat at a time, then move on. Don't try to nail the whole thing in one take.
- Read **slower than feels natural** — the script is dense. ~150 words for 60s = ~2.5 words/sec.
- Don't read the captions verbatim. Captions = key claims. VO = paraphrase + transitions.
- Don't say "amazing" / "revolutionary" / "powerful" / "sophisticated." Trips the AI-tone radar that burned us on the Watchful1 thread. <!-- AITONE_IGNORE -->
- Sound like you're telling a fellow dev about a project, not pitching a VC.
- Polish #75: do NOT read the payout math aloud. It lives in the written writeup (`writeup-draft.md` §3) with full context. The video voiceover is community-value framing only.
- Polish #79: Simulate flow is menu-first, NOT paste-first. Say "open the mod menu, click Simulate, paste a rule" — not "paste a rule, then open the mod menu."

## Voiceover guidance — Vinh (90s alt cut, optional)

If recording the 90-sec alt cut alongside Stephen's primary, Vinh covers Beats 5–6 (the post-50s segment that gets cut for the 60s submission):

- **Beat 5 (60–75s): Phase 4.7 image-repost demo.** Submit the same JPEG twice in a row on the test sub. Cut to dashboard: second submission triggers a `report` (configured as dry-run for demo safety). VO from Vinh in his own voice: "We extended the rule engine with perceptual blockhash image-repost detection — pure-JS pipeline, no native deps, 5MB peak memory on a 4K JPEG. Hamming distance against the per-sub hash store catches reposts even when the URL or filename differs."
- **Beat 6 (75–90s): Phase 4 author-history rules.** Show a `recentActivity` rule firing on a fresh-burner profile. Vinh VO: "The history-aware rules use a per-sub author-history cache. Cache-miss thundering herd is locked per-author so a viral post burst doesn't burn the Reddit rate-limit. Degraded responses skip the rule rather than false-positive on fake-zero counts."
- Vinh's voice cadence should match Stephen's (slower than natural, no marketing tone). Same AI-tone blocklist.

The 60s cut is the SUBMITTED video. The 90s alt cut is a bonus YouTube unlisted that the operator-outreach DMs can link to (`docs/submission/outreach-drafts.md` §7 has the cold-DM template — link the 90s cut there if recorded).

## Deliverable

- Upload final cut to YouTube as **unlisted**.
- Paste URL into Devpost submission form.
- Save raw OBS recording + Audacity project files in `docs/submission/_video-source/` (gitignored).
