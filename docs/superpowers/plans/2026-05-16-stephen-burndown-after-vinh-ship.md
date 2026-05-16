# Stephen Burndown After Vinh's Phase 1+2 Ship — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Plan respects the three locked project rules: (1) atomic commits per fix, (2) Playwright verify after external-surface commits, (3) tool-inventory audit at task start (done in the parent session).

**Goal:** Burn down Stephen's remaining hackathon work (3.5 status refresh, 3.6 dry-run rule tester, 5.3–5.6 demo/submission docs) and harden Vinh's Phase 1+2 surface (3,670 lines, 137 tests) via Codex adversarial review with non-contract fix protocol.

**Architecture:** Single-session inline execution. Codex review runs async in background while Stephen-side work proceeds. 3.6 built via a NEW `src/core/dryRunActivity.ts` that mirrors `handleActivity` minus the ZSET write — keeps Vinh's `handleActivity` contract unchanged. Doc work batched in Phase D.

**Tech Stack:** Vitest, Hono, @devvit/web, codex CLI 0.128.0, gh CLI, Playwright MCP.

**Today's context:**
- Repo: `StephenSook/context-mod-devvit`, branch `main`, fast-forwarded to `8218016` (Vinh's last commit, 2026-05-16 ~07:25 UTC).
- 137/137 tests green locally; `tsc --build` clean.
- Deadline: 2026-05-27 18:00 PT (T-11 days).
- Two-person team: Stephen (frontend/UX/submission) + Vinh (backend, just shipped Phase 1+2).

**Push-rights protocol for Codex findings:**
- **Non-Shared-Contract bug** → Stephen pushes hotfix directly, atomic commit, notify Vinh in commit body + Discord. Per PLAN.md Coordination Rule 5.
- **Shared-Contract touch** (`src/shared/types.ts`, `src/schema/app.schema.json`, `src/state/keys.ts`, `src/shared/normalize.ts`, `RecentEvent` JSON shape, Mustache context shape, `/api/recent` shape) → draft fix locally, ping Vinh, wait for OK, push w/ `⚠️ CONTRACT:` prefix. Per PLAN.md Rule 10.
- **Critical security/correctness** → push immediately, notify after. Per PLAN.md Rule 5.

---

## File Structure

**New files:**
- `src/core/dryRunActivity.ts` — non-contract dry-run pipeline returning structured `DryRunResult` (does NOT touch ZSET; does NOT modify `handleActivity`)
- `tests/core/dryRunActivity.test.ts` — full coverage
- `tests/routes/menu-test-rules.test.ts` — `/test-rules` menu handler test
- `tests/routes/forms-test-rules.test.ts` — `/test-rules-submit` form handler test
- `docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md` — Codex review findings parked here for triage

**Modified files:**
- `PLAN.md:69, 206` — 3.5 status flip + Last-updated bump
- `src/routes/menu.ts:117-122` — replace `/test-rules` stub with `showForm` flow
- `src/routes/forms.ts:12-16` — replace `/test-rules-submit` stub with dryRunActivity invocation + toast rendering
- `README.md` — add Phase 1+2 backend section
- `docs/submission/writeup-draft.md` — add Phase 1+2 build notes (D10 first-person)
- `docs/submission/demo-video-runbook.md` — refresh script outline against shipped features

**Doc-only new files:**
- `docs/submission/e2e-scenarios.md` — Phase 5.3 scenarios A–H draft

---

## Phase A — Codex Adversarial Review (background)

**Why first:** longest-running task (~5–15 min). Launch in background; Stephen-side work proceeds in parallel.

### Task A1: Capture Vinh's full Phase 1+2 diff + launch Codex review

**Files:**
- Create (output): `/tmp/vinh-phase-1-2.diff`
- Create (output): `docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md`

- [ ] **Step 1: Capture the diff**

```bash
cd "/Users/stephensookra/Reddiit Hacks/context-mod-devvit"
git diff df05b37..origin/main > /tmp/vinh-phase-1-2.diff
wc -l /tmp/vinh-phase-1-2.diff
```

Expected: ~4,800 lines (3,670 additions + headers + context).

- [ ] **Step 2: Ensure codex-reviews directory exists**

```bash
mkdir -p "docs/superpowers/codex-reviews"
```

- [ ] **Step 3: Launch Codex review in background**

Bash with `run_in_background=true`:

```bash
cd "/Users/stephensookra/Reddiit Hacks/context-mod-devvit"
codex exec --skip-git-repo-check "Adversarial review. Diff at /tmp/vinh-phase-1-2.diff (3,670 line additions, Vinh's Phase 1+2 ship for StephenSook/context-mod-devvit — Devvit Web port of FoxxMD's ContextMod). Read it via shell tools.

Focus areas, ranked by risk:
1. Idempotency edges in src/core/runAction.ts + src/lib/idem.ts — stale-lease race, actionId collision proofs, dry-run gate slip past reserveAction
2. Atomic config publish in src/state/configStore.ts — concurrent writer race, rev pointer torn read, multi-tenant key segmentation
3. Mustache template injection in src/core/template.ts — escapeMarkdown completeness (u/r-ping defang, link-injection [click](evil), backtick code, blockquote, HTML), Unicode lookalikes
4. Rule logic in src/rules/{regex,author,ruleset,repost}.ts — regex DoS, short-circuit correctness, empty-rules behavior, repost fail-OPEN under Redis outage
5. Trigger event normalize in src/shared/normalize.ts — null safety, type coercion, missing PostV2/CommentV2 fields, malformed inputs
6. handleActivity orchestrator in src/core/handleActivity.ts — config-rev read-once invariant, error propagation, ZSET write best-effort guarantee
7. AJV schema at src/schema/app.schema.json — missing required fields, additionalProperties drift, oneOf mismatches vs actual TS types
8. Tests: which assertions are weak (e.g., assert exists vs assert exact shape), what edge cases are untested, what would only fail in production

Output format: STRICT MARKDOWN with sections CRITICAL / HIGH / MED / LOW. Per finding:
- file:line citation
- 1-paragraph problem statement
- suggested fix (code block if non-trivial)
- IS_SHARED_CONTRACT: yes/no — yes if touching src/shared/types.ts, src/schema/app.schema.json, src/state/keys.ts, src/shared/normalize.ts, RecentEvent shape, Mustache context shape, or /api/recent shape

End with a SUMMARY count: CRITICAL=N, HIGH=N, MED=N, LOW=N." > docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md 2>&1
```

- [ ] **Step 4: Continue to Phase B while Codex runs** — do NOT poll. When the background task completes the harness notifies us.

---

## Phase B — PLAN.md Status Refresh (atomic doc commit)

**Why second:** restores coordination doc integrity. Vinh sees Stephen's status, no false 🟡 stale-lock signal.

### Task B1: Flip 3.5 Dashboard ✅, bump Last-updated

**Files:**
- Modify: `PLAN.md:69` — row 3.5
- Modify: `PLAN.md:206` — footer Last-updated

- [ ] **Step 1: Edit row 3.5**

Replace this line:
```
| 3.5 | Dashboard custom post (Vite + React) | `src/client/*` | **Stephen** | 🟡 Umay 12 5pm | 3.4 | Mobile-first Tailwind, Lighthouse>80 |
```

With:
```
| 3.5 | Dashboard custom post (Vite + React) | `src/client/*` | **Stephen** | ✅ 2026-05-16 | 3.4 | Wave A–F shipped 2026-05-12 → 2026-05-14: stat cards + sparkline + event stream + CSV export + rule hit-count chips + empty-state w/ starter-config snippet. a11y polish (aria-live, prefers-reduced-motion, semantic `<time>`). `demo=1` synthetic-fixture path per Codex M6 production-safety. Awaits 3.4 `/api/recent` ZRANGE wiring (Vinh) — dashboard already handles empty array. Last commit 8218016. |
```

- [ ] **Step 2: Edit footer**

Replace `_Last updated: 2026-05-12 by Stephen._` with `_Last updated: 2026-05-16 by Stephen._`

- [ ] **Step 3: Commit (PLAN.md only, no code per Rule 6)**

```bash
cd "/Users/stephensookra/Reddiit Hacks/context-mod-devvit"
git add PLAN.md
git commit -m "$(cat <<'EOF'
status: 3.5 ✅ dashboard custom post — Wave A–F shipped

Flipped Stephen's 3.5 from 🟡 → ✅ with Wave A–F commit citation.
Dashboard renders against demo=1 today; awaits Vinh's 3.4 ZRANGE
wiring at /api/recent for live event data. Empty-array path already
handled.

Per Coordination Rule 6 — atomic doc commit, no code bundled.
EOF
)"
```

- [ ] **Step 4: Push**

```bash
git push origin main
```

- [ ] **Step 5: Playwright verify PLAN.md renders on github.com**

```
mcp__plugin_playwright_playwright__browser_navigate  https://github.com/StephenSook/context-mod-devvit/blob/main/PLAN.md
mcp__plugin_playwright_playwright__browser_snapshot
```

Confirm: row 3.5 reads `✅ 2026-05-16` and footer reads `Last updated: 2026-05-16`.

```
mcp__plugin_playwright_playwright__browser_close
```

---

## Phase C — 3.6 Dry-Run Rule Tester (TDD, code)

**Why third:** unblocked by Vinh's 2.3 + 2.5.2 ship. Pure Stephen surface. Ships a judge-visible feature.

**Design choice — non-contract path:** `handleActivity` returns `void` and writes to ZSET. Dry-run tester needs structured RETURN of evaluation trace + action results without polluting the ZSET. Two options:

1. Modify `handleActivity` to accept `{dryRun: true}` and branch return type → **Shared Contract change** → ping Vinh first
2. Create sibling `dryRunActivity()` that mirrors the pipeline but returns `DryRunResult` and skips `recordEvent` → **non-contract** → ship directly

Choosing option 2. Slight code duplication (~30 lines) vs. days of coordination friction.

### Task C1: Define `DryRunResult` type + write failing test for `dryRunActivity`

**Files:**
- Create: `tests/core/dryRunActivity.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/core/dryRunActivity.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dryRunActivity } from '../../src/core/dryRunActivity';
import * as configStore from '../../src/state/configStore';
import * as recentEvents from '../../src/state/recentEvents';
import type { Item, Author, AppConfig } from '../../src/shared/types';

vi.mock('../../src/state/recentEvents');

const sub = 'r_test';
const item: Item = {
  id: 't3_abc', title: 'free crypto giveaway', body: '', url: '',
  author: 'spammer', age: 60, score: 0, isSelf: true, over18: false,
  removed: false, approved: false, locked: false, stickied: false, linkFlairText: '',
};
const author: Author = {
  name: 'spammer', id: 't2_x', age: 86400 * 30,
  linkKarma: 0, commentKarma: 0, flairText: '',
  isMod: false, isContributor: false, verified: false, shadowBanned: false,
};
const cfg: AppConfig = {
  dryRun: false,
  runs: [{
    name: 'spam-removal',
    checks: [{
      name: 'crypto-giveaway',
      combinator: 'OR',
      rules: [{ kind: 'regex', name: 'scam-words', pattern: 'crypto|giveaway', flags: 'i' }],
      actions: [
        { kind: 'remove', isSpam: true },
        { kind: 'comment', template: 'Hi {{author.nameSafe}}, removed as spam.' },
      ],
    }],
  }],
};

describe('dryRunActivity', () => {
  beforeEach(() => {
    vi.spyOn(configStore, 'getCurrentRev').mockResolvedValue({ rev: 1, config: cfg });
    vi.mocked(recentEvents.recordEvent).mockClear();
  });

  it('returns triggered runs with action wouldHaveCalled list', async () => {
    const result = await dryRunActivity(item, author, sub);
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0].triggered).toBe(true);
    expect(result.runs[0].actions).toEqual([
      { kind: 'remove', wouldHaveCalled: 'remove' },
      { kind: 'comment', wouldHaveCalled: 'comment' },
    ]);
  });

  it('never writes to recentEvents ZSET', async () => {
    await dryRunActivity(item, author, sub);
    expect(recentEvents.recordEvent).not.toHaveBeenCalled();
  });

  it('returns empty when no config published', async () => {
    vi.spyOn(configStore, 'getCurrentRev').mockResolvedValue(null);
    const result = await dryRunActivity(item, author, sub);
    expect(result.runs).toEqual([]);
    expect(result.configPresent).toBe(false);
  });

  it('reports non-triggered runs explicitly', async () => {
    const noMatchItem: Item = { ...item, title: 'a peaceful poem about flowers' };
    const result = await dryRunActivity(noMatchItem, author, sub);
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0].triggered).toBe(false);
    expect(result.runs[0].actions).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm test -- tests/core/dryRunActivity.test.ts
```

Expected: FAIL — `Cannot find module '../../src/core/dryRunActivity'`.

### Task C2: Implement `src/core/dryRunActivity.ts`

**Files:**
- Create: `src/core/dryRunActivity.ts`

- [ ] **Step 1: Write the minimal implementation**

```ts
// src/core/dryRunActivity.ts
/**
 * Step 3.6 — Dry-run rule tester pipeline.
 *
 * Mirrors handleActivity's read-and-evaluate flow but:
 *   - Forces dryRun: true on every action (overrides config)
 *   - Returns structured DryRunResult instead of writing to recentEvents ZSET
 *   - Surfaces non-triggered runs so the form UI can show "no rules matched"
 *
 * Non-contract design choice (2026-05-16): keeps Vinh's handleActivity void
 * signature stable. Slight pipeline duplication (~30 lines) is the cost.
 */

import type { Item, Author, Action } from '../shared/types';
import * as configStore from '../state/configStore';
import { runRun } from './runRun';
import { runAction } from './runAction';

export interface DryRunActionResult {
  kind: string;
  wouldHaveCalled?: string;
}

export interface DryRunRunResult {
  runName: string;
  triggered: boolean;
  checkName?: string;
  actions: DryRunActionResult[];
}

export interface DryRunResult {
  configPresent: boolean;
  configRev?: number;
  runs: DryRunRunResult[];
}

export async function dryRunActivity(
  item: Item,
  author: Author,
  subredditName: string,
): Promise<DryRunResult> {
  const current = await configStore.getCurrentRev(subredditName);
  if (!current) {
    return { configPresent: false, runs: [] };
  }

  const runs: DryRunRunResult[] = [];
  for (const run of current.config.runs) {
    const result = await runRun(run, item, author, subredditName);
    if (!result.triggered) {
      runs.push({ runName: run.name, triggered: false, actions: [] });
      continue;
    }

    const actions: DryRunActionResult[] = [];
    for (const action of result.actions) {
      const forcedDryRun: Action = { ...action, dryRun: true };
      const res = await runAction(forcedDryRun, {
        item,
        author,
        subredditName,
        rev: current.rev,
        config: current.config,
      });
      actions.push({
        kind: action.kind,
        wouldHaveCalled: res.status === 'dry-run' ? res.wouldHaveCalled : undefined,
      });
    }

    runs.push({
      runName: run.name,
      triggered: true,
      checkName: result.checkName,
      actions,
    });
  }

  return { configPresent: true, configRev: current.rev, runs };
}
```

- [ ] **Step 2: Run test, verify pass**

```bash
npm test -- tests/core/dryRunActivity.test.ts
```

Expected: PASS — 4 tests green.

- [ ] **Step 3: Run full suite + type-check to confirm no regression**

```bash
npm test 2>&1 | tail -5
npm run type-check 2>&1 | tail -5
```

Expected: all 141 tests pass (137 existing + 4 new). `tsc` clean.

- [ ] **Step 4: Commit**

```bash
git add src/core/dryRunActivity.ts tests/core/dryRunActivity.test.ts
git commit -m "$(cat <<'EOF'
feat(dry-run): src/core/dryRunActivity.ts — non-contract pipeline mirror

Step 3.6 dry-run rule tester needs a pipeline that returns structured
{run, check, actions[].wouldHaveCalled} without writing to events:recent
ZSET. Adding a sibling dryRunActivity() vs modifying Vinh's handleActivity
contract — saves a ⚠️ CONTRACT roundtrip.

Forces dryRun: true on every action (overrides config), so the tester
works even when the mod has dryRun: false published. 4 tests green.

Vinh: ping in #devvit-dev if you'd prefer to merge into handleActivity
instead. No urgency — works as-is.
EOF
)"
```

### Task C3: Wire `/internal/menu/test-rules` to showForm

**Files:**
- Modify: `src/routes/menu.ts:117-122` (the stub)
- Create: `tests/routes/menu-test-rules.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/routes/menu-test-rules.test.ts
import { describe, it, expect } from 'vitest';
import { menu } from '../../src/routes/menu';

