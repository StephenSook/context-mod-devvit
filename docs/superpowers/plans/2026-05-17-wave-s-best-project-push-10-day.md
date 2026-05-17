# Wave S — 10-day best-project push (T-10 → 2026-05-27)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Locked rules: atomic commits + edit→tests→tsc→lint→commit→push triplet + Playwright visual verify on UI + Codex adversarial review on risky paths + genuine 200+ tool audit before starting (already shown).

**Goal:** Ship every high-ROI item we previously deferred to "post-hackathon" so the May 27 submission is genuinely WOW-class, not just complete. Stephen authorized full execution 2026-05-17 + said "we have more than enough time, no restraints."

**Architecture:** 19 phases across 10 days. Quick wins (frontend-only, no schema) sequenced first to build momentum + ship velocity. Schema-impacting features mid-wave. Vinh's Phase 4 backend runs in parallel via PLAN.md update + Discord ping. Demo + submit terminal actions on Day 10.

**Tech stack:** React + TypeScript + Tailwind (frontend), Vitest + @testing-library/react + jsdom (tests, already installed via R5), Devvit Web platform (CommonJS bundle), Playwright MCP (visual verify), gh CLI (release ops), OpenAI HTTP fetch via Devvit allowlist PR #96 (S5).

**Total estimated work:** ~35-45 hours across Stephen + me-as-implementer + Vinh's parallel S16 lane.

---

## Tool audit reference

Full 200+ entry audit shown four times earlier this session per `[[full-tool-audit-genuine]]` memory rule. Active USE set for Wave S documented at top of prior turn — built-in tools + plugin_playwright (10 sub-tools) + plugin_github_github (6 sub-tools) + Context7 + firecrawl_search + 6 sub-agents + 10 skills. See conversation history for full enumeration.

---

## Pre-flight verified

- main = origin/main clean (after Wave R)
- 260 tests passing
- tsc + lint + ai-tone all clean
- npm audit 0 vulnerabilities
- v0.2.0 GitHub Release published
- 0 open issues, 0 open PRs
- 9 days remaining (today + 9) to 2026-05-27 6pm PT deadline

---

## Sequencing strategy

Three execution rails running in parallel:

**Rail A — Stephen-side (me as implementer, frontend + non-contract backend):**
- Day 1: S6 search chips + S7 mobile responsive + S8 keyboard nav (3 quick wins, ~4 hr)
- Day 2: S2 per-event drill-down + S4 onboarding overlay (~4 hr)
- Day 3: S1 rule simulation (4 hr) + S5 AI rule explainer (2 hr) ← BIG WOW DAY
- Day 4: S9 config rev diff viewer + S11 per-rule statistics (~6 hr)
- Day 5: S10 mute/unmute rule from dashboard (4 hr) + S3 mod activity attribution (3 hr)
- Day 6: S12 E2E Playwright CI integration (4 hr)
- Day 7: S14 operator quickstart blog + S15 migration doc (~4 hr)
- Day 8: integration testing + Codex full-session review pass
- Day 9: S17 Devpost writeup voice rewrite (Stephen-manual)
- Day 10: S18 demo video record + S19 final Devpost submit (Stephen-manual)

**Rail B — Vinh-side (PLAN.md update + Discord ping, parallel):**
- S16 Phase 4: history + attribution + recentActivity rules + author-cache substrate (~12 hr)
- Stephen pings Vinh after I update PLAN.md

**Rail C — Background passive:**
- Reddit App Directory v0.2.0 approval email (passive wait, 2-7 days remaining from 2026-05-16)
- SampleOfNone Helper-nomination already confirmed (Stephen pinged her)

---

## Phase S1 — Rule simulation against last 50 events (Day 3, 4 hr, ⭐⭐⭐⭐⭐ WOW)

**Why this is the killer feature:** Mod writes a NEW rule. Clicks "Simulate against history." Dashboard shows: "This rule would have fired on 7 of the last 50 events — 5 removes + 2 comments." Mods preview rule impact BEFORE going live. Nobody else in the hackathon will have this. Demo-video gold.

