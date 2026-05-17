# Wave T — Wave S remaining (S1 + S3 + S5 + S9 + S10 + S11 + S12)

> Continuation of Wave S. References the parent plan `docs/superpowers/plans/2026-05-17-wave-s-best-project-push-10-day.md`. Tighter implementation detail per phase.

**Goal:** Execute the 7 remaining Wave S code phases in priority order. Stephen authorized full push.

**Order (by ROI × risk):**
1. **S1 Rule simulation** — biggest WOW, demo-video gold
2. **S5 AI rule explainer** — high WOW per hour, 2 hr
3. **S11 Per-rule statistics** — practical mod metric, frontend-heavy
4. **S9 Config rev diff viewer** — operator-trust, reads existing keys
5. **S3 Mod activity attribution** — provenance, backend wiring
6. **S10 Mute/unmute rule** — workflow-changing, schema-impacting (highest risk)
7. **S12 E2E Playwright in CI** — enterprise signal, infra

S13 deferred to Stephen-manual (verified no tool/agent substitute).

---

## Phase S1 — Rule simulation against last 50 events (~4 hr)

**Why this matters:** mod writes a new rule, clicks "Simulate against history," sees which past events it would have fired on. Killer mod-confidence feature. Demo-video gold.

### Task S1.1: Pure simulation core

**Files:** Create `src/core/simulateRule.ts`

- [ ] Step 1: Export `simulateRule(ruleJson5: string, snapshot: ConfigSnapshot, recentEvents: EventRecord[]): SimulationResult`
- [ ] Step 2: Parse JSON5 → AJV-validate against rule schema fragment
- [ ] Step 3: Reconstruct Item + Author from each event (needs activityId → fetch via reddit API OR use cached event-row data)
- [ ] Step 4: Run rule + filter eval against each historical item; collect would-fired/would-not list

Result type:
```ts
type SimulationResult = {
  totalEvents: number;
  wouldHaveFired: number;
  parseError?: string;
  breakdown: { activityId: string; ts: number; wouldFire: boolean }[];
};
```

### Task S1.2: Form + menu wiring

- [ ] Step 1: `devvit.json` add menu entry `ContextMod: Simulate rule against history`
- [ ] Step 2: `src/routes/menu.ts` form: large JSON5 textarea labeled "Paste rule JSON5"
- [ ] Step 3: `src/routes/forms.ts` `/simulate-rule-submit` — calls simulateRule, returns toast w/ breakdown

### Task S1.3: Tests + commit

- [ ] Vitest tests w/ fixture rule + fixture events
- [ ] Form/menu route tests
- [ ] Codex review post-commit

---

## Phase S5 — AI rule explainer (~2 hr)

### Task S5.1: Verify OpenAI HTTP allowlist

**Files:** read-only `devvit.json` http section

- [ ] Step 1: Confirm `api.openai.com` is allowlisted per PR #96
- [ ] Step 2: If missing, ADD via `http` block

### Task S5.2: Settings schema + key

**Files:** Modify `devvit.json` settings

- [ ] Step 1: Add `openai_api_key` (encrypted: true) field
- [ ] Step 2: README install note: "set OPENAI_API_KEY in app settings before using explain feature"

### Task S5.3: Core explainer

**Files:** Create `src/core/explainRule.ts`

- [ ] Step 1: Export `explainRule(rule: string, apiKey: string): Promise<string>` — POST chat.completions w/ system: "Explain this ContextMod JSON5 rule in 2-3 sentences as if to a non-technical moderator."
- [ ] Step 2: Error handling: missing key, rate limit, network failure

### Task S5.4: Menu + form + toast

- [ ] Step 1: `devvit.json` menu entry `ContextMod: Explain a rule with AI`
- [ ] Step 2: Form: textarea for rule JSON5
- [ ] Step 3: Form-submit returns toast w/ AI explanation

### Task S5.5: Mock-fetch tests + commit

---

## Phase S11 — Per-rule statistics (~3 hr)

### Task S11.1: Counter store