describe('POST /test-rules menu handler', () => {
  it('returns showForm UiResponse with thingId pre-filled', async () => {
    const req = new Request('http://x/test-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: 't3_abc' }),
    });
    const res = await menu.request(req);
    expect(res.status).toBe(200);
    const json = await res.json() as { showForm: { name: string; form: { fields: unknown[] } } };
    expect(json.showForm.name).toBe('testRules');
    expect(json.showForm.form.fields).toEqual([
      { type: 'string', name: 'thingId', label: 'Thing ID', defaultValue: 't3_abc', disabled: true },
    ]);
  });

  it('returns toast when targetId missing', async () => {
    const req = new Request('http://x/test-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await menu.request(req);
    const json = await res.json() as { showToast?: string };
    expect(json.showToast).toMatch(/select a post or comment/i);
  });
});
```

- [ ] **Step 2: Run test, verify failure**

```bash
npm test -- tests/routes/menu-test-rules.test.ts
```

Expected: FAIL — current stub returns `{showToast: 'Dry-run rule tester — Phase 3'}`.

- [ ] **Step 3: Replace the stub**

Edit `src/routes/menu.ts:117-122` from:

```ts
menu.post('/test-rules', async (c) => {
  const evt = await c.req.json<MenuItemRequest>();
  console.log(`[cm/menu/test-rules] targetId=${evt.targetId}`);
  // TODO Phase 3 Task 32: dry-run pipeline against the target, show UiResponse.showForm
  return c.json({ showToast: 'Dry-run rule tester — Phase 3' });
});
```

To:

```ts
menu.post('/test-rules', async (c) => {
  const evt = await c.req.json<MenuItemRequest>();
  console.log(`[cm/menu/test-rules] targetId=${evt.targetId}`);
  if (!evt.targetId) {
    return c.json({ showToast: 'Right-click a post or comment to test rules on it.' });
  }
  return c.json({
    showForm: {
      name: 'testRules',
      form: {
        title: 'ContextMod — Dry-run rules',
        description: 'Evaluate the live rule set against this item. No actions will fire.',
        fields: [
          { type: 'string', name: 'thingId', label: 'Thing ID', defaultValue: evt.targetId, disabled: true },
        ],
        acceptLabel: 'Run dry-run',
        cancelLabel: 'Cancel',
      },
    },
  });
});
```

- [ ] **Step 4: Run test, verify pass**

```bash
npm test -- tests/routes/menu-test-rules.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Full suite + type-check**

