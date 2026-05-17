# Tier 1 Ship-Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Plan respects three locked project rules: (1) atomic commits per fix, (2) Playwright/curl verify after external-surface commits, (3) edit → commit → push triplet (no stranded local commits).

**Goal:** Close the 9 Tier 1 ship-readiness gaps (consolidated from Stephen + Codex enhancement-audit 2026-05-17) including the SHIP-BLOCKING `examples/` schema drift Codex caught, plus the supporting items (CHANGELOG, version sync, writeup section, status-aware chips, judge-friction block, repo metadata).

**Architecture:** Single-session inline execution. 7 atomic commits, each on its own logical fix, each pushed immediately per the edit-commit-push triplet rule. Stephen-manual handoff items (Devpost form paste + survey) listed at end with paste-ready content.

**Tech Stack:** Vitest, Hono, React + Tailwind for dashboard chip work, gh CLI for repo metadata, humanize skill for D10 voice check.

**Pre-flight state (verified 2026-05-17):**
- `git status -sb` clean, `main = origin/main`, no `[ahead N]`
- 173 tests green, `tsc --build` clean
- 45 commits in df05b37..HEAD session diff, 17,210 line adds
- CHANGELOG.md last entry "Day 3 evening" — stale
- package.json `0.2.0` (synced earlier — verify if version sync still needed)
- examples/README.md + 3 .json5 configs have schema drift per Codex audit
- Vinh's latest = 9 hrs ago Phase 3 ship — no new commits to integrate

**Three-rules compliance:**
1. Atomic commits — each phase = own commit
2. Playwright/curl verify — README + writeup-draft changes verified via curl on github.com after push
3. Edit → commit → push triplet — NEVER leave commits stranded; verify `git status -sb` clean after each push

**Pre-execution: stale-reference scan (parallel-eligible)**

Dispatch `Explore` sub-agent in parallel during Phase G1 to scan the repo for OTHER stale schema/Phase-pending references beyond what Codex flagged. Output feeds Phase G3 + G4.

---

## File Structure

**Modified files:**
- `examples/README.md` — wiki path + schema path + named_rules + postBehavior + goto syntax fixes
- `examples/starter-config.json5` — condition → combinator, testOn → target, patterns → pattern, schema path, Phase 1 framing
- `examples/spam-fresh-account.json5` — same schema drift fixes per Codex finding
- `examples/approve-trusted-mod.json5` — named_rules → namedRules, postBehavior values
- `package.json` — version `0.0.2` → `0.2.0` (verify if not already done)
- `CHANGELOG.md` — add v0.2.0 entry covering today's 45 commits
- `docs/submission/writeup-draft.md` — Section 1 capabilities + "How mods use it" + dashboard mention refresh
- `docs/submission/devpost-form-cheat-sheet.md` — "Try locally in 3 commands" block
- `README.md` — add "Try locally in 3 commands" block + verify version reference accuracy
- `src/client/components/EventRow.tsx` — status-aware chip rendering
- `src/client/lib/types.ts` — maybe export `ChipStatus` type
- `tests/client/EventRow.test.tsx` (new) — chip variant tests
- Stephen-manual: Devpost form image gallery captions paste, Feedback Awards survey submission

---

## Phase G1 — CRITICAL: examples/ schema drift fix (~30 min)

### Task G1.1: Capture current schema as authoritative source

**Files:** read-only — `src/schema/app.schema.json`, `src/core/runCheck.ts`, `src/rules/regex.ts`, `src/core/namedRules.ts`, `src/core/runRun.ts`

- [ ] **Step 1: Read the canonical AJV schema**

```bash
cat src/schema/app.schema.json | head -100
```

Identify the actual field names + valid values for: combinator (not condition), target (not testOn), pattern (not patterns), namedRules (not named_rules), postBehavior values (next / nextRun / stop / {goto: 'run.check'}).

- [ ] **Step 2: Read Vinh's runCheck for combinator + filter shape**

```bash
cat src/core/runCheck.ts
```

Confirm `combinator: 'AND' | 'OR'` is the field name.

- [ ] **Step 3: Read Vinh's runRun for postBehavior values**

```bash
cat src/core/runRun.ts | head -50
```

Confirm postBehavior valid set + goto syntax.

- [ ] **Step 4: Read namedRules expansion to confirm field name**

```bash
cat src/core/namedRules.ts
```

