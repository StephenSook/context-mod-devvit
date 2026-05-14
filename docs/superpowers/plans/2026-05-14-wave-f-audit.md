# Wave F Audit Plan

> **STATUS: COMPLETE** — executed before 2026-05-14; preserved for audit trail. See `git log --oneline` for the commit sequence implementing this plan.

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Verify everything shipped in Wave F (commits c576f06, 4100d85, 1860c8a + the Playwright protocol memory addition) was implemented correctly. Surface bad-code / AI-slop / factual-drift / security / link-rot findings. Fix any HIGH/MED findings as atomic commits before declaring close.

**Architecture:** Six parallel passes (some background, some foreground), then a final fix wave. Codex adversarial is the HARD-RULE primary review per `three-brain` memory; my own audit is a corroboration pass, not the source-of-truth.

**Tech Stack:** bash / curl / Codex / Playwright MCP / check-ai-tone.sh.

---

## Tool inventory audit (per `memory/tool-inventory-audit-per-task.md`)

| Tool | Used? | Why / Why not |
|------|-------|---------------|
| `codex:codex-rescue` sub-agent | ✅ | HARD RULE per `three-brain` memory — "make sure implemented correctly" = Codex review, not self-review |
| `plan-review` skill | ✅ | Audit the wave-f-closeout plan itself for missing pieces |
| `pr-review-toolkit:silent-failure-hunter` sub-agent | ⛔ | Wave F = docs, no try/catch/fallback paths |
| `pr-review-toolkit:comment-analyzer` sub-agent | ⛔ | No code comments to audit |
| `pr-review-toolkit:type-design-analyzer` sub-agent | ⛔ | No types introduced |
| `pr-review-toolkit:code-reviewer` sub-agent | ⛔ | No code changes |
| `feature-dev:code-reviewer` sub-agent | ⛔ | Codex is the review hard-rule; second sub-agent = duplicated work |
| `Playwright` MCP | ✅ | Re-verify screenshot still on disk + dashboard chrome unchanged |
| `curl` via Bash | ✅ | Link verify (anchor links + external URLs in stephen-action-list) |
| `check-ai-tone.sh --strict` | ✅ | Final gate before declaring close |
| `WebSearch` / `WebFetch` | ⛔ | No external claims need re-verification this wave |
| `context7` MCP | ⛔ | No library APIs touched |
| `Firecrawl` MCP | ⛔ | No JS-SPA to scrape |
| `last30days` skill | ⛔ | Week-2 refresh already in earlier session |
| `three-brain` skill (Gemini) | ⛔ | No multimodal / >50K-token doc to skim |
| `session-memory` skill | ✅ | Log audit outcome to memory |
| `green-dot` policy | ✅ | One commit per finding fix |

---

## Pass A — Codex adversarial review (background, HARD RULE primary)

**Trigger:** user message contains "make sure that everything was implemented correctly" + "review" — three-brain memory hard-rule.

- [ ] **A.1** Dispatch `codex:codex-rescue` on the Wave F bundle (5 files):
  - `docs/superpowers/plans/2026-05-14-wave-f-closeout.md` (the plan)
  - `docs/submission/stephen-action-list.md` (new)
  - `docs/submission/submission-day-runbook.md` (frontmatter cross-link added)
  - `docs/submission/outreach-drafts.md` §5 (send-date fix)
  - `memory/playwright-verification-protocol.md` (verification log + local-dev gotcha)

Adversarial framing: "Find every claim in these 5 docs that contradicts the rest of the repo, every time estimate that's unrealistic, every command that won't run, every link that 404s, every date that drifts, every place an AI-tone word slipped past the strict scanner, every security gotcha in `/tmp/mock-cm-server.py`. Verdict: ship / ship-with-fixes / rethink."

- [ ] **A.2** Poll `/codex:status` until complete; capture findings list.

---

## Pass B — Self-audit (foreground, while Codex runs in background)

**Risk:** Stephen's action list has dense cross-references. Drift between this file and the existing runbook / cheat-sheet / outreach is the main bad-implementation surface.

- [ ] **B.1** Cross-reference check: every `[T-N action]` in stephen-action-list must have a matching entry in submission-day-runbook for the same date. Read both side-by-side, table the matches.

- [ ] **B.2** Anchor-link check: stephen-action-list links to `outreach-drafts.md#1b-foxxmd-kanban-seeded-heads-up`, `#4-rdevvit-progress-check`, `#3-foxxmd-optional-quote-ask`. Grep outreach-drafts headings — confirm GitHub auto-generates these exact slugs.

- [ ] **B.3** Date-arithmetic check:
  - T-6 = May 14 (today) — submission target May 20 = correct
  - T-5 = May 15 — submission target May 20 = correct
  - T-3 = May 17 — submission target May 20 = correct
  - T-2 = May 18 — submission target May 20 = correct
  - T-1 = May 19 — submission target May 20 = correct
  - T-0 = May 20 — correct
  - Sanity: do "T-6 today" + "T-0 submission" stay consistent if Stephen reads this file on May 15? (Answer: T-N is relative to submission, not today; should be unambiguous.)

