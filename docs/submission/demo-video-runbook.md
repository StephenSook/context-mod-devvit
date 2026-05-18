# Demo Video Production Runbook

> Bridges [`demo-video-script.md`](./demo-video-script.md) → recording. Stephen records the voiceover in his own voice (per the Watchful1 AI-tone lesson). 60.0-second hard cap.

> **CRITICAL DEPENDENCY:** demo recording is gated on **Vinh's Phase 1+2+3 backend** being live enough to demo a real trigger end-to-end. Per `PLAN.md` the work splits across phases: Phase 1 (engine — `handleActivity`, `runRun`, `runCheck`, `runRule`, filters, templates, config store), Phase 2 (action handlers + onPostSubmit/onCommentSubmit trigger wire-up), Phase 3 (`events:recent` ZSET push + dashboard live data). All three must execute on a real `r/cm_devvit_test` post submission, with the new event chip surfacing on the Observatory dashboard in real time. The shorthand "Phase 1" used in earlier sections of this doc is imprecise — the live demo path needs Phase 1+2+3.
>
> If Phase 1+2+3 isn't live by **May 17, 2026** (T-3 days per `submission-day-runbook.md`, May 20 target / May 27 hard), execute the fallback in [Fallback section](#fallback-if-phase-1-slips). The fallback heading still says "Phase 1 slips" for backward-compat with existing cross-refs, but the trigger condition is "any of Phase 1, 2, or 3 not done."
>
> **Realistic 3-day recording window:** May 17 — May 19, 2026 (matches the T-3 → T-1 sequence in submission-day-runbook).
> **Target submission:** May 20, 2026. **Hard cutoff for upload + paste into Devpost:** May 27, 2026 at 6pm PT.

## Tooling (all macOS)

| Tool | Purpose | Install |
|------|---------|---------|
| **OBS Studio** | Screen capture (1920×1080 @ 30fps) | `brew install --cask obs` |
| **Audacity** | Voiceover record + edit | `brew install --cask audacity` |
| **ffmpeg** | Stitch + bake captions + final encode | `brew install ffmpeg` |
| **DaVinci Resolve (optional)** | Color match between takes if OBS scenes drift | `brew install --cask davinci-resolve` |

## OBS settings

