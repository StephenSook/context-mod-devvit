# Audit-4 — Integration + Vinh-Readiness + GitHub State

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** 4th audit cycle. Different focus from prior 3 — not bug-hunting. Check: (1) cumulative integration state w/ all 30+ commits since audit-2, (2) PLAN.md Vinh-readiness, (3) GitHub repo state, (4) `dev:web` fresh-install actually works, (5) commits not introducing regressions in already-fixed areas, (6) AI-slop scrub one final time.

**Why now:** user explicit ask + we're waiting on Vinh. Worth verifying everything we ship while idle.

**Architecture:** parallel dispatch (Codex + silent-failure-hunter on `mock-server.cjs`) + foreground checks (gh CLI, PLAN.md walkthrough, manual phrase scan, dev:web dry-run).

---

## Tool inventory audit

| Tool | Used? | Why |
|------|-------|-----|
| writing-plans | ✅ | This plan |
| codex:codex-rescue | ✅ | Adversarial cumulative + Vinh-readiness review |
| pr-review-toolkit:silent-failure-hunter | ✅ | Focus on `mock-server.cjs` (new code) |
| `gh` CLI | ✅ | Repo state + CI status |
| Playwright | ⛔ | Already verified twice this session |
| Banana / Firecrawl / NotebookLM | ⛔ | Not relevant |
| green-dot atomic policy | ✅ | Per-finding fix commits |
| check-ai-tone --strict | ✅ | Gate per commit |

---

## Phase A — GitHub state check (foreground, 5 min)

- [ ] **A.1** `git status` — confirm clean working tree
- [ ] **A.2** `git log origin/main..HEAD` — confirm 0 unpushed commits
- [ ] **A.3** `gh repo view` metadata snapshot
- [ ] **A.4** `gh run list --limit 5` — confirm CI green on latest commits
- [ ] **A.5** `gh issue list` / `gh pr list` — any open issues/PRs?

---

## Phase B — Dispatch agents (background)

- [ ] **B.1** Codex adversarial on commits since audit-2 close + PLAN.md Vinh-readiness
- [ ] **B.2** silent-failure-hunter on `scripts/dev/mock-server.cjs` (new code path)

---

## Phase C — PLAN.md Vinh-readiness walkthrough (foreground, 10 min)

Walk PLAN.md as if Vinh just pulled the repo + opened the file fresh. For each ⬜ task in his lane:
- Is the file path explicit?
- Are dependencies clear?
- Are the deliverables (functions / shapes / interfaces) named?
- Does the description tell him what to build vs. just naming the task?

Flag any task that would require Vinh to ask Stephen "what does X mean?" or "where do I look for Y?"

---

## Phase D — Manual AI-slop phrase scan (foreground, 5 min)

Strict scanner is clean. Manual scan for phrase patterns it misses:
- "comprehensive solution"
- "build on top of"
- "out of the box"
- "single source of truth" (3 hits found, 1 fixed; check remaining)
- "best of both worlds"
- "first-class"
- "well-tested"
- "production-grade" (vs. "production")

---

## Phase E — `dev:web` fresh-install dry-run (foreground, 5 min)

- [ ] **E.1** `rm -rf dist/ node_modules/.cache/` (simulated fresh state — don't actually rm node_modules)
- [ ] **E.2** `npm run dev:web` from clean state
- [ ] **E.3** Confirm server up, routes respond, no Node deprecation warnings

---

## Phase F — Merge findings + fix wave + push

---

## Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Codex stalls again (last cycle 21-min 0-output) | Med | Hard cap response, distinct prompt framing, run silent-failure-hunter in parallel as backup |
| PLAN.md ambiguous for Vinh on specific tasks | Med | Flag specifically + add clarifying notes per gap |
| `dev:web` fresh-install reveals issues | Low | Already smoke-tested earlier today |
| GitHub state has uncommitted changes (drift from last push) | Very low | Confirmed pushed via final commit a few minutes ago |
| Cumulative-integration finds new contradictions | Med | Each fix = atomic commit |

---

## Verification gates

- After A: GitHub state == 0 unpushed + CI green + 0 critical issues
- After C: PLAN.md walk produces ≤3 clarification items for Vinh
- After D: 0 manual phrase-pattern hits
- After E: `dev:web` works clean
- After F: all findings actioned, repo pushed