```bash
npm test 2>&1 | tail -5
npm run type-check 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add src/routes/menu.ts tests/routes/menu-test-rules.test.ts
git commit -m "feat(menu): wire /test-rules → showForm with thingId pre-filled (Step 3.6)"
```

### Task C4: Wire `/internal/form/test-rules-submit` to dryRunActivity

**Files:**
- Modify: `src/routes/forms.ts:12-16` (the stub)
- Create: `tests/routes/forms-test-rules.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/routes/forms-test-rules.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { forms } from '../../src/routes/forms';
import * as dryRun from '../../src/core/dryRunActivity';
import * as normalize from '../../src/shared/normalize';

vi.mock('../../src/core/dryRunActivity');
vi.mock('../../src/shared/normalize');
vi.mock('@devvit/web/server', () => ({
  reddit: {
    getCurrentSubreddit: async () => ({ name: 'r_test' }),
    getPostById: async (id: string) => ({ id, title: 'free crypto giveaway' }),
    getCommentById: async (id: string) => ({ id, body: 'hello' }),
  },
}));

describe('POST /test-rules-submit form handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders triggered actions as toast bullets', async () => {
    vi.mocked(normalize.normalizePostV2).mockReturnValue([
      { id: 't3_abc', title: 'free crypto giveaway' } as never,
      { name: 'spammer' } as never,
    ]);
    vi.mocked(dryRun.dryRunActivity).mockResolvedValue({
      configPresent: true,
      configRev: 1,
      runs: [{
        runName: 'spam-removal',
        triggered: true,
        checkName: 'crypto-giveaway',
        actions: [
          { kind: 'remove', wouldHaveCalled: 'remove' },
          { kind: 'comment', wouldHaveCalled: 'comment' },
        ],
      }],
    });

    const req = new Request('http://x/test-rules-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { thingId: 't3_abc' } }),
    });
    const res = await forms.request(req);
    const json = await res.json() as { showToast: string };

    expect(json.showToast).toContain('spam-removal');
    expect(json.showToast).toContain('crypto-giveaway');
    expect(json.showToast).toContain('remove');
    expect(json.showToast).toContain('comment');
  });

  it('reports no config when configPresent=false', async () => {
    vi.mocked(normalize.normalizePostV2).mockReturnValue([
      { id: 't3_abc' } as never, { name: 'x' } as never,
    ]);
    vi.mocked(dryRun.dryRunActivity).mockResolvedValue({ configPresent: false, runs: [] });

    const req = new Request('http://x/test-rules-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { thingId: 't3_abc' } }),
    });
    const res = await forms.request(req);
    const json = await res.json() as { showToast: string };
    expect(json.showToast).toMatch(/no config published/i);
  });

  it('reports no triggered runs as explicit pass', async () => {
    vi.mocked(normalize.normalizePostV2).mockReturnValue([
      { id: 't3_abc' } as never, { name: 'x' } as never,
    ]);
    vi.mocked(dryRun.dryRunActivity).mockResolvedValue({
      configPresent: true,
      configRev: 1,
      runs: [{ runName: 'spam-removal', triggered: false, actions: [] }],
    });

    const req = new Request('http://x/test-rules-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { thingId: 't3_abc' } }),
    });
    const res = await forms.request(req);
    const json = await res.json() as { showToast: string };
    expect(json.showToast).toMatch(/no rules triggered/i);
  });
});
```

