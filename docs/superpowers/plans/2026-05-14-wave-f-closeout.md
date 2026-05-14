# Wave F Close-Out + T-5 Prep — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close out the Tier 1-3 plan's Wave F (verification gates + user-side action list) and prep the May 15 (T-5) outreach send, without touching Vinh's Phase 1 backend lane.

**Architecture:** Four phases, executed sequentially. F.1 runs the four npm gates as a single chained command (fail-fast). F.2 launches the vite dev server, drives Playwright MCP to verify `?demo=1` rendering, captures screenshot evidence. F.4 generates a single new doc — `docs/submission/stephen-action-list.md` — cross-linked from the existing submission-day-runbook. T-5 prep re-reads `outreach-drafts.md §1b/§3/§4` and patches any drift against the now-final state (MHS cut, $19.5K–$25K cash framing, 94-upvote dossier, May 17 fallback gate).

**Tech Stack:** TypeScript / Vite 5 / Vitest / ESLint / Playwright MCP / bash.

---

## Tool inventory audit (per `memory/tool-inventory-audit-per-task.md`)

| Tool | Used? | Why / Why not |
|------|-------|---------------|
| writing-plans skill | ✅ | This plan |
| Playwright MCP (`mcp__plugin_playwright_playwright__*`) | ✅ | F.2 dashboard verify |
| playwright-verification memory protocol | ✅ | Save evidence per memory rule |
| check-ai-tone.sh `--strict` | ✅ | Gate before commits |
| writing-plans `executing-plans` | ⛔ | Skip — plan is short enough for inline execution |
| `feature-dev:code-reviewer` sub-agent | ⛔ | Codex already cleared the bundle |
| `codex:codex-rescue` | ⛔ | All 10 findings closed |
| `last30days` skill | ⛔ | Week-2 refresh already captured in `2026-05-13-research-deltas.md` |
| Firecrawl MCP | ⛔ | No JS-SPA scraping needed |
| `banana` skill | ⛔ | All 5 gallery + thumbnail assets generated |
| `frontend-design` | ⛔ | UI polish (Sparkline + EventRow) shipped in earlier waves |
| `three-brain` skill auto-route | ⛔ | No risky path triggers; review-style cues already routed in earlier cycle |
| `green-dot` atomic commit policy | ✅ | Per finding |
| `context7` MCP | ⛔ | No new library docs needed |
| `stitch` MCP (DESIGN.md spec) | ⛔ | DESIGN.md authored Day 3 evening |

---

## Phase F.1 — npm gates (single fail-fast chain)

**Files:** none (read-only verification)

**Risk:** Vinh's `src/state/`, `src/core/`, `src/rules/`, `src/server/` are empty / non-existent — confirmed via `ls` 2026-05-14. Nothing imports those paths in current Stephen-lane code. Gate should pass clean.

- [ ] **Step F.1.1:** Run combined gate chain.

Run: `cd /Users/stephensookra/Reddiit\ Hacks/context-mod-devvit && npm run type-check && npm run lint && npm test && npm run build`
Expected: all four pass, no errors, `dist/client/index.html` written.

- [ ] **Step F.1.2:** If a gate fails, triage by file path:
  - Fails in `src/client/` → my lane, fix immediately, re-run.
  - Fails in `src/state/`, `src/core/`, `src/rules/`, `src/server/`, `src/routes/triggers.ts`, `src/routes/scheduler.ts` → Vinh's lane, document in PLAN.md Notes col but do not modify; flag for handoff in `outreach-drafts.md`.
  - Fails in `src/lib/` (shared) or `src/index.ts` → triage by git blame; touch only if last author = Stephen.

- [ ] **Step F.1.3:** Commit only if F.1.1 surfaced Stephen-lane fixes. Otherwise skip commit (gate verification is not a code change).

