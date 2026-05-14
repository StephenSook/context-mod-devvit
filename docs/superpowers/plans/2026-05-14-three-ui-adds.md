# Three UI Adds Plan — 2026-05-14

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Ship 3 client-only UI adds that survive without Vinh's backend: empty-state with starter-config snippet + clipboard, CSV export, rule hit-count summary chips. All ~70 min total, 3 atomic commits, no existing-feature break, no Vinh-lane interference.

**Architecture:**
- All 3 additions live in `src/client/` (Stephen's lane).
- Empty-state lives in `App.tsx` zero-state branch (lines ~125-140).
- CSV export lives in `ActionBar.tsx` as a 4th button.
- Rule hit-count chips render in the event-stream header above the row list.
- Demo data (`?demo=1`) exercises all 3 surfaces; live-data path uses identical code.

**Tech stack:** React 18 / TypeScript / Tailwind / `navigator.clipboard` / `URL.createObjectURL` / `Blob`. No new deps.

---

## Tool inventory audit (per `memory/tool-inventory-audit-per-task.md`)

| Tool | Used? | Why |
|------|-------|-----|
| writing-plans skill | ✅ | This plan |
| green-dot atomic policy | ✅ | 3 commits, one per add |
| check-ai-tone.sh --strict | ✅ | Gate per commit |
| npm gates (type-check + lint + test + build) | ✅ | Gate per commit |
| Playwright re-verify post-ship | ✅ | Final sanity-check on `?demo=1` render |
| codex:codex-rescue | ⛔ | 3 small additive changes; no review needed beyond gates + Playwright |
| Banana | ⛔ | No new images |
| 21st.dev magic_component_builder | ⛔ | Components are too repo-specific (Geist/ink/bone tokens) — off-the-shelf would need heavy adaptation |
| Firecrawl / context7 | ⛔ | No external research |
| feature-dev:code-reviewer | ⛔ | Audit fatigue; 3 small client-only changes |

---

## Phase A — Rule hit-count summary chips (25 min)

**Why first:** smallest visual change; least intrusive; pure derivation from existing data.

**Files:**
- Modify: `src/client/App.tsx` — pass derived counts into event-stream header
- (Optional) Modify: `src/client/components/EventRow.tsx` — no, this lives at App.tsx level
- (Optional new) `src/client/components/RuleCountChips.tsx` — small presentational component

**Steps:**

- [ ] **A.1** Create `src/client/components/RuleCountChips.tsx`. Props: `{ events: EventRecord[] }`. useMemo to reduce events by `checkName` → `Record<string, number>`. Sort desc by count. Render top 5 chips + "+N more" if >5. Each chip styled per `tailwind.config.ts` tokens (ink.800 background, bone.200 text, telemetry font, rounded-sm).

- [ ] **A.2** Import + render in `App.tsx` event-stream header (line ~117-122 area, where "recent actions · N events" lives). Position: below header row, above event list. Hide entirely when `events.length === 0`.

- [ ] **A.3** `npm run type-check && npm run lint && npm test && npm run build` — all 4 pass.

- [ ] **A.4** Strict AI-tone scan — 0 hits across 11 files.

- [ ] **A.5** Atomic commit.

---

## Phase B — CSV export button (15 min)

**Why second:** additive to ActionBar, doesn't touch other components.

**Files:**
- Modify: `src/client/components/ActionBar.tsx` — add 4th button "Export CSV"

**Steps:**

- [ ] **B.1** Add export handler:
  ```typescript
  function exportCsv(events: EventRecord[], subreddit: string) {
    const header = ['ts', 'activityId', 'runName', 'checkName', 'actions', 'allOk'];
    const rows = events.map(e => [
      new Date(e.ts).toISOString(),
      e.activityId,
      e.runName,
      e.checkName,
      e.actions.map(a => `${a.kind}${a.ok ? '' : '✗'}`).join(';'),
      e.actions.every(a => a.ok) ? 'true' : 'false',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    a.download = `contextmod-events-${subreddit}-${ts}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  ```

- [ ] **B.2** Render 4th button in ActionBar between "Reload config" and the Wiki/Docs link group. Disabled state when `events.length === 0`.

- [ ] **B.3** ActionBar accepts new prop `events: EventRecord[]` + `subreddit: string` — App.tsx already has both in scope.

- [ ] **B.4** `npm` gates + AI-tone scan.

- [ ] **B.5** Atomic commit.

---

## Phase C — Empty-state with starter-config snippet (30 min)

**Why third:** biggest visual change; only renders in zero-state path; non-disruptive to existing populated-state flow.

**Files:**
- Modify: `src/client/App.tsx` — expand empty-state block (current lines ~125-140)
- New: `src/client/lib/starter-snippet.ts` — inline JS template literal of trimmed starter-config

**Steps:**

- [ ] **C.1** Write `src/client/lib/starter-snippet.ts`:
  ```typescript
  // Trimmed version of examples/starter-config.json5 — kept inline for zero-fetch
  // empty-state display. Full schema lives in examples/ + README "Config schema".
  export const STARTER_CONFIG_SNIPPET = `{
    schema_version: 1,
    runs: [{
      name: 'safety',
      checks: [{
        name: 'block-spam',
        condition: 'AND',
        rules: [{
          kind: 'regex',
          testOn: ['title', 'body'],
          patterns: ['(?i)\\\\bfree\\\\s+crypto\\\\b'],
          threshold: 1,
        }],
        actions: [
          { kind: 'remove', reason: 'spam pattern' },
          { kind: 'comment', body: 'Hi {{author}}, removed for spam.' },
        ],
      }],
    }],
  }`;
  ```

- [ ] **C.2** Expand `App.tsx` empty-state. Current zero-state shows "Nothing has fired yet. Define rules in r/<sub>/wiki/contextmod to start moderating." Expand to:
  - Same header copy
  - Code block w/ STARTER_CONFIG_SNIPPET (Geist Mono, ink.800 background, syntax-color via inline css — keep it simple)
  - "Copy" button → `navigator.clipboard.writeText(STARTER_CONFIG_SNIPPET)` + ephemeral "Copied!" toast (state-based)
  - Link out: "Full examples + schema at [examples/](github URL) / README Config schema"

- [ ] **C.3** Toast handling: `const [copied, setCopied] = useState(false)`. On click → write + setCopied(true) + setTimeout(() => setCopied(false), 2000). Button text swaps to "Copied!" during the 2s window.

- [ ] **C.4** `npm` gates + AI-tone scan.

- [ ] **C.5** Atomic commit.

---

## Phase D — Verification + push

- [ ] **D.1** Final strict AI-tone scan across all 11 files.
- [ ] **D.2** Final `npm run type-check && npm run lint && npm test && npm run build`.
- [ ] **D.3** Playwright re-verify against `?demo=1` (live data path renders rule chips + ActionBar shows Export CSV button; click button verifies CSV download triggers).
- [ ] **D.4** Playwright re-verify against `?demo=` (no demo flag) — confirm empty-state shows new starter-config snippet + copy button.
- [ ] **D.5** Push 3 commits + summary.

---

## Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `navigator.clipboard` unavailable in Devvit iframe | Low | Devvit webview = Chromium, modern API available; silent fallback (no toast) acceptable |
| CSV escaping wrong for action descriptions w/ commas | Low | Quote every field + escape inner quotes |
| Rule chip "+N more" UX clutter at small viewports | Low | Mobile dashboard width 375px; cap chips to 5 → likely fits |
| Empty-state snippet feels marketing-y | Med | Keep copy minimal: "Get started — copy this config to r/<sub>/wiki/contextmod" |
| Date format in CSV filename non-portable | Low | ISO date + colon-strip (Windows-safe filename) |
| Playwright mock-server doesn't trigger empty-state demo flow | Low | Test by removing ?demo=1; mock returns empty + zero-state renders new snippet |

---

## Verification gates

- After Phase A: rule chips render on `?demo=1` w/ 5 events → 4 unique rules visible
- After Phase B: ActionBar shows Export button; click triggers download w/ correct filename
- After Phase C: zero-state shows snippet + copy button; click writes to clipboard
- After Phase D: all 4 npm gates green; strict AI-tone clean; Playwright snapshots show expected new elements

---

## Execution order

A.1 → A.2 → A.3 → A.4 → A.5 (commit) → B.1 → B.2 → B.3 → B.4 → B.5 (commit) → C.1 → C.2 → C.3 → C.4 → C.5 (commit) → D.1 → D.2 → D.3 → D.4 → D.5 (push + summary)

3 atomic commits + 1 final verification round.