- [ ] **Step 2: Run test, verify failure**

```bash
npm test -- tests/routes/forms-test-rules.test.ts
```

Expected: FAIL — stub returns Phase 3 toast.

- [ ] **Step 3: Replace the stub**

Edit `src/routes/forms.ts` from:

```ts
import { Hono } from 'hono';

export const forms = new Hono();

forms.post('/test-rules-submit', async (c) => {
  console.log(`[cm/forms/test-rules-submit] submitted`);
  // TODO Phase 3 Task 32: handle dry-run form submit
  return c.json({ showToast: 'Form submit — Phase 3' });
});
```

To:

```ts
import { Hono } from 'hono';
import { reddit } from '@devvit/web/server';
import { dryRunActivity } from '../core/dryRunActivity';
import { normalizePostV2, normalizeCommentV2 } from '../shared/normalize';

export const forms = new Hono();

forms.post('/test-rules-submit', async (c) => {
  const body = await c.req.json<{ values: { thingId: string } }>();
  const thingId = body.values?.thingId;
  console.log(`[cm/forms/test-rules-submit] thingId=${thingId}`);

  if (!thingId) {
    return c.json({ showToast: 'Missing thingId — form re-submit needed.' });
  }

  try {
    const sub = await reddit.getCurrentSubreddit();
    const isComment = thingId.startsWith('t1_');
    const raw = isComment
      ? await reddit.getCommentById(thingId)
      : await reddit.getPostById(thingId);
    const [item, author] = isComment
      ? normalizeCommentV2(raw as never, sub.name)
      : normalizePostV2(raw as never, sub.name);

    const result = await dryRunActivity(item, author, sub.name);

    if (!result.configPresent) {
      return c.json({ showToast: 'No config published yet — run "Reload config from wiki" first.' });
    }

    const triggered = result.runs.filter(r => r.triggered);
    if (triggered.length === 0) {
      return c.json({
        showToast: `No rules triggered. Evaluated ${result.runs.length} run(s) at rev ${result.configRev}.`,
      });
    }

    const lines = triggered.map(r => {
      const actionKinds = r.actions.map(a => a.kind).join(', ');
      return `• ${r.runName} / ${r.checkName} → ${actionKinds || '(no actions)'}`;
    });
    return c.json({
      showToast: `Dry-run (rev ${result.configRev}):\n${lines.join('\n')}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cm/forms/test-rules-submit] failed:', err);
    return c.json({ showToast: `Dry-run failed: ${msg}` });
  }
});
```

- [ ] **Step 4: Run test, verify pass**

```bash
npm test -- tests/routes/forms-test-rules.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Full suite + type-check + lint**