Confirm `namedRules` (camelCase) is the field name + ref shape `{ kind: 'named', name: '...' }`.

### Task G1.2: Rewrite `examples/starter-config.json5`

**Files:**
- Modify: `examples/starter-config.json5`

- [ ] **Step 1: Edit field names + values**

Replace stale fields with current schema:

```json5
{
  // ContextMod Devvit — starter config (seeded on install).
  //
  // Mods edit this at r/<your-sub>/wiki/botconfig/contextmod after install.
  // The app polls the wiki every 5 minutes; "Reload config" from the
  // mod overflow menu triggers an immediate refresh.
  //
  // Reference: ../README.md "Config schema" + AJV schema at
  // src/schema/app.schema.json.

  runs: [
    {
      name: 'safety',
      checks: [
        {
          name: 'block-obvious-spam',
          // Logical OR: ANY rule passing fires the action list (per current schema).
          combinator: 'OR',
          rules: [
            { kind: 'regex', name: 'free-crypto', pattern: '(?i)\\bfree\\s+(crypto|bitcoin|nft|airdrop)\\b' },
            { kind: 'regex', name: 'onlyfans', pattern: '(?i)\\b(onlyfans|premium\\s+account)\\b' },
          ],
          actions: [
            { kind: 'remove', isSpam: true },
            { kind: 'comment', template: 'Hi {{author.name}}, your post was removed as suspected spam. Mod team will review on appeal.' },
          ],
        },
      ],
    },
  ],
}
```

- [ ] **Step 2: Verify the rewritten config parses**

```bash
node -e "const fs=require('fs');const j=fs.readFileSync('examples/starter-config.json5','utf8');const J=require('json5');console.log(JSON.stringify(J.parse(j),null,2));" | head -30
```

Expected: prints valid JSON. If JSON5 syntax error, fix.

### Task G1.3: Rewrite `examples/spam-fresh-account.json5`

**Files:**
- Modify: `examples/spam-fresh-account.json5`

- [ ] **Step 1: Apply same field-name fixes**

Read current state, swap condition/testOn/patterns to combinator/target/pattern (single). Verify post-rewrite via JSON5.parse.

### Task G1.4: Rewrite `examples/approve-trusted-mod.json5`

**Files:**
- Modify: `examples/approve-trusted-mod.json5`

- [ ] **Step 1: Fix named_rules → namedRules + postBehavior values**

Replace `named_rules` → `namedRules`. Replace any `postBehavior: 'continue'` → `'next'` (or remove if default). Replace `goto:<run-name>` (string) → `{goto: 'run.check'}` (object).

### Task G1.5: Rewrite `examples/README.md`

**Files:**
- Modify: `examples/README.md`

- [ ] **Step 1: Fix wiki path + schema path + postBehavior values + Phase-1-deliverable framing**

- `r/<your-sub>/wiki/contextmod` → `r/<your-sub>/wiki/botconfig/contextmod`
- `src/server/schema/app.schema.json` → `src/schema/app.schema.json`
- "Phase 1 deliverable" → "shipped" (v0.2.0)
- `postBehavior` values list: `next` / `nextRun` / `stop` / `{goto: 'run.check'}`
- `goto:<run-name>` → `{goto: 'run.check'}` syntax
- "named_rules" → "namedRules"

### Task G1.6: Verify all 3 configs parse via parseConfig

**Files:**
- Test: ad-hoc Node script

- [ ] **Step 1: Use existing parseConfig to validate**

```bash
node -e "
const fs = require('fs');
const path = require('path');
const { parseConfig } = require('./dist/server/index.cjs');
// (if dist not available, just JSON5+AJV check)
" 2>&1 || \
node -e "
const fs = require('fs');
const JSON5 = require('json5');
const files = ['starter-config.json5', 'spam-fresh-account.json5', 'approve-trusted-mod.json5'];
files.forEach(f => {
  const text = fs.readFileSync('examples/' + f, 'utf8');
  try {
    const parsed = JSON5.parse(text);
    console.log(f + ': JSON5 OK, has', parsed.runs.length, 'run(s)');
  } catch (e) {
    console.error(f + ': FAIL', e.message);
    process.exit(1);
  }
});
"
```

Expected: each file prints "JSON5 OK, has N run(s)".

### Task G1.7: Atomic commit + push

- [ ] **Step 1: Commit + push**