### Task S1.1: New backend endpoint `/internal/menu/simulate-rule`

**Files:** Modify `src/routes/menu.ts` + create `src/core/simulateRule.ts`

- [ ] Step 1: Add mod-menu entry `ContextMod: Simulate rule against last 50 events` in `devvit.json`
- [ ] Step 2: Form schema in `src/routes/forms.ts` w/ JSON5 textarea
- [ ] Step 3: `src/core/simulateRule.ts` exports `simulateRule(ruleJson5: string, snapshot: ConfigSnapshot, recentEvents: EventRecord[]): SimulationResult` — pure function, no side-effects, runs the parser + the runRule loop against each historical event's normalized item/author

### Task S1.2: Result type + UI rendering

- [ ] Step 1: `SimulationResult = { totalEvents: number, wouldHaveFired: number, breakdown: { kind: ActionKind, count: number }[], samples: { activityId: string, wouldHaveFired: boolean }[] }`
- [ ] Step 2: Toast formatter — "Rule would have fired on N/50 events: K removes + L comments + M reports"

### Task S1.3: Tests + Playwright verify + commit

- [ ] Step 1: Vitest tests for `simulateRule` w/ fixture configs + fixture events
- [ ] Step 2: Playwright verify in live dev:web
- [ ] Step 3: Atomic commit + push + Codex review dispatch

---

## Phase S2 — Per-event drill-down click-to-expand (Day 2, 2 hr, ⭐⭐⭐⭐ WOW)

### Task S2.1: Expand EventRow to support expanded state

**Files:** Modify `src/client/components/EventRow.tsx`

- [ ] Step 1: useState `expanded: boolean` per row
- [ ] Step 2: Click anywhere on row toggles expanded
- [ ] Step 3: Expanded section shows: matched rule name + run path (run→check→rule), all actions w/ wouldHaveCalled or status, raw event JSON in collapsible code block

### Task S2.2: Backend support — propagate matched-rule context

**Files:** Modify `src/core/handleActivity.ts` + `src/state/recentEvents.ts`

- [ ] Step 1: Add `matchedRule?: string` + `runPath?: string` to EventRecord type
- [ ] Step 2: handleActivity populates these from the first matched rule

### Task S2.3: Tests + Playwright + commit

---

## Phase S3 — Mod activity attribution (Day 5, 3 hr, ⭐⭐⭐⭐ WOW)

### Task S3.1: Capture mod identity in mod-menu actions

**Files:** Modify `src/routes/menu.ts` + `src/routes/forms.ts`

- [ ] Step 1: Each mod-menu trigger captures `context.userId` + `context.username`
- [ ] Step 2: Persist to `events:recent50` ZSET w/ `actor?: string` field on EventRecord

### Task S3.2: Dashboard renders attribution

**Files:** Modify `src/client/components/EventRow.tsx`

- [ ] Step 1: If `actor` present, show small "by u/CowSufficient3840" badge near event timestamp

### Task S3.3: Tests + Playwright + commit

---

## Phase S4 — First-time setup walkthrough overlay (Day 2, 2 hr, ⭐⭐⭐⭐ WOW)

### Task S4.1: 3-step tour overlay component

**Files:** Create `src/client/components/OnboardingTour.tsx`

- [ ] Step 1: Renders fixed-position translucent overlay w/ 3 steps:
  - "1/3 — This is your event stream. Last 50 mod actions show here."
  - "2/3 — Mod menu has 3 entries: Reload config, View recent, Test rules."
  - "3/3 — Edit your rules at r/<sub>/wiki/botconfig/contextmod"
- [ ] Step 2: localStorage flag `cm-tour-seen-v1` to never re-show
- [ ] Step 3: Skip button + Next/Done navigation

### Task S4.2: Wire into App.tsx empty state

- [ ] Step 1: Show tour only on FIRST visit (no localStorage flag) AND empty events state

### Task S4.3: Tests + Playwright + commit

---

## Phase S5 — AI rule explainer (Day 3, 2 hr, ⭐⭐⭐⭐⭐ WOW)

