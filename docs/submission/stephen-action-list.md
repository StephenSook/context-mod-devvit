# Stephen Action List — T-8 → T-0

> Companion to [`submission-day-runbook.md`](./submission-day-runbook.md). The runbook is the full sequence; this file is the **subset Claude can't do for you** — surfaces that require Stephen's authenticated session, voice, or judgment.

## ⚠️ Status update 2026-05-19 (T-8)

Deadline: **May 27, 2026 18:00 PT** (T-8 from today). Most early-T action items already done. Current focus:

- ✅ Phase 1+2+3+4 shipped (Vinh + Stephen, v0.2 → v0.5.x)
- ✅ Phase 4 SHIPPED + live-verified on `r/contextmod_vinh_dev` (Vinh, 2026-05-18, commit `0bd59aa`)
- ✅ **Phase 4.7 image-repost SHIPPED** v0.6.0 (2026-05-18, Stephen GO 5/18) — pure-JS blockhash pipeline
- ✅ **AE wave: 35 polishes shipped** (Polish #1–#108) — auth-fail toast 503-aware, default-config dryRun:true safety, EmptyState snippet schema fix, image decode Content-Length pre-check, shared regex cache + safe-regex on filters, scheduler tests, App.tsx tests, mod-activity tests, demo-fixtures tests, migrations tests, configSource tests, etc.
- ✅ v0.6.7 tagged + pushed (828 tests, all CI green)
- ✅ Reddit cm-devvit@0.2.4 approved unlisted (re-upload latest source at T-2)
- ⏳ **Stephen: `npm run launch` at T-2 (May 25)** — push v0.6.x to Reddit App Directory
- ⏳ Demo video recording — Stephen's hands (T-3 to T-1 window)
- ⏳ Devpost form submit — final action at T-0
- ⏳ FoxxMD operator outreach — Discord DMs to 15 operators (template + migration tool ready)

## Labeling note (cross-ref with `submission-day-runbook.md`)

This file's labels updated for May 27 deadline. Both files now anchor on the same dates.

| This file | runbook | Date |
|-----------|---------|------|
| T-9 (today) | (between T-7 and T-5) | 2026-05-18 |
| T-7 | T-7 | 2026-05-20 |
| T-5 | T-5 | 2026-05-22 |
| T-3 | T-3 | 2026-05-24 |
| T-2 | T-2 | 2026-05-25 |
| T-1 | T-1 | 2026-05-26 |
| T-0 | Submission day | 2026-05-27 |

## Why this list exists

Three reasons Claude doesn't touch these:

1. **AI-tone discipline.** Watchful1's r/modnews lesson: marketers + AI bots get filtered as outreach. The FoxxMD Discord DM + r/Devvit reply + Devpost writeup paste all have to read as Stephen's own voice, not Claude's. Claude drafts; Stephen paraphrases + sends.
2. **Authenticated surfaces.** Discord, Devpost, Devvit Developer Portal, YouTube upload, Reddit reply — all require Stephen's 2FA / session cookies / OAuth. Claude can't paste-and-send.
3. **Irreversible publish gates.** `npx devvit publish --public`, Devpost "Submit project," YouTube unlisted → public flip. Once they go, they're public. Stephen owns the click.

---

## T-6 — 2026-05-21

### Action 1 — Ping Vinh on Phase 0.10 image-blockhash spike status (30s)

**Why now:** spike was GO/NO-GO Day 0–2 per `PLAN.md`. We're past that. Phase 4 image-hash repost detection in the demo storyline depends on the answer. No pressure on Vinh — just need to know whether to keep it in the 5/18 demo or cut.

**Channel:** Discord DM or PLAN.md notes column on Phase 0.10 card.

**Three draft variants — pick the tone:**

```
[discord-casual]
hey, quick check on phase 0.10 image-blockhash spike — still in scope or should I cut phase 4 image-hash from the demo storyline? trying to plan by 5/18, no rush on the answer
```

```
[plan-md-formal]
@vinh — phase 0.10 image-blockhash spike status? need to know by 5/18 whether to keep phase 4 image-hash in demo or cut. no rush, just want to plan the storyline.
```

```
[super-short]
phase 0.10 spike status? deciding demo storyline 5/18
```

Selection guidance: if Discord chat has been flowing already, use casual. If communication has been sparse, super-short reads as respectful-of-time. PLAN.md-formal stays in the kanban audit trail.

**Verify:** Vinh replies within 24h with one of (a) "still working on it," (b) "feasible, will land," (c) "blocked, cut it." Any of the three unblocks the demo plan.

### Other admin

Beyond the Vinh ping, today is a Claude-side workday — solo artifacts (MEMORY.md, captions.srt pre-bake, ffmpeg stitch script). You read this file + confirm the May 15 outreach is what you want sent.

---

## T-5 — 2026-05-22

**No user-only actions pending.** Both originally-scheduled items are resolved early:

- ~~Send FoxxMD kanban-seeded heads-up~~ — **SENT 2026-05-13 3:30 PM ET** (full audit trail in [`outreach-drafts.md`](./outreach-drafts.md) §1b). FoxxMD shared the Projects v2 board at 2:50 PM; Stephen replied with the seeding heads-up at 3:30 PM.
- ~~Check MHS domain status~~ — **SKIP, cut per PR #96 on 2026-05-13.** No domain request was ever submitted. See [`devvit-app-settings.md`](./devvit-app-settings.md) HTTP fetch domains table.

Use the day as buffer time — review writeup-draft, run `./scripts/check-ai-tone.sh --strict` on the full bundle, or get ahead on the demo recording prep (T-2 work).

---

## T-3 — 2026-05-24

### Action 1 — Confirm Phase 1+2 status with Vinh
- **What to ask:** "Is `handleActivity` → config load → `runRun` → `runCheck` → `runRule` → action handler → `events:recent` ZSET push executing end-to-end on a real `r/cm_devvit_test` post submission?"
- **If yes:** proceed with the live-data demo recording May 17–19.
- **If no:** execute synthetic-data fallback per [`demo-video-runbook.md`](./demo-video-runbook.md) "Fallback if Phase 1 slips" section. VO swap is documented; the truth caption at 36s is non-negotiable.
- **Verify:** post a test submission in `r/cm_devvit_test` titled "free crypto giveaway scam" — see if the regex spam-filter rule fires + an event row surfaces on the Observatory dashboard in real time.
- **Time:** 5–10 min (Discord/Slack ping + test post)

### Action 2 — Pin Devvit playtest version (only if something bumped)
- **Run:** `npx devvit upload --bump minor`
- **Verify:** version number shows in the Developer Portal at developers.reddit.com/apps/cm-devvit
- **Time:** 2 min

---

## T-2 — 2026-05-25 — Demo recording + `npm run launch`

### Action 1 — Pre-flight `demo-video-runbook.md` checklist
- OBS scenes pre-positioned (App Directory / wiki / dashboard `?demo=1` / mod menu)
- Audacity mic set (correct device, not AirPods by accident)
- Captions written (`captions.srt` with truth-caption at 36–50s if synthetic path)
- Geist font installed system-wide for ffmpeg `subtitles=` filter

### Action 2 — Record OBS clips per `demo-video-script.md` beat sheet
- 60s hard cap
- Clip-by-clip, not a single take
- Beat 3 (36–43s): if synthetic path, **the truth caption must arrive at 36s, not 50s**

### Action 3 — Record Audacity VO clips
- In your own voice, ~2.5 words/sec (slower than feels natural)
- Filter Curve EQ (Voice low-cut 80Hz) + Compressor 2:1 / −18dB + Normalize −1dB peak

### Action 4 — ffmpeg stitch + caption bake + final encode
- Per runbook command sequence
- Verify final mp4 ≤60s + captions burned in (not just SRT sidecar)

### Action 5 — Upload to YouTube as unlisted
- Title: `ContextMod Devvit Web port — 60-second demo`
- Paste URL into a temp file you'll paste into Devpost on May 27

---

## T-1 — 2026-05-26

### Action 1 — Ping SampleOfNone for Helper Nomination permission (30s)
- **Channel:** Discord same thread (the May 12-14 conversation)
- **Source:** [`devpost-form-cheat-sheet.md`](./devpost-form-cheat-sheet.md) Step 4 "Nominate a most helpful user"
- **Ask:** "would you be cool if I nominated you on my Devpost helper-nomination field + cited r/piercing as a named community in the writeup?"
- **Fallback:** if she declines or doesn't reply by T-0 morning (5/20), nominate FoxxMD per the alternate text in the cheat-sheet (he's already engaged via collab access + kanban; safe ask)
- **Why:** $500 Devvit Helper Award (×6 winners) goes to the user, not Stephen — but their visible engagement strengthens our Community Impact rubric score