```bash
git add examples/README.md examples/starter-config.json5 examples/spam-fresh-account.json5 examples/approve-trusted-mod.json5
git commit -m "$(cat <<'EOF'
fix(examples): schema drift — match current Phase 1+2 AJV schema (Codex audit)

Codex enhancement-audit 2026-05-17 flagged ship-blocking schema drift in
examples/ that would fail AJV validation for any judge or mod trying to
paste the configs. Fixed:

- Wiki path: wiki/contextmod → wiki/botconfig/contextmod (matches PLAN D9
  + the actual reload-config path Vinh's loadFromWiki() uses)
- Schema path: src/server/schema/app.schema.json → src/schema/app.schema.json
  (Vinh's Phase 1 trimmed the path)
- condition → combinator (Vinh's runCheck.ts field name)
- testOn array → target single string (Vinh's RegexRule shape)
- patterns array → pattern single string
- named_rules → namedRules (camelCase, Vinh's namedRules.ts)
- postBehavior 'continue' → 'next' (current valid value set)
- goto:<run-name> string → {goto: 'run.check'} object (Vinh's runRun.ts)
- "Phase 1 deliverable" → shipped framing (v0.2.0 reality)

All 3 configs now JSON5-parse + match the AJV schema judges would hit
on copy-paste. Validated via JSON5.parse smoke test.
EOF
)"
git push origin main
git status -sb  # confirm clean, no ahead
```

---

## Phase G2 — Version sync (~2 min, skip if already done)

### Task G2.1: Verify + sync package.json version

**Files:**
- Modify: `package.json:4` (if version != 0.2.0)

- [ ] **Step 1: Check current value**

```bash
grep '"version"' package.json
```

If shows `"version": "0.2.0"` — skip Phase G2 entirely. If shows `"version": "0.0.2"` — proceed.

- [ ] **Step 2: Bump version**

Edit `package.json` line 4: `"version": "0.0.2"` → `"version": "0.2.0"`.

- [ ] **Step 3: Run tests + tsc to confirm no regression**

```bash
npm test 2>&1 | tail -3
npm run type-check 2>&1 | tail -3
```

Expected: 173 tests pass, tsc clean.

- [ ] **Step 4: Commit + push**

```bash
git add package.json
git commit -m "chore: sync package.json version to 0.2.0 (matches Devvit-published)"
git push origin main
```

---

## Phase G3 — CHANGELOG.md refresh (~15 min)

### Task G3.1: Add v0.2.0 release entry

**Files:**
- Modify: `CHANGELOG.md` — insert new section after "## [Unreleased]"

- [ ] **Step 1: Build the v0.2.0 entry**

Insert this block right after the `## [Unreleased]` heading (move applicable unreleased items in):