### Task S5.1: Verify OpenAI HTTP fetch allowlist

**Files:** N/A — verify-only

- [ ] Step 1: Check `devvit.json` http allowlist + Reddit PR #96 docs to confirm `api.openai.com` is on the AI-provider allowlist

### Task S5.2: New mod-menu + form for explainer

**Files:** Modify `src/routes/menu.ts` + `src/routes/forms.ts` + create `src/core/explainRule.ts`

- [ ] Step 1: Menu entry `ContextMod: Explain a rule with AI`
- [ ] Step 2: Form: JSON5 textarea for rule input
- [ ] Step 3: `explainRule(rule: string): Promise<string>` posts to OpenAI chat completions w/ a system prompt: "Explain this ContextMod JSON5 rule in 2-3 sentences as if to a non-technical moderator."
- [ ] Step 4: API key from Devvit settings (`context.settings.get('openai_api_key')`) — Stephen needs to add per-install

### Task S5.3: Settings UI + tests + Playwright + commit

- [ ] Step 1: `devvit.json` settings schema for `openai_api_key`
- [ ] Step 2: README install instruction for the key
- [ ] Step 3: Mock-fetch tests + live verify w/ Stephen's test key

---

## Phase S6 — Search/filter chips above event stream (Day 1, 1 hr, ⭐⭐⭐)

### Task S6.1: Filter state + chip UI

**Files:** Modify `src/client/App.tsx` + create `src/client/components/FilterChips.tsx`

- [ ] Step 1: useState `filter: { action?: ActionKind, status?: ActionStatus, author?: string }`
- [ ] Step 2: 4 chips above event stream: "all" / "remove only" / "failed only" / "dry-run only"
- [ ] Step 3: Active chip styled w/ accent border; click toggles

### Task S6.2: Apply filter to events list rendering

- [ ] Step 1: `filteredEvents = events.filter(e => matchesFilter(e, filter))`
- [ ] Step 2: Empty filtered state: "No events match filter — show all"

### Task S6.3: Tests + Playwright + commit

---

## Phase S7 — Mobile-responsive pass (Day 1, 90 min, ⭐⭐⭐)

### Task S7.1: Resize breakpoints

**Files:** Modify `src/client/components/*` + `src/client/styles.css`

- [ ] Step 1: Header — hide subreddit name on `<480px`, keep live indicator
- [ ] Step 2: StatsRow — 4 cards stack 2x2 on `<640px`
- [ ] Step 3: EventRow — drop secondary metadata on `<640px`, keep core chips
- [ ] Step 4: ActionBar — stack vertically on `<480px`

### Task S7.2: Playwright resize verify

- [ ] Step 1: browser_resize → 320 / 480 / 768 viewport widths
- [ ] Step 2: browser_snapshot at each, verify no horizontal overflow

---

## Phase S8 — Keyboard nav + shortcuts overlay (Day 1, 90 min, ⭐⭐⭐)

### Task S8.1: Global key handlers

**Files:** Create `src/client/hooks/useKeyboardShortcuts.ts`

- [ ] Step 1: `?` opens shortcut overlay
- [ ] Step 2: `r` triggers reload
- [ ] Step 3: `e` triggers export CSV
- [ ] Step 4: `j` / `k` navigate event stream up/down (selected row highlighted)
- [ ] Step 5: `escape` closes overlay / clears selection

### Task S8.2: Overlay component

**Files:** Create `src/client/components/KeyboardOverlay.tsx`

- [ ] Step 1: Backdrop + centered card w/ key bindings
- [ ] Step 2: Click outside or escape closes

### Task S8.3: Tests + Playwright (browser_press_key) + commit

---

## Phase S9 — Config rev diff viewer (Day 4, 3 hr, ⭐⭐⭐⭐ WOW)

### Task S9.1: New backend endpoint `/api/config-history`

**Files:** Modify `src/routes/api.ts` + `src/state/configStore.ts`

