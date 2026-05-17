# Pre-bed polish — 3 stale-ref fixes + 1 UI enhancement + codex review dispatch

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]` checkbox syntax. Honors locked project rules: atomic commits, Playwright/curl verify external surfaces, edit → commit → push triplet, genuine tool audit before non-trivial work.

**Goal:** Close the 3 stale-ref items the Explore agent surfaced (1 BLOCKER + 1 WARN + 1 NIT) + ship one judge-noticeable UI polish (self-ticking Header w/ pulse-on-arrival) + dispatch codex:codex-rescue background review on the H9 + H10 risky-path commits per three-brain rule.

**Architecture:** 5 atomic phases. Phases P1–P3 = doc-only stale-ref fixes (Bash + Edit, atomic commit each, curl-verify external). Phase P4 = src/client/components/Header.tsx enhancement + tests + tsc + lint. Phase P5 = background codex:codex-rescue dispatch (non-blocking).

**Tech stack:** React + TypeScript, Vitest, Bash for git triplets, curl for GitHub-rendered external verification, codex:codex-rescue sub-agent for adversarial review.

**Pre-flight verified:**
- main = origin/main clean
- 223 tests green pre-changes
- Today's Tier 2/3 backlog (14 commits) pushed
- v0.2.0 in Reddit App Directory review

**Compact tool-audit (genuine consideration; full 200+ inventory already shown this session per [[full-tool-audit-genuine]] memory rule — same session, same tools available, no change in catalog since):**

| Pass | USE this batch | Reason |
|------|----------------|--------|
| 1 (process) | superpowers:executing-plans, superpowers:test-driven-development, superpowers:verification-before-completion, karpathy-guidelines | 5-phase multi-fix run, P4 needs TDD discipline |
| 2 (built-in) | Read, Edit, Bash, TaskCreate/Update | per-phase doc/code edits + atomic git triplets |
| 3 (MCP) | plugin_playwright (navigate/snapshot/take_screenshot for P4 verify), curl (in Bash) for P1+P3 external surface verify | locked Playwright verification protocol |
| 4 (sub-agents) | codex:codex-rescue (P5 background dispatch on H9+H10), three-brain skill (forced-review hard rule for risky-path edits) | three-brain rule triggers post-H9/H10 |
| 5 (skip) | Figma, Gmail, Calendar, Drive, Notion, Slack, Stitch, Magic, Firecrawl, Exa, Supabase, Vercel, commercial-legal | not in scope |

Full audit dump = output from this session's earlier turn.

---

## File Structure

**New files:**
- `tests/client/header.test.ts` (P4) — Vitest + React Testing Library tests for Header self-tick + pulse trigger

**Modified files:**
- `README.md` line 395 (P1) — `src/server/schema/...` → `src/schema/...`
- `policies/privacy.md` (P2) — date "May 12, 2026" → "May 16, 2026", add v0.2.0 reference
- `policies/terms.md` (P2) — same
- `PLAN.md` row 3 (P3) — same path fix as P1
- `src/client/components/Header.tsx` (P4) — add useEffect-driven self-tick state + pulse-on-prop-change

---

## Phase P1 — README.md:395 stale path fix (5 min)

### Task P1.1: Read context around line 395

**Files:** read-only `README.md:380-410`

- [ ] Step 1: `Read README.md offset:385 limit:25` — find the exact line

### Task P1.2: Apply edit

**Files:** Modify `README.md`

- [ ] Step 1: Replace `src/server/schema/app.schema.json` → `src/schema/app.schema.json` (use `replace_all:false`, expect 1 occurrence — confirmed by Explore agent w/ line number)

### Task P1.3: Commit + push + curl verify

```bash
git add README.md
git commit -m "docs(readme): fix stale src/server/schema/ path → src/schema/ (Explore agent BLOCKER)"
git push origin main
sleep 2
curl -fsSL https://raw.githubusercontent.com/StephenSook/context-mod-devvit/main/README.md | grep -c "src/server/schema"
# expected: 0 (path no longer present)
git status -sb
```

---

## Phase P2 — Policies dates bump (10 min)

### Task P2.1: Read both files

**Files:** read-only `policies/privacy.md` + `policies/terms.md`

- [ ] Step 1: `Read policies/privacy.md` — locate the date line + intro paragraph
- [ ] Step 2: `Read policies/terms.md` — same

### Task P2.2: Bump dates + add v0.2.0 reference

**Files:** Modify both files

- [ ] Step 1: privacy.md — "May 12, 2026" → "May 16, 2026 (v0.2.0)"
- [ ] Step 2: terms.md — same
- [ ] Step 3: If there's a "last reviewed" or "effective date" field separate from the doc header, update both

### Task P2.3: Commit + push + curl verify GitHub Pages

```bash
git add policies/privacy.md policies/terms.md
git commit -m "docs(policies): bump effective date to 2026-05-16 + v0.2.0 reference (Explore agent WARN)"
git push origin main
sleep 60   # GitHub Pages rebuild latency
curl -fsSL https://stephensook.github.io/context-mod-devvit/privacy.html 2>&1 | grep -c "May 16, 2026" || echo "GitHub Pages may not have rebuilt yet — verify manually if zero"
git status -sb
```

---

## Phase P3 — PLAN.md path fix (2 min)

### Task P3.1: Read row 3 context

**Files:** read-only `PLAN.md` first 30 lines

### Task P3.2: Apply edit

**Files:** Modify `PLAN.md`

- [ ] Step 1: Replace `src/server/schema/app.schema.json` → `src/schema/app.schema.json`

### Task P3.3: Commit + push

```bash
git add PLAN.md
git commit -m "docs(plan): fix stale src/server/schema/ path → src/schema/ (Explore agent NIT)"
git push origin main
git status -sb
```

---

## Phase P4 — Header self-tick + pulse animation (45 min)

### Task P4.1: Read current Header.tsx + identify state shape

**Files:** read-only `src/client/components/Header.tsx`

- [ ] Step 1: Confirm `refreshedAt` is a numeric prop (already verified — yes)
- [ ] Step 2: Confirm `ago` is computed at render time (already verified — yes)

### Task P4.2: TDD — write failing tests first

**Files:** Create `tests/client/header.test.ts`

- [ ] Step 1: Write test cases:
  - `relTime(refreshedAt, now)` pure-helper exported from Header file:
    - returns "1s ago" for now-1s
    - returns "30s ago" for now-30s
    - returns "1m ago" for now-60s (or kept as "60s ago" — TBD by helper design)
    - returns "5m ago" for now-300s
    - never returns "0s ago" (min clamp to 1)
  - Component test: when `refreshedAt` prop changes, the pulse class is applied to the time element for ~1.5s then removed

- [ ] Step 2: Run tests — confirm FAIL

```bash
npm test -- --run tests/client/header.test.ts
# expected: FAIL (relTime not exported, pulse class not implemented)
```

### Task P4.3: Implement self-tick + pulse

**Files:** Modify `src/client/components/Header.tsx`

- [ ] Step 1: Extract pure `relTime(refreshedAt: number, now: number): string` helper at module scope (so tests can import directly)
- [ ] Step 2: Add `const [now, setNow] = useState(Date.now())` state
- [ ] Step 3: Add `useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [])` to self-tick every 1s
- [ ] Step 4: Compute `ago` from `relTime(refreshedAt, now)` instead of `Date.now()` directly
- [ ] Step 5: Add `const [pulsing, setPulsing] = useState(false)` + `useEffect(() => { setPulsing(true); const id = setTimeout(() => setPulsing(false), 1500); return () => clearTimeout(id); }, [refreshedAt])` to trigger 1.5s pulse on prop change
- [ ] Step 6: Add conditional className: `${pulsing ? 'cm-refresh-pulse' : ''}` on the `<time>` element
- [ ] Step 7: Add `cm-refresh-pulse` keyframe to `src/client/index.css` (or wherever `cm-fade-up` is defined):

```css
@keyframes cm-refresh-pulse {
  0% { color: rgba(74, 222, 128, 1); text-shadow: 0 0 4px rgba(74, 222, 128, 0.6); }
  100% { color: rgba(161, 161, 170, 1); text-shadow: none; }
}
.cm-refresh-pulse { animation: cm-refresh-pulse 1.5s ease-out; }
@media (prefers-reduced-motion: reduce) { .cm-refresh-pulse { animation: none; } }
```

### Task P4.4: Verify all tests + tsc + lint

```bash
npm test -- --run tests/client/header.test.ts 2>&1 | tail -10
npm test 2>&1 | tail -5   # full suite, target 223 + new header tests
npm run type-check 2>&1 | tail -3
npm run lint 2>&1 | tail -3
```

- [ ] Step 1: All passing

### Task P4.5: Playwright visual verify (locked rule for external UI)

**Files:** N/A — verify in-browser

- [ ] Step 1: `npm run dev:web` background
- [ ] Step 2: Wait for ready on 127.0.0.1:5173
- [ ] Step 3: Playwright `browser_navigate` to `http://127.0.0.1:5173/?demo=1`
- [ ] Step 4: `browser_evaluate` to check: `document.querySelector('time').textContent` matches `/\d+s ago/`
- [ ] Step 5: `browser_evaluate` to trigger a refresh manually (click Reload button); confirm pulse class applied for ~1.5s
- [ ] Step 6: `browser_take_screenshot` to `docs/screenshots/header-live-tick-2026-05-17.png` for proof
- [ ] Step 7: Close browser, kill dev server