### Action 2 — Submit Reddit developer satisfaction survey (5 min)
- **URL:** [forms.gle/d9jY3szEzRzmKPwL8](https://forms.gle/d9jY3szEzRzmKPwL8)
- **Why:** independent of the project Devpost form; free entry to the $200 Feedback Award pool (×10 winners) per Devpost overview
- **Source draft:** [`devpost-form-cheat-sheet.md`](./devpost-form-cheat-sheet.md) Step 4 "[Optional] Developer Platform feedback" — 6 specific topics to cover (Redis primitive limits, vite plugin gotcha, PR #96 MHS impact, Blocks deprecation timing, App Migration Program docs gaps, OG-crawler surface)

### Action 3 — Post r/Devvit progress check
- **Source draft:** [`outreach-drafts.md`](./outreach-drafts.md) §4 (r/Devvit subreddit + Discord update)
- **Gating condition:** only post if you have something concrete to show — Phase 1+2 partially live OR synthetic-data demo recorded
- **Verify:** post visible at reddit.com/r/Devvit
- **Time:** 60s

### Action 4 — Optional FoxxMD quote ask
- **Source draft:** [`outreach-drafts.md`](./outreach-drafts.md) §3 (FoxxMD — optional quote ask)
- **Skip if:** would read as last-minute. Honesty over hustle.
- **Time:** 60s if you choose to send

### Action 5 — Run pre-submission gates locally

From the repo root (`~/Reddiit\ Hacks/context-mod-devvit/`):

```bash
npm run type-check && npm run lint && npm test && npm run build
./scripts/check-ai-tone.sh --strict
```

Verify all pass. If anything fails, ping Claude.

---

## T-0 — 2026-05-27 — Submission day

### Morning (60 min) — Claude assists
- Claude does the final Codex review + the strict AI-tone scan + confirms CI green
- You confirm Codex output before Devpost form fill

### Devpost form fill (90 min) — Stephen executes from `devpost-form-cheat-sheet.md`
- **Step 1 — Manage team:** verify Stephen + Vinh listed (already done)
- **Step 2 — Project overview:** paste from cheat-sheet (project name 49 chars, elevator pitch 198 chars, thumbnail `assets/thumbnail.png`)
- **Step 3 — Project details (PUBLIC):**
  - Paste about-the-project Markdown from cheat-sheet §Step 3 (8-heading story)
  - Paste comma-separated Built-with tags
  - Paste 3 try-it-out URLs (App Directory / GitHub / Pages)
  - Upload 5 gallery images in order: `gallery-dashboard.png` → `gallery-modmenu.png` → `gallery-wiki.png` → `gallery-install.png` → `gallery-trigger.png`
  - Paste YouTube unlisted URL
- **Step 4 — Additional info (judges-only):** paste from cheat-sheet
- **Step 5 — Tags:** paste tag list from cheat-sheet

### Publish (90s) — Stephen owns the click
- Hit "Submit project"
- Verify confirmation page loads + email receipt arrives

### Post-publish — Claude assists
- Watch for Devpost confirmation
- Watch for Reddit app review email (4-day SLA per PR #98)
- Tag the commit: `git tag v0.1.0-devpost-submission && git push --tags`

---

## What Claude does for you (you don't need to do these)

- All atomic commits + push to origin/main (green-dot policy)
- Strict AI-tone scan before any text-touching commit
- Codex pre-submission review (`/codex:codex-rescue`)
- Playwright verification of Observatory `?demo=1` rendering after Sparkline / EventRow / dashboard changes
- README + DESIGN.md + CHANGELOG + writeup-draft + devpost-cheat + pillar-5 + outreach-drafts polish
- Mermaid + Markdown + YAML lint
- 4-gate npm chain (type-check + lint + test + build) post any frontend change

If you find Claude has missed any of these, ping it — the contract is that you handle the surfaces above and Claude handles the surfaces below.

---

## Sources

- [`submission-day-runbook.md`](./submission-day-runbook.md) — full sequence including Claude-handled tasks
- [`outreach-drafts.md`](./outreach-drafts.md) — every send draft
- [`demo-video-script.md`](./demo-video-script.md) — beat-by-beat VO + scenes
- [`demo-video-runbook.md`](./demo-video-runbook.md) — production pipeline + synthetic-data fallback
- [`devpost-form-cheat-sheet.md`](./devpost-form-cheat-sheet.md) — paste-by-paste form fill