- [ ] **B.4** Command verify: any shell command in stephen-action-list T-1 must actually work from Stephen's terminal. Inspect path quoting + working-dir assumptions.

- [ ] **B.5** Gallery upload order check: stephen-action-list T-0 says "dashboard → modmenu → wiki → install → trigger" — does this match `devpost-form-cheat-sheet.md` Step 3 + the on-disk filenames?

- [ ] **B.6** Phase numbering check: stephen-action-list T-3 says "Phase 1+2 status" but per PLAN.md the user-facing nomenclature has been Phase 1 (engine) + Phase 2 (actions/triggers). Confirm wording is unambiguous.

---

## Pass C — Link + URL verify (curl)

- [ ] **C.1** Verify all https:// URLs in stephen-action-list + plan doc + outreach §5 fix return 2xx via `curl -sI`. External URLs:
  - github.com/StephenSook/context-mod-devvit
  - github.com/FoxxMD/context-mod
  - github.com/FoxxMD/context-mod/issues/152
  - developers.reddit.com/apps/cm-devvit
  - reddit.com/r/Devvit
  - reddit.com/r/cm_devvit_test

- [ ] **C.2** Internal markdown link verify: every `[text](./other.md)` and `[text](#anchor)` resolves to an existing file + heading.

---

## Pass D — AI-tone + security + idempotency

- [ ] **D.1** `./scripts/check-ai-tone.sh --strict` — must stay 0 hits across 11 files (10 paste-day docs + DESIGN.md).

- [ ] **D.2** Security inspection of `/tmp/mock-cm-server.py`:
  - Binds to which interface? (Must be 127.0.0.1, not 0.0.0.0)
  - Returns auth-token any path?
  - Reads files outside `dist/client/`?
  - Logs anything sensitive?
  - Should it be committed to repo or stay ephemeral?

- [ ] **D.3** Idempotency: re-run wave F validation steps (F.1 + F.2) — must produce identical results. Confirms no side-effects accumulated.

---

## Pass E — Playwright re-verify (sanity, not gate)

- [ ] **E.1** Confirm screenshot still on disk at `.playwright-mcp/wave-f-dashboard-demo1-2026-05-14.png`. Confirm size > 0 + magic-byte = PNG via `file`.

- [ ] **E.2** Optional: re-navigate dashboard once more to confirm post-commit state still renders. SKIP if E.1 passes + nothing in `src/client/` changed since last verify.

---

## Pass F — Fix wave + final close

- [ ] **F.1** Triage Codex (Pass A) + self-audit (Pass B-E) findings:
  - HIGH = must fix before close (factual drift, broken commands, security risk, broken links)
  - MED = fix unless time-bound
  - LOW = acknowledge + decide ship/skip per finding

- [ ] **F.2** Atomic commit per finding fix. One commit = one finding. Green-dot policy.

- [ ] **F.3** Final `./scripts/check-ai-tone.sh --strict` — must stay 0 hits.

- [ ] **F.4** Push the fix batch.

- [ ] **F.5** Memory log: append audit outcome to a new memory file `wave-f-audit-2026-05-14.md` OR `MEMORY.md` entry.

- [ ] **F.6** Final summary to Stephen: bundle state + finding count + commit count + next milestone.

---

## Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Codex finds HIGH bug requiring rewrite of stephen-action-list | Med | Time-bound: fix lands in ≤3 commits, else flag for next session |
| Codex finds nothing new (clean ship) | Med | OK — surface "Codex passed clean" as a result, not a worry |
| Anchor links don't match GitHub's auto-generated slugs | High | Test the literal slugs against GitHub's rules: lowercase, alphanumeric, dashes for spaces, strip punctuation |
| Mock server security finding | Low | It's an ephemeral `/tmp` file, not committed — but document it doesn't get committed if user-asked-to-save |
| External URL 404 (Reddit/GitHub) | Low | Re-check via curl; if real 404 then doc-fix |
| Time estimates in action list called out as unrealistic | Med | Realistic for Stephen at ~22 wpm typing on Discord; Codex may push back — accept reasonable reframes |
| Self-audit + Codex duplicate findings | Low | OK — confirms severity ranking |

---

## Verification gates

- After Pass A: Codex returns a verdict + findings list
- After Pass B: self-audit table built; mismatches flagged
- After Pass C: all curl probes 2xx (or documented exception)
- After Pass D: strict scan clean; mock-server inspected
- After Pass E: screenshot intact
- After Pass F: all HIGH/MED findings have a fix commit; push completes

---

## Execution order

1. **Pass A** dispatched as `run_in_background=true` Codex job (long-running)
2. While Codex runs: **Pass B + C + D + E** sequential in foreground
3. Poll Codex completion via `/codex:status`
4. Merge findings (Pass A + B + C + D + E)
5. **Pass F** fix wave