Settings → Output → Recording:
- Format: `mkv` (record to mkv; transcode to mp4 in ffmpeg — protects against crashes)
- Encoder: `Apple VideoToolbox H264` (hardware-accelerated on Apple Silicon)
- Bitrate: `12000 kbps`
- Keyframe interval: `2`
- Audio bitrate: `192 kbps` (we'll re-record VO separately so this is just ambient)

Settings → Video:
- Base canvas: `1920×1080`
- Output: `1920×1080`
- FPS: `30` (NOT 60 — 30fps reads more like a screen tutorial than a marketing reel)

Settings → Audio:
- Disable desktop audio capture (cleaner mix; we add VO in post)
- Mic source: built-in or USB mic; gate noise via Filters → Noise Suppression (RNNoise)

## Scene layout

Three OBS scenes, switch via hotkey:

1. **Scene "App Directory"** — full-screen Chrome at `developers.reddit.com/apps/cm-devvit`
2. **Scene "Subreddit + Wiki"** — full-screen Chrome at `reddit.com/r/cm_devvit_test` (and the wiki page in another tab)
3. **Scene "Observatory + Mod Menu"** — full-screen Chrome at the dashboard custom post

Pre-position the cursor before each scene begins recording so you don't waste seconds finding the click target.

## Recording sequence (matches `demo-video-script.md`)

| Beat | Time | Scene | What to capture |
|------|------|-------|-----------------|
| Cold open | 0.0 – 8.0s | montage (record as separate clips, stitch later) | r/AskReddit modqueue, 2023 blackout headline, Reddit Q1 earnings number |
| History + permission | 8.0 – 22.0s | (still images / browser tabs) | github.com/FoxxMD/context-mod, FoxxMD's Discord permission screenshot, GitHub issue #152 |
| Live demo: install | 22.0 – 29.0s | App Directory scene | click "Add to community", pick r/cm_devvit_test |
| Live demo: wiki | 29.0 – 36.0s | Subreddit + Wiki scene | open `r/cm_devvit_test/wiki/botconfig/contextmod`, paste JSON5 config, click save |
| Live demo: trigger | 36.0 – 43.0s | Subreddit + Wiki scene | submit a test post titled "free crypto giveaway scam" |
| Live demo: dashboard | 43.0 – 50.0s | Observatory + Mod Menu scene | cut to dashboard; event row appears at top; pan over stat cards; mention dry-run mod menu |
| Wedge | 50.0 – 58.0s | title card (static, generate via ffmpeg `drawtext`) | "Migration ready — eligible for Reddit's $1,000 Migration Bounty + Developer Funds (realistic 12-mo direct-cash envelope $19.5K–$25K per `pillar-5-numbers.md` §8)" |
| Close | 58.0 – 60.0s | three lines fade-up | `context-mod-devvit` / `github.com/StephenSook/context-mod-devvit` / `developers.reddit.com/apps/cm-devvit` |

## Voiceover record (Audacity)

1. New project at 48kHz, mono channel.
2. Read each beat as a separate clip. Don't try to nail the whole 60s in one take.
3. Speak slower than feels natural — ~2.5 words/second target (the script is dense).
4. After all clips recorded:
   - Apply **Effect → Filter Curve EQ → Voice (Low Cut at 80Hz)**
   - Apply **Effect → Compressor → Soft Limiter** (Ratio 2:1, Threshold -18dB)
   - Apply **Effect → Normalize → -1.0 dB peak**
5. Export each beat as `vo-<beat>.wav` (uncompressed PCM 48kHz mono).

## Stitch (ffmpeg)

> **Pre-baked artifacts at [`scripts/demo/`](../../scripts/demo/):**
> - `captions-live-data.srt` — 8-cue VO transcript (live-data path)
> - `captions-synthetic-fallback.srt` — 8 VO cues + truth caption (36–50s)
> - `captions.notes.md` — instructions for swapping pre-bake with actual VO post-record
> - `stitch.sh` — executable: `bash scripts/demo/stitch.sh --live` or `--synthetic`
>
> The inline ffmpeg snippets below remain as reference but `stitch.sh` is the recommended path on recording day.

Folder layout in `raw-obs/` + `raw-vo/` at repo root (gitignored):

```
_video-source/
  raw-obs/
    install.mkv
    wiki.mkv
    trigger.mkv
    dashboard.mkv
  raw-vo/
    vo-cold-open.wav
    vo-history.wav
    vo-install.wav
    vo-wiki.wav
    vo-trigger.wav
    vo-dashboard.wav
    vo-wedge.wav
    vo-close.wav
  stills/
    blackout-headline.png
    earnings-number.png
    foxxmd-permission.png
    title-card-wedge.png
    close-three-lines.png
```

**Per-beat ffmpeg (example: install beat, 7s):**
```bash
ffmpeg -i raw-obs/install.mkv -i raw-vo/vo-install.wav \
  -t 7 \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset slow -crf 18 \
  -c:a aac -b:a 192k \
  -shortest \
  -y beats/install.mp4
```

**Concatenate beats:**
```bash
cat > beats/list.txt <<EOF
file 'cold-open.mp4'
file 'history.mp4'
file 'install.mp4'
file 'wiki.mp4'
file 'trigger.mp4'
file 'dashboard.mp4'
file 'wedge.mp4'
file 'close.mp4'
EOF

ffmpeg -f concat -safe 0 -i beats/list.txt -c copy beats/concat-raw.mp4
```

**Bake in captions (subtitles file `captions.srt`):**
```bash
ffmpeg -i beats/concat-raw.mp4 \
  -vf "subtitles=captions.srt:force_style='FontName=Geist,FontSize=24,PrimaryColour=&Hffffff,OutlineColour=&H80000000,BorderStyle=3,Outline=1,Shadow=0,Alignment=2,MarginV=80'" \
  -c:a copy \
  beats/final.mp4
```

(`Alignment=2` is bottom-center, `MarginV=80` pushes captions up off the very bottom edge.)

**Final encode (YouTube spec):**
```bash
ffmpeg -i beats/final.mp4 \
  -c:v libx264 -preset slow -crf 18 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 192k \
  -y context-mod-demo.mp4
```

## Captions

Write `captions.srt` from the script. SRT format:

```
1
00:00:00,000 --> 00:00:04,000
Reddit's volunteer mods do 466 hours of unpaid labor a day.

2
00:00:04,000 --> 00:00:08,000
73% of mod actions are already performed by bots.

3
00:00:08,000 --> 00:00:14,000
ContextMod is the rule-engine mod bot 15+ communities run.
```

Source: `demo-video-script.md` line by line. Time each block to ~4 seconds per line max.

## Retake protocol

If a beat is wrong:
1. Re-record ONLY that beat in OBS (don't restart from scratch).
2. Re-stitch via the concat list above (only the changed beat re-encodes).
3. Save final OBS recording + Audacity project files in `_video-source/` (gitignored — already in `.gitignore` per `dist/` rule, but add `docs/submission/_video-source/` explicitly to be safe).

## Upload

YouTube upload:
1. youtube.com/upload
2. Title: `ContextMod Devvit Web port — 60-second demo`
3. Description: `Port of FoxxMD's PRAW ContextMod to Reddit Devvit Web. Repo: github.com/StephenSook/context-mod-devvit · App: developers.reddit.com/apps/cm-devvit · Reddit Mod Tools and Migrated Apps Hackathon 2026 entry.`
4. Visibility: **Unlisted** (NOT public)
5. Category: Science & Technology
6. Tags: `devvit`, `reddit`, `moderation`, `praw`, `typescript`
7. Captions: upload the same `captions.srt` (don't rely on auto-generated)
8. Copy the unlisted URL → paste into Devpost Step 3 "Video demo link" field.

## Pre-flight checklist before recording

- [ ] **Vinh's Phase 1 backend is live** — confirm `handleActivity` is wired, `runRule` evaluates against a real wiki config, and at least one action handler (e.g. `comment`) actually posts to Reddit on a test trigger. **Do not record if this isn't true** — fall back to synthetic-data path below.
- [ ] r/cm_devvit_test has the latest ContextMod install
- [ ] Wiki page `r/cm_devvit_test/wiki/botconfig/contextmod` has a clean starter config that fires on the "free crypto giveaway scam" test post
- [ ] Observatory dashboard pinned and renders a real action chip when a test post triggers a rule
- [ ] FoxxMD's Discord permission screenshot saved as PNG (no shoulder-surfable info)
- [ ] OBS scene transitions tested without recording
- [ ] Audacity output device set to mic (not the wrong AirPods)
- [ ] Captions written in advance, not improvised after
- [ ] Stephen rehearsed the full 60s VO twice

## Fallback if Phase 1 slips — full synthetic-data recording plan

If Phase 1 isn't live by **May 17, 2026** (T-3 days per `submission-day-runbook.md`), execute this complete capture path. The fallback isn't ideal but is honest — Devpost research found that *winners* explicitly caption mockup-vs-real-data; faked numbers torch credibility faster than stated gaps.

### Pre-flight (1 hour before recording)

- [ ] Load `https://developers.reddit.com/apps/cm-devvit?demo=1` (or playtest equivalent) — confirm dashboard renders with seeded data: 47 actions today / 2h 14m saved / 3 active rules / spam-filter top rule
- [ ] Open the wiki at `r/cm_devvit_test/wiki/botconfig/contextmod` — confirm starter JSON5 config visible
- [ ] Open the App Directory page at `developers.reddit.com/apps/cm-devvit`
- [ ] Open the mod overflow menu showing the 3 ContextMod items
- [ ] Pre-position cursor in OBS for each scene transition

### Beat-by-beat capture sequence (60s total)

| Beat | Time | OBS scene | Source data | VO line (Stephen's voice) |
|------|------|-----------|-------------|---------------------------|
| Cold open | 0-8s | montage stills | r/AskReddit modqueue + 2023 blackout + Q1 2026 earnings | "Reddit's mods do 466 hours of unpaid labor a day. 73% of mod actions are already bots. The bot infrastructure they depend on got killed in 2023." |
| History + permission | 8-22s | screenshots | github.com/FoxxMD/context-mod + FoxxMD Discord screenshot + issue #152 | "ContextMod's the rule-engine mod bot 15+ communities run — r/mealtimevideos at 60K weekly, r/piercing at 600K. Last release 2022. I got written permission from FoxxMD to port it to Devvit." |
| Install | 22-29s | App Directory | live `developers.reddit.com/apps/cm-devvit` | "One click to install on any subreddit. No hosting. No tokens." |
| Wiki config | 29-36s | wiki tab | live wiki editor with starter JSON5 | "Write rules in JSON5 in your sub's wiki. Composable rules. Mustache-templated action messages. The full ContextMod concept model, ported faithfully." |
| Trigger flow | 36-43s | dashboard `?demo=1` | synthetic seeded data + truth caption ON-SCREEN | "This is the dashboard and event model rendering seeded demo data. The live trigger pipeline — `handleActivity` → rule engine → action → `events:recent` — ships in Phase 1 post-hackathon." + ON-SCREEN CAPTION (arrives at 36s, persists to 50s): *"Dashboard rendered with `?demo=1` synthetic data. Phase 1 live-trigger wiring lands post-hackathon."* |
| Dashboard tour | 43-50s | dashboard `?demo=1` | synthetic seeded data, caption still on-screen | "Telemetry stream: stats, recent actions, hourly volume. Plus a dry-run rule tester for testing config before it goes live." |
| Wedge | 50-58s | title card | static, ffmpeg-rendered | "FoxxMD's instance and 15+ other ContextMod operators are stuck on dying PRAW infrastructure. This port unblocks them. Eligible for Reddit's $1,000 Migration Bounty plus the Developer Funds program." (truth caption from beat 5 may persist into early wedge frames; up to motion grader) |
| Close | 58-60s | three lines fade-up | static | "ContextMod, on Devvit. Now." |

### Caption-as-truth-telling (ffmpeg subtitle bake)

Add this caption block to `captions.srt` so the disclosure arrives the moment seeded data hits the screen (36s — start of trigger beat) and persists through the dashboard tour (to 50s):

```
N
00:00:36,000 --> 00:00:50,000
Dashboard rendered with ?demo=1 synthetic data.
Phase 1 live-trigger wiring lands post-hackathon.
```

Bake into the final mp4 via the same `ffmpeg -vf "subtitles=captions.srt:..."` pipeline used for the rest of the captions. **Do not** rely on YouTube auto-captions for this disclosure — judges may watch with captions off. The 36s arrival is non-negotiable: showing seeded data without a concurrent truth-caption reads as a real-trigger demo.

### Writeup synchronization

After recording the synthetic-data version, sync the writeup state:

- [ ] `docs/submission/writeup-draft.md` Section 3 "Ported faithfully": each shipped bullet stays as ✅ but emphasis on "scaffolds + types + idempotency primitives + dashboard"; gating language for "live evaluation lands Phase 1" / "handler wiring lands Phase 2" / "dashboard live data wires Phase 3" remains intact.
- [ ] `docs/submission/writeup-draft.md` Section 5 checklist: confirm "Demo video recorded" item references synthetic-data path explicitly.
- [ ] `docs/submission/devpost-form-cheat-sheet.md` Step 3 image-gallery captions: add `(rendered with ?demo=1 synthetic data)` suffix to dashboard-related images.

### Recording rehearsal checklist

- [ ] Read each beat aloud once at natural pace. If a beat overruns its time-slot, trim words not slow the read.
- [ ] Read again with the on-screen visual cued (OBS preview window) so VO timing matches scene transitions.
- [ ] Record VO clip-by-clip; don't try to nail the whole 60s in one take.
- [ ] Apply Audacity post-process: Filter Curve EQ (Voice low-cut 80Hz) + Compressor (2:1 / -18dB) + Normalize to -1dB peak.

### When to NOT use the synthetic path

If Phase 1 + Phase 2 + Phase 3 all ship by May 17 (`handleActivity` → `runRule` → action → `events:recent` ZSET → dashboard update) — record the live-data version instead. Judges trust real telemetry more than mockups, and the synthetic-data caption costs ~5s of demo time that could be product showcase.

The synthetic-data path is the **honest fallback**, not the preferred path.