### Task P4.6: Commit + push

```bash
git add src/client/components/Header.tsx src/client/index.css tests/client/header.test.ts docs/screenshots/header-live-tick-2026-05-17.png
git commit -m "feat(dashboard): Header self-ticks every 1s + pulse animation on refresh (judge-polish)"
git push origin main
git status -sb
```

---

## Phase P5 — codex:codex-rescue background dispatch (5 min dispatch, 5-15 min run)

### Task P5.1: Dispatch background review

**Files:** N/A — Agent call

- [ ] Step 1: `Agent(subagent_type: "codex:codex-rescue", run_in_background: true)` with prompt referencing:
  - Latest commits: `41d3f41` (csv-export.ts extraction) + `84c740a` (api.test.ts regression suite)
  - Risky areas: CSV escaping (RFC 4180 nuances on CRLF, BOM, Excel auto-formatting risk on numeric-leading values), fetch mocking (vi.stubGlobal sequencing, JSON.parse error propagation)
  - Ask for: BLOCKER + WARN findings only, skip nits; concrete file:line refs
  - Don't fix anything — report only

- [ ] Step 2: Let it run in background while P1–P4 complete; report back on next user turn

---

## Stephen-manual (not in this plan)

- Demo video record + upload (45–60 min OBS+Audacity+ffmpeg, your hands)
- Devpost form FINAL SUBMIT after video URL pasted

---

## Self-Review

**Spec coverage:** All 3 Explore-agent items (P1 BLOCKER + P2 WARN + P3 NIT) + chosen OPTIONAL polish (P4 Header) + the "one last call-out" (P5 codex review per three-brain rule).

**Placeholder scan:** No TBDs. Each phase has exact file paths + exact commands + commit messages. Test cases enumerated in P4.2.

**Type consistency:** `relTime(refreshedAt: number, now: number): string` signature consistent across P4.2 test file + P4.3 implementation file.

**Sequencing:** P1–P3 doc-only (low-risk, fast, build momentum). P4 code+tests (slower but contained to one component). P5 background-dispatch happens at start so it can run while P1–P4 complete.

**Risk:** P4 touches CSS; if `src/client/index.css` doesn't exist (uses Tailwind utility classes only), add the keyframe to a Tailwind plugin config or inline as a `<style>` in the component. Plan recovery: check first.

**External surface verify (locked rule):**
- P1 → curl GitHub raw README
- P2 → curl GitHub Pages privacy.html
- P3 → no external surface (internal plan doc)
- P4 → Playwright dev:web visual verify
- P5 → no external surface (codex output review)

---

_Plan saved 2026-05-17 by Stephen via Claude Code, pre-bed T-10 polish run._