Commit message template:
```
fix(client): <one-line summary of what broke>

Surfaced by Wave F.1 npm gate chain. <file:line> failed
<tool> because <reason>. Fix preserves <invariant>.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Phase F.2 — Playwright dashboard verify

**Files:** none (read-only verification + evidence capture)

**Risk:** `npm run dev` = `devvit playtest` which opens Reddit's developer-portal iframe, not a localhost URL. Use `npx vite dev` for standalone client verification.

- [ ] **Step F.2.1:** Launch vite dev server in background.

Run: `cd /Users/stephensookra/Reddiit\ Hacks/context-mod-devvit && npx vite dev --port 5173 --strictPort` (background)
Expected: `VITE v5.x ready in <ms> ms · Local: http://localhost:5173/`

- [ ] **Step F.2.2:** Navigate Playwright MCP to `http://localhost:5173/?demo=1`.

Tool: `mcp__plugin_playwright_playwright__browser_navigate`
URL: `http://localhost:5173/?demo=1`
Expected: page loads without 404 / blank-screen.

- [ ] **Step F.2.3:** Capture full-page snapshot for evidence.

Tool: `mcp__plugin_playwright_playwright__browser_snapshot`
Expected snapshot contains:
- Stat cards (Actions today / Mod time saved / Active rules / Top rule)
- Sparkline path element
- ≥1 EventRow with `cm-event-arrive` class
- No `[ERROR]` console messages

- [ ] **Step F.2.4:** Hover over Sparkline midpoint to verify tooltip (C.2 from Tier 1-3 wave).

Tool: `mcp__plugin_playwright_playwright__browser_hover` with CSS selector for sparkline svg.
Then `browser_snapshot` again — expect tooltip with format `{hour}:00 · {value}` visible.

- [ ] **Step F.2.5:** Read console messages — must be empty of errors.

Tool: `mcp__plugin_playwright_playwright__browser_console_messages`
Expected: zero entries at level `error`.

- [ ] **Step F.2.6:** Screenshot to `/tmp/wave-f-dashboard-demo1-2026-05-14.png`.

Tool: `mcp__plugin_playwright_playwright__browser_take_screenshot`
fullPage: true
Save path: `/tmp/wave-f-dashboard-demo1-2026-05-14.png`

- [ ] **Step F.2.7:** Close browser + kill vite dev server.

Tool: `mcp__plugin_playwright_playwright__browser_close`
Then: kill background bash shell holding vite dev.

- [ ] **Step F.2.8:** Log result in memory per playwright-verification-protocol — append one-line entry to `memory/playwright-verification-protocol.md` saying what was checked + result + date.

---

## Phase F.4 — Stephen's Tier 3 user-side action list

**Files:**
- Create: `docs/submission/stephen-action-list.md`
- Modify: `docs/submission/submission-day-runbook.md:13` (add cross-link)

- [ ] **Step F.4.1:** Write `docs/submission/stephen-action-list.md`.

Content scope:
- Header: "Stephen-only actions Claude can't take" + rationale (AI-tone discipline + own-voice + 2FA / portal / Discord auth surfaces).
- Five date-tagged blocks: T-6 (May 14 — today), T-5 (May 15), T-3 (May 17), T-2 (May 18), T-1 (May 19), T-0 (May 20).
- Each block: 1-3 actions, each with exact source (paste-ready draft or runbook section), exact verification step, and 30-second-or-less time estimate.
- Footer: "What Claude does for you" — atomic-commit + AI-tone gate + Codex review + Playwright verify + writeup polish. Sets the contract.

- [ ] **Step F.4.2:** Cross-link from `submission-day-runbook.md` top frontmatter.

Edit `submission-day-runbook.md` line 3 frontmatter to mention `stephen-action-list.md` as the user-side companion.

- [ ] **Step F.4.3:** Run `./scripts/check-ai-tone.sh --strict` — must stay at 0 hits.

- [ ] **Step F.4.4:** Atomic commit.

