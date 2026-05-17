# Wave V — Category A pre-submit holdbacks (7 phases, ~5 hr)

> Per Stephen's "no holdbacks" challenge 2026-05-17 (post-Wave-U). Ship the doc-refresh + version-bump + AI-summary feature that fell behind Wave S+T+U code shipping pace. Item 7 (npm run launch) is Stephen-manual.

**Goal:** lock v0.3.0 versioning + bring all user-facing docs (README, writeup, cheat sheet, demo script) in sync w/ Wave S+T+U features + ship one final feature (AI summary per event) before Stephen's Devpost final submit.

**Pre-flight:**
- main = origin/main clean post-Wave-U
- 319 vitest tests passing
- tsc + lint + ai-tone clean
- 0 open issues, 0 open PRs, 0 npm audit vulns
- repo-sentinel pre-submit scan clean

**Sequencing rationale:** quick-win bump first (V1) to build momentum. Doc refreshes batched alphabetically by file. AI summary feature (V7) last because it's the only code change + risky-path codex review.

---

## Phase V1 — package.json 0.2.0 → 0.3.0 (5 min)

### Task V1.1: Bump version + verify
- [ ] Edit package.json version field
- [ ] git add + commit + push (atomic)
- [ ] No tests / lint / type-check needed (data-only change)

---

## Phase V2 — CHANGELOG v0.3.0 entry (30 min)

### Task V2.1: Author release notes
**Files:** Modify `CHANGELOG.md` — add `## [0.3.0] — 2026-05-17` section above [0.2.0]

Cover (15 features + 16 fixes since v0.2.0):
- **Added (Wave S+T)**: S6 filter chips · S7 mobile responsive · S8 keyboard shortcuts · S2 event drill-down · S4 onboarding tour · S14 blog draft · S15 migration guide · S16 Phase 4 auth · S1 rule simulation · S5 AI rule explainer · S11 per-rule statistics · S9 config rev diff · S3 mod activity attribution · S10 mute/unmute MVP · S12 E2E Playwright in CI
- **Added (Wave V)**: V7 AI summary per event (drill-down panel)
- **Changed**: Header self-tick + glow-pulse (R5 RTL tests); CSV export status-aware markers; OnboardingTour fail-OPEN on localStorage error
- **Fixed (Wave U)**: 3 BLOCKERs + 1 CRITICAL + 11 WARNs from parallel code review (mod auth on /mute-rule, simulateRule errored surface, muteSet Result types, API 500 on infra fail, simpleDiff LCS rewrite, OpenAI body parse, modActivity structured warn, forms phase prefix, ConfigDiff stack log, ModActivityFeed caption, keyboard try/catch, dryRunActivity wording, configStore gap-walk, OnboardingTour fail-open)
- **Fixed (Wave R)**: CSV no-control-regex lint, hono 4.11.7 → 4.12.19 (0 npm audit vulns), RTL Header lifecycle tests
- **Tests**: 260 → 319 (+59)
- **Repo health**: 0 open issues, 0 open PRs, all CI green

### Task V2.2: Commit + push

---

## Phase V3 — README "Status at a glance" update (30 min)

### Task V3.1: Refresh Status table w/ Wave S+T+U items
**Files:** Modify `README.md` Status at a glance section

Add rows:
- ✅ Wave S+T mod-UX (filter chips, drill-down, onboarding, mobile responsive, keyboard shortcuts)
- ✅ S1 rule simulation against history
- ✅ S5 AI rule explainer (OpenAI)
- ✅ S9 config rev diff viewer
- ✅ S10 mute/unmute MVP
- ✅ S11 per-rule statistics
- ✅ S3 mod activity attribution
- ✅ S12 E2E Playwright tests in CI
- ✅ Wave U code review hardening (5 BLOCKERs + 11 WARNs closed)
- 🟡 v0.3.0 publish (queued post-doc-refresh)

### Task V3.2: Bump test count line + commit + push + curl verify

---

## Phase V4 — writeup-draft.md Section 1+3 update (1 hr)

### Task V4.1: Section 1 (Tool Overview) — add new features
**Files:** Modify `docs/submission/writeup-draft.md`

- [ ] Update bullet list to include rule simulation + AI explainer + mute/unmute + config diff viewer + mod activity feed + per-rule stats
- [ ] Test count 245 → 319
- [ ] Phase 4 status updated: history/attribution/recentActivity authorized for Vinh (Wave S16)