```bash
npm test 2>&1 | tail -5
npm run type-check 2>&1 | tail -5
npm run lint 2>&1 | tail -10
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/routes/forms.ts tests/routes/forms-test-rules.test.ts
git commit -m "feat(forms): wire /test-rules-submit → dryRunActivity → toast bullets (Step 3.6 complete)"
```

### Task C5: Update PLAN.md — 3.6 flipped ✅

**Files:**
- Modify: `PLAN.md:70`

- [ ] **Step 1: Edit row 3.6**

Replace status `⬜` with `✅ 2026-05-16` and add commit citation in Notes column.

- [ ] **Step 2: Commit (atomic, PLAN.md only)**

```bash
git add PLAN.md
git commit -m "status: 3.6 ✅ dry-run rule tester — menu + form + dryRunActivity sibling pipeline"
```

- [ ] **Step 3: Push all C-phase commits**

```bash
git push origin main
```

---

## Phase D — Doc Burndown (parallel-eligible)

Phase D tasks are independent doc drafts. Can be done in any order, even interleaved with Phase E triage as Codex lands findings.

### Task D1: 5.4 README polish — Phase 1+2 backend section

**Files:**
- Modify: `README.md` — add "Rule Engine + Actions" section after the "Observatory" section

- [ ] **Step 1: Read current README structure**