Commit message template:
```
docs(submission): add stephen-action-list — user-only actions on T-6 → T-0

Wave F.4 close-out. Distinguishes the surfaces Stephen owns
(Discord, Devpost portal, YouTube unlisted upload, Devvit publish
button) from the surfaces Claude automates (commits, AI-tone gate,
Codex review, Playwright verify, writeup polish). Cross-linked
from submission-day-runbook frontmatter.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Phase T-5 Prep — outreach drafts alignment

**Files:**
- Read: `docs/submission/outreach-drafts.md` §1b (FoxxMD kanban-seeded heads-up), §3 (FoxxMD quote ask — optional), §4 (r/Devvit progress check)

- [ ] **Step T-5.1:** Read full `outreach-drafts.md`.

- [ ] **Step T-5.2:** Audit each draft for drift against the now-final state:
  - MHS state = "cut per PR #96" (no "pending approval" / "Phase 4 stretch" framings).
  - Cash framing = "$19.5K–$25K realistic 12-mo direct-cash envelope; $75K is DQE Tier-8 ceiling, not expected capture." (no bare "$75K Developer Funds" / no "$5K-$10.5K theoretical ceiling" anywhere a judge could read it as overall).
  - Live-vs-demo wording = "Once Phase 1-3 wiring lands…" not "the bot reads every new post" (scope honesty).
  - 94-upvote dossier = if any draft references the r/modnews data, ensure it cites `pillar-5-numbers.md §9.5` not just the writeup §1 paragraph.
  - Fallback gate = May 17 (T-3), not May 22.

- [ ] **Step T-5.3:** Patch any drift in-place. Each draft = its own atomic commit if it needed a fix; skip commits for drafts that were clean.

- [ ] **Step T-5.4:** Final `./scripts/check-ai-tone.sh --strict` post-patches.

- [ ] **Step T-5.5:** Print a one-paragraph "Ready to send 2026-05-15" summary listing which §s Stephen pastes where (Discord DM to FoxxMD, optional FoxxMD quote ask, r/Devvit reply on May 19 not May 15).

---

## Phase Push + Summary

- [ ] **Step Push.1:** `git push origin main` after all atomic commits.

- [ ] **Step Push.2:** Print final summary table to Stephen:
  - F.1 result (gates pass / fail)
  - F.2 result (screenshot path + console clean)
  - F.4 result (new file path + cross-link)
  - T-5 result (drafts ready, send target = 2026-05-15)
  - Commit count this cycle
  - Next milestone = T-5 outreach send (Stephen, May 15) → T-3 Phase 1+2 confirm (Vinh, May 17) → T-2 demo recording (Stephen, May 18) → T-0 Devpost submit (Stephen, May 20).

---

## Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `npm run type-check` fails on something Vinh-adjacent | Low | Confirmed empty Vinh dirs 2026-05-14; nothing imports from them |
| `npx vite dev` collides with running playtest on same port | Low | `--strictPort` flag fails clearly if busy; kill conflict + retry |
| Playwright MCP screenshot path collision in `/tmp` | Low | Date-stamped filename |
| `?demo=1` flag doesn't render seeded data | Med | Verified earlier session — App.tsx line 19 confirms opt-in path; if broken, gate fail surfaces it |
| `stephen-action-list.md` introduces AI-tone hits (own-voice section especially risky) | Low | Strict scan before commit |
| outreach drafts already clean → no patch commits | OK | Skip → green dots still come from F.4 + any F.1 fixes |
| Vite dev server doesn't shut down cleanly | Low | Kill via Bash background-shell control |

---

## Verification gates

- After F.1: all four npm scripts exit 0.
- After F.2: Playwright snapshot shows stat cards + sparkline + ≥1 event-row + hover tooltip; console clean; screenshot saved to `/tmp/`.
- After F.4: new file exists; cross-link from submission-day-runbook present; strict AI-tone scan clean.
- After T-5: outreach-drafts.md audited section-by-section; any drift patched; strict scan clean.
- After Push: `git log origin/main..HEAD` returns empty.

---

## Execution order (no parallelism — sequential by design)

1. F.1 (npm chain) — must pass before F.2 launches dev server
2. F.2 (Playwright) — independent of F.4, but sequencing keeps mental context clean
3. F.4 (action list)
4. T-5 (outreach audit)
5. Push + final summary