- [ ] Step 1: List last 10 revs from `cfg:rev:*` keys
- [ ] Step 2: GET `/api/config-history?from=N&to=M` returns `{ revs: [{rev, ts, json}] }`

### Task S9.2: Diff UI

**Files:** Create `src/client/components/ConfigDiffViewer.tsx`

- [ ] Step 1: Side-by-side diff using `diff` npm lib OR simple line-by-line color (green/red)
- [ ] Step 2: Mod-menu entry `ContextMod: View config history` opens this in a custom post

### Task S9.3: Tests + Playwright + commit

---

## Phase S10 — Mute/unmute rule from dashboard (Day 5, 4 hr, ⭐⭐⭐⭐)

### Task S10.1: Schema addition — runtime mute set

**Files:** Modify `src/schema/app.schema.json` + `src/state/keys.ts`

- [ ] Step 1: New Redis key `cm:muted-rules:{sub}` set containing ruleSet/check names that are muted
- [ ] Step 2: handleActivity checks mute set before evaluating rule

### Task S10.2: New `/internal/menu/mute-rule` endpoint

**Files:** Modify `src/routes/menu.ts` + `src/routes/forms.ts`

- [ ] Step 1: Mod-menu entry per event row: "Mute this rule"
- [ ] Step 2: Form: select which rule from the list of currently-firing rules

### Task S10.3: Dashboard UI

**Files:** Modify `src/client/components/EventRow.tsx`

- [ ] Step 1: Add small mute icon button on each event row
- [ ] Step 2: Click → show "Mute spam-removal/crypto-giveaway?" confirm → call mute endpoint

### Task S10.4: Tests + Codex review + Playwright + commit

---

## Phase S11 — Per-rule statistics (Day 4, 3 hr, ⭐⭐⭐⭐)

### Task S11.1: Counter store

**Files:** Modify `src/core/handleActivity.ts` + `src/state/recentEvents.ts`

- [ ] Step 1: `cm:rule-stats:{sub}:{run}/{check}/{rule}` hash with fields `fired24h`, `firedLifetime`, `lastFiredTs`
- [ ] Step 2: Increment on every successful rule trigger

### Task S11.2: Dashboard summary

**Files:** Modify `src/client/App.tsx` + create `src/client/components/RuleStatsTable.tsx`

- [ ] Step 1: New section below event stream "Rule stats (24h)" — table sortable by fired-count
- [ ] Step 2: Click rule name → filter event stream to only that rule

### Task S11.3: Tests + Playwright + commit

---

## Phase S12 — E2E Playwright tests in CI (Day 6, 4 hr, ⭐⭐⭐)

### Task S12.1: Headless Playwright in CI workflow

**Files:** Modify `.github/workflows/ci.yml` + create `tests/e2e/dashboard.spec.ts`

- [ ] Step 1: Install playwright/test in devDeps
- [ ] Step 2: New CI job that spins up dev:web in background + runs Playwright against ?demo=1
- [ ] Step 3: Tests: dashboard renders, 5 events shown, header time matches pattern, no console errors

### Task S12.2: First test scenarios

- [ ] Step 1: Sanity scenario — page loads, 200 OK, title is "ContextMod Observatory"
- [ ] Step 2: Smoke scenario — stat cards + events list render + ActionBar visible
- [ ] Step 3: Interaction scenario — click Reload, see "refreshed" flash

### Task S12.3: Commit + push + verify CI passes

---

## Phase S13 — E2E captures B/C/D/E live (Day 7, 1 hr, ⭐⭐⭐)

### Task S13.1: Stephen-manual

- [ ] Step 1: Stephen uses throwaway Reddit account to trigger scenarios B/C/D/E
- [ ] Step 2: Cmd-Shift-4 capture each → save to docs/screenshots/scenario-{b,c,d,e}-*.png

### Task S13.2: Crop to 1200x800 + add to Devpost gallery rotation

(Same sips pipeline as Wave H11)

---

## Phase S14 — Operator quickstart blog post (Day 7, 2 hr, ⭐⭐⭐⭐)

### Task S14.1: Draft on dev.to / hashnode