```bash
grep -n "^##" README.md
```

- [ ] **Step 2: Draft + insert section**

Add a `## Rule Engine` section covering:
- 3 MVP rule kinds (regex / author / ruleset) w/ JSON5 example each
- 7 MVP actions (remove / approve / lock / comment / report / ban / userFlair) — Reddit-API signature corrections per Vinh's commits
- Dual idempotency story (`cm:proc:{thingId}` 24h + `cm:action:{hash}` 7d)
- Atomic config publish via revision pointer (D5)
- Dry-run gate (per-action override + config-level)
- Mustache markdown sanitizer (defangs u/r pings, link-injection)

Source material: PLAN.md rows 1.1–2.5.3 + Vinh's commit messages 6694109 + 9532cf4.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(readme): add Rule Engine + Actions section — Phase 1+2 shipped"
```

- [ ] **Step 4: Push + Playwright verify**

```bash
git push origin main
```

```
mcp__plugin_playwright_playwright__browser_navigate  https://github.com/StephenSook/context-mod-devvit#readme
mcp__plugin_playwright_playwright__browser_snapshot  3
```

Confirm new section renders + code-fence JSON5 highlighted.

```
mcp__plugin_playwright_playwright__browser_close
```

### Task D2: 5.3 E2E scenarios A–H draft

**Files:**
- Create: `docs/submission/e2e-scenarios.md`

- [ ] **Step 1: Write the scenarios**

8 scenarios judges can replay on the test sub:
- A — Regex spam: title matches "crypto|giveaway" → remove + Mustache comment
- B — Repost: same URL submitted twice in 30d → dry-run remove (audit only)
- C — Mod whitelist: post by mod author → no action (authorIs filter passes)
- D — Approved-user: post by `r/sub` approved-contributor → no action
- E — Comment moderation: comment matches body regex → remove + lock parent post
- F — Dry-run tester: mod right-clicks suspicious post → "Test rules" → form → toast bullets
- G — Reload config: mod edits wiki → menu "Reload config" → toast shows rule count
- H — Recent actions dashboard: mod clicks "View recent actions" → Observatory post renders w/ live ZSET

Each scenario: `Trigger | Expected outcome | Verification step | Screenshot target`.

- [ ] **Step 2: Commit**

```bash
git add docs/submission/e2e-scenarios.md
git commit -m "docs(submission): e2e scenarios A–H draft (Step 5.3)"
```

### Task D3: 5.6 Devpost writeup draft — first-person Phase 1+2 build notes

**Files:**
- Modify: `docs/submission/writeup-draft.md`

- [ ] **Step 1: Read current writeup state**

```bash
head -80 docs/submission/writeup-draft.md
```

- [ ] **Step 2: Add Phase 1+2 build-notes section**

Per D10 (first-person, no AI-tone marketing prose). Material:
- "Vinh shipped the engine + actions in one push (Phase 1+2, 3,670 lines, 137 tests)"
- Specific Reddit-API course-corrections Vinh discovered in playtest: ban duration 0 ≠ permanent, `lock()` routes through getPostById, `getCurrentSubredditName` doesn't exist
- Council fixes baked in: `actions: undefined` bug caught pre-ship, ActionContext.config REQUIRED to prevent dry-run gate regression
- Stale-lease bug: `reserveAction` returning false on 5-min lease now records `{status: 'skipped-locked'}` instead of dropping
- Idempotency action-id collision: pipe-separated to prevent `(t3_a, ban, x)` aliasing `(t3_ab, an, x)`

- [ ] **Step 3: Commit**

```bash
git add docs/submission/writeup-draft.md
git commit -m "docs(submission): writeup Phase 1+2 build notes — first-person per D10"
```

### Task D4: 5.5 Demo video script outline

**Files:**
- Modify: `docs/submission/demo-video-runbook.md`

- [ ] **Step 1: Read current runbook**

```bash
head -80 docs/submission/demo-video-runbook.md
```

- [ ] **Step 2: Add 60s script outline keyed to shipped features**

Script beats (60s total):
- 0:00–0:05 — `r/contextmod_vinh_dev` opens, "ContextMod" install screen
- 0:05–0:15 — "Reload config from wiki" → toast shows rule count
- 0:15–0:30 — Spammer submits "free crypto giveaway" → bot removes + comments
- 0:30–0:40 — Mod right-clicks suspect post → "Test rules on this item" → form → toast bullets (Phase 3.6 dry-run tester)
- 0:40–0:55 — Mod opens Observatory dashboard pin → event row + stats animate in
- 0:55–0:60 — End card: github.com/StephenSook/context-mod-devvit + FoxxMD credit

- [ ] **Step 3: Commit**

```bash
git add docs/submission/demo-video-runbook.md
git commit -m "docs(submission): 60s demo script outline keyed to shipped features"
```

---

## Phase E — Triage Codex Findings (gated on Phase A completion)

### Task E1: Read Codex output, categorize findings

**Files:**
- Read: `docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md`

- [ ] **Step 1: Read the review**

- [ ] **Step 2: Categorize each finding**

For each: `severity` (CRITICAL/HIGH/MED/LOW), `is_shared_contract` (yes/no), `fix scope` (1-file, multi-file).

- [ ] **Step 3: Build action list**

| Finding | Severity | Contract? | Action |
|---------|----------|-----------|--------|
| (Codex finding 1) | … | yes/no | direct push OR ping-Vinh-first OR defer |

### Task E2: Apply non-contract fixes as atomic commits

For each finding marked `is_shared_contract: no` and severity CRITICAL/HIGH:
- [ ] Write a regression test
- [ ] Apply fix
- [ ] Run full test suite + type-check
- [ ] Atomic commit per fix per rule #1 (one commit per logical fix)
- [ ] Push

### Task E3: Draft contract-touching fixes, ping Vinh

For each finding marked `is_shared_contract: yes`:
- [ ] Draft fix in a local branch (`git checkout -b fix-vinh-<topic>`)
- [ ] Document the proposed contract change in PR description
- [ ] Push branch + open PR with `⚠️ CONTRACT:` prefix per Rule 10
- [ ] Ping Vinh in PR + Discord, wait for OK

### Task E4: Defer LOW + MED findings to post-submission

- [ ] Open a GitHub issue per LOW/MED finding tagged `post-hackathon`
- [ ] Reference in PLAN.md Risk Register

---

## Phase F — Session Wrap (session-memory)

### Task F1: Write Claude Memory session summary

**Files:**
- Create: `~/Documents/Obsidian Vault/Claude Memory/Session - 2026-05-16 Stephen Burndown After Vinh Phase 1+2 Ship.md`

Per `session-memory` skill end-of-session protocol. Sections: What done / Decided / Next / Gotchas / Related.

---

## Self-Review

**Spec coverage:** ✓ All 7 requested work items mapped (Codex review = A1; 3.6 = C1–C5; PLAN.md = B1; 5.3 = D2; 5.4 = D1; 5.5 = D4; 5.6 = D3). Phase E + F are skill-disciplined wrap-up.

**Placeholder scan:** No TBDs, no "add error handling later", no "similar to Task N". Each step has actual content.

**Type consistency:** `DryRunResult` / `DryRunRunResult` / `DryRunActionResult` consistent across C1 (test), C2 (impl), C4 (form caller). `Action` type imported from `../shared/types`. `MenuItemRequest` from `@devvit/web/shared` per existing menu.ts.

**Rule compliance:**
1. Atomic commits — ✓ each task ends in its own commit
2. Playwright verify — ✓ scheduled after B1 (PLAN.md) and D1 (README) per surface table
3. Tool inventory audit — done in parent session response

---

_Plan saved 2026-05-16 by Stephen via Claude Code._
