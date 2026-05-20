# Submission Day Runbook

> Top-to-bottom checklist for **2026-05-27 18:00 PT hard deadline** submission. Stephen runs this end-to-end, no improvising. Every step has a verification gate.
>
> **User-only subset:** if you only want the actions Stephen has to physically do (Discord DM, Devpost paste, YouTube upload, publish click), read [`stephen-action-list.md`](./stephen-action-list.md) instead — same sequence, Claude-handled steps stripped out.

## ⚠️ Status update 2026-05-19 (T-8)

Original runbook was anchored to a May 20 target submission. Reality: Phase 1+2+3+4+4.7 ALL shipped (Vinh + Stephen, see CHANGELOG v0.2.0 through v0.6.7), tests went 223 → 828, Reddit cm-devvit@0.2.4 approved unlisted on 2026-05-18, AE wave shipped Polish #1–#108 (auth-fail toast 503-aware, default-config dryRun:true safety, EmptyState snippet schema fix, image decode Content-Length pre-check, shared regex cache + safe-regex on filters, +scheduler/App/mod-activity/demo-fixtures/migrations/configSource direct unit tests). `npm run launch` ✅ shipped 2026-05-19 (T-8, 6 days early) — Devvit v0.2.6 submitted for App Directory re-review. The "Phase 1 slips" fallback path below is obsolete. Recording window is now T-3 to T-1 (May 24-26). Final Devpost submit at T-0 = May 27.

## Why submit T-2 to T-0 (not last-second)

Per [`docs/superpowers/2026-05-13-research-deltas.md`](../superpowers/2026-05-13-research-deltas.md) Section 3:

- Devvit domain approval SLA: up to **4 business days** (PR #98)
- User Actions require App Review pre-approval (PR #106)
- 2-3 day buffer between final `npm run launch` and deadline gives time to fix anything Reddit's app review bounces

Phase 1+2+3+4 all live as of 2026-05-18, so the synthetic-data fallback is no longer needed. Live-demo recording on Vinh's `r/contextmod_vinh_dev` (already verified end-to-end) is the strongest demo path.

---

## T-7 days (May 13 — today, complete by EOD)

- [x] All submission docs scaffolded (writeup-draft / devpost-form-cheat-sheet / pillar-5-numbers / demo-video-script / demo-video-runbook / devvit-app-settings / domain-approval-runbook / outreach-drafts)
- [x] DESIGN.md + CONTRIBUTING.md + CODE_OF_CONDUCT.md + SECURITY.md + CHANGELOG.md + Issue Forms + PR template
- [x] 42 cards seeded on FoxxMD's GitHub Projects v2 board
- [x] Devvit deps pinned exact `0.12.23`
- [x] CI green + Pages live + repo public + social preview uploaded
- [x] 5+ Codex audit cycles + Firecrawl-verified Reddit citations + Playwright-verified rendered surfaces
- [x] AI-tone scanner hardened against silent false-negatives

## T-5 days (May 15)

- [x] ~~**Send FoxxMD kanban-seeded heads-up** on Discord — draft in `outreach-drafts.md §1b`~~ — **SENT EARLY 2026-05-13 3:30 PM ET.** Full audit trail in `outreach-drafts.md §1b` (preserved draft + actual sent text + paraphrase deltas).
- ~~Check `api.moderatehatespeech.com` domain status~~ — **SKIP, no longer applicable.** MHS rule was proactively cut from `devvit.json` on 2026-05-13 per `reddit/devvit-docs` PR #96 (commit `c2d2865`). No domain request was ever submitted; no status to check. See [`devvit-app-settings.md`](./devvit-app-settings.md) HTTP fetch domains table for closure record.

> Both T-5 items resolved 2026-05-13. T-5 day (May 15) now has no required actions — use as buffer.

## T-3 days (May 24)

- [ ] **Confirm Phase 1+2 status with Vinh** — does `handleActivity` → rule pipeline → mod action work end-to-end against a real test post in `r/cm_devvit_test`?
  - **Yes** → proceed with live-data demo recording May 24-26
  - **No** → execute synthetic-data fallback from `demo-video-runbook.md`
- [ ] **Pin Devvit playtest version** if anything bumped during the week — run `npx devvit upload --bump minor`

## T-2 days (May 18) — Demo recording day

- [ ] **Pre-flight `demo-video-runbook.md` checklist** — OBS scenes pre-positioned, Audacity mic set, captions written, Geist font installed system-wide for ffmpeg subtitles filter
- [ ] **Record OBS clips per `demo-video-script.md` beat sheet** — 60s hard cap
- [ ] **Record Audacity VO clips** in Stephen's own voice — slower than feels natural, ~2.5 words/sec
- [ ] **ffmpeg stitch + caption bake + final encode** per runbook
- [ ] **Upload to YouTube as unlisted** — title `ContextMod Devvit Web port — 60-second demo`, paste URL into a temp file for May 27 paste

## T-1 day (May 19)

- [ ] **Ping SampleOfNone for Helper Nomination permission** (Discord, 30s) — "would you be cool if I nominated you on my Devpost helper-nomination field + cited r/piercing as a named community in the writeup?" 24h window. If she declines or doesn't reply by T-0 morning, fall back to FoxxMD per `devpost-form-cheat-sheet.md` alternate text.
- [ ] **Submit Reddit developer satisfaction survey** at [forms.gle/d9jY3szEzRzmKPwL8](https://forms.gle/d9jY3szEzRzmKPwL8) — free entry to the $200 Feedback Award pool (×10 winners). Topics drafted in `devpost-form-cheat-sheet.md` Step 4. Independent of the project Devpost form.
- [ ] **Post r/Devvit progress check** — draft in `outreach-drafts.md §4`. Gated on having something concrete to show (Phase 1+2 partially live OR synthetic-data demo recorded).
- [ ] **Optional: FoxxMD quote ask** — draft `§3` if natural; skip if it'd read as last-minute.
- [ ] **Run pre-submission gates locally:**
  - [ ] `npm run type-check && npm run lint && npm test`
  - [ ] `npm run build`
  - [ ] `./scripts/check-ai-tone.sh --strict` (strict mode blocks on any hit)
  - [ ] Re-run on the FULL paste-day bundle: writeup-draft, devpost-form-cheat-sheet, pillar-5-numbers, README, demo-video-script

## Submission day (May 27)

### Morning (60 min)

- [ ] **Final Codex review on the paste-day bundle** — invoke `codex:codex-rescue` sub-agent with full set of submission docs. Fix any HIGH/MED findings before paste.
- [ ] **Run `./scripts/check-ai-tone.sh --strict`** one more time post-Codex-fixes
- [ ] **Pull latest from main** — confirm CI green on the latest push

### Devpost form fill (90 min, follow `devpost-form-cheat-sheet.md`)

- [ ] **Step 1 — Manage team:** verify Stephen + Vinh in team (already complete)
- [ ] **Step 2 — Project overview:**
  - Project name: paste recommended (`ContextMod — Devvit port of FoxxMD's PRAW mod bot`, 49 chars)
  - Elevator pitch: paste recommended (198 chars)
  - Thumbnail: upload `assets/thumbnail.png` (1200×800, real PNG)
- [ ] **Step 3 — Project details (PUBLIC):**
  - About-the-project Markdown: paste from `devpost-form-cheat-sheet.md §Step 3` (8-heading story: Inspiration / What it does / How I built / Challenges / Accomplishments / What I learned / What's next / Built with)
  - Built with tags: paste comma-separated list
  - Try-it-out links: 3 URLs (App Directory, GitHub, Pages)
  - Image gallery: upload `assets/gallery-{dashboard,modmenu,wiki,install,trigger}.png` (5 images, 3:2 each)
  - Video demo: paste YouTube unlisted URL
- [ ] **Step 4 — Additional info (JUDGES ONLY):**
  - Sponsor / Special Prizes: check "Best Ported App" ($10K grand prize)
  - Reddit usernames: `u/CowSufficient3840, u/<Vinh's reddit username>`
  - developers.reddit.com app page: `https://developers.reddit.com/apps/cm-devvit`
  - Tool overview: paste from `writeup-draft.md` Section 1 (includes "Why now" + "What mods actually want" paragraphs)
  - Project Impact: paste from `writeup-draft.md` Section 2
  - Is this a new app or a migrated app: select **Migrated app**
  - [For Ported] Original Bot username: `u/ContextModBot`
  - [For Ported] Port Completion: paste from `writeup-draft.md` Section 3
  - Helper nomination: paste from `devpost-form-cheat-sheet.md §Step 4 helper-nomination`

### Pre-submit gate (15 min)

- [ ] **Devpost Preview button** — click + open in new tab + read top-to-bottom as if a judge
- [ ] **Scan rendered project story for AI-tone words** — visual scan ≠ scanner; eyes catch what regex doesn't
- [ ] **Verify gallery image order** — dashboard hero first (judges land on first image)
- [ ] **Verify YouTube video embed** — preview should show the player
- [ ] **Verify "Try it out" links resolve** — click each, confirm 200

### Submit (5 min)

- [ ] **Click Submit on Devpost** — Form auto-saves; submit makes it final
- [ ] **Screenshot the submission confirmation page** — keep for records
- [ ] **Paste the Devpost project URL into `outreach-drafts.md §5`** — replaces the `[paste devpost project URL]` placeholder

### Post-submit (30 min)

- [ ] **Submission-day announcement** — post the prepared draft from `outreach-drafts.md §5` to:
  - r/Devvit subreddit (NEW POST)
  - r/Devvit Discord (cross-post the same text)
- [ ] **DM FoxxMD on Discord** with the Devpost link + "submitted, thanks for the permission"
- [ ] **DM SampleOfNone** with the Devpost link if helper-nomination ask was sent earlier (else skip)
- [ ] **Tag the v0.1.0 release on GitHub:**
  ```bash
  git tag -a v0.1.0 -m "v0.1.0 — Reddit Mod Tools Hackathon submission"
  git push origin v0.1.0
  ```
  Then create a GitHub Release referencing the Devpost submission URL.
- [ ] **Update `CHANGELOG.md` v0.1.0 section** with the actual submit date (replace `TBD` line)
- [ ] **Downgrade gh CLI scopes** — `gh auth refresh --remove-scopes project` (was added temporarily for kanban bulk-add)

## T+1 to T+7 days (May 21-27)

- [ ] **Watch r/Devvit + Discord for judge questions** about the submission
- [ ] **Respond in Stephen's own voice** (Watchful1 lesson) — no AI replies
- [ ] **If Reddit app review bounces:** fix the noted issue, bump minor (`npx devvit upload --bump minor`), resubmit before May 27 6pm PT
- [ ] **If competing rule-engine submission posts feedback:** engage technically, lean into ContextMod's defensible differentiators (named upstream, 15+ existing operators, audit-chain Observatory)

## Hard rules (zero exceptions)

1. **No AI-generated replies** to anyone — Watchful1 publicly shamed AI replies in r/Devvit on May 10 ([`research-deltas.md`](../superpowers/2026-05-13-research-deltas.md) Section 2). Every Discord / Reddit reply is in Stephen's own voice.
2. **No invented numbers** in the submission — every quantitative claim has a citation in [`pillar-5-numbers.md`](./pillar-5-numbers.md).
3. **No claims about features that aren't shipping** — Phase 4 stretch rules + MHS rule are explicitly cut/deferred per current state.
4. **No `splash` parameter** in `submitCustomPost` — deprecated June 2026 per Devvit PR #98.
5. **No fetch domains outside Reddit-allowlist + the OpenAI/Gemini AI carve-out** — Devvit PR #96 (2026-05-08) rejects all other AI domains.

## Failure modes + recovery

| If this happens | Do this |
|----------------|---------|
| Devpost form rejects elevator pitch as too long | Trim to 195 chars; saved fallback in `devpost-form-cheat-sheet.md §Step 2 alternatives` |
| Image gallery upload fails on a specific PNG | Re-encode via `python3 -c "from PIL import Image; Image.open('FILE').save('FILE', 'PNG', optimize=True)"` to strip metadata |
| YouTube video processing not complete by paste time | Upload earlier (T-2 day buffer); set to public-unlisted, not "scheduled" |
| Reddit app review timeline >7 days | Submit Devpost anyway with the playtest URL — judges accept playtest links per hackathon rules |
| Phase 1+2 not done by May 24 | OBSOLETE — Phase 1+2+3+4 all shipped 2026-05-17/18. Live-data demo on `r/contextmod_vinh_dev` (Vinh's verified install). |
| Domain approval not received by May 18 | Drop MHS rule from `devvit.json` + writeup Section 3, ship without it |
| CI red on `main` morning of May 27 (type-check/lint/test/build fails) | `git log --oneline -5` to find the offending commit; `git revert <hash>` if not a critical fix, force-push not needed (revert = new commit); re-run gates locally; if blocked >30 min, ship Devpost with the prior-good commit hash in the writeup |
| Pages site (privacy/terms) returns 502 or HTML-not-found at paste time | Trigger a Pages redeploy: edit `policies/privacy.md` with a single-char no-op change + push; watch `gh run list --workflow=pages.yml` for green; if still down at T-0, paste raw `github.com/StephenSook/context-mod-devvit/blob/main/policies/privacy.md` URLs into Devpost (less polished but functional) |
| Devvit upload/publish bounces on app review | Wait 4 business days per published SLA; if outside window, file support ticket at `developers.reddit.com/support`; for Devpost-side, paste the playtest URL (judges accept playtest links per hackathon rules — line 147 above) |