### Task V4.2: Section 3 (Port Completion) — claim refresh
- [ ] Repalce "shipped Phase 1+2+3" w/ "shipped Phase 1+2+3 + Step 3.6 + Wave S+T 15 user-facing features + Wave U 16 code-review fixes"
- [ ] Add Codex hardening tally: 2 CRITICAL + 12 HIGH initial + 5 BLOCKERs + 11 WARNs from Wave U review

### Task V4.3: Commit + push

---

## Phase V5 — devpost-form-cheat-sheet.md refresh (30 min)

### Task V5.1: Add new features to paste-ready text
**Files:** Modify `docs/submission/devpost-form-cheat-sheet.md`

- [ ] About-the-project Markdown: add rule simulation + AI explainer as headline WOW
- [ ] Tool Overview: include new features
- [ ] Project Impact: highlight rule simulation as the demo money shot
- [ ] Port Completion: bump test count

### Task V5.2: Commit + push

---

## Phase V6 — demo-video-script.md update (30 min)

### Task V6.1: Update 60-second beat list
**Files:** Modify `docs/submission/demo-video-script.md`

- [ ] Add beats for S1 rule simulation (the killer feature)
- [ ] Add S5 AI explainer beat
- [ ] Add S9 config diff viewer beat
- [ ] Suggest 60-sec cut order: install → wiki config → reload → trigger event → dashboard → drill-down expand → rule simulation (S1 money shot) → AI explainer (bonus)

### Task V6.2: Commit + push

---

## Phase V7 — AI summary per event in EventDetails (~2 hr, ONLY code change)

### Task V7.1: New pure core `explainEvent`
**Files:** Create `src/core/explainEvent.ts` + `tests/core/explain-event.test.ts`

- [ ] Export `explainEvent(event: EventSummary, apiKey: string, fetcher: Fetcher = fetch): Promise<ExplainResult>` w/ same Fetcher-injected pattern as explainRule
- [ ] System prompt: "Explain in 2 sentences why this moderation event fired. Use plain English. Don't repeat field values, summarize intent."
- [ ] EventSummary type w/ runName/checkName/actions/matchedRule subset (no raw item body to avoid leaking content into OpenAI)
- [ ] 5+ vitest cases (mock fetcher) same shape as explainRule tests

### Task V7.2: New API endpoint `POST /api/explain-event`
**Files:** Modify `src/routes/api.ts`

- [ ] Body: `{ event: EventSummary }`
- [ ] Reuses settings.get for openai_api_key
- [ ] Returns `{ ok: true, explanation: string }` or `{ ok: false, error }`
- [ ] Same mod-auth check as /mute-rule? — actually NO, this is read-only + costs only one OpenAI token charge so any sub viewer hitting it is fine (rate-limit concern but minimal)
- [ ] Actually: gate behind requireModerator() to be safe — only mods should burn the API key quota

### Task V7.3: Button in EventDetails component
**Files:** Modify `src/client/components/EventDetails.tsx`

- [ ] Add "Explain this event w/ AI" button at bottom of expanded panel
- [ ] useState `{ loading, explanation, error }`
- [ ] onClick → POST /api/explain-event w/ event payload → render explanation inline
- [ ] Loading spinner during fetch
- [ ] Error caption on failure

### Task V7.4: Verify all + commit + push
- [ ] npm test (319 + 5 new = 324)
- [ ] npm run lint
- [ ] npm run type-check
- [ ] Playwright visual verify on dev:web
- [ ] codex:codex-rescue review on V7 risky path

---

## Stephen-manual (Category E reminders)

- E25: Set `openai_api_key` in App Directory installation settings
- E26: `npm run launch` to publish v0.3.0
- E27: Submit v0.3.0 to App Directory review
- E28: Update GitHub Release for v0.3.0
- E29: Re-paste refreshed cheat-sheet text into Devpost form

---

## Self-Review

**Spec coverage:** All 7 Category A items (6 docs + 1 code) mapped 1:1.
**Sequencing:** Quick wins first (V1 version + V2 CHANGELOG) build momentum. Docs middle. Code change last (V7) w/ tests + Playwright + Codex review.
**Risk:** V7 is highest-risk (new endpoint + OpenAI fetch + UI integration). Codex review forced per three-brain rule.
**External verify:** V3 curl raw README. V7 Playwright on dev:web.

---

_Plan saved 2026-05-17 by Stephen via Claude Code, Wave V Category A pre-submit holdback flush._