**Files:** Create `docs/submission/blog-post-draft.md`

- [ ] Step 1: Outline: hook (mods drowning in spam), problem (ContextMod stuck on PRAW), solution (Devvit port), 3 install steps, demo dashboard screenshot, 15+ operator pool callout
- [ ] Step 2: Stephen pastes into dev.to + publishes
- [ ] Step 3: URL added to Devpost form Tool Overview section

---

## Phase S15 — Migration guide (Day 7, 2 hr, ⭐⭐⭐⭐)

### Task S15.1: 5-step doc

**Files:** Create `docs/migration-from-upstream-cm.md`

- [ ] Step 1: Step-by-step for the 15+ FoxxMD operators:
  1. Install cm-devvit from App Directory
  2. Copy wiki config to `r/<sub>/wiki/botconfig/contextmod`
  3. Apply schema renames (combinator/filter/target/pattern/template)
  4. Delete cut rules (mhs/dispatch/message/etc per migration-compatibility.md)
  5. Click Reload config, verify dashboard shows N rules at rev 1
- [ ] Step 2: Cross-link from README + Devpost writeup

---

## Phase S16 — Vinh Phase 4 (Days 2-9, parallel, 8-12 hr, ⭐⭐⭐⭐⭐)

### Task S16.1: PLAN.md update (Stephen pings Vinh after)

- [ ] Step 1: Add Phase 4 rows w/ ⬜ status:
  - 4.1 author-cache substrate (`cm:author:{name}` hash, 1h TTL)
  - 4.2 `history` rule (submissionCount + commentCount + linkKarma + commentKarma + accountAge thresholds)
  - 4.3 `attribution` rule (domain frequency analysis)
  - 4.4 `recentActivity` rule (per-sub thresholds + sliding window)
- [ ] Step 2: Tests target: 280+ at completion
- [ ] Step 3: Schema additions in `src/schema/app.schema.json`

---

## Phase S17 — Devpost writeup voice rewrite (Day 9, 2 hr, Stephen-manual)

- [ ] Step 1: Stephen rewrites Tool Overview + Project Impact + Port Completion sections in own voice per D10 (no AI-tone words)
- [ ] Step 2: Re-paste into Devpost form (already saved as draft)

---

## Phase S18 — Demo video record (Day 10, 60-90 min, Stephen-manual)

- [ ] Step 1: OBS + Audacity per existing demo-video-runbook.md
- [ ] Step 2: 60-second cut showing: install → wiki config → reload → trigger → dashboard → dry-run → rule simulation (S1 demo gold)
- [ ] Step 3: Upload YouTube unlisted, URL into Devpost form

---

## Phase S19 — Final Devpost submit (Day 10, 5 min, Stephen-manual)

- [ ] Step 1: Verify all form fields populated (cheat sheet)
- [ ] Step 2: Click Submit on Devpost
- [ ] Step 3: Tweet/post launch announcement per outreach-drafts §5

---

## Self-Review

**Spec coverage:** All 19 Wave S items mapped 1:1 to phases. Vinh's lane scoped via S16. Stephen-manual items isolated (S13/S17/S18/S19).

**Placeholder scan:** No TBDs. Each phase has exact file paths + step list.

**Type consistency:** EventRecord shape extensions in S2 (`matchedRule`, `runPath`) + S3 (`actor`) consistent with existing definition. SimulationResult in S1 is new + scoped to that phase.

**Sequencing:** Quick wins Day 1 (S6+S7+S8) build momentum. WOW features Day 3 (S1+S5) when momentum is high. Schema-impacting features (S10+S11) mid-wave when foundation tests are solid. Documentation + outreach Day 7. Stephen-manual + submit terminal on Day 10.

**Risk:** S1 + S5 + S10 are highest-risk for hidden bugs. Each gets a codex:codex-rescue dispatch per three-brain rule.

**External surface verify:** Playwright after every UI-touching phase. curl verify after every README/policies/external-doc commit.

---

_Plan saved 2026-05-17 by Stephen via Claude Code, Wave S full WOW push for May 27 submission._