**Files:** Modify `src/state/keys.ts` + `src/core/runRule.ts` (lightly — needs check on whether Vinh's lane)

Actually — to avoid Vinh-lane collision, hook into handleActivity AFTER the rule eval completes. Increment per fired rule.

- [ ] Step 1: New Redis key shape `cm:rule-stats:{sub}` hash w/ field `{runName}|{checkName}|{ruleName}` → count
- [ ] Step 2: `incrementRuleStat(runName, checkName, ruleName?)` helper

### Task S11.2: GET endpoint

**Files:** Modify `src/routes/api.ts`

- [ ] Step 1: GET `/api/rule-stats` → returns sorted `{ rule: string, count: number }[]`
- [ ] Step 2: ?demo=1 returns synthetic fixture

### Task S11.3: Dashboard component

**Files:** Create `src/client/components/RuleStatsTable.tsx`

- [ ] Step 1: Sortable table below event stream
- [ ] Step 2: Click rule name → set filter to that rule's events
- [ ] Step 3: Empty state if no stats yet

### Task S11.4: Tests + commit

---

## Phase S9 — Config rev diff viewer (~3 hr)

### Task S9.1: GET endpoint

**Files:** Modify `src/routes/api.ts` + `src/state/configStore.ts`

- [ ] Step 1: GET `/api/config-history?limit=10` returns last N revs `{ rev, ts, json }`
- [ ] Step 2: Reads `cfg:rev:*` keys + sorts by rev number desc

### Task S9.2: Diff UI

**Files:** Create `src/client/components/ConfigDiffViewer.tsx`

- [ ] Step 1: List view: 10 most recent revs w/ timestamp + rule count
- [ ] Step 2: Click rev → side-by-side diff against next-older rev (use `diff` library or simple line-by-line color)

### Task S9.3: Menu entry + tests + commit

---

## Phase S3 — Mod activity attribution (~3 hr)

### Task S3.1: Capture mod identity

**Files:** Modify `src/routes/menu.ts` + `src/routes/forms.ts`

- [ ] Step 1: Each mod-action route extracts `context.userId` + `context.username`
- [ ] Step 2: Pass through to recentEvents write w/ new `actor?: string` field on EventRecord

### Task S3.2: Dashboard render

**Files:** Modify `src/client/components/EventRow.tsx`

- [ ] Step 1: If `actor` present, show "by u/X" badge near timestamp

### Task S3.3: Tests + commit

---

## Phase S10 — Mute/unmute rule from dashboard (~4 hr, HIGHEST RISK)

### Task S10.1: Mute storage

**Files:** Create `src/state/muteSet.ts` + modify `src/core/runCheck.ts`

- [ ] Step 1: Redis SET `cm:muted-rules:{sub}` containing `{runName}/{checkName}` keys
- [ ] Step 2: runCheck checks mute set BEFORE rule eval; skip if muted

### Task S10.2: Mute/unmute endpoints

**Files:** Modify `src/routes/api.ts` or `src/routes/menu.ts`

- [ ] Step 1: POST `/api/mute-rule` body `{ runName, checkName }` → adds to set
- [ ] Step 2: POST `/api/unmute-rule` → removes
- [ ] Step 3: GET `/api/muted-rules` → returns current list

### Task S10.3: Dashboard UI

**Files:** Modify `src/client/components/EventRow.tsx` + create `src/client/components/MuteButton.tsx`

- [ ] Step 1: Per-event "mute this rule" icon button
- [ ] Step 2: Confirm dialog (muting affects future events sub-wide)
- [ ] Step 3: Visual indicator on muted rules (struck-through chip)

### Task S10.4: Codex review + tests + commit

---

## Phase S12 — E2E Playwright tests in CI (~4 hr)

### Task S12.1: Install + config

**Files:** Modify `package.json` + create `playwright.config.ts`

- [ ] Step 1: `npm install --save-dev @playwright/test`
- [ ] Step 2: `playwright.config.ts` w/ baseURL http://127.0.0.1:5173/?demo=1

### Task S12.2: First E2E spec

**Files:** Create `tests/e2e/dashboard.spec.ts`

- [ ] Step 1: Page loads + title check
- [ ] Step 2: Stat cards visible
- [ ] Step 3: Event rows count >= 5 (demo data)
- [ ] Step 4: Filter chips work
- [ ] Step 5: ? opens overlay
- [ ] Step 6: Expand row shows details

### Task S12.3: CI workflow

**Files:** Modify `.github/workflows/ci.yml`

- [ ] Step 1: New job that runs `npm ci`, spins dev:web in background, runs playwright test
- [ ] Step 2: Upload trace + screenshots on failure

### Task S12.4: Commit + verify CI green

---

## Stephen-manual (deferred — verified no tool substitute)

- S13 E2E B/C/D/E captures (throwaway Reddit account + Devvit playtest + Cmd-Shift-4 per CAPTURE-CHECKLIST.md)
- S17 Devpost writeup voice rewrite per D10
- S18 Demo video record (~60-90 min OBS+Audacity+ffmpeg)
- S19 Final Devpost submit

---

## Self-Review

**Spec coverage:** All 7 code phases mapped 1:1 to Wave S remaining items.

**Sequencing:** WOW-first (S1 + S5) → frontend-heavy (S11 + S9) → backend (S3) → risky (S10) → infra (S12).

**Risk controls:** Codex review dispatched post-S1 + post-S5 + post-S10. plan-gap-scanner pre-execute. silent-failure-hunter on S5+S10 error paths.

**External surface verify:** Playwright after every UI-touching commit. curl for any external doc.

---

_Plan saved 2026-05-17 by Stephen via Claude Code, Wave T execution of Wave S remaining._