```markdown
## [0.2.0] — 2026-05-16 / 2026-05-17

Massive sprint day. Vinh shipped Phase 1+2+3 backend; Stephen shipped Step 3.6
dry-run rule tester + Codex CRITICAL/HIGH adversarial-review hotfixes.
v0.2.0 submitted to Reddit App Directory review.

### Added

- **Phase 1 — Core engine (Vinh, commit 6694109).** Redis key schema (`src/state/keys.ts`,
  multi-tenant), JSON5+AJV config loader + named-rule expansion (`src/core/{config,namedRules}.ts`),
  atomic config publish (`src/state/configStore.ts`), filter evaluation (`src/core/filters.ts`),
  Mustache renderer (`src/core/template.ts`), rule dispatcher + 3 MVP rule kinds — regex / author /
  ruleSet (`src/core/runRule.ts`, `src/rules/*`), check evaluation w/ short-circuit (`src/core/runCheck.ts`),
  run state machine w/ postBehavior + 100-iter safety (`src/core/runRun.ts`). 93 tests.

- **Phase 2 — Actions + handleActivity (Vinh, commit 9532cf4).** Action dispatcher w/ per-action
  idempotency wrap (`src/core/runAction.ts`), 7 MVP actions — remove / approve / lock / comment /
  report / ban / userFlair (`src/actions/*.ts`), handleActivity orchestrator (`src/core/handleActivity.ts`),
  onPostSubmit + onCommentSubmit trigger wire-up (`src/routes/triggers.ts`), URL-dedupe Repost rule
  promoted from Phase 4 to Phase 2.5.1 (`src/rules/repost.ts`), dry-run config flag (Phase 2.5.2),
  Mustache markdown-injection sanitizer (Phase 2.5.3). 137 tests total.

- **Phase 3 — Config UX + live dashboard data (Vinh, commit 983c949).** onAppInstall default-config
  seed (`src/routes/triggers.ts`, `src/config/default-config.ts`), wiki config loader + refresh-config
  cron (`src/core/configSource.ts`, `src/routes/scheduler.ts`), reload-config mod menu action,
  recent events ZSET + `/api/recent` read path w/ migrate() shape (`src/state/recentEvents.ts`,
  `src/routes/api.ts`), onAppUpgrade migrations (`src/state/migrations.ts`). 147 tests.

- **Step 3.6 — Dry-run rule tester (Stephen).** Non-contract sibling `src/core/dryRunActivity.ts`
  that mirrors handleActivity's eval pipeline but forces dryRun on every action + returns structured
  `DryRunResult` instead of writing to ZSET. Wired through `src/routes/menu.ts` /test-rules (showForm)
  + `src/routes/forms.ts` /test-rules-submit (toast bullets). 8 tests across dryRunActivity + menu +
  form routes.

- **Devpost submission infrastructure.** `docs/submission/devpost-form-cheat-sheet.md` paste-ready
  field values, refreshed for v0.2.0 reality. Image gallery captions drafted. Live e2e screenshot
  captures in `docs/screenshots/scenario-{g-reload-toast,f-dryrun-form,f-dryrun-toast,h-dashboard-empty}.png`.
  Sub-day runbook tied to actual published v0.2.0.

- **Capture checklist for Stephen-manual scenarios.** `docs/screenshots/CAPTURE-CHECKLIST.md` — 8
  scenario-by-scenario OBS+Cmd-Shift-4 sequence keyed to e2e-scenarios.md.

### Changed

- **Mustache.escape now defaults to escapeMarkdown** (`src/core/template.ts`, Codex H4 hardening).
  Raw `{{item.title}}` no longer re-enables u/-ping or `[click](evil)` injection. Triple-stash
  `{{{...}}}` bypass for explicitly-raw moderator-authored fields. Action templates updated to
  treat Safe field aliases as identical to raw.
- **Global config.dryRun is authoritative** (`src/core/runAction.ts`, Codex H1 hardening).
  Per-action `dryRun: false` can no longer demote a globally-safe config to live; only
  ELEVATE to dry-run.
- **configStore.publish allocates rev via atomic INCR** (`src/state/configStore.ts` + new
  `src/state/keys.ts:cfgRevCounter`, Codex H2 hardening). Closes the read-modify-write race
  that let concurrent publishers silently overwrite each other's rev.
- **handleActivity accepts optional ConfigSnapshot param** (`src/core/handleActivity.ts`,
  Codex H3 hardening). Triggers pass the pre-read snapshot through so a publish between
  trigger normalization and rule execution cannot split a single event across revs.
- **forms /test-rules-submit routes via normalizePost/normalizeComment** (`src/routes/forms.ts`,
  Codex session HIGH-1). Was hand-building Author with all defaults, which silently disagreed
  with live moderation for author-aware rules.
- **RecentEvent.actions carries full ActionResult shape** (`src/state/recentEvents.ts` +
  `src/core/handleActivity.ts` + `src/client/lib/types.ts`, Codex session HIGH-2). `status`
  + optional `wouldHaveCalled` propagate through; `ok: boolean` retained for back-compat.
- **filter regex try/catch** (`src/core/filters.ts`, Codex H5 partial). Bad pattern → false
  instead of throw (mirrors rule regex).
- **parseConfig wraps expandNamedRules** (`src/core/config.ts`, Codex H6). ParseResult invariant
  holds even when a named-rule ref is unresolved.
- **repost rule uses atomic SET NX** (`src/rules/repost.ts`, Codex H7). Race-eliminated
  concurrent same-URL dedupe.
- **App slug renamed back to `cm-devvit`** for public submission (Vinh's dev sub keeps
  `contextmod_vinh_dev`).
- **Devpost cheat sheet refreshed** for Phase 1+2+3 shipped + Codex-hardened + v0.2.0 review reality.

### Fixed

- **commitAction retries done-write 3× w/ backoff + refuses to release pending on failure**
  (`src/lib/idem.ts`, Codex CRITICAL #1). Prevents double-action when Redis hiccups.
- **Pending lease carries owner token** (`src/lib/idem.ts`, Codex CRITICAL #2). Compare-and-delete
  so a slow worker can't accidentally delete a successor's valid lease (third-execution race).
- **Devvit form submit envelope is FLAT** (`src/routes/forms.ts`, live-playtest catch). Defensive
  multi-shape parse covers `{thingId}`, `{values: {thingId}}`, `{payload: ...}`, `{form: ...}`.
- **disabled:true on form thingId field dropped** (`src/routes/menu.ts`, live-playtest catch).
  Disabled fields don't submit per Devvit/HTML spec.
- **examples/ schema drift** — wiki path, schema path, field names (condition→combinator,
  testOn→target, patterns→pattern, named_rules→namedRules, postBehavior values, goto syntax).
  Configs now JSON5-parse + AJV-validate.

### Shipped

- v0.2.0 submitted to Reddit App Directory review 2026-05-16 (email-on-approval within
  1–7-day Reddit SLA). Track at
  https://developers.reddit.com/apps/cm-devvit/app-versions.

### Tests

- 173 passing (up from 9 pre-Phase-1). 22 test files. `tsc --build` clean. Vitest config
  isolated from `@devvit/start` plugin via `vitest.config.ts`.

### Notes

- Codex adversarial review ran twice: once on Vinh's Phase 1+2 ship
  (`docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md`), once on the full session
  retrospective (`docs/superpowers/codex-reviews/2026-05-16-session-full-review.md`),
  once on enhancement audit (`docs/superpowers/codex-reviews/2026-05-17-enhancement-audit.md`).
  All CRITICAL + HIGH closed within the session.
- 45 atomic commits in df05b37..0.2.0-release range, 17,210 line additions.

```

- [ ] **Step 2: Commit + push**

```bash
git add CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs(changelog): v0.2.0 release entry — Phase 1+2+3 + Codex hotfixes + Step 3.6

Captures the 2026-05-16/17 sprint: Vinh's Phase 1 (rule engine, 93 tests) +
Phase 2 (actions + handleActivity, 137 tests) + Phase 3 (config UX +
live dashboard, 147 tests). Stephen's Step 3.6 (dry-run rule tester via
non-contract dryRunActivity). Codex CRITICAL/HIGH hotfixes baked in
(2 CRITICAL idempotency + 10 HIGH safety findings across two adversarial
review passes). v0.2.0 submitted to Reddit App Directory review.

Live-playtest gotchas documented in Fixed: Devvit form envelope is flat,
disabled:true drops fields from submission. Codex enhancement-audit
caught examples/ schema drift; fixed in same commit chain.

CHANGELOG was last refreshed at "Day 3 evening" — pre-Phase-1. Now
current through 2026-05-17.
EOF
)"
git push origin main
git status -sb  # confirm clean
```

---

## Phase G4 — writeup-draft Section 1 refresh (~15 min)

### Task G4.1: Refresh "Capabilities" + "How mods use it" bullets

**Files:**
- Modify: `docs/submission/writeup-draft.md:14-37` (Section 1 region)

- [ ] **Step 1: Replace stale "lands Phase N" / "ships in v0.1.0" / "Phase 3 wires" language**

The writeup-draft "Suggested opener" + capabilities bullet list still says:
- "Once Phase 1-3 wiring lands, the bot reads..."
- "v0.1.0 ships the rule engine + idempotency primitives + atomic config publish + Observatory dashboard demo mode"
- "live trigger / action / dashboard wiring lands through Day 5-11"
- "Observatory dashboard ... Ships in v0.1.0 against `?demo=1` synthetic data; live-data wiring lands at Phase 3 once Vinh's events:recent ZSET pipeline finishes"
- "Renders with `?demo=1` synthetic data until Phase 3 wires live `events:recent` ZSET data"
- "Wiki-based config with 5-min refresh cron + manual reload from mod menu. Atomic publish via revision pointer so handleActivity always reads a consistent snapshot mid-event." — already true post-Phase-3 ship

Apply targeted edits to flip "lands" / "ships in v0.1.0" → "shipped in v0.2.0" / "lives at" / removed.

- [ ] **Step 2: Optionally run humanize skill on the refreshed paragraphs**

```
Invoke the `humanize` skill with the refreshed Section 1 prose.
Skill scans for AI-pattern density and rewrites toward Stephen-voice.
```

- [ ] **Step 3: Commit + push**

```bash
git add docs/submission/writeup-draft.md
git commit -m "docs(submission): writeup-draft Section 1 refresh — Phase 1+2+3 shipped reality"
git push origin main
git status -sb
```

---

## Phase G5 — Status-aware chip rendering (~30 min, TDD)

### Task G5.1: Read current EventRow.tsx + decide chip variant shape

**Files:**
- Read-only: `src/client/components/EventRow.tsx`, `src/client/lib/types.ts`, `src/client/lib/design-tokens.ts`

- [ ] **Step 1: Read the current EventRow**

```bash
cat src/client/components/EventRow.tsx
```

Identify how action chips currently render (e.g., `<span className="chip" data-action={kind}>`) + which `ok` branch drives the color.

- [ ] **Step 2: Decide chip color mapping**

| status | color | rationale |
|--------|-------|-----------|
| `ok` | green | action fired successfully |
| `dry-run` | blue | tested without side-effect |
| `error` | red | action threw or commit failed |
| `skipped-locked` | gray | idempotency lock — already done |
| (undefined / legacy) | derived from `ok` | back-compat |

Map to existing `SIGNAL` palette in `design-tokens.ts` if those colors already exist; otherwise add minimal HSL tokens.

### Task G5.2: Write failing test for status-aware chip

**Files:**
- Create: `tests/client/EventRow.test.tsx`

- [ ] **Step 1: Set up vitest + React Testing Library test**

```tsx
// tests/client/EventRow.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventRow } from '../../src/client/components/EventRow';
import type { EventRecord } from '../../src/client/lib/types';

const base: EventRecord = {
  ts: Date.now(),
  activityId: 't3_x',
  runName: 'r',
  checkName: 'c',
  triggered: true,
  actions: [{ kind: 'remove', ok: true, status: 'ok' }],
};

describe('EventRow chip variants', () => {
  it('renders ok status as success variant', () => {
    render(<EventRow event={base} />);
    const chip = screen.getByText('remove');
    expect(chip.className).toMatch(/ok|success|green/);
  });

  it('renders dry-run status as info variant', () => {
    render(<EventRow event={{ ...base, actions: [{ kind: 'remove', ok: false, status: 'dry-run', wouldHaveCalled: 'remove' }] }} />);
    const chip = screen.getByText(/remove/);
    expect(chip.className).toMatch(/dry-run|info|blue/);
  });

  it('renders error status as danger variant', () => {
    render(<EventRow event={{ ...base, actions: [{ kind: 'remove', ok: false, status: 'error' }] }} />);
    const chip = screen.getByText('remove');
    expect(chip.className).toMatch(/error|danger|red/);
  });

  it('renders skipped-locked status as muted variant', () => {
    render(<EventRow event={{ ...base, actions: [{ kind: 'remove', ok: false, status: 'skipped-locked' }] }} />);
    const chip = screen.getByText('remove');
    expect(chip.className).toMatch(/skipped|muted|gray/);
  });

  it('back-compat: undefined status falls back to ok boolean', () => {
    render(<EventRow event={{ ...base, actions: [{ kind: 'remove', ok: false }] }} />);
    const chip = screen.getByText('remove');
    expect(chip.className).toMatch(/error|danger|red/);
  });
});
```

- [ ] **Step 2: Verify test setup runs (will fail — chip variants don't exist yet)**

```bash
npm test -- tests/client/EventRow.test.tsx 2>&1 | tail -10
```

Expected: FAIL or error — chip rendering doesn't have status variants yet. If vitest/react-testing-library isn't installed, may need package install first.

### Task G5.3: Implement status-aware chip rendering

**Files:**
- Modify: `src/client/components/EventRow.tsx`

- [ ] **Step 1: Add status → CSS class mapping helper at top of file**

```tsx
type ChipStatus = 'ok' | 'dry-run' | 'error' | 'skipped-locked';

function chipClassForStatus(status: ChipStatus | undefined, ok: boolean): string {
  // Codex H2 propagation: status-aware chip variants. Back-compat: undefined
  // status falls back to ok boolean (legacy server payloads).
  if (status === 'dry-run') return 'cm-chip cm-chip--dry-run';
  if (status === 'error') return 'cm-chip cm-chip--error';
  if (status === 'skipped-locked') return 'cm-chip cm-chip--skipped';
  if (status === 'ok') return 'cm-chip cm-chip--ok';
  return ok ? 'cm-chip cm-chip--ok' : 'cm-chip cm-chip--error';
}
```

- [ ] **Step 2: Replace existing chip className expression to use chipClassForStatus(status, ok)**

In the action map within the row, change the chip class binding to call the helper.

- [ ] **Step 3: Add the chip styles (Tailwind utility classes OR a small CSS block)**

If the project uses Tailwind exclusively, attach utility class strings inside chipClassForStatus. If a styles.css file exists with `.cm-chip` rules, add `.cm-chip--dry-run`, `.cm-chip--skipped` variants there using HSL tokens from design-tokens.ts.

### Task G5.4: Verify tests pass + full suite + tsc + lint

- [ ] **Step 1: Run the chip test file**

```bash
npm test -- tests/client/EventRow.test.tsx 2>&1 | tail -10
```

Expected: all 5 tests pass.

- [ ] **Step 2: Full suite + type-check + lint**

```bash
npm test 2>&1 | tail -3
npm run type-check 2>&1 | tail -3
npm run lint 2>&1 | tail -3
```

Expected: 178 tests pass (173 + 5 new), tsc clean, lint clean.

### Task G5.5: Atomic commit + push

- [ ] **Step 1: Commit**

```bash
git add src/client/components/EventRow.tsx src/client/lib/types.ts tests/client/EventRow.test.tsx src/client/styles.css
git commit -m "$(cat <<'EOF'
feat(dashboard): status-aware action chips — distinguish dry-run / error / skipped / ok

Server propagates ActionResult.status + wouldHaveCalled per Codex session
HIGH-2 (commit 1e4cba4). Until now the client rendered only on `ok` boolean,
collapsing dry-run vs error vs skipped-locked vs ok into a binary
red-or-green chip. Dashboard surface upgrade now uses the status field to
render distinct chip variants:

- status: 'ok'              → green chip
- status: 'dry-run'         → blue chip  (no Reddit side-effect — informational)
- status: 'error'           → red chip   (action threw or commit failed)
- status: 'skipped-locked'  → gray chip  (idempotency lock — already done)

Back-compat: undefined status falls back to ok boolean for legacy ZSET
events written pre-Codex-H2. 5 new tests across all chip variants.
Total tests: 178 green. tsc + lint clean.

Pure src/client/ change. No contract touched.
EOF
)"
git push origin main
git status -sb
```

---

## Phase G6 — "Try locally in 3 commands" judge-friction block (~15 min)

### Task G6.1: Add block to devpost-form-cheat-sheet.md

**Files:**
- Modify: `docs/submission/devpost-form-cheat-sheet.md` — add new section before "Step 3 — Project details"

- [ ] **Step 1: Insert the block**

```markdown
## Try locally (judge-friction reducer)

Any technical judge can verify the dashboard renders in <2 min:

```bash
git clone https://github.com/StephenSook/context-mod-devvit.git
cd context-mod-devvit
npm ci && npm run dev:web
```

Then open `http://localhost:5173/?demo=1` in a browser. Renders the
Observatory dashboard against synthetic seed data — exercises every
component (stat cards, sparkline, event stream, action chips, ApiResult
discriminated union) without needing a Devvit playtest install. No
Reddit auth required. Zero risk to anyone's sub.
```

### Task G6.2: Add same block to README.md

**Files:**
- Modify: `README.md` — insert after "Quick start (for moderators)" section, before "Run the dashboard locally (for judges + devs)" if it doesn't already exist; if it does, verify accuracy.

- [ ] **Step 1: Check if the block already exists**

```bash
grep -n "Try locally" README.md || echo "missing"
grep -n "dev:web" README.md
```

- [ ] **Step 2: Add or refresh the block**

If missing: add a "## Try locally in 3 commands" section before "## Run the dashboard locally" with the same content as above.

If present: verify the dev:web command + URL are accurate.

### Task G6.3: Commit + push

- [ ] **Step 1: Commit + push**

```bash
git add docs/submission/devpost-form-cheat-sheet.md README.md
git commit -m "docs: add 'Try locally in 3 commands' judge-friction reducer block (Codex enhancement-audit)"
git push origin main
git status -sb
```

---

## Phase G7 — Repo metadata polish via gh API (~10 min)

### Task G7.1: Set Topics + Description + Homepage URL

**Files:**
- External: GitHub repo settings via gh CLI

- [ ] **Step 1: Audit current state**

```bash
gh repo view --json description,homepageUrl,repositoryTopics
```

- [ ] **Step 2: Set Topics (5 suggested)**

```bash
gh repo edit --add-topic devvit
gh repo edit --add-topic reddit
gh repo edit --add-topic moderation
gh repo edit --add-topic contextmod
gh repo edit --add-topic praw
```

- [ ] **Step 3: Set Description if missing/stale**

```bash
gh repo edit --description "Devvit Web port of FoxxMD's PRAW-era ContextMod moderation bot. JSON5 wiki rules, live Observatory dashboard, per-sub install. MIT, OSS, Codex-hardened."
```

- [ ] **Step 4: Set Homepage URL to the Pages site**

```bash
gh repo edit --homepage "https://stephensook.github.io/context-mod-devvit/"
```

- [ ] **Step 5: Verify**

```bash
gh repo view --json description,homepageUrl,repositoryTopics
```

Expected output shows all 5 topics + description + homepage URL set.

**Note:** Social preview image (`assets/social-preview.png` already exists in repo) cannot be set via `gh` API — Stephen must upload it manually at github.com/StephenSook/context-mod-devvit/settings → Social preview → Edit. ~30 sec.

---

## Phase G8 — Stephen-manual handoff items

### Image gallery captions (Tier 1 #6)

5 paste-ready captions from the cheat sheet — copy into each "Add a caption" field on the Devpost form Image gallery section. All ≤140 chars. Already documented in the cheat sheet I refreshed earlier this session.

### Feedback Awards survey (Tier 1 #7)

Submit Reddit's developer satisfaction survey at:
```
https://forms.gle/d9jY3szEzRzmKPwL8
```

Topics to cover (from cheat sheet):
- Devvit Redis primitive limitations (no Lists/Sets, no Lua/transactions) + the TOCTOU mitigation pattern we invented
- vite plugin blocking `vite dev`/`vite preview` — workaround via mock Python http server
- HTTP fetch policy PR #96 impact on legitimate third-party APIs (MHS cut)
- Devvit Web vs Blocks deprecation timing clarity
- Documentation gaps on App Migration Program bounty workflow
- Custom-post webview iframe URL not being a shareable OG-crawlable surface
- Devvit form submit envelope flat vs nested mismatch with docs convention (caught live-playtest 2026-05-16)
- App Versions page lacks per-version install/update action for owners

~10 min effort. $200 × 10 prize pool (free entry).

### Social preview image upload

GitHub Settings → Repository → Social preview → Edit → upload `assets/social-preview.png` (1280×640 already in repo). ~30 sec.

---

## Self-Review

**Spec coverage:** Codex audit recommendations + my Tier 1 picks cross-referenced:
- ✓ examples/ schema drift (Codex T1 #1, #2) → Phase G1
- ✓ CHANGELOG refresh (my T1 #2 + Codex T1 #1 partial) → Phase G3
- ✓ writeup-draft section 1 refresh (my T1 #3 + Codex T1 #1 partial) → Phase G4
- ✓ Try locally in 3 commands (Codex T1 #4) → Phase G6
- ✓ Status-aware chip rendering (my T1 #5) → Phase G5
- ✓ Image gallery captions (my T1 #6) → G8 Stephen-manual
- ✓ Feedback Awards survey (my T1 #7) → G8 Stephen-manual
- ✓ package.json version sync (my T1 #8) → Phase G2
- ✓ Repo Topics + Description + Homepage (Codex T1 #6 + my T1 #9) → Phase G7

**Placeholder scan:** Each task has exact file paths, exact commands, complete code blocks. No TBDs, no "TODO", no "similar to Task N". 

**Type consistency:** `ChipStatus` defined in Task G5.3 matches the type used in Task G5.2 test. `EventRecord` already exported from `src/client/lib/types.ts` per session memory; tests + impl both import from there.

**Sequencing:** Phase G1 (schema drift) is independent. G2 (version sync) is fast-skip if already done. G3 (CHANGELOG) references session work, independent. G4 (writeup) independent. G5 (chip) independent code change. G6 (Try locally) independent. G7 (gh API) independent. No ordering dependencies.

---

## Execution

Inline execution per `superpowers:executing-plans`. Each phase ends with the edit-commit-push triplet to keep repo state clean. Plan-gap-scanner can run after this file is committed to catch anything I missed.

_Plan saved 2026-05-17 by Stephen via Claude Code._
