Reading additional input from stdin...
OpenAI Codex v0.128.0 (research preview)
--------
workdir: /Users/stephensookra/Reddiit Hacks/context-mod-devvit
model: gpt-5.5
provider: openai
approval: never
sandbox: workspace-write [workdir, /tmp, $TMPDIR, /Users/stephensookra/.codex/memories]
reasoning effort: none
reasoning summaries: none
session id: 019e3372-07bd-7d71-9c5c-df48d744240d
--------
user
Adversarial code review of full session work. Diff at /tmp/session-2026-05-16.diff (10,920 lines — full df05b37..HEAD range for StephenSook/context-mod-devvit). Use shell tools to read it + cross-reference with /Users/stephensookra/Reddiit\ Hacks/context-mod-devvit/.

Scope:
- Vinh Phase 1+2+3 ships (6694109, 9532cf4, 983c949) + interim plan-flip commits
- Stephen contract-hotfixes (274aef6 dry-run, 8f6d608 repost SET NX, dafe050 commitAction retries, fc3851a lease token)
- Stephen Step 3.6 dry-run tester (5930074 dryRunActivity, 6feed7c menu, 50bda17 form, 778b60a TS guard, 3f8c9f4 test fix)
- Doc commits (6505e2d README, 075a927 e2e scenarios, d6972c7 writeup, d19e063 demo script, 8fb5849 codex review + vinh ping)
- Plan commit (dfc1b80)
- PLAN.md status flips (a227d68 3.5 + 9923622 3.6)

Focus areas:
1. AI drift / template-feel in docs (writeup-draft.md, e2e-scenarios.md, demo-video-script.md, README.md Status table refresh) — flag any prose that reads AI-template vs first-person Stephen voice per D10
2. Stephen 3.6 dryRunActivity correctness vs handleActivity — does the sibling actually mirror the contract or did Stephen drift?
3. Stephen 4 hotfixes vs Codex original report — did Stephen actually fix what was flagged or work around it?
4. New tests: are assertions tight (asserting exact shape) or weak (asserting exists)?
5. Atomic commit discipline — did any commit bundle unrelated changes?
6. ⚠️ CONTRACT discipline — did any non-Vinh-territory change slip past as non-contract when it should have pinged?
7. Type-safety (exactOptionalPropertyTypes), null-safety, fail-mode handling on the new files
8. Coordination protocol — was PLAN.md rebase resolved correctly?

Output STRICT MARKDOWN: CRITICAL / HIGH / MED / LOW / KUDOS sections. Per finding: file:line citation, 1-paragraph problem, suggested fix (code block if non-trivial), IS_SHARED_CONTRACT yes/no, IS_AI_DRIFT yes/no. End with SUMMARY count.
codex
I’ll use the PR review skill for this because the request is explicitly an adversarial diff review. I’m going to inspect the session diff first, then cross-reference the current files for exact line citations and test context.
exec
/bin/zsh -lc "sed -n '1,220p' /Users/stephensookra/.agents/skills/pr-review/SKILL.md" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
---
name: pr-review
description: 'Diff-based PR review across code quality, test coverage, silent failures, type design, and comment quality with severity-ranked findings. Triggers on: "review my PR", "review this code", "check my changes", "audit this PR", "code review". NOT for pre-landing gate, use pre-landing-review.'
metadata:
  version: 1.1.1
  category: review
  tags: [code-review, pull-request, quality, diff-analysis]
  difficulty: intermediate
  phase: review
---

# PR Review

Diff-based code review across five dimensions. Reads the changed files, selects
applicable review methodologies, and produces an aggregated report with severity-ranked
findings.

## Reference Files

| File                            | Contents                                                | Load When                       |
| ------------------------------- | ------------------------------------------------------- | ------------------------------- |
| `references/code-review.md`     | Guideline compliance, bug detection, confidence scoring | Always                          |
| `references/test-analysis.md`   | Behavioral test coverage, criticality rating            | Test files changed              |
| `references/error-handling.md`  | Silent failure patterns, catch block analysis           | Error handling changed          |
| `references/type-design.md`     | Invariant analysis, 4-dimension rating rubric           | Type definitions added/modified |
| `references/comment-quality.md` | Comment accuracy, long-term value, rot detection        | Comments/docstrings added       |

---

## Workflow

### Phase 1: Scope

1. Determine the review target:
   - Default: `git diff` (unstaged changes)
   - If user specifies a PR: `git diff main...HEAD` or `gh pr diff <number>`
   - If user specifies files: review those files directly
2. List all changed files with `git diff --name-only`
3. Read the project's CLAUDE.md (if present) for project-specific rules

### Phase 2: Route

Classify changed files and select applicable dimensions:

| Condition                                                                    | Dimension       | Reference to Load               |
| ---------------------------------------------------------------------------- | --------------- | ------------------------------- |
| Always                                                                       | Code review     | `references/code-review.md`     |
| Files matching `*test*`, `*spec*`, `*_test.*`, `test_*`                      | Test analysis   | `references/test-analysis.md`   |
| Files containing try/catch, except, .catch, Result, error callbacks          | Error handling  | `references/error-handling.md`  |
| Files containing class, interface, type, struct, enum, dataclass definitions | Type design     | `references/type-design.md`     |
| Files with new/modified docstrings, JSDoc, or block comments                 | Comment quality | `references/comment-quality.md` |

Load only the reference files that apply. Skip dimensions with no matching files.

### Phase 3: Review

For each applicable dimension, analyze the diff using the loaded methodology:

1. **Code review** — scan every changed file for guideline violations and bugs.
   Apply confidence scoring (0-100). Only report issues >= 80.
2. **Test analysis** — map test coverage to changed code paths. Rate gaps 1-10.
   Only report gaps >= 5.
3. **Error handling** — examine every error handler in the diff for silent failures.
   Classify CRITICAL/HIGH/MEDIUM.
4. **Type design** — evaluate new or modified types on 4 dimensions (encapsulation,
   invariant expression, usefulness, enforcement). Rate each 1-10.
5. **Comment quality** — verify accuracy, assess long-term value, flag comment rot.

### Phase 4: Aggregate

Merge all findings into a single report, deduplicated and severity-ranked.

**Deduplication rules:**

- If two dimensions flag the same file:line, keep the higher-severity finding
- If code-review and error-handling both flag an empty catch block, merge into one
  finding with the error-handling severity (it's the specialist)

**Severity mapping across dimensions:**

| Dimension       | Maps to Critical    | Maps to Important        | Maps to Suggestion    |
| --------------- | ------------------- | ------------------------ | --------------------- |
| Code review     | Confidence 90-100   | Confidence 80-89         | —                     |
| Test analysis   | Rating 9-10         | Rating 7-8               | Rating 5-6            |
| Error handling  | CRITICAL            | HIGH                     | MEDIUM                |
| Type design     | Any rating <= 3/10  | Any rating 4-6/10        | Rating 7-8/10         |
| Comment quality | Factually incorrect | Misleading or incomplete | Restates obvious code |

---

## Output Format

```text
# PR Review Summary

**Scope:** [X files changed, Y dimensions applied]
**Dimensions:** [list of active dimensions]

## Critical Issues (must fix before merge)
- **[dimension]** `file:line` — Description. Fix suggestion.

## Important Issues (should fix)
- **[dimension]** `file:line` — Description. Fix suggestion.

## Suggestions (consider)
- **[dimension]** `file:line` — Description.

## Strengths
- What's well-done in this changeset.

## Recommended Action
1. Fix critical issues
2. Address important issues
3. Consider suggestions
4. Re-run review after fixes
```

If no issues are found at any severity level, confirm the code meets standards with
a brief summary of what was reviewed and which dimensions were applied.

---

## Aspect Selection

Users can request specific dimensions instead of running all:

| User Says                                       | Dimensions Applied       |
| ----------------------------------------------- | ------------------------ |
| "review my PR" / "check my changes"             | All applicable (default) |
| "review the code" / "check code quality"        | Code review only         |
| "check the tests" / "is test coverage good"     | Test analysis only       |
| "check error handling" / "find silent failures" | Error handling only      |
| "review the types" / "check type design"        | Type design only         |
| "check the comments" / "review documentation"   | Comment quality only     |

When a specific aspect is requested, load only that reference file and skip routing.

---

## Error Handling

| Problem                     | Resolution                                                                    |
| --------------------------- | ----------------------------------------------------------------------------- |
| No git diff available       | Ask user to specify files or scope                                            |
| CLAUDE.md not found         | Review against general best practices; note the absence                       |
| No test files in diff       | Skip test analysis dimension; note in output                                  |
| Diff is empty               | Report "no changes to review" and stop                                        |
| Diff exceeds context limits | Focus on files the user is most likely to care about; summarize skipped files |

---

## Calibration Rules

1. **Precision over recall.** A false positive erodes trust in the review. Only report
   issues at >= 80 confidence (code review) or >= 5 criticality (tests). Silence is
   better than noise.
2. **File:line references are mandatory.** Every finding must include a specific location.
   Vague findings ("consider improving error handling") are not actionable.
3. **Project rules override general rules.** If CLAUDE.md says "use arrow functions",
   do not flag arrow functions even if conventional style prefers `function` declarations.
4. **Deduplication is mandatory.** If two dimensions flag the same issue, merge them.
   Never report the same problem twice.
5. **Acknowledge strengths.** A review that only lists problems is demoralizing. Note
   what's done well, even briefly.
6. **Code-refiner handles simplification.** This skill reviews and reports. It does not
   refactor or simplify — that's the `code-refiner` skill's job. Keep the roles separate.

## Rationalizations

| Rationalization | Reality |
|---|---|
| "Tests pass, so the code is fine" | Tests are necessary but insufficient — they miss architecture, security, readability, and maintainability concerns |
| "It's a small diff, no real review needed" | Small changes cause most production incidents; a 3-line auth bypass is worse than a 300-line refactor |
| "We'll clean it up later" | Later never comes — the review IS the quality gate before code becomes legacy |
| "The author is senior, I trust them" | Seniority doesn't prevent mistakes; fresh eyes catch what familiarity blinds |
| "I already reviewed similar code recently" | Each diff has unique context — assumptions from past reviews cause missed issues |
| "This is just a refactor, nothing can break" | Refactors change behavior in subtle ways — verify with tests and trace call sites |

## Red Flags

- Approving without reading every changed file in full (not just diff hunks)
- No file:line references in findings — vague feedback is not actionable
- Skipping a review dimension because "it looks fine"
- Reporting only style issues while ignoring logic, security, or architecture
- Reviewing generated code (migrations, protobuf stubs) with the same rigor as hand-written code
- Merging findings from different dimensions without deduplication

## Verification

- [ ] Every changed file read in full, not just diff hunks
- [ ] Each review dimension scored: correctness, security, performance, readability, architecture
- [ ] Every finding includes a file:line reference
- [ ] At least one actionable finding per 100 lines changed, or explicit "no issues found" with justification
- [ ] Review summary includes risk level (LOW/MEDIUM/HIGH/CRITICAL) and blocking vs. non-blocking classification
- [ ] Strengths acknowledged — review is not 100% negative

codex
I have the review rubric loaded. Next I’m mapping changed files and commit structure so the findings can cite current line numbers rather than just diff offsets.
exec
/bin/zsh -lc 'git status --short && git log --oneline --decorate --max-count=35' in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "rg '"'^diff --git'"' /tmp/session-2026-05-16.diff | sed 's/"'^diff --git a'"\\///' | sed 's/ b\\// -> /'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
PLAN.md -> PLAN.md
README.md -> README.md
devvit.json -> devvit.json
docs/submission/demo-video-script.md -> docs/submission/demo-video-script.md
docs/submission/e2e-scenarios.md -> docs/submission/e2e-scenarios.md
docs/submission/writeup-draft.md -> docs/submission/writeup-draft.md
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md -> docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md
docs/superpowers/codex-reviews/2026-05-16-vinh-ping-contract-findings.md -> docs/superpowers/codex-reviews/2026-05-16-vinh-ping-contract-findings.md
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md -> docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md -> docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md
eslint.config.js -> eslint.config.js
package-lock.json -> package-lock.json
package.json -> package.json
src/actions/approve.ts -> src/actions/approve.ts
src/actions/ban.ts -> src/actions/ban.ts
src/actions/comment.ts -> src/actions/comment.ts
src/actions/lock.ts -> src/actions/lock.ts
src/actions/remove.ts -> src/actions/remove.ts
src/actions/report.ts -> src/actions/report.ts
src/actions/userFlair.ts -> src/actions/userFlair.ts
src/config/default-config.ts -> src/config/default-config.ts
src/core/config.ts -> src/core/config.ts
src/core/configSource.ts -> src/core/configSource.ts
src/core/dryRunActivity.ts -> src/core/dryRunActivity.ts
src/core/filters.ts -> src/core/filters.ts
src/core/handleActivity.ts -> src/core/handleActivity.ts
src/core/namedRules.ts -> src/core/namedRules.ts
src/core/runAction.ts -> src/core/runAction.ts
src/core/runCheck.ts -> src/core/runCheck.ts
src/core/runRule.ts -> src/core/runRule.ts
src/core/runRun.ts -> src/core/runRun.ts
src/core/template.ts -> src/core/template.ts
src/lib/idem.ts -> src/lib/idem.ts
src/routes/api.ts -> src/routes/api.ts
src/routes/forms.ts -> src/routes/forms.ts
src/routes/menu.ts -> src/routes/menu.ts
src/routes/scheduler.ts -> src/routes/scheduler.ts
src/routes/triggers.ts -> src/routes/triggers.ts
src/rules/author.ts -> src/rules/author.ts
src/rules/regex.ts -> src/rules/regex.ts
src/rules/repost.ts -> src/rules/repost.ts
src/rules/ruleset.ts -> src/rules/ruleset.ts
src/schema/app.schema.json -> src/schema/app.schema.json
src/shared/normalize.ts -> src/shared/normalize.ts
src/shared/types.ts -> src/shared/types.ts
src/state/configStore.ts -> src/state/configStore.ts
src/state/keys.ts -> src/state/keys.ts
src/state/migrations.ts -> src/state/migrations.ts
src/state/recentEvents.ts -> src/state/recentEvents.ts
tests/actions/actions.test.ts -> tests/actions/actions.test.ts
tests/config/default-config.test.ts -> tests/config/default-config.test.ts
tests/core/config.test.ts -> tests/core/config.test.ts
tests/core/configSource.test.ts -> tests/core/configSource.test.ts
tests/core/dryRunActivity.test.ts -> tests/core/dryRunActivity.test.ts
tests/core/filters.test.ts -> tests/core/filters.test.ts
tests/core/handleActivity.test.ts -> tests/core/handleActivity.test.ts
tests/core/namedRules.test.ts -> tests/core/namedRules.test.ts
tests/core/runAction.test.ts -> tests/core/runAction.test.ts
tests/core/runCheck.test.ts -> tests/core/runCheck.test.ts
tests/core/runRun.test.ts -> tests/core/runRun.test.ts
tests/core/template.test.ts -> tests/core/template.test.ts
tests/lib/idem-commit.test.ts -> tests/lib/idem-commit.test.ts
tests/routes/forms-test-rules.test.ts -> tests/routes/forms-test-rules.test.ts
tests/routes/menu-test-rules.test.ts -> tests/routes/menu-test-rules.test.ts
tests/rules/author.test.ts -> tests/rules/author.test.ts
tests/rules/regex.test.ts -> tests/rules/regex.test.ts
tests/rules/repost.test.ts -> tests/rules/repost.test.ts
tests/rules/ruleset.test.ts -> tests/rules/ruleset.test.ts
tests/shared/normalize.test.ts -> tests/shared/normalize.test.ts
tests/state/configStore.test.ts -> tests/state/configStore.test.ts
tests/state/keys.test.ts -> tests/state/keys.test.ts
tests/state/recentEvents.test.ts -> tests/state/recentEvents.test.ts
tsconfig.json -> tsconfig.json

exec
/bin/zsh -lc "rg --files -g 'CLAUDE.md' -g 'PLAN.md' -g 'README.md' -g '*dry*' -g '*activity*' -g '*scenario*' -g '*script*' -g '*writeup*'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
src/core/dryRunActivity.ts
assets/gallery-dryrun.png
PLAN.md
examples/README.md
README.md
docs/submission/e2e-scenarios.md
docs/submission/writeup-draft.md
docs/submission/demo-video-script.md
tests/core/dryRunActivity.test.ts

 succeeded in 127ms:
d19e063 (HEAD -> main, origin/main, origin/HEAD) docs(submission): demo video script Beats 3+4 — live data path canonical, dry-run promoted
d6972c7 docs(submission): writeup Phase 1+2+3 build journal — first-person per D10
075a927 docs(submission): e2e scenarios A–H draft (Step 5.3)
6505e2d docs(readme): refresh Status table — Phase 1+2+3 shipped + Codex hotfixes baked in
9923622 status: 3.6 ✅ dry-run rule tester — menu + form + dryRunActivity sibling shipped
50bda17 feat(forms): wire /test-rules-submit → dryRunActivity → toast bullets (Step 3.6 complete)
3f8c9f4 test(menu): loosen toast regex to match actual phrasing
6feed7c feat(menu): wire /test-rules → showForm w/ thingId pre-filled (Step 3.6 — half 1)
778b60a fix(dry-run): exactOptionalPropertyTypes guard on wouldHaveCalled spread
5930074 feat(dry-run): src/core/dryRunActivity.ts — non-contract pipeline for Step 3.6
8fb5849 docs(codex-review): Vinh Phase 1+2 review (2C/7H/5M/3L) + Vinh ping draft
fc3851a fix(idem): lease owner token — close third-execution race on slow-worker timeout
dafe050 fix(idem): commitAction retries done-write 3x + never releases pending on failure
8f6d608 fix(repost): SET NX atomic — race-eliminate concurrent same-URL dedupe
274aef6 fix(dry-run): global config.dryRun is authoritative — close per-action bypass
a227d68 status: 3.5 ✅ dashboard custom post — Wave A–F shipped
96d1841 docs(plan): flip Vinh Phase 3 rows to ✅ — config UX + live dashboard (commit c8952b3)
983c949 feat(phase-3): config UX + live dashboard data — 6 steps, 147 tests green, verified live
dfc1b80 docs(plans): save Stephen burndown plan after Vinh Phase 1+2 ship
8218016 chore(rename): cm-devvit → contextmod-vinh + dev sub contextmod_vinh_dev
1370214 docs(plan): flip Vinh Phase 2 rows to ✅ — actions+handleActivity shipped (commit 9532cf4)
9532cf4 feat(phase-2): ContextMod actions + handleActivity — 6 steps, 137 tests green, verified live
2ecb2ea fix(ci): extend ESLint typed-server glob to Phase 1 dirs + drop useless escapes
512c74f docs(plan): flip Vinh Phase 1 rows to ✅ — engine shipped (commit 6694109)
6694109 feat(phase-1): ContextMod rule engine — 11 steps, 93 tests green
df05b37 docs(runbook): expand failure-modes — CI red + Pages 502 + app-review bounce
051ed2a fix(ai-tone): scrub 3 phrase patterns Codex found past the scanner
da9b509 docs(migration): schema-compat matrix — Codex Q10 "one commit before 5/20"
12206df docs(plan): Vinh-readiness — expand 7 ambiguous task rows + fix schema path
3a29795 docs(plans): save audit-4 integration plan
ce4074a fix(dev-server): silent-failure hunter hardening — 8 findings closed
220597e docs(plans): save dev:web plan — local-dashboard final 100% lever
cd11a5e docs(readme): Run-the-dashboard-locally section + examples/ link
fe19ddc feat(dev): npm run dev:web — local dashboard, zero Devvit auth
5b206f0 docs(plans): save a11y-polish plan

exec
/bin/zsh -lc "sed -n '1,220p' CLAUDE.md 2>/dev/null || true" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "sed -n '1,220p' /Users/stephensookra/.agents/skills/pr-review/references/test-analysis.md" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "sed -n '1,220p' /Users/stephensookra/.agents/skills/pr-review/references/code-review.md" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
 succeeded in 0ms:
# Code Review Methodology

Review code against project guidelines (CLAUDE.md) with high precision. Minimize false
positives — quality over quantity.

## Review Scope

Default: unstaged changes from `git diff`. User may specify different scope (staged
changes, specific files, PR diff).

## Responsibilities

**Project Guidelines Compliance**

- Import patterns and module structure
- Framework conventions and language-specific style
- Function declarations and naming conventions
- Error handling and logging patterns
- Testing practices and platform compatibility

**Bug Detection**

- Logic errors and off-by-one mistakes
- Null/undefined handling gaps
- Race conditions and concurrency issues
- Memory leaks and resource management
- Security vulnerabilities (injection, XSS, auth bypass)
- Performance regressions (N+1 queries, unbounded loops)

**Code Quality**

- Significant duplication
- Missing critical error handling
- Accessibility problems (if frontend)
- Inadequate test coverage for new code paths

## Confidence Scoring

Rate each issue 0-100. Only report issues scoring >= 80.

| Range  | Meaning                                      |
| ------ | -------------------------------------------- |
| 91-100 | Critical bug or explicit CLAUDE.md violation |
| 80-90  | Important issue requiring attention          |
| 51-75  | Valid but low-impact (do not report)         |
| 26-50  | Minor nitpick (do not report)                |
| 0-25   | Likely false positive (do not report)        |

## Output Format

Start by listing files under review. For each issue:

```text
**[CRITICAL]** (confidence: 95) `src/auth.py:42`
Description of the issue.
Rule: [CLAUDE.md rule or bug category]
Fix: Concrete suggestion with code example.
```

Group by severity:

1. **Critical** (90-100): Must fix before merge
2. **Important** (80-89): Should fix, significant quality impact

If no issues >= 80 confidence exist, confirm the code meets standards with a brief
summary of what was reviewed.

 succeeded in 0ms:
# Test Coverage Analysis Methodology

Analyze behavioral test coverage — not line coverage. Focus on tests that prevent real
bugs, not academic completeness.

## Analysis Process

1. Examine the diff to identify new functionality and modifications
2. Map existing tests to changed code paths
3. Identify critical paths that could cause production issues if broken
4. Check for implementation-coupled tests that break on refactoring
5. Find missing negative cases and error scenarios
6. Evaluate integration points and their coverage

## Critical Gap Identification

Look for:

- Untested error handling paths that could cause silent failures
- Missing boundary condition tests (zero, one, max, overflow)
- Uncovered business logic branches
- Absent negative test cases for validation logic
- Missing async/concurrent behavior tests where relevant
- Integration points tested only in isolation

## Test Quality Evaluation

Tests should:

- Test behavior and contracts, not implementation details
- Catch meaningful regressions from future code changes
- Be resilient to reasonable refactoring
- Follow DAMP principles (Descriptive and Meaningful Phrases)
- Avoid mocking what they're testing

## Criticality Rating

| Rating | Criteria                                     | Example                   |
| ------ | -------------------------------------------- | ------------------------- |
| 9-10   | Data loss, security issues, system failures  | Auth bypass with no test  |
| 7-8    | User-facing errors in business logic         | Payment rounding untested |
| 5-6    | Edge cases causing confusion or minor issues | Empty input not tested    |
| 3-4    | Nice-to-have for completeness                | Redundant enum variant    |
| 1-2    | Optional minor improvements                  | Trivial getter            |

## Output Format

```text
## Test Coverage Analysis

### Summary
Brief overview of coverage quality.

### Critical Gaps (rating 8-10)
- [file:line] What's untested, what failure it would catch, criticality rating

### Important Improvements (rating 5-7)
- [file:line] What's weakly tested, suggested improvement, rating

### Test Quality Issues
- Tests coupled to implementation rather than behavior
- Brittle assertions that break on valid refactoring

### Positive Observations
- Well-tested areas that follow best practices
```

Do not suggest tests for trivial getters/setters unless they contain logic. Consider
whether existing integration tests already cover a scenario before flagging it.

codex
There is no `CLAUDE.md` in this checkout, so I’m reviewing against the project’s visible contracts and the requested D10/contract-discipline rules. I’m narrowing now on dry-run parity, hotfix behavior, docs tone, and tests.
exec
/bin/zsh -lc "nl -ba src/core/dryRunActivity.ts | sed -n '1,260p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "nl -ba tests/core/dryRunActivity.test.ts | sed -n '1,320p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "nl -ba src/core/handleActivity.ts | sed -n '1,280p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
     1	/**
     2	 * Step 3.6 — Dry-run rule tester pipeline.
     3	 *
     4	 * Mirrors handleActivity's read-and-evaluate flow but:
     5	 *   - Forces dryRun: true on every action (overrides config + per-action setting)
     6	 *   - Returns structured DryRunResult instead of writing to recentEvents ZSET
     7	 *   - Surfaces non-triggered runs so the form UI can show "no rules matched"
     8	 *
     9	 * Non-contract design choice (2026-05-16): keeps Vinh's handleActivity void
    10	 * signature stable. Slight pipeline duplication (~30 lines) is the cost.
    11	 *
    12	 * Codex H1 (2026-05-16) fixed: global config.dryRun=true now blocks per-action
    13	 * dryRun=false. Since this function ALWAYS sets action.dryRun=true, that gate
    14	 * always elevates, regardless of config.dryRun setting. No safety bypass.
    15	 */
    16	
    17	import type { Item, Author, Action } from '../shared/types';
    18	import * as configStore from '../state/configStore';
    19	import { runRun } from './runRun';
    20	import { runAction } from './runAction';
    21	
    22	export interface DryRunActionResult {
    23	  kind: string;
    24	  wouldHaveCalled?: string;
    25	}
    26	
    27	export interface DryRunRunResult {
    28	  runName: string;
    29	  triggered: boolean;
    30	  checkName?: string;
    31	  actions: DryRunActionResult[];
    32	}
    33	
    34	export interface DryRunResult {
    35	  configPresent: boolean;
    36	  configRev?: number;
    37	  runs: DryRunRunResult[];
    38	}
    39	
    40	export async function dryRunActivity(
    41	  item: Item,
    42	  author: Author,
    43	  subredditName: string,
    44	): Promise<DryRunResult> {
    45	  const current = await configStore.getCurrentRev(subredditName);
    46	  if (!current) {
    47	    return { configPresent: false, runs: [] };
    48	  }
    49	
    50	  const runs: DryRunRunResult[] = [];
    51	  for (const run of current.config.runs) {
    52	    const result = await runRun(run, item, author, subredditName);
    53	    if (!result.triggered) {
    54	      runs.push({ runName: run.name, triggered: false, actions: [] });
    55	      continue;
    56	    }
    57	
    58	    const actions: DryRunActionResult[] = [];
    59	    for (const action of result.actions) {
    60	      const forcedDryRun: Action = { ...action, dryRun: true };
    61	      const res = await runAction(forcedDryRun, {
    62	        item,
    63	        author,
    64	        subredditName,
    65	        rev: current.rev,
    66	        config: current.config,
    67	      });
    68	      // Spread guard avoids exactOptionalPropertyTypes incompatibility — only
    69	      // include wouldHaveCalled when it's a defined string.
    70	      actions.push(
    71	        res.status === 'dry-run' && res.wouldHaveCalled
    72	          ? { kind: action.kind, wouldHaveCalled: res.wouldHaveCalled }
    73	          : { kind: action.kind },
    74	      );
    75	    }
    76	
    77	    runs.push({
    78	      runName: run.name,
    79	      triggered: true,
    80	      checkName: result.checkName,
    81	      actions,
    82	    });
    83	  }
    84	
    85	  return { configPresent: true, configRev: current.rev, runs };
    86	}

 succeeded in 0ms:
     1	/**
     2	 * Step 3.6 — dryRunActivity pipeline tests.
     3	 *
     4	 * Non-contract sibling of handleActivity: same evaluation flow, force-true
     5	 * dry-run on every action, returns structured DryRunResult, NEVER writes
     6	 * to events:recent ZSET (test 2 pins this).
     7	 */
     8	
     9	import { describe, it, expect, beforeEach, vi } from 'vitest';
    10	
    11	vi.mock('@devvit/web/server', () => ({
    12	  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn(), zAdd: vi.fn(), zRemRangeByRank: vi.fn() },
    13	  reddit: {},
    14	}));
    15	vi.mock('../../src/state/recentEvents', () => ({
    16	  recordEvent: vi.fn(),
    17	}));
    18	vi.mock('../../src/state/configStore');
    19	
    20	import { dryRunActivity } from '../../src/core/dryRunActivity';
    21	import * as configStore from '../../src/state/configStore';
    22	import * as recentEvents from '../../src/state/recentEvents';
    23	import type { Item, Author, AppConfig } from '../../src/shared/types';
    24	
    25	const sub = 'r_test';
    26	const item: Item = {
    27	  id: 't3_abc', title: 'free crypto giveaway', body: '', url: '',
    28	  author: 'spammer', age: 60, score: 0, isSelf: true, over18: false,
    29	  removed: false, approved: false, locked: false, stickied: false, linkFlairText: null,
    30	};
    31	const author: Author = {
    32	  name: 'spammer', id: 't2_x', age: 86400 * 30,
    33	  linkKarma: 0, commentKarma: 0, flairText: null,
    34	  isMod: false, isContributor: false, verified: false, shadowBanned: false,
    35	};
    36	const cfg: AppConfig = {
    37	  dryRun: false,
    38	  runs: [{
    39	    name: 'spam-removal',
    40	    checks: [{
    41	      name: 'crypto-giveaway',
    42	      combinator: 'OR',
    43	      rules: [{ kind: 'regex', name: 'scam-words', pattern: 'crypto|giveaway', flags: 'i' }],
    44	      actions: [
    45	        { kind: 'remove', isSpam: true },
    46	        { kind: 'comment', template: 'Hi {{author.nameSafe}}, removed as spam.' },
    47	      ],
    48	    }],
    49	  }],
    50	};
    51	
    52	beforeEach(() => {
    53	  vi.mocked(recentEvents.recordEvent).mockClear();
    54	  vi.mocked(configStore.getCurrentRev).mockReset();
    55	});
    56	
    57	describe('dryRunActivity', () => {
    58	  it('returns triggered runs with action wouldHaveCalled list', async () => {
    59	    vi.mocked(configStore.getCurrentRev).mockResolvedValueOnce({ rev: 1, config: cfg });
    60	    const result = await dryRunActivity(item, author, sub);
    61	    expect(result.configPresent).toBe(true);
    62	    expect(result.configRev).toBe(1);
    63	    expect(result.runs).toHaveLength(1);
    64	    expect(result.runs[0]).toMatchObject({
    65	      runName: 'spam-removal',
    66	      triggered: true,
    67	      checkName: 'crypto-giveaway',
    68	    });
    69	    expect(result.runs[0]!.actions).toEqual([
    70	      { kind: 'remove', wouldHaveCalled: 'remove' },
    71	      { kind: 'comment', wouldHaveCalled: 'comment' },
    72	    ]);
    73	  });
    74	
    75	  it('NEVER writes to recentEvents ZSET (safety: pipeline is read-only)', async () => {
    76	    vi.mocked(configStore.getCurrentRev).mockResolvedValueOnce({ rev: 1, config: cfg });
    77	    await dryRunActivity(item, author, sub);
    78	    expect(recentEvents.recordEvent).not.toHaveBeenCalled();
    79	  });
    80	
    81	  it('returns configPresent=false when no config published', async () => {
    82	    vi.mocked(configStore.getCurrentRev).mockResolvedValueOnce(null);
    83	    const result = await dryRunActivity(item, author, sub);
    84	    expect(result).toEqual({ configPresent: false, runs: [] });
    85	  });
    86	
    87	  it('reports non-triggered runs explicitly so the form UI can show "no rules matched"', async () => {
    88	    vi.mocked(configStore.getCurrentRev).mockResolvedValueOnce({ rev: 1, config: cfg });
    89	    const peacefulItem: Item = { ...item, title: 'a peaceful poem about flowers' };
    90	    const result = await dryRunActivity(peacefulItem, author, sub);
    91	    expect(result.runs).toHaveLength(1);
    92	    expect(result.runs[0]).toMatchObject({
    93	      runName: 'spam-removal',
    94	      triggered: false,
    95	    });
    96	    expect(result.runs[0]!.actions).toEqual([]);
    97	  });
    98	});

 succeeded in 0ms:
     1	/**
     2	 * Step 2.3 — handleActivity orchestrator.
     3	 *
     4	 * Single entry point the trigger handlers call. Pipeline:
     5	 *   1. Read config revision ONCE at event start (D5 — atomic publish gate).
     6	 *   2. For each run, evaluate via runRun.
     7	 *   3. On trigger, dispatch each action through runAction (which gates on
     8	 *      reserveAction + dry-run) and aggregate {kind, ok} results.
     9	 *   4. Append to events:recent ZSET so the dashboard surfaces what happened.
    10	 *
    11	 * Council fix (Software Lead, 2026-05-14 23:00): the v1 plan wrote `actions: ...`
    12	 * literal in the recordEvent call, but action results were never aggregated —
    13	 * the field would have shipped as `undefined`. Fix: collect ActionResult.status
    14	 * into `{ kind, ok }[]` and pass it explicitly.
    15	 *
    16	 * Council fix (Software Lead, 2026-05-14 23:00): ActionContext.config is REQUIRED
    17	 * so the Phase 2.5 dry-run gate can read `ctx.config.dryRun`. Without `config`,
    18	 * the safety net silently evaluates undefined → false and every action goes live.
    19	 */
    20	
    21	import type { Item, Author } from '../shared/types';
    22	import * as configStore from '../state/configStore';
    23	import { runRun } from './runRun';
    24	import { runAction } from './runAction';
    25	import { recordEvent } from '../state/recentEvents';
    26	
    27	export async function handleActivity(
    28	  item: Item,
    29	  author: Author,
    30	  subredditName: string,
    31	): Promise<void> {
    32	  const current = await configStore.getCurrentRev(subredditName);
    33	  if (!current) return;  // no config yet — nothing to do
    34	
    35	  for (const run of current.config.runs) {
    36	    const result = await runRun(run, item, author, subredditName);
    37	    if (!result.triggered) continue;
    38	
    39	    const actionResults: { kind: string; ok: boolean }[] = [];
    40	    for (const action of result.actions) {
    41	      const res = await runAction(action, {
    42	        item,
    43	        author,
    44	        subredditName,
    45	        rev: current.rev,
    46	        config: current.config,
    47	      });
    48	      actionResults.push({ kind: action.kind, ok: res.status === 'ok' });
    49	    }
    50	
    51	    await recordEvent({
    52	      ts: Date.now(),
    53	      activityId: item.id,
    54	      runName: run.name,
    55	      checkName: result.checkName,
    56	      triggered: true,
    57	      actions: actionResults,
    58	    }, subredditName);
    59	  }
    60	}

exec
/bin/zsh -lc "nl -ba src/core/runAction.ts | sed -n '1,260p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "nl -ba src/shared/types.ts | sed -n '1,260p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "nl -ba src/routes/forms.ts | sed -n '1,260p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
     1	/**
     2	 * Form submit handlers for ContextMod.
     3	 *
     4	 * /test-rules-submit: Step 3.6 — dry-run rule tester. Mod right-clicks a post
     5	 * or comment, picks "Test rules on this item", form pre-fills thingId, submit
     6	 * runs dryRunActivity (no Reddit side-effects) + renders triggered runs as
     7	 * toast bullets.
     8	 */
     9	
    10	import { Hono } from 'hono';
    11	import { reddit } from '@devvit/web/server';
    12	import { dryRunActivity } from '../core/dryRunActivity';
    13	import type { Item, Author } from '../shared/types';
    14	
    15	export const forms = new Hono();
    16	
    17	interface PostLike {
    18	  id?: string;
    19	  title?: string;
    20	  body?: string;
    21	  url?: string;
    22	  authorName?: string;
    23	  score?: number;
    24	  isSelf?: boolean;
    25	  nsfw?: boolean;
    26	  locked?: boolean;
    27	  stickied?: boolean;
    28	  createdAt?: number | Date;
    29	}
    30	
    31	interface CommentLike {
    32	  id?: string;
    33	  body?: string;
    34	  authorName?: string;
    35	  score?: number;
    36	  createdAt?: number | Date;
    37	}
    38	
    39	function ageSeconds(createdAt?: number | Date): number {
    40	  if (!createdAt) return 0;
    41	  const ms = createdAt instanceof Date ? createdAt.getTime() : createdAt;
    42	  return Math.max(0, Math.floor((Date.now() - ms) / 1000));
    43	}
    44	
    45	const ITEM_DEFAULTS = {
    46	  removed: false, approved: false, locked: false, stickied: false,
    47	  isSelf: false, over18: false, linkFlairText: null as string | null,
    48	};
    49	const AUTHOR_DEFAULTS = {
    50	  id: '', age: 0, linkKarma: 0, commentKarma: 0,
    51	  flairText: null as string | null,
    52	  isMod: false, isContributor: false, verified: false, shadowBanned: false,
    53	};
    54	
    55	forms.post('/test-rules-submit', async (c) => {
    56	  const body = await c.req.json<{ values?: { thingId?: string } }>();
    57	  const thingId = body.values?.thingId;
    58	  console.log(`[cm/forms/test-rules-submit] thingId=${thingId}`);
    59	
    60	  if (!thingId) {
    61	    return c.json({ showToast: 'Missing thingId — re-open the form from the menu.' });
    62	  }
    63	
    64	  try {
    65	    const sub = await reddit.getCurrentSubreddit();
    66	    const isComment = thingId.startsWith('t1_');
    67	
    68	    let item: Item;
    69	    let authorName: string;
    70	    if (isComment) {
    71	      const cmt = (await reddit.getCommentById(thingId as `t1_${string}`)) as unknown as CommentLike;
    72	      authorName = cmt.authorName ?? '';
    73	      item = {
    74	        ...ITEM_DEFAULTS,
    75	        id: cmt.id ?? thingId,
    76	        title: '',
    77	        body: cmt.body ?? '',
    78	        url: '',
    79	        author: authorName,
    80	        age: ageSeconds(cmt.createdAt),
    81	        score: cmt.score ?? 0,
    82	      };
    83	    } else {
    84	      const post = (await reddit.getPostById(thingId as `t3_${string}`)) as unknown as PostLike;
    85	      authorName = post.authorName ?? '';
    86	      item = {
    87	        ...ITEM_DEFAULTS,
    88	        id: post.id ?? thingId,
    89	        title: post.title ?? '',
    90	        body: post.body ?? '',
    91	        url: post.url ?? '',
    92	        author: authorName,
    93	        age: ageSeconds(post.createdAt),
    94	        score: post.score ?? 0,
    95	        isSelf: post.isSelf ?? false,
    96	        over18: post.nsfw ?? false,
    97	        locked: post.locked ?? false,
    98	        stickied: post.stickied ?? false,
    99	      };
   100	    }
   101	
   102	    const author: Author = { ...AUTHOR_DEFAULTS, name: authorName };
   103	
   104	    const result = await dryRunActivity(item, author, sub.name);
   105	
   106	    if (!result.configPresent) {
   107	      return c.json({
   108	        showToast: 'No config published yet — run "Reload config from wiki" first, then retry.',
   109	      });
   110	    }
   111	
   112	    const triggered = result.runs.filter((r) => r.triggered);
   113	    if (triggered.length === 0) {
   114	      return c.json({
   115	        showToast: `No rules triggered. Evaluated ${result.runs.length} run(s) at rev ${result.configRev}.`,
   116	      });
   117	    }
   118	
   119	    const lines = triggered.map((r) => {
   120	      const actionKinds = r.actions.map((a) => a.kind).join(', ');
   121	      return `• ${r.runName} / ${r.checkName} → ${actionKinds || '(no actions)'}`;
   122	    });
   123	    return c.json({
   124	      showToast: `Dry-run (rev ${result.configRev}):\n${lines.join('\n')}`,
   125	    });
   126	  } catch (err) {
   127	    const msg = err instanceof Error ? err.message : String(err);
   128	    console.error('[cm/forms/test-rules-submit] failed:', err);
   129	    return c.json({ showToast: `Dry-run failed: ${msg}` });
   130	  }
   131	});

 succeeded in 0ms:
     1	/**
     2	 * Engine-internal types. The `Item` and `Author` shapes are the strict, fully
     3	 * defaulted view every rule reads — the V2 trigger payload (every field
     4	 * optional) is normalized into these shapes by `src/shared/normalize.ts`.
     5	 *
     6	 * Output-side contracts (RuleResult / CheckResult / RunResult / ActionResult
     7	 * / ActionContext) are locked here so Step 2.1 dispatcher + Step 2.3
     8	 * handleActivity + Step 3.5 recordEvent all type-check end-to-end.
     9	 */
    10	
    11	// ---------------------------------------------------------------------------
    12	// Inputs — Item & Author (post-normalization, no `undefined` fields)
    13	// ---------------------------------------------------------------------------
    14	
    15	export interface Item {
    16	  id: string;            // t3_xxx (post) or t1_xxx (comment)
    17	  title: string;         // empty for comments
    18	  body: string;          // selftext for posts, body for comments
    19	  url: string;
    20	  author: string;        // username
    21	  age: number;           // seconds since creation
    22	  score: number;
    23	  isSelf: boolean;
    24	  over18: boolean;
    25	  removed: boolean;
    26	  approved: boolean;
    27	  locked: boolean;
    28	  stickied: boolean;
    29	  linkFlairText: string | null;
    30	  depth?: number;        // comments only
    31	  op?: boolean;          // comment was authored by OP
    32	}
    33	
    34	export interface Author {
    35	  name: string;
    36	  id: string;
    37	  age: number;           // seconds since account creation
    38	  linkKarma: number;
    39	  commentKarma: number;
    40	  flairText: string | null;
    41	  isMod: boolean;
    42	  isContributor: boolean;
    43	  verified: boolean;
    44	  shadowBanned: boolean;
    45	}
    46	
    47	// ---------------------------------------------------------------------------
    48	// Filters (Step 1.5) — predicates over Item / Author
    49	// ---------------------------------------------------------------------------
    50	
    51	export interface AuthorFilter {
    52	  nameIn?: string[];                  // exact-match usernames
    53	  nameNotIn?: string[];
    54	  flairTextIn?: string[];
    55	  flairTextNotIn?: string[];
    56	  ageMinSec?: number;
    57	  ageMaxSec?: number;
    58	  linkKarmaMin?: number;
    59	  linkKarmaMax?: number;
    60	  commentKarmaMin?: number;
    61	  commentKarmaMax?: number;
    62	  isMod?: boolean;
    63	  isContributor?: boolean;
    64	  verified?: boolean;
    65	  shadowBanned?: boolean;
    66	}
    67	
    68	export interface ItemFilter {
    69	  over18?: boolean;
    70	  locked?: boolean;
    71	  stickied?: boolean;
    72	  removed?: boolean;
    73	  approved?: boolean;
    74	  isSelf?: boolean;
    75	  scoreMin?: number;
    76	  scoreMax?: number;
    77	  linkFlairTextIn?: string[];
    78	  linkFlairTextNotIn?: string[];
    79	  titleMatches?: string;              // regex source
    80	  bodyMatches?: string;
    81	  urlMatches?: string;
    82	}
    83	
    84	export interface FilterSpec {
    85	  authorIs?: AuthorFilter;
    86	  itemIs?: ItemFilter;
    87	}
    88	
    89	// ---------------------------------------------------------------------------
    90	// Config — rules, checks, runs, actions
    91	// ---------------------------------------------------------------------------
    92	
    93	export type RegexTarget = 'title' | 'body' | 'url';
    94	
    95	export interface RegexRule {
    96	  kind: 'regex';
    97	  name?: string;                      // optional for inline rules
    98	  pattern: string;                    // regex source
    99	  flags?: string;                     // 'i' / 'm' / 'mi' / etc.
   100	  target?: RegexTarget;               // default 'title'
   101	}
   102	
   103	export interface AuthorRule {
   104	  kind: 'author';
   105	  name?: string;
   106	  filter: AuthorFilter;               // reuses the filter shape
   107	}
   108	
   109	export interface RuleSetRule {
   110	  kind: 'ruleset';
   111	  name?: string;
   112	  combinator: 'AND' | 'OR';
   113	  rules: Rule[];
   114	}
   115	
   116	export interface NamedRuleRef {
   117	  kind: 'named';                      // alias to a top-level namedRules[name]
   118	  name: string;
   119	}
   120	
   121	/**
   122	 * URL-dedupe repost rule (Phase 2.5, Council Expansionist).
   123	 * Fingerprints `item.url` via FNV-1a64 and writes a 30-day Redis seen-marker;
   124	 * triggers on the second submission of the same URL. Sub-scoped to avoid
   125	 * cross-tenant pollution. SRE flagged: ship behind `dryRun` until mods watch
   126	 * the dry-run feed for a few days — false positives nuke legitimate crossposts.
   127	 */
   128	export interface RepostRule {
   129	  kind: 'repost';
   130	  name?: string;
   131	  windowDays?: number;                // default 30
   132	}
   133	
   134	export type Rule = RegexRule | AuthorRule | RuleSetRule | NamedRuleRef | RepostRule;
   135	
   136	// Actions — shape is shared with src/actions/* in Phase 2. Phase 1 only needs
   137	// the type so RunResult.actions[] type-checks; runtime dispatch lands in 2.1.
   138	export interface RemoveAction { kind: 'remove'; isSpam?: boolean; dryRun?: boolean; }
   139	export interface ApproveAction { kind: 'approve'; dryRun?: boolean; }
   140	export interface CommentAction { kind: 'comment'; template: string; dryRun?: boolean; }
   141	export interface LockAction { kind: 'lock'; dryRun?: boolean; }
   142	export interface ReportAction { kind: 'report'; reason: string; dryRun?: boolean; }
   143	export interface BanAction {
   144	  kind: 'ban';
   145	  duration?: number;                  // 0 = permanent
   146	  reason?: string;
   147	  note?: string;
   148	  message?: string;
   149	  dryRun?: boolean;
   150	}
   151	export interface UserFlairAction {
   152	  kind: 'userFlair';
   153	  text?: string;
   154	  cssClass?: string;
   155	  dryRun?: boolean;
   156	}
   157	
   158	export type Action =
   159	  | RemoveAction
   160	  | ApproveAction
   161	  | CommentAction
   162	  | LockAction
   163	  | ReportAction
   164	  | BanAction
   165	  | UserFlairAction;
   166	
   167	export type CheckCombinator = 'AND' | 'OR';
   168	export type PostBehavior = 'next' | 'stop' | { goto: string };
   169	
   170	export interface Check {
   171	  name: string;
   172	  combinator: CheckCombinator;
   173	  rules: Rule[];
   174	  filters?: FilterSpec;
   175	  actions?: Action[];                 // fired when the check triggers; the run
   176	                                      // collects these in order on a triggered run.
   177	  postBehavior?: PostBehavior;        // default 'next'
   178	}
   179	
   180	export interface Run {
   181	  name: string;
   182	  checks: Check[];
   183	}
   184	
   185	export interface AppConfig {
   186	  runs: Run[];
   187	  namedRules?: Record<string, Rule>;
   188	  dryRun?: boolean;                   // global dry-run flag (Phase 2.5)
   189	  needsAuthorEnrichment?: boolean;    // set at parse time by inspecting rule kinds
   190	                                      // — gates the expensive getUserByUsername call
   191	                                      // (Step 1.3 short-circuit, Council Software Lead).
   192	}
   193	
   194	// ---------------------------------------------------------------------------
   195	// Engine output contracts (Council fix 2026-05-14 21:30, Software Lead)
   196	// ---------------------------------------------------------------------------
   197	
   198	export interface RuleResult {
   199	  triggered: boolean;
   200	}
   201	
   202	export interface CheckResult {
   203	  triggered: boolean;
   204	  checkName: string;
   205	  actions: Action[];                  // empty when triggered = false
   206	}
   207	
   208	export interface RunResult {
   209	  triggered: boolean;
   210	  checkName: string;
   211	  actions: Action[];                  // actions to fire when triggered === true
   212	  terminated?: 'iteration-limit';
   213	  lastCheckName?: string;             // populated when terminated set
   214	}
   215	
   216	export interface ActionResult {
   217	  status: 'ok' | 'skipped-locked' | 'dry-run' | 'error';
   218	  kind: string;
   219	  wouldHaveCalled?: string;           // populated when status === 'dry-run'
   220	}
   221	
   222	// ActionContext.config is REQUIRED (Council 2026-05-14 23:00, Software Lead) —
   223	// Phase 2.5's dry-run gate reads `ctx.config.dryRun`. Without `config` on this
   224	// contract, the safety net silently evaluates undefined → false → every repost
   225	// action would go live by default, the OPPOSITE of the claimed contract.
   226	export interface ActionContext {
   227	  item: Item;
   228	  author: Author;
   229	  subredditName: string;
   230	  rev: number;
   231	  config: AppConfig;
   232	}

 succeeded in 0ms:
     1	/**
     2	 * Action dispatcher (Step 2.1).
     3	 *
     4	 * Wraps every action with `reserveAction → side-effect → commitAction/releaseAction`
     5	 * per D4. The action ID MUST come from the exported `actionId(thingId, actionType, payload)`
     6	 * helper at src/lib/idem.ts:123 — pipe-separated. Hand-rolling concat collides on inputs
     7	 * like ('t3_a','ban','x') vs ('t3_ab','an','x') and lets an attacker alias another user's
     8	 * already-committed action to bypass `reserveAction`.
     9	 *
    10	 * Critical ordering: reserveAction → side-effect → (success: commitAction) / (failure: releaseAction).
    11	 *
    12	 * Stale-lease handling (Council fix, Software Lead): when `reserveAction` returns false
    13	 * because of a 5-min `pending` lease from a prior crash, return an explicit
    14	 * `{ status: 'skipped-locked' }` so handleActivity can record it in the event log
    15	 * instead of dropping silently.
    16	 *
    17	 * Dry-run gate (Phase 2.5): a per-action `dryRun` overrides the config-level
    18	 * `ctx.config.dryRun`. When either is true, no Reddit side-effect is called;
    19	 * we still write the `done` marker so retries don't refire.
    20	 */
    21	
    22	import type { Action, ActionContext, ActionResult } from '../shared/types';
    23	import { actionId, reserveAction, commitAction, releaseAction } from '../lib/idem';
    24	import { runRemove } from '../actions/remove';
    25	import { runApprove } from '../actions/approve';
    26	import { runComment } from '../actions/comment';
    27	import { runLock } from '../actions/lock';
    28	import { runReport } from '../actions/report';
    29	import { runBan } from '../actions/ban';
    30	import { runUserFlair } from '../actions/userFlair';
    31	
    32	/**
    33	 * Stable payload digest fed into actionId. Keeps the hash deterministic across
    34	 * runs of the same config rev so retries collide with the prior attempt.
    35	 * Per-action fields included here are the ones that change the side-effect
    36	 * (e.g. ban duration, comment template) — dryRun is intentionally excluded so a
    37	 * dry-run and a real run for the same logical action collide on the `done` marker.
    38	 */
    39	function payloadDigest(a: Action): string {
    40	  switch (a.kind) {
    41	    case 'remove':    return `spam=${a.isSpam ?? false}`;
    42	    case 'approve':   return '';
    43	    case 'comment':   return `tpl=${a.template}`;
    44	    case 'lock':      return '';
    45	    case 'report':    return `reason=${a.reason}`;
    46	    case 'ban':       return `dur=${a.duration ?? 0}|reason=${a.reason ?? ''}|note=${a.note ?? ''}`;
    47	    case 'userFlair': return `text=${a.text ?? ''}|css=${a.cssClass ?? ''}`;
    48	  }
    49	}
    50	
    51	export async function runAction(action: Action, ctx: ActionContext): Promise<ActionResult> {
    52	  // Dry-run gate (Phase 2.5). Global config.dryRun is AUTHORITATIVE — per-action
    53	  // can only ELEVATE to dry-run, never demote a globally-safe config to live.
    54	  // Codex HIGH 2026-05-16: previous `??` semantics let per-action dryRun: false
    55	  // override config.dryRun: true (catastrophic safety-gate bypass).
    56	  const dry = ctx.config.dryRun === true || action.dryRun === true;
    57	  if (dry) {
    58	    return { status: 'dry-run', kind: action.kind, wouldHaveCalled: action.kind };
    59	  }
    60	
    61	  const aid = actionId(ctx.item.id, action.kind, payloadDigest(action));
    62	  const reservation = await reserveAction(aid, ctx.subredditName);
    63	  if (!reservation) {
    64	    return { status: 'skipped-locked', kind: action.kind };
    65	  }
    66	  const { token } = reservation;
    67	
    68	  let sideEffectDone = false;
    69	  try {
    70	    switch (action.kind) {
    71	      case 'remove':    await runRemove(action, ctx); break;
    72	      case 'approve':   await runApprove(action, ctx); break;
    73	      case 'comment':   await runComment(action, ctx); break;
    74	      case 'lock':      await runLock(action, ctx); break;
    75	      case 'report':    await runReport(action, ctx); break;
    76	      case 'ban':       await runBan(action, ctx); break;
    77	      case 'userFlair': await runUserFlair(action, ctx); break;
    78	    }
    79	    sideEffectDone = true;
    80	    await commitAction(aid, token, ctx.subredditName);
    81	    return { status: 'ok', kind: action.kind };
    82	  } catch (err) {
    83	    if (sideEffectDone) {
    84	      // Codex CRITICAL fix: side-effect succeeded but commitAction threw on
    85	      // done-marker write failure. Pending lease was NOT released by
    86	      // commitAction (intentional — prevents instant double-action). Surface
    87	      // as 'error' so dashboard shows red + mod investigates. NOT releaseAction:
    88	      // releasing would reopen the gate and cause double-action on retry.
    89	      console.error('[cm/runAction] side-effect succeeded but idempotency commit failed:', action.kind, ctx.item.id, err);
    90	      return { status: 'error', kind: action.kind };
    91	    }
    92	    await releaseAction(aid, token, ctx.subredditName);
    93	    console.error('[cm/runAction] action failed, released for retry:', action.kind, ctx.item.id, err);
    94	    return { status: 'error', kind: action.kind };
    95	  }
    96	}

exec
/bin/zsh -lc "nl -ba src/lib/idem.ts | sed -n '1,280p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
     1	/**
     2	 * Idempotency + cron single-flight helpers for ContextMod on Devvit.
     3	 *
     4	 * Three layered gates (post-Codex review fixes):
     5	 *   1. Trigger-side firstSeen: cm:proc:{thingId} — 24h NX guard. Fail-CLOSED on
     6	 *      Redis error (treats redis-down as "seen" to avoid double-processing).
     7	 *   2. Action-side reserve/commit/release:
     8	 *      - cm:action:pending:{hash} — 5min TTL, written BEFORE side-effect
     9	 *      - cm:action:done:{hash}    — 7d TTL, written AFTER side-effect succeeds
    10	 *      Crash mid-action: pending TTL expires in 5 min, retry succeeds.
    11	 *      Success: pending deleted, done lasts 7d to lock out replays.
    12	 *   3. Cron single-flight: cm:lock:{task} — 60s NX guard with token verification
    13	 *      on release so a re-acquired lock isn't deleted by the previous holder.
    14	 *
    15	 * Hash: BigInt-correct FNV-1a 64. Test vectors verified in tests/lib/idem.test.ts.
    16	 */
    17	
    18	import { redis } from '@devvit/web/server';
    19	import { K } from '../state/keys';
    20	
    21	const PROC_TTL_SEC = 86_400;          // 24 hours
    22	const PENDING_TTL_SEC = 5 * 60;        // 5 min — caps lost-on-crash retry delay
    23	const DONE_TTL_SEC = 7 * 86_400;       // 7 days — long enough to survive retries
    24	const LOCK_TTL_SEC = 60;
    25	
    26	/**
    27	 * Trigger-side idempotency gate. Call at the top of every trigger handler.
    28	 * Returns true the FIRST time a thingId is seen, false on subsequent retries.
    29	 * Fail-CLOSED on Redis error (returns false → handler skips work).
    30	 *
    31	 * `sub` is optional and defaults to the `'_'` sentinel — callers that have a
    32	 * subreddit context (Step 2.4 onward) should thread it through for tenant
    33	 * isolation. See src/state/keys.ts.
    34	 */
    35	export async function firstSeen(thingId: string, sub?: string): Promise<boolean> {
    36	  const key = K.proc(thingId, sub);
    37	  try {
    38	    const result = await redis.set(key, '1', {
    39	      nx: true,
    40	      expiration: new Date(Date.now() + PROC_TTL_SEC * 1000),
    41	    });
    42	    return result === 'OK';
    43	  } catch (err) {
    44	    console.error('[cm/idem/firstSeen] redis err — fail-closed (skip):', thingId, err);
    45	    return false;
    46	  }
    47	}
    48	
    49	/**
    50	 * Reserve an action slot BEFORE executing the side-effect.
    51	 * Returns `{token}` if not previously done AND not currently pending → proceed.
    52	 * Returns null on conflict / already done / Redis error (fail-CLOSED).
    53	 *
    54	 * Caller MUST follow up with commitAction(actionId, token) on success OR
    55	 * releaseAction(actionId, token) on failure. The token is mandatory:
    56	 * commitAction/releaseAction compare-and-delete only if the pending value
    57	 * still matches THIS caller's token, so a slow worker can't accidentally
    58	 * delete a successor's valid lease (Codex CRITICAL 2026-05-16 fix).
    59	 *
    60	 * TOCTOU note: Devvit's Redis surface lacks Lua / transactions, so the
    61	 * reservation pattern is lock-then-check (not check-then-lock). Set the
    62	 * pending NX lock FIRST (atomic), then re-read done inside the lock window.
    63	 * If done is set after we acquired the lock, release + skip — a concurrent
    64	 * caller completed during the lock attempt. The lock guarantees only one
    65	 * caller proceeds into the side-effect for a given actionId at a time.
    66	 */
    67	export async function reserveAction(actionId: string, sub?: string): Promise<{ token: string } | null> {
    68	  const doneKey = K.actionDone(actionId, sub);
    69	  const pendingKey = K.actionPending(actionId, sub);
    70	  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    71	  let reservedHere = false;
    72	  try {
    73	    const reserved = await redis.set(pendingKey, token, {
    74	      nx: true,
    75	      expiration: new Date(Date.now() + PENDING_TTL_SEC * 1000),
    76	    });
    77	    if (reserved !== 'OK') return null;
    78	    reservedHere = true;
    79	    const done = await redis.get(doneKey);
    80	    if (done) {
    81	      // Token check is owner-safe — only delete pending if it's still ours.
    82	      const current = await redis.get(pendingKey);
    83	      if (current === token) await redis.del(pendingKey);
    84	      reservedHere = false;
    85	      return null;
    86	    }
    87	    return { token };
    88	  } catch (err) {
    89	    // Distinct error tag depending on which half of the lock-then-check failed.
    90	    // ORPHANED_LEASE means we hold a pending-NX that we couldn't verify against
    91	    // done — the lease will TTL-expire in PENDING_TTL_SEC (5min); caller skips.
    92	    const tag = reservedHere
    93	      ? '[cm/idem/reserveAction/ORPHANED_LEASE]'
    94	      : '[cm/idem/reserveAction/LOCK_FAIL]';
    95	    console.error(tag, 'fail-closed (skip):', actionId, err);
    96	    return null;
    97	  }
    98	}
    99	
   100	/**
   101	 * Commit a successful action: write the 7d done marker, then clear the pending lease.
   102	 *
   103	 * Codex CRITICAL 2026-05-16 (a): if the done-marker write fails AND we delete the
   104	 * pending lease, the next retry sees neither marker and fires the action AGAIN
   105	 * (double mod-action: ban twice, comment twice, etc). Fix: retry done-write
   106	 * with backoff, throw on persistent failure, NEVER delete the pending lease
   107	 * unless the done marker was actually written. Pending TTL (5 min) caps the
   108	 * worst-case wait — better double-action 5 min later than instantly.
   109	 *
   110	 * Codex CRITICAL 2026-05-16 (b): token compare-and-delete. If this worker's
   111	 * pending lease TTL'd out and a successor acquired the same key with a new
   112	 * token, blindly deleting pending would reopen the gate for a third execution.
   113	 * The token check makes pending delete a no-op if we're no longer the owner.
   114	 */
   115	export async function commitAction(actionId: string, token: string, sub?: string): Promise<void> {
   116	  const doneKey = K.actionDone(actionId, sub);
   117	  const pendingKey = K.actionPending(actionId, sub);
   118	  const doneExpiration = new Date(Date.now() + DONE_TTL_SEC * 1000);
   119	
   120	  const backoffsMs = [100, 300, 1000];
   121	  let lastErr: unknown = null;
   122	  for (let attempt = 0; attempt < backoffsMs.length; attempt++) {
   123	    try {
   124	      await redis.set(doneKey, '1', { expiration: doneExpiration });
   125	      lastErr = null;
   126	      break;
   127	    } catch (err) {
   128	      lastErr = err;
   129	      if (attempt < backoffsMs.length - 1) {
   130	        await new Promise(resolve => setTimeout(resolve, backoffsMs[attempt]!));
   131	      }
   132	    }
   133	  }
   134	
   135	  if (lastErr) {
   136	    console.error(
   137	      '[cm/idem/commitAction/DONE_WRITE_FAIL]',
   138	      'side-effect already happened — idempotency marker NOT written after 3 retries. ' +
   139	      'Pending lease intentionally NOT released to prevent immediate double-action; ' +
   140	      'pending TTL will expire in 5 min then retry path can re-execute. Investigate this actionId:',
   141	      actionId,
   142	      lastErr,
   143	    );
   144	    throw lastErr;
   145	  }
   146	
   147	  // Done marker is durable. Compare-and-delete pending — only clear it if we're
   148	  // still the lease owner. If TTL expired + successor took over, current !=
   149	  // token and we leave the successor's lease intact (it'll see done==true
   150	  // when it re-reads in reserveAction's lock-then-check).
   151	  try {
   152	    const current = await redis.get(pendingKey);
   153	    if (current === token) await redis.del(pendingKey);
   154	  } catch (err) {
   155	    console.error('[cm/idem/commitAction/PENDING_DEL_FAIL]', '(harmless, TTL reaps in 5min):', actionId, err);
   156	  }
   157	}
   158	
   159	/**
   160	 * Release a reserved action slot when the side-effect failed.
   161	 * Compare-and-delete: only release if we still own the lease (token matches).
   162	 * If a successor took over (our TTL expired), leave their lease intact.
   163	 *
   164	 * Codex CRITICAL 2026-05-16 fix: token check prevents the
   165	 * "slow-worker-releases-successor's-lease" race that would otherwise allow
   166	 * a third execution of the same actionId.
   167	 */
   168	export async function releaseAction(actionId: string, token: string, sub?: string): Promise<void> {
   169	  const pendingKey = K.actionPending(actionId, sub);
   170	  try {
   171	    const current = await redis.get(pendingKey);
   172	    if (current === token) await redis.del(pendingKey);
   173	  } catch (err) {
   174	    console.error('[cm/idem/releaseAction] redis err (pending will expire in 5 min):', actionId, err);
   175	  }
   176	}
   177	
   178	/**
   179	 * Deterministic action ID for use with reserveAction. Combines thingId + kind + payload
   180	 * digest via BigInt-correct FNV-1a 64.
   181	 */
   182	export function actionId(thingId: string, actionType: string, payload: string): string {
   183	  return fnv1a64(`${thingId}|${actionType}|${payload}`);
   184	}
   185	
   186	/**
   187	 * Cron single-flight lock. Returns a release function on success, null if held.
   188	 * Release verifies our token still owns the lock; if TTL expired and someone else
   189	 * grabbed it, we leave it alone. Defensive: release never throws.
   190	 *
   191	 * Usage:
   192	 *   const release = await acquireLock('refresh-config');
   193	 *   if (!release) return c.json({ skipped: 'locked' });
   194	 *   try { ...work... } finally { await release(); }
   195	 */
   196	export async function acquireLock(taskName: string, sub?: string): Promise<(() => Promise<void>) | null> {
   197	  const key = K.lock(taskName, sub);
   198	  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
   199	  try {
   200	    const result = await redis.set(key, token, {
   201	      nx: true,
   202	      expiration: new Date(Date.now() + LOCK_TTL_SEC * 1000),
   203	    });
   204	    if (result !== 'OK') return null;
   205	  } catch (err) {
   206	    console.error('[cm/idem/acquireLock] redis err — fail-closed (skip):', taskName, err);
   207	    return null;
   208	  }
   209	  return async () => {
   210	    try {
   211	      const current = await redis.get(key);
   212	      if (current === token) await redis.del(key);
   213	    } catch (err) {
   214	      console.error('[cm/idem/releaseLock] err (lock TTL will reap):', taskName, err);
   215	    }
   216	  };
   217	}
   218	
   219	/**
   220	 * FNV-1a 64-bit hash via BigInt. Pure JS, no native deps. CSP-safe.
   221	 * Test vectors verified in tests/lib/idem.test.ts against the canonical FNV-1a 64 suite.
   222	 */
   223	const FNV_OFFSET = 0xcbf29ce484222325n;
   224	const FNV_PRIME = 0x100000001b3n;
   225	const MASK_64 = 0xffffffffffffffffn;
   226	
   227	export function fnv1a64(input: string): string {
   228	  let h = FNV_OFFSET;
   229	  for (let i = 0; i < input.length; i++) {
   230	    h ^= BigInt(input.charCodeAt(i));
   231	    h = (h * FNV_PRIME) & MASK_64;
   232	  }
   233	  return h.toString(16).padStart(16, '0');
   234	}

exec
/bin/zsh -lc "nl -ba tests/lib/idem-commit.test.ts | sed -n '1,320p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "nl -ba src/rules/repost.ts | sed -n '1,240p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
     1	/**
     2	 * URL-dedupe repost rule (Phase 2.5, Council Expansionist — promoted from Phase 4
     3	 * because it's the screenshot moment that differentiates this from an AutoMod port).
     4	 *
     5	 * Reuses the FNV-1a64 substrate from src/lib/idem.ts — no new primitive, same
     6	 * dedup shape as `cm:action:done:{hash}`. Sub-scoped via the K.* keys (kept
     7	 * tenant-isolated from day 0 per Long-Term Architect, Council 2026-05-14 21:30).
     8	 *
     9	 * Semantics (race-safe SET NX, Codex HIGH fix 2026-05-16):
    10	 *   - First submission of a URL:  `SET key id NX EX 30d` returns 'OK' → no trigger
    11	 *   - Second submission of same:  `SET key id NX EX 30d` returns non-OK → trigger + TTL refresh
    12	 *   - Empty/missing URL:          no-op (regex rules can chain for those)
    13	 *
    14	 * SRE non-negotiable: ship behind `config.dryRun: true` — false positives nuke
    15	 * legitimate crossposts, news threads, weekly recurring posts. Mods opt into live
    16	 * mode after watching the dry-run feed for a few days. See Step 2.5.2 in the plan.
    17	 *
    18	 * Prior GET-then-SET version had a TOCTOU race: two simultaneous submissions of
    19	 * the same URL both missed the GET, both SET, both failed to trigger. NX flips
    20	 * the check into a single atomic op — Devvit Redis returns 'OK' iff the key was
    21	 * newly created, otherwise the call is a no-op and we treat that as repost.
    22	 */
    23	
    24	import { redis } from '@devvit/web/server';
    25	import type { RepostRule, Item, RuleResult } from '../shared/types';
    26	import { fnv1a64 } from '../lib/idem';
    27	
    28	const DEFAULT_WINDOW_DAYS = 30;
    29	const SUB_DEFAULT = '_';
    30	
    31	export async function runRepostRule(
    32	  rule: RepostRule,
    33	  item: Item,
    34	  sub: string = SUB_DEFAULT,
    35	): Promise<RuleResult> {
    36	  if (!item.url) return { triggered: false };
    37	  const urlHash = fnv1a64(item.url);
    38	  const key = `cm:${sub}:repost:url:${urlHash}`;
    39	  const windowDays = rule.windowDays ?? DEFAULT_WINDOW_DAYS;
    40	  const expiration = new Date(Date.now() + windowDays * 86_400 * 1000);
    41	
    42	  try {
    43	    const result = await redis.set(key, item.id, { nx: true, expiration });
    44	    if (result === 'OK') {
    45	      // Newly-set marker — first submission of this URL in the window.
    46	      return { triggered: false };
    47	    }
    48	    // NX failed → key already existed → repost. Refresh TTL (non-NX SET) so an
    49	    // active-repost loop doesn't expire and re-allow itself mid-week.
    50	    await redis.set(key, item.id, { expiration });
    51	    return { triggered: true };
    52	  } catch (err) {
    53	    // Fail-OPEN on Redis error — repost is a soft signal, not a safety gate.
    54	    // Bias toward letting posts through rather than mass-flagging during outage.
    55	    console.error('[cm/rules/repost] redis err — fail-open (no trigger):', item.id, err);
    56	    return { triggered: false };
    57	  }
    58	}

 succeeded in 0ms:
     1	/**
     2	 * Codex CRITICAL 2026-05-16 — commitAction must NOT release the pending lease
     3	 * when the done-marker write fails. Otherwise a retry sees neither marker and
     4	 * fires the side-effect again (double mod action).
     5	 */
     6	
     7	import { describe, it, expect, vi, beforeEach } from 'vitest';
     8	
     9	const redisSet = vi.fn().mockResolvedValue('OK');
    10	const redisDel = vi.fn().mockResolvedValue(undefined);
    11	const redisGet = vi.fn().mockResolvedValue('tk-test');
    12	
    13	vi.mock('@devvit/web/server', () => ({
    14	  redis: {
    15	    set: (...a: unknown[]) => redisSet(...a),
    16	    del: (...a: unknown[]) => redisDel(...a),
    17	    get: (...a: unknown[]) => redisGet(...a),
    18	  },
    19	}));
    20	
    21	import { commitAction } from '../../src/lib/idem';
    22	
    23	beforeEach(() => {
    24	  redisSet.mockReset();
    25	  redisDel.mockReset();
    26	  redisGet.mockReset();
    27	  redisSet.mockResolvedValue('OK');
    28	  redisDel.mockResolvedValue(undefined);
    29	  redisGet.mockResolvedValue('tk-test');
    30	});
    31	
    32	describe('commitAction — done-marker durability + pending-lease safety', () => {
    33	  it('happy path: writes done marker then deletes pending', async () => {
    34	    await commitAction('abc', 'tk-test', 'sub1');
    35	
    36	    expect(redisSet).toHaveBeenCalledTimes(1);
    37	    expect(redisDel).toHaveBeenCalledTimes(1);
    38	    const [doneKey] = redisSet.mock.calls[0] as [string];
    39	    const [pendingKey] = redisDel.mock.calls[0] as [string];
    40	    expect(doneKey).toContain(':done:');
    41	    expect(pendingKey).toContain(':pending:');
    42	  });
    43	
    44	  it('retries done-marker write 3x on failure with backoff', async () => {
    45	    redisSet
    46	      .mockRejectedValueOnce(new Error('redis hiccup 1'))
    47	      .mockRejectedValueOnce(new Error('redis hiccup 2'))
    48	      .mockResolvedValueOnce('OK');
    49	
    50	    await commitAction('abc', 'tk-test', 'sub1');
    51	
    52	    expect(redisSet).toHaveBeenCalledTimes(3);
    53	    // Pending deleted because we eventually succeeded
    54	    expect(redisDel).toHaveBeenCalledTimes(1);
    55	  });
    56	
    57	  it('throws + does NOT delete pending lease when done-marker write persistently fails', async () => {
    58	    // mockImplementation avoids eager rejected-promise creation that
    59	    // mockRejectedValueOnce produces (which vitest flags as unhandled even when
    60	    // ultimately awaited inside our retry loop).
    61	    redisSet.mockImplementation(async () => { throw new Error('redis down hard'); });
    62	
    63	    await expect(commitAction('abc', 'tk-test', 'sub1')).rejects.toThrow(/redis down hard/);
    64	    expect(redisSet).toHaveBeenCalledTimes(3);  // attempted retries
    65	    // SAFETY: pending lease must NOT be deleted — otherwise the next retry
    66	    // path would see neither marker and fire the side-effect AGAIN.
    67	    expect(redisDel).not.toHaveBeenCalled();
    68	  });
    69	
    70	  it('done write success but pending del failure is harmless (TTL reaps)', async () => {
    71	    redisSet.mockResolvedValueOnce('OK');
    72	    redisDel.mockRejectedValueOnce(new Error('del failed'));
    73	
    74	    await expect(commitAction('abc', 'tk-test', 'sub1')).resolves.toBeUndefined();
    75	  });
    76	
    77	  it('Codex C2 — pending del is no-op when token mismatches (successor lease protected)', async () => {
    78	    // Worker A's TTL expired, Worker B took over with a new token. A finally
    79	    // completes side-effect + commitAction. The pending key now holds B's
    80	    // token. A must NOT delete B's lease (would allow a third execution).
    81	    redisSet.mockResolvedValueOnce('OK');           // done write succeeds
    82	    redisGet.mockResolvedValueOnce('different-token-from-B');  // pending owned by B
    83	
    84	    await commitAction('abc', 'tk-A', 'sub1');
    85	
    86	    expect(redisSet).toHaveBeenCalledTimes(1);  // done marker
    87	    expect(redisGet).toHaveBeenCalledTimes(1);  // token check
    88	    expect(redisDel).not.toHaveBeenCalled();    // B's lease NOT deleted
    89	  });
    90	});

exec
/bin/zsh -lc "nl -ba tests/core/runAction.test.ts | sed -n '1,360p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "nl -ba tests/rules/repost.test.ts | sed -n '1,300p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "nl -ba tests/routes/forms-test-rules.test.ts | sed -n '1,360p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
     1	/**
     2	 * Phase 2 — Step 2.1 gate: reserveAction → side-effect → commit/release order;
     3	 * stale-lease handling; dry-run gate (Phase 2.5).
     4	 */
     5	
     6	import { describe, it, expect, vi, beforeEach } from 'vitest';
     7	
     8	const reserveAction = vi.fn();
     9	const commitAction = vi.fn().mockResolvedValue(undefined);
    10	const releaseAction = vi.fn().mockResolvedValue(undefined);
    11	const redditRemove = vi.fn();
    12	
    13	vi.mock('../../src/lib/idem', async () => {
    14	  const actual = await vi.importActual<typeof import('../../src/lib/idem')>('../../src/lib/idem');
    15	  return {
    16	    ...actual,
    17	    reserveAction: (...a: unknown[]) => reserveAction(...a),
    18	    commitAction: (...a: unknown[]) => commitAction(...a),
    19	    releaseAction: (...a: unknown[]) => releaseAction(...a),
    20	  };
    21	});
    22	
    23	vi.mock('@devvit/web/server', () => ({
    24	  reddit: {
    25	    remove: (...a: unknown[]) => redditRemove(...a),
    26	  },
    27	}));
    28	
    29	import { runAction } from '../../src/core/runAction';
    30	import type { ActionContext, Item, Author, AppConfig, RemoveAction } from '../../src/shared/types';
    31	
    32	const item: Item = {
    33	  id: 't3_abc', title: 't', body: 'b', url: 'u', author: 'a', age: 0, score: 0,
    34	  isSelf: false, over18: false, removed: false, approved: false, locked: false,
    35	  stickied: false, linkFlairText: null,
    36	};
    37	const author: Author = {
    38	  name: 'a', id: 't2_a', age: 0, linkKarma: 0, commentKarma: 0,
    39	  flairText: null, isMod: false, isContributor: false, verified: false,
    40	  shadowBanned: false,
    41	};
    42	const config: AppConfig = { runs: [] };
    43	const ctx: ActionContext = { item, author, subredditName: 'sub', rev: 0, config };
    44	
    45	const action: RemoveAction = { kind: 'remove' };
    46	
    47	beforeEach(() => {
    48	  reserveAction.mockReset();
    49	  commitAction.mockClear();
    50	  releaseAction.mockClear();
    51	  redditRemove.mockReset();
    52	});
    53	
    54	describe('runAction — happy path', () => {
    55	  it('reserve → side-effect → commit (in that order)', async () => {
    56	    const order: string[] = [];
    57	    reserveAction.mockImplementation(async () => { order.push('reserve'); return { token: 'tk' }; });
    58	    redditRemove.mockImplementation(async () => { order.push('side-effect'); });
    59	    commitAction.mockImplementation(async () => { order.push('commit'); });
    60	
    61	    const res = await runAction(action, ctx);
    62	
    63	    expect(res).toEqual({ status: 'ok', kind: 'remove' });
    64	    expect(order).toEqual(['reserve', 'side-effect', 'commit']);
    65	    expect(releaseAction).not.toHaveBeenCalled();
    66	  });
    67	});
    68	
    69	describe('runAction — failure path', () => {
    70	  it('releases the reservation when the Devvit call throws + returns error', async () => {
    71	    reserveAction.mockResolvedValueOnce({ token: 'tk' });
    72	    redditRemove.mockRejectedValueOnce(new Error('boom'));
    73	
    74	    const res = await runAction(action, ctx);
    75	
    76	    expect(res).toEqual({ status: 'error', kind: 'remove' });
    77	    expect(releaseAction).toHaveBeenCalledTimes(1);
    78	    expect(commitAction).not.toHaveBeenCalled();
    79	  });
    80	
    81	  it('retry after release succeeds', async () => {
    82	    reserveAction.mockResolvedValueOnce({ token: 'tk1' }).mockResolvedValueOnce({ token: 'tk2' });
    83	    redditRemove.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
    84	
    85	    await runAction(action, ctx);  // first attempt fails
    86	    const second = await runAction(action, ctx);  // retry
    87	
    88	    expect(second).toEqual({ status: 'ok', kind: 'remove' });
    89	    expect(commitAction).toHaveBeenCalledTimes(1);
    90	  });
    91	});
    92	
    93	describe('runAction — stale-lease path', () => {
    94	  it('returns skipped-locked when reserveAction returns false', async () => {
    95	    reserveAction.mockResolvedValueOnce(null);
    96	
    97	    const res = await runAction(action, ctx);
    98	
    99	    expect(res).toEqual({ status: 'skipped-locked', kind: 'remove' });
   100	    expect(redditRemove).not.toHaveBeenCalled();
   101	    expect(commitAction).not.toHaveBeenCalled();
   102	    expect(releaseAction).not.toHaveBeenCalled();
   103	  });
   104	});
   105	
   106	describe('runAction — dry-run gate (Phase 2.5)', () => {
   107	  it('returns dry-run when config.dryRun=true and skips reserve + side-effect', async () => {
   108	    const dryCtx: ActionContext = { ...ctx, config: { runs: [], dryRun: true } };
   109	    const res = await runAction(action, dryCtx);
   110	
   111	    expect(res).toEqual({ status: 'dry-run', kind: 'remove', wouldHaveCalled: 'remove' });
   112	    expect(reserveAction).not.toHaveBeenCalled();
   113	    expect(redditRemove).not.toHaveBeenCalled();
   114	  });
   115	
   116	  it('per-action dryRun overrides live config', async () => {
   117	    const dryAction: RemoveAction = { kind: 'remove', dryRun: true };
   118	    const res = await runAction(dryAction, ctx);
   119	
   120	    expect(res.status).toBe('dry-run');
   121	    expect(reserveAction).not.toHaveBeenCalled();
   122	  });
   123	
   124	  it('per-action dryRun=false does NOT override config.dryRun=true (global is authoritative — safety gate)', async () => {
   125	    // Codex HIGH 2026-05-16: global dry-run must be authoritative.
   126	    // A config-level dryRun: true is the SRE non-negotiable safety setting;
   127	    // a per-action dryRun: false trying to override it would be a catastrophic
   128	    // bypass (mod sets the whole bot to dry-run, one rule still fires live).
   129	    // Per-action can ONLY ELEVATE to dry-run, never demote to live.
   130	    const liveAction: RemoveAction = { kind: 'remove', dryRun: false };
   131	    const dryCtx: ActionContext = { ...ctx, config: { runs: [], dryRun: true } };
   132	    const res = await runAction(liveAction, dryCtx);
   133	    expect(res.status).toBe('dry-run');
   134	    expect(reserveAction).not.toHaveBeenCalled();
   135	    expect(redditRemove).not.toHaveBeenCalled();
   136	  });
   137	});

 succeeded in 0ms:
     1	/**
     2	 * Phase 2.5 — Step 2.5.1 gate: URL-dedupe repost rule (race-safe SET NX, Codex HIGH fix).
     3	 *   - first submission: SET NX returns 'OK' → no trigger, 1 set call (NX with TTL)
     4	 *   - second submission: SET NX returns non-OK → trigger + TTL refresh (2 set calls)
     5	 *   - empty URL: no-op
     6	 *   - redis error: fail-OPEN (no false-positive removals during outage)
     7	 */
     8	
     9	import { describe, it, expect, vi, beforeEach } from 'vitest';
    10	
    11	const redisSet = vi.fn().mockResolvedValue('OK');
    12	
    13	vi.mock('@devvit/web/server', () => ({
    14	  redis: {
    15	    set: (...a: unknown[]) => redisSet(...a),
    16	  },
    17	}));
    18	
    19	import { runRepostRule } from '../../src/rules/repost';
    20	import type { Item, RepostRule } from '../../src/shared/types';
    21	
    22	const item = (url: string): Item => ({
    23	  id: 't3_abc', title: '', body: '', url, author: 'u', age: 0, score: 0,
    24	  isSelf: false, over18: false, removed: false, approved: false,
    25	  locked: false, stickied: false, linkFlairText: null,
    26	});
    27	
    28	const rule: RepostRule = { kind: 'repost' };
    29	
    30	beforeEach(() => {
    31	  redisSet.mockReset();
    32	  redisSet.mockResolvedValue('OK');
    33	});
    34	
    35	describe('runRepostRule', () => {
    36	  it('returns triggered=false and writes seen-marker NX on first submission', async () => {
    37	    const res = await runRepostRule(rule, item('https://x.example/a'), 'sub1');
    38	    expect(res).toEqual({ triggered: false });
    39	    expect(redisSet).toHaveBeenCalledTimes(1);
    40	    const [key, value, opts] = redisSet.mock.calls[0] as [string, string, { nx: boolean; expiration: Date }];
    41	    expect(key).toMatch(/^cm:sub1:repost:url:[0-9a-f]{16}$/);
    42	    expect(value).toBe('t3_abc');
    43	    expect(opts.nx).toBe(true);
    44	  });
    45	
    46	  it('triggers when SET NX returns non-OK (key already exists — race-safe)', async () => {
    47	    // Codex HIGH 2026-05-16: prior GET-then-SET pattern raced concurrent
    48	    // submissions. Single atomic SET NX returns non-OK iff key existed.
    49	    redisSet.mockResolvedValueOnce(null);  // NX failed → existing key
    50	    const res = await runRepostRule(rule, item('https://x.example/a'), 'sub1');
    51	    expect(res).toEqual({ triggered: true });
    52	    expect(redisSet).toHaveBeenCalledTimes(2);  // NX attempt + non-NX refresh
    53	  });
    54	
    55	  it('refreshes TTL on a hit so repeat reposts dont expire mid-window', async () => {
    56	    redisSet.mockResolvedValueOnce(null);  // NX failed
    57	    redisSet.mockResolvedValueOnce('OK');  // refresh
    58	    await runRepostRule(rule, item('https://x.example/a'), 'sub1');
    59	    const refreshOpts = redisSet.mock.calls[1]![2] as { nx?: boolean; expiration: Date };
    60	    expect(refreshOpts.nx).toBeUndefined();
    61	    expect(refreshOpts.expiration).toBeInstanceOf(Date);
    62	    expect(refreshOpts.expiration.getTime()).toBeGreaterThan(Date.now());
    63	  });
    64	
    65	  it('sub-scopes the redis key so cross-sub repost markers do not alias', async () => {
    66	    await runRepostRule(rule, item('https://x.example/a'), 'sub_a');
    67	    await runRepostRule(rule, item('https://x.example/a'), 'sub_b');
    68	    const k1 = redisSet.mock.calls[0]![0] as string;
    69	    const k2 = redisSet.mock.calls[1]![0] as string;
    70	    expect(k1).toContain(':sub_a:');
    71	    expect(k2).toContain(':sub_b:');
    72	    expect(k1).not.toBe(k2);
    73	  });
    74	
    75	  it('no-ops on an empty URL', async () => {
    76	    const res = await runRepostRule(rule, item(''), 'sub1');
    77	    expect(res).toEqual({ triggered: false });
    78	    expect(redisSet).not.toHaveBeenCalled();
    79	  });
    80	
    81	  it('fails OPEN on redis error (no trigger — bias away from mass false-positives)', async () => {
    82	    redisSet.mockRejectedValueOnce(new Error('redis down'));
    83	    const res = await runRepostRule(rule, item('https://x.example/a'), 'sub1');
    84	    expect(res).toEqual({ triggered: false });
    85	  });
    86	
    87	  it('honors a custom windowDays', async () => {
    88	    await runRepostRule({ kind: 'repost', windowDays: 7 }, item('https://x.example/a'), 'sub1');
    89	    const opts = redisSet.mock.calls[0]![2] as { expiration: Date };
    90	    const sevenDaysMs = 7 * 86_400 * 1000;
    91	    const expected = Date.now() + sevenDaysMs;
    92	    expect(Math.abs(opts.expiration.getTime() - expected)).toBeLessThan(2_000);
    93	  });
    94	});

 succeeded in 0ms:
     1	/**
     2	 * Step 3.6 — form /test-rules-submit invokes dryRunActivity + renders toast bullets.
     3	 */
     4	
     5	import { describe, it, expect, vi, beforeEach } from 'vitest';
     6	
     7	const dryRunActivity = vi.fn();
     8	const getCurrentSubreddit = vi.fn(async () => ({ name: 'r_test' }));
     9	const getPostById = vi.fn();
    10	const getCommentById = vi.fn();
    11	
    12	vi.mock('@devvit/web/server', () => ({
    13	  reddit: {
    14	    getCurrentSubreddit: () => getCurrentSubreddit(),
    15	    getPostById: (id: string) => getPostById(id),
    16	    getCommentById: (id: string) => getCommentById(id),
    17	  },
    18	  redis: {},
    19	}));
    20	vi.mock('../../src/core/dryRunActivity', () => ({
    21	  dryRunActivity: (...a: unknown[]) => dryRunActivity(...a),
    22	}));
    23	
    24	import { forms } from '../../src/routes/forms';
    25	
    26	beforeEach(() => {
    27	  dryRunActivity.mockReset();
    28	  getPostById.mockReset();
    29	  getCommentById.mockReset();
    30	});
    31	
    32	describe('POST /test-rules-submit form handler', () => {
    33	  it('renders triggered actions as toast bullets', async () => {
    34	    getPostById.mockResolvedValueOnce({
    35	      id: 't3_abc', title: 'free crypto giveaway', body: '', url: '', authorName: 'spammer',
    36	    });
    37	    dryRunActivity.mockResolvedValueOnce({
    38	      configPresent: true,
    39	      configRev: 1,
    40	      runs: [{
    41	        runName: 'spam-removal',
    42	        triggered: true,
    43	        checkName: 'crypto-giveaway',
    44	        actions: [
    45	          { kind: 'remove', wouldHaveCalled: 'remove' },
    46	          { kind: 'comment', wouldHaveCalled: 'comment' },
    47	        ],
    48	      }],
    49	    });
    50	
    51	    const req = new Request('http://x/test-rules-submit', {
    52	      method: 'POST',
    53	      headers: { 'Content-Type': 'application/json' },
    54	      body: JSON.stringify({ values: { thingId: 't3_abc' } }),
    55	    });
    56	    const res = await forms.request(req);
    57	    const json = await res.json() as { showToast: string };
    58	
    59	    expect(json.showToast).toContain('spam-removal');
    60	    expect(json.showToast).toContain('crypto-giveaway');
    61	    expect(json.showToast).toContain('remove');
    62	    expect(json.showToast).toContain('comment');
    63	  });
    64	
    65	  it('reports no config when configPresent=false', async () => {
    66	    getPostById.mockResolvedValueOnce({ id: 't3_abc', title: '', body: '', url: '', authorName: 'x' });
    67	    dryRunActivity.mockResolvedValueOnce({ configPresent: false, runs: [] });
    68	
    69	    const req = new Request('http://x/test-rules-submit', {
    70	      method: 'POST',
    71	      headers: { 'Content-Type': 'application/json' },
    72	      body: JSON.stringify({ values: { thingId: 't3_abc' } }),
    73	    });
    74	    const res = await forms.request(req);
    75	    const json = await res.json() as { showToast: string };
    76	    expect(json.showToast).toMatch(/no config/i);
    77	  });
    78	
    79	  it('reports no triggered runs as explicit pass', async () => {
    80	    getPostById.mockResolvedValueOnce({ id: 't3_abc', title: 'a poem', body: '', url: '', authorName: 'x' });
    81	    dryRunActivity.mockResolvedValueOnce({
    82	      configPresent: true,
    83	      configRev: 1,
    84	      runs: [{ runName: 'spam-removal', triggered: false, actions: [] }],
    85	    });
    86	
    87	    const req = new Request('http://x/test-rules-submit', {
    88	      method: 'POST',
    89	      headers: { 'Content-Type': 'application/json' },
    90	      body: JSON.stringify({ values: { thingId: 't3_abc' } }),
    91	    });
    92	    const res = await forms.request(req);
    93	    const json = await res.json() as { showToast: string };
    94	    expect(json.showToast).toMatch(/no rules triggered/i);
    95	  });
    96	
    97	  it('routes comments via getCommentById when thingId starts with t1_', async () => {
    98	    getCommentById.mockResolvedValueOnce({ id: 't1_xyz', body: 'a comment', authorName: 'u' });
    99	    dryRunActivity.mockResolvedValueOnce({
   100	      configPresent: true,
   101	      configRev: 1,
   102	      runs: [{ runName: 'spam', triggered: false, actions: [] }],
   103	    });
   104	
   105	    const req = new Request('http://x/test-rules-submit', {
   106	      method: 'POST',
   107	      headers: { 'Content-Type': 'application/json' },
   108	      body: JSON.stringify({ values: { thingId: 't1_xyz' } }),
   109	    });
   110	    await forms.request(req);
   111	    expect(getCommentById).toHaveBeenCalledWith('t1_xyz');
   112	    expect(getPostById).not.toHaveBeenCalled();
   113	  });
   114	});

exec
/bin/zsh -lc "nl -ba tests/routes/menu-test-rules.test.ts | sed -n '1,300p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "nl -ba src/routes/menu.ts | sed -n '1,260p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
     1	/**
     2	 * Step 3.6 — menu /test-rules wires to UiResponse.showForm with thingId pre-filled.
     3	 */
     4	
     5	import { describe, it, expect, vi } from 'vitest';
     6	
     7	vi.mock('@devvit/web/server', () => ({
     8	  reddit: {},
     9	  redis: {},
    10	}));
    11	vi.mock('../../src/core/configSource', () => ({
    12	  loadFromWiki: vi.fn(),
    13	  WIKI_PAGE: 'botconfig/contextmod',
    14	}));
    15	vi.mock('../../src/state/configStore');
    16	
    17	import { menu } from '../../src/routes/menu';
    18	
    19	describe('POST /test-rules menu handler', () => {
    20	  it('returns showForm UiResponse with thingId pre-filled', async () => {
    21	    const req = new Request('http://x/test-rules', {
    22	      method: 'POST',
    23	      headers: { 'Content-Type': 'application/json' },
    24	      body: JSON.stringify({ targetId: 't3_abc' }),
    25	    });
    26	    const res = await menu.request(req);
    27	    expect(res.status).toBe(200);
    28	    const json = await res.json() as {
    29	      showForm: { name: string; form: { fields: { name: string; defaultValue: string }[] } };
    30	    };
    31	    expect(json.showForm.name).toBe('testRules');
    32	    expect(json.showForm.form.fields[0]).toMatchObject({
    33	      name: 'thingId',
    34	      defaultValue: 't3_abc',
    35	    });
    36	  });
    37	
    38	  it('returns toast when targetId missing (mod invoked from subreddit menu, not post/comment)', async () => {
    39	    const req = new Request('http://x/test-rules', {
    40	      method: 'POST',
    41	      headers: { 'Content-Type': 'application/json' },
    42	      body: JSON.stringify({}),
    43	    });
    44	    const res = await menu.request(req);
    45	    const json = await res.json() as { showToast?: string };
    46	    expect(json.showToast).toMatch(/post or comment/i);
    47	  });
    48	});

 succeeded in 0ms:
     1	/**
     2	 * Mod menu handlers for ContextMod.
     3	 *
     4	 * /reload-config: re-reads `r/<sub>/wiki/botconfig/contextmod` and republishes
     5	 *                 (Step 3.4). Same logic as the 5-min cron, on demand. Returns
     6	 *                 a toast with the rule count so the mod has immediate feedback.
     7	 * /recent-actions: creates/navigates to the Observatory custom post.
     8	 * /test-rules: stub for Phase 3 Task 32 (dry-run rule tester form).
     9	 */
    10	
    11	import { Hono } from 'hono';
    12	import type { MenuItemRequest } from '@devvit/web/shared';
    13	import { reddit, redis } from '@devvit/web/server';
    14	import * as configStore from '../state/configStore';
    15	import { loadFromWiki, WIKI_PAGE } from '../core/configSource';
    16	import { K } from '../state/keys';
    17	
    18	export const menu = new Hono();
    19	
    20	menu.post('/reload-config', async (c) => {
    21	  await c.req.json<MenuItemRequest>();
    22	  let subName: string;
    23	  try {
    24	    subName = (await reddit.getCurrentSubreddit()).name;
    25	  } catch (err) {
    26	    console.error('[cm/menu/reload-config] could not resolve current sub:', err);
    27	    return c.json({ showToast: 'Could not resolve current subreddit — try again.' });
    28	  }
    29	
    30	  const loaded = await loadFromWiki(subName);
    31	  if (!loaded.ok) {
    32	    const msg = loaded.reason === 'not-found'
    33	      ? `Wiki page "${WIKI_PAGE}" not found in r/${subName}. Create it first, then retry.`
    34	      : `Config parse failed — check the wiki page for JSON5/schema errors.`;
    35	    return c.json({ showToast: msg });
    36	  }
    37	
    38	  try {
    39	    const rev = await configStore.publish(loaded.config, subName);
    40	    await redis.set(K.cfgLastWikiRev(subName), loaded.revisionId);
    41	    const ruleCount = loaded.config.runs
    42	      .flatMap((r) => r.checks)
    43	      .flatMap((ch) => ch.rules).length;
    44	    console.log(`[cm/menu/reload-config] published rev=${rev} (wiki=${loaded.revisionId}) sub=${subName}`);
    45	    return c.json({ showToast: `Loaded ${ruleCount} rules (rev ${rev}).` });
    46	  } catch (err) {
    47	    const msg = err instanceof Error ? err.message : String(err);
    48	    console.error('[cm/menu/reload-config] publish failed:', err);
    49	    return c.json({ showToast: `Publish failed: ${msg}` });
    50	  }
    51	});
    52	
    53	menu.post('/recent-actions', async (c) => {
    54	  try {
    55	    await c.req.json<MenuItemRequest>();
    56	    console.log(`[cm/menu/recent-actions] creating Observatory post`);
    57	    const subreddit = await reddit.getCurrentSubreddit();
    58	    const post = await reddit.submitCustomPost({
    59	      subredditName: subreddit.name,
    60	      title: 'ContextMod Observatory',
    61	      entry: 'default',
    62	      textFallback: {
    63	        text:
    64	          'ContextMod Observatory — recent rule firings and mod-action telemetry. ' +
    65	          'Open this post in a Devvit-compatible Reddit client to view the dashboard.',
    66	      },
    67	    });
    68	    console.log(`[cm/menu/recent-actions] post created ${post.id}`);
    69	    return c.json({
    70	      navigateTo: `https://reddit.com${post.permalink}`,
    71	      showToast: 'Observatory dashboard pinned',
    72	    });
    73	  } catch (err) {
    74	    // Surface real error class to the mod so they have something actionable.
    75	    // Mods cannot read Devvit server logs, so "check logs" is useless to them.
    76	    const msg = err instanceof Error ? err.message : String(err);
    77	    const name = err instanceof Error ? err.name : 'Error';
    78	    console.error(`[cm/menu/recent-actions] failed:`, name, msg, err);
    79	
    80	    let toast = `Could not create dashboard post: ${msg}`;
    81	    if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('scope')) {
    82	      toast = 'App is missing the submit-post permission. Reinstall or contact app author.';
    83	    } else if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('429')) {
    84	      toast = 'Reddit rate-limited us. Try again in 60 seconds.';
    85	    }
    86	    return c.json({ showToast: toast });
    87	  }
    88	});
    89	
    90	menu.post('/test-rules', async (c) => {
    91	  const evt = await c.req.json<MenuItemRequest>();
    92	  console.log(`[cm/menu/test-rules] targetId=${evt.targetId}`);
    93	  if (!evt.targetId) {
    94	    return c.json({
    95	      showToast: 'Right-click a post or comment to select it, then re-open this menu to test rules.',
    96	    });
    97	  }
    98	  return c.json({
    99	    showForm: {
   100	      name: 'testRules',
   101	      form: {
   102	        title: 'ContextMod — Dry-run rules',
   103	        description: 'Evaluate the live rule set against this item. No Reddit actions will fire.',
   104	        fields: [
   105	          {
   106	            type: 'string',
   107	            name: 'thingId',
   108	            label: 'Thing ID',
   109	            defaultValue: evt.targetId,
   110	            disabled: true,
   111	          },
   112	        ],
   113	        acceptLabel: 'Run dry-run',
   114	        cancelLabel: 'Cancel',
   115	      },
   116	    },
   117	  });
   118	});

exec
/bin/zsh -lc "nl -ba src/routes/triggers.ts | sed -n '1,240p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
     1	/**
     2	 * Trigger handlers — Phase 2 wiring.
     3	 *
     4	 * /post-submit and /comment-submit normalize the V2 payload and dispatch to
     5	 * `handleActivity`, which reads the published config and runs the full
     6	 * rule → check → run → action pipeline.
     7	 *
     8	 * Guard order (D0.1 skeleton kept verbatim — these are NOT moved into
     9	 * handleActivity because they're trigger-shape-specific):
    10	 *   1. Null-safety — bail if post/comment ID is missing.
    11	 *   2. Recursion guard — don't react to our own posts (reddit.getAppUser may
    12	 *      return undefined; null-check is required per RedditClient.d.ts:371).
    13	 *      Skip the guard (rather than bail) when author.name is missing so a
    14	 *      payload anomaly doesn't kill all trigger work.
    15	 *   3. firstSeen idempotency — 24h NX guard so a Devvit retry doesn't
    16	 *      double-fire. Fail-CLOSED on Redis error (returns false → skip).
    17	 *   4. Normalize the V2 payload + dispatch to handleActivity.
    18	 *
    19	 * Kill switch deferred — Ctrl+C on the playtest terminal IS the kill switch
    20	 * for playtest. Revisit before any `devvit publish --public`.
    21	 */
    22	
    23	import { Hono } from 'hono';
    24	import { reddit, redis } from '@devvit/web/server';
    25	import { firstSeen } from '../lib/idem';
    26	import { normalizePost, normalizeComment, type PostSubmitPayload, type CommentSubmitPayload } from '../shared/normalize';
    27	import { handleActivity } from '../core/handleActivity';
    28	import * as configStore from '../state/configStore';
    29	import { parseConfig } from '../core/config';
    30	import { DEFAULT_CONFIG_JSON5 } from '../config/default-config';
    31	import { runMigrations, SCHEMA_VERSION } from '../state/migrations';
    32	import { K } from '../state/keys';
    33	import type { AppConfig } from '../shared/types';
    34	
    35	export const triggers = new Hono();
    36	
    37	/**
    38	 * App-install (Step 3.1). Two responsibilities:
    39	 *   1. Stash the install→subname pointer so cron handlers — which have no
    40	 *      inbound request context — can resolve which sub to fetch the wiki for.
    41	 *   2. Seed the default config on FIRST install only. Re-install (existing
    42	 *      `cfg:current_rev` for this sub) is a no-op so a reinstall doesn't
    43	 *      clobber a mod's wiki-edited config.
    44	 *
    45	 * `OnAppInstallRequest` is NOT exported from `@devvit/web/server` (same
    46	 * pattern as PostSubmitPayload — barrel-export confusion). Local payload
    47	 * interface keeps the type-check honest. The V2 trigger payload does NOT
    48	 * include an installId (plan was wrong — verified in playtest 2026-05-16),
    49	 * so we synthesize one from the subname inside stashInstallPointer().
    50	 */
    51	interface AppInstallPayload {
    52	  subreddit?: { name?: string };
    53	}
    54	
    55	/**
    56	 * Stash the installId→subname pointer used by the cron (which has no inbound
    57	 * request context). Reality check from playtest 2026-05-16: the V2 trigger
    58	 * payload does NOT carry installId — the plan's original snippet assumed it.
    59	 * For the hackathon single-install case, synthesize a stable installId of
    60	 * `sub:<subname>` so the existing K.installSubname / K.currentInstallId
    61	 * key shape keeps working without a schema change. Re-running this is a no-op
    62	 * (idempotent SET), so both /app-install and /app-upgrade can call it.
    63	 */
    64	async function stashInstallPointer(subName: string): Promise<void> {
    65	  const installId = `sub:${subName}`;
    66	  await redis.set(K.installSubname(installId), subName);
    67	  await redis.set(K.currentInstallId(), installId);
    68	}
    69	
    70	triggers.post('/app-install', async (c) => {
    71	  const input = await c.req.json<AppInstallPayload>();
    72	  const subName = input.subreddit?.name;
    73	  console.log(`[cm/app-install] sub=${subName}`);
    74	
    75	  if (subName) {
    76	    await stashInstallPointer(subName);
    77	  }
    78	
    79	  if (!subName) {
    80	    console.warn('[cm/app-install] subreddit.name missing — skipping default-config seed');
    81	    return c.json({ status: 'ok' });
    82	  }
    83	
    84	  const existing = await redis.get(K.cfgCurrentRev(subName));
    85	  if (existing) {
    86	    console.log(`[cm/app-install] sub=${subName} already has cfg:current_rev=${existing} — skip seed`);
    87	    return c.json({ status: 'ok' });
    88	  }
    89	
    90	  const parsed = parseConfig(DEFAULT_CONFIG_JSON5);
    91	  if (!parsed.ok) {
    92	    console.error('[cm/app-install] default config failed to parse:', parsed.errors);
    93	    return c.json({ status: 'ok' });
    94	  }
    95	  const rev = await configStore.publish(parsed.config, subName);
    96	  console.log(`[cm/app-install] seeded default config rev=${rev} for sub=${subName}`);
    97	  return c.json({ status: 'ok' });
    98	});
    99	
   100	/**
   101	 * App-upgrade (Step 3.6). Two responsibilities:
   102	 *   1. BACKFILL the install→subname pointer so the cron has somewhere to look
   103	 *      even when the app was installed before Step 3.1 shipped — install fires
   104	 *      once, upgrade fires on every redeploy, so this self-heals existing
   105	 *      installs that never ran the v0.0.1 install handler. Idempotent SET.
   106	 *   2. Compare stored schema version to current — if different, run migrations
   107	 *      and stamp the new version. v0.1 → v0.1 is a no-op today; the seam exists
   108	 *      so a future shape change can land without leaving old installs broken.
   109	 */
   110	triggers.post('/app-upgrade', async (c) => {
   111	  const input = await c.req.json<AppInstallPayload>();
   112	  const subName = input.subreddit?.name;
   113	  if (subName) {
   114	    await stashInstallPointer(subName);
   115	    console.log(`[cm/app-upgrade] backfilled install pointer for sub=${subName}`);
   116	  }
   117	
   118	  const stored = (await redis.get(K.schemaVersion())) ?? '0';
   119	  if (stored === SCHEMA_VERSION) {
   120	    console.log(`[cm/app-upgrade] schema version up-to-date (${stored})`);
   121	    return c.json({ status: 'ok' });
   122	  }
   123	  console.log(`[cm/app-upgrade] migrating ${stored} → ${SCHEMA_VERSION}`);
   124	  await runMigrations(stored, SCHEMA_VERSION);
   125	  await redis.set(K.schemaVersion(), SCHEMA_VERSION);
   126	  return c.json({ status: 'ok' });
   127	});
   128	
   129	triggers.post('/post-submit', async (c) => {
   130	  const input = await c.req.json<PostSubmitPayload>();
   131	  const post = input.post;
   132	  if (!post?.id) {
   133	    console.log('[cm/post-submit] null-safety bail (no post.id)');
   134	    return c.json({ status: 'ok' });
   135	  }
   136	  const authorName = input.author?.name;
   137	  if (!authorName) {
   138	    console.warn('[cm/post-submit] author.name missing — recursion guard skipped');
   139	  }
   140	
   141	  // Recursion guard. getAppUser() returns User | undefined per
   142	  // node_modules/@devvit/reddit/RedditClient.d.ts:371. If authorName is missing
   143	  // we skip the guard rather than bailing — worst case the bot reacts to its
   144	  // own post on a private test sub.
   145	  if (authorName) {
   146	    const appUser = await reddit.getAppUser();
   147	    if (appUser && authorName === appUser.username) return c.json({ status: 'ok' });
   148	  }
   149	
   150	  const subName = input.subreddit?.name ?? (await reddit.getCurrentSubreddit()).name;
   151	
   152	  // firstSeen BEFORE normalize so a re-delivered trigger doesn't burn the
   153	  // (potentially expensive) getUserByUsername call when the config needs it.
   154	  const seen = await firstSeen(post.id, subName);
   155	  if (!seen) {
   156	    console.warn('[cm/post-submit] firstSeen=false (already-seen OR Redis fail-closed):', post.id);
   157	    return c.json({ status: 'skipped-already-seen' });
   158	  }
   159	
   160	  // Read the config ONCE at the entry point so normalize sees the same rev
   161	  // handleActivity will. needsAuthorEnrichment is decided at publish time.
   162	  const current = await configStore.getCurrentRev(subName);
   163	  const config: AppConfig = current?.config ?? { runs: [], needsAuthorEnrichment: false };
   164	  const { item, author } = await normalizePost(input, config);
   165	  await handleActivity(item, author, subName);
   166	
   167	  return c.json({ status: 'ok' });
   168	});
   169	
   170	triggers.post('/comment-submit', async (c) => {
   171	  const input = await c.req.json<CommentSubmitPayload>();
   172	  const comment = input.comment;
   173	  if (!comment?.id) {
   174	    console.log('[cm/comment-submit] null-safety bail (no comment.id)');
   175	    return c.json({ status: 'ok' });
   176	  }
   177	  const authorName = input.author?.name;
   178	  if (!authorName) {
   179	    console.warn('[cm/comment-submit] author.name missing — recursion guard skipped');
   180	  }
   181	
   182	  if (authorName) {
   183	    const appUser = await reddit.getAppUser();
   184	    if (appUser && authorName === appUser.username) return c.json({ status: 'ok' });
   185	  }
   186	
   187	  const subName = input.subreddit?.name ?? (await reddit.getCurrentSubreddit()).name;
   188	
   189	  const seen = await firstSeen(comment.id, subName);
   190	  if (!seen) {
   191	    console.warn('[cm/comment-submit] firstSeen=false (already-seen OR Redis fail-closed):', comment.id);
   192	    return c.json({ status: 'skipped-already-seen' });
   193	  }
   194	
   195	  const current = await configStore.getCurrentRev(subName);
   196	  const config: AppConfig = current?.config ?? { runs: [], needsAuthorEnrichment: false };
   197	  const { item, author } = await normalizeComment(input, config);
   198	  await handleActivity(item, author, subName);
   199	
   200	  return c.json({ status: 'ok' });
   201	});

exec
/bin/zsh -lc "nl -ba src/core/config.ts | sed -n '1,260p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "nl -ba src/shared/normalize.ts | sed -n '1,340p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
     1	/**
     2	 * Config loader. JSON5 → AJV-validate → typed `AppConfig`.
     3	 *
     4	 * Step 1.7's named-rule expansion runs here too so the engine only ever sees
     5	 * a flat rule graph (Step 1.9 dispatcher doesn't need to know about `named:`
     6	 * refs).
     7	 *
     8	 * `needsAuthorEnrichment` is computed at parse time so per-event normalization
     9	 * (Step 1.3) can short-circuit the expensive `reddit.getUserByUsername` call
    10	 * on configs that don't need it.
    11	 */
    12	
    13	import Ajv, { type ErrorObject } from 'ajv';
    14	import JSON5 from 'json5';
    15	import schema from '../schema/app.schema.json' with { type: 'json' };
    16	import type { AppConfig } from '../shared/types';
    17	import { expandNamedRules } from './namedRules';
    18	import { computeNeedsAuthorEnrichment } from '../shared/normalize';
    19	
    20	export type AjvError = ErrorObject;
    21	
    22	export type ParseResult =
    23	  | { ok: true; config: AppConfig }
    24	  | { ok: false; errors: AjvError[] | string };
    25	
    26	const ajv = new Ajv({ allErrors: true, strict: false });
    27	const validate = ajv.compile<AppConfig>(schema);
    28	
    29	export function parseConfig(json5Text: string): ParseResult {
    30	  let raw: unknown;
    31	  try {
    32	    raw = JSON5.parse(json5Text);
    33	  } catch (err) {
    34	    return { ok: false, errors: `JSON5 parse error: ${(err as Error).message}` };
    35	  }
    36	  if (!validate(raw)) {
    37	    return { ok: false, errors: validate.errors ?? [] };
    38	  }
    39	  const config = raw as AppConfig;
    40	  // Codex H6 2026-05-16: expandNamedRules throws on unknown refs (cycles
    41	  // are short-circuited but unresolved names raise). AJV can't catch
    42	  // "named ref X doesn't exist" because the schema only enforces shape.
    43	  // Wrap so callers get a structured ParseResult instead of a 500.
    44	  let expanded: AppConfig;
    45	  try {
    46	    expanded = expandNamedRules(config);
    47	  } catch (err) {
    48	    return { ok: false, errors: `Named-rule expansion failed: ${(err as Error).message}` };
    49	  }
    50	  expanded.needsAuthorEnrichment = computeNeedsAuthorEnrichment(expanded);
    51	  return { ok: true, config: expanded };
    52	}

 succeeded in 0ms:
     1	/**
     2	 * V2 trigger-payload → strict Item/Author normalizer.
     3	 *
     4	 * Devvit's V2 payload is optional-everywhere; the engine reads strict, fully
     5	 * defaulted shapes. Karma is NOT in the UserV2 payload, so we enrich via
     6	 * `reddit.getUserByUsername(name)` — but only if the current config has at
     7	 * least one rule that references Author fields (Council fix, Software Lead +
     8	 * Contrarian: unbounded fan-out on busy subs otherwise).
     9	 *
    10	 * Reality-correction 2026-05-15: Devvit payload field is `author.name`, NOT
    11	 * `author.username`. See `src/routes/triggers.ts:20-23` for the shipped shape.
    12	 */
    13	
    14	import { reddit } from '@devvit/web/server';
    15	import type { Item, Author, AppConfig } from './types';
    16	import { escapeMarkdown } from '../core/template';
    17	
    18	// Local payload shapes — `OnPostSubmitRequest` / `OnCommentSubmitRequest` are
    19	// NOT re-exported by `@devvit/web/server`; they live in `@devvit/shared/types`
    20	// and the barrel does not re-export shared. Define locally instead.
    21	export interface PostSubmitPayload {
    22	  post?: {
    23	    id?: string;
    24	    title?: string;
    25	    selftext?: string;
    26	    url?: string;
    27	    authorId?: string;
    28	    score?: number;
    29	    nsfw?: boolean;
    30	    spoiler?: boolean;
    31	    locked?: boolean;
    32	    stickied?: boolean;
    33	    createdAt?: number | string;
    34	    linkFlair?: { text?: string };
    35	    isSelf?: boolean;
    36	  };
    37	  author?: { id?: string; name?: string };
    38	  subreddit?: { name?: string };
    39	}
    40	
    41	export interface CommentSubmitPayload {
    42	  comment?: {
    43	    id?: string;
    44	    body?: string;
    45	    parentId?: string;
    46	    createdAt?: number | string;
    47	    score?: number;
    48	  };
    49	  post?: { id?: string };
    50	  author?: { id?: string; name?: string };
    51	  subreddit?: { name?: string };
    52	}
    53	
    54	// ---------------------------------------------------------------------------
    55	// Item-side defaults
    56	// ---------------------------------------------------------------------------
    57	
    58	const ITEM_DEFAULTS: Omit<Item, 'id'> = {
    59	  title: '',
    60	  body: '',
    61	  url: '',
    62	  author: '',
    63	  age: 0,
    64	  score: 0,
    65	  isSelf: false,
    66	  over18: false,
    67	  removed: false,
    68	  approved: false,
    69	  locked: false,
    70	  stickied: false,
    71	  linkFlairText: null,
    72	};
    73	
    74	function ageSeconds(createdAt: number | string | undefined): number {
    75	  if (createdAt == null) return 0;
    76	  const ms = typeof createdAt === 'number' ? createdAt : Date.parse(createdAt);
    77	  if (!Number.isFinite(ms)) return 0;
    78	  return Math.max(0, Math.floor((Date.now() - ms) / 1000));
    79	}
    80	
    81	// ---------------------------------------------------------------------------
    82	// Author enrichment
    83	// ---------------------------------------------------------------------------
    84	
    85	const AUTHOR_DEFAULTS: Omit<Author, 'name' | 'id'> = {
    86	  age: 0,
    87	  linkKarma: 0,
    88	  commentKarma: 0,
    89	  flairText: null,
    90	  isMod: false,
    91	  isContributor: false,
    92	  verified: false,
    93	  shadowBanned: false,
    94	};
    95	
    96	async function enrichAuthor(
    97	  name: string,
    98	  id: string,
    99	  needsEnrichment: boolean,
   100	): Promise<Author> {
   101	  if (!needsEnrichment || !name) {
   102	    return { ...AUTHOR_DEFAULTS, name, id };
   103	  }
   104	  try {
   105	    const user = await reddit.getUserByUsername(name);
   106	    if (!user) {
   107	      // Deleted / suspended.
   108	      return { ...AUTHOR_DEFAULTS, name, id, shadowBanned: true };
   109	    }
   110	    return {
   111	      name,
   112	      id: id || (user as { id?: string }).id || '',
   113	      age: ageSeconds((user as { createdAt?: Date | number | string }).createdAt as number | string | undefined),
   114	      linkKarma: (user as { linkKarma?: number }).linkKarma ?? 0,
   115	      commentKarma: (user as { commentKarma?: number }).commentKarma ?? 0,
   116	      flairText: null,
   117	      isMod: (user as { isModerator?: boolean }).isModerator ?? false,
   118	      isContributor: false,
   119	      verified: (user as { isAdmin?: boolean }).isAdmin ?? false,
   120	      shadowBanned: false,
   121	    };
   122	  } catch (err) {
   123	    console.warn('[cm/normalize] getUserByUsername failed — defaulting author:', name, err);
   124	    return { ...AUTHOR_DEFAULTS, name, id };
   125	  }
   126	}
   127	
   128	// ---------------------------------------------------------------------------
   129	// Public API
   130	// ---------------------------------------------------------------------------
   131	
   132	export interface NormalizedActivity {
   133	  item: Item;
   134	  author: Author;
   135	  /** Pre-escaped variants for safe Mustache rendering (Step 1.4 / Phase 2.5). */
   136	  safe: { authorName: string; itemTitle: string; itemBody: string };
   137	}
   138	
   139	/**
   140	 * Inspect the config once to decide whether the per-event normalize must call
   141	 * `reddit.getUserByUsername`. Cached on the config object by Step 1.6 so this
   142	 * runs at publish time, not per-event.
   143	 */
   144	export function computeNeedsAuthorEnrichment(config: AppConfig): boolean {
   145	  for (const run of config.runs ?? []) {
   146	    for (const check of run.checks ?? []) {
   147	      for (const rule of check.rules ?? []) {
   148	        if (ruleNeedsAuthorEnrichment(rule)) return true;
   149	      }
   150	    }
   151	  }
   152	  // Filter side too — checks may include author filters even if no rule does.
   153	  for (const run of config.runs ?? []) {
   154	    for (const check of run.checks ?? []) {
   155	      if (check.filters?.authorIs) {
   156	        const f = check.filters.authorIs;
   157	        if (
   158	          f.ageMinSec != null || f.ageMaxSec != null ||
   159	          f.linkKarmaMin != null || f.linkKarmaMax != null ||
   160	          f.commentKarmaMin != null || f.commentKarmaMax != null ||
   161	          f.isMod != null || f.isContributor != null ||
   162	          f.verified != null || f.shadowBanned != null
   163	        ) return true;
   164	      }
   165	    }
   166	  }
   167	  return false;
   168	}
   169	
   170	function ruleNeedsAuthorEnrichment(rule: { kind: string; filter?: unknown; rules?: unknown }): boolean {
   171	  if (rule.kind === 'author' && rule.filter) {
   172	    const f = rule.filter as Record<string, unknown>;
   173	    return (
   174	      f.ageMinSec != null || f.ageMaxSec != null ||
   175	      f.linkKarmaMin != null || f.linkKarmaMax != null ||
   176	      f.commentKarmaMin != null || f.commentKarmaMax != null ||
   177	      f.isMod != null || f.isContributor != null ||
   178	      f.verified != null || f.shadowBanned != null
   179	    );
   180	  }
   181	  if (rule.kind === 'ruleset' && Array.isArray(rule.rules)) {
   182	    return (rule.rules as { kind: string; filter?: unknown; rules?: unknown }[])
   183	      .some(ruleNeedsAuthorEnrichment);
   184	  }
   185	  return false;
   186	}
   187	
   188	export async function normalizePost(
   189	  payload: PostSubmitPayload,
   190	  config: AppConfig,
   191	): Promise<NormalizedActivity> {
   192	  const p = payload.post ?? {};
   193	  const a = payload.author ?? {};
   194	  const authorName = a.name ?? '';
   195	  const author = await enrichAuthor(
   196	    authorName,
   197	    a.id ?? p.authorId ?? '',
   198	    config.needsAuthorEnrichment ?? false,
   199	  );
   200	  const item: Item = {
   201	    ...ITEM_DEFAULTS,
   202	    id: p.id ?? '',
   203	    title: p.title ?? '',
   204	    body: p.selftext ?? '',
   205	    url: p.url ?? '',
   206	    author: authorName,
   207	    age: ageSeconds(p.createdAt),
   208	    score: p.score ?? 0,
   209	    isSelf: p.isSelf ?? false,
   210	    over18: p.nsfw ?? false,
   211	    locked: p.locked ?? false,
   212	    stickied: p.stickied ?? false,
   213	    linkFlairText: p.linkFlair?.text ?? null,
   214	  };
   215	  return {
   216	    item,
   217	    author,
   218	    safe: {
   219	      authorName: escapeMarkdown(author.name),
   220	      itemTitle: escapeMarkdown(item.title),
   221	      itemBody: escapeMarkdown(item.body),
   222	    },
   223	  };
   224	}
   225	
   226	export async function normalizeComment(
   227	  payload: CommentSubmitPayload,
   228	  config: AppConfig,
   229	): Promise<NormalizedActivity> {
   230	  const c = payload.comment ?? {};
   231	  const a = payload.author ?? {};
   232	  const authorName = a.name ?? '';
   233	  const author = await enrichAuthor(
   234	    authorName,
   235	    a.id ?? '',
   236	    config.needsAuthorEnrichment ?? false,
   237	  );
   238	  const item: Item = {
   239	    ...ITEM_DEFAULTS,
   240	    id: c.id ?? '',
   241	    title: '',
   242	    body: c.body ?? '',
   243	    url: '',
   244	    author: authorName,
   245	    age: ageSeconds(c.createdAt),
   246	    score: c.score ?? 0,
   247	  };
   248	  return {
   249	    item,
   250	    author,
   251	    safe: {
   252	      authorName: escapeMarkdown(author.name),
   253	      itemTitle: '',
   254	      itemBody: escapeMarkdown(item.body),
   255	    },
   256	  };
   257	}

exec
/bin/zsh -lc 'rg -n "needsAuthorEnrichment|author|karma|isMod|normalize" src docs tests /tmp/session-2026-05-16.diff' in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
tests/routes/forms-test-rules.test.ts:35:      id: 't3_abc', title: 'free crypto giveaway', body: '', url: '', authorName: 'spammer',
tests/routes/forms-test-rules.test.ts:66:    getPostById.mockResolvedValueOnce({ id: 't3_abc', title: '', body: '', url: '', authorName: 'x' });
tests/routes/forms-test-rules.test.ts:80:    getPostById.mockResolvedValueOnce({ id: 't3_abc', title: 'a poem', body: '', url: '', authorName: 'x' });
tests/routes/forms-test-rules.test.ts:98:    getCommentById.mockResolvedValueOnce({ id: 't1_xyz', body: 'a comment', authorName: 'u' });
tests/rules/repost.test.ts:23:  id: 't3_abc', title: '', body: '', url, author: 'u', age: 0, score: 0,
src/routes/triggers.ts:4: * /post-submit and /comment-submit normalize the V2 payload and dispatch to
src/routes/triggers.ts:13: *      Skip the guard (rather than bail) when author.name is missing so a
src/routes/triggers.ts:26:import { normalizePost, normalizeComment, type PostSubmitPayload, type CommentSubmitPayload } from '../shared/normalize';
src/routes/triggers.ts:136:  const authorName = input.author?.name;
src/routes/triggers.ts:137:  if (!authorName) {
src/routes/triggers.ts:138:    console.warn('[cm/post-submit] author.name missing — recursion guard skipped');
src/routes/triggers.ts:142:  // node_modules/@devvit/reddit/RedditClient.d.ts:371. If authorName is missing
src/routes/triggers.ts:145:  if (authorName) {
src/routes/triggers.ts:147:    if (appUser && authorName === appUser.username) return c.json({ status: 'ok' });
src/routes/triggers.ts:152:  // firstSeen BEFORE normalize so a re-delivered trigger doesn't burn the
src/routes/triggers.ts:160:  // Read the config ONCE at the entry point so normalize sees the same rev
src/routes/triggers.ts:161:  // handleActivity will. needsAuthorEnrichment is decided at publish time.
src/routes/triggers.ts:163:  const config: AppConfig = current?.config ?? { runs: [], needsAuthorEnrichment: false };
src/routes/triggers.ts:164:  const { item, author } = await normalizePost(input, config);
src/routes/triggers.ts:165:  await handleActivity(item, author, subName);
src/routes/triggers.ts:177:  const authorName = input.author?.name;
src/routes/triggers.ts:178:  if (!authorName) {
src/routes/triggers.ts:179:    console.warn('[cm/comment-submit] author.name missing — recursion guard skipped');
src/routes/triggers.ts:182:  if (authorName) {
src/routes/triggers.ts:184:    if (appUser && authorName === appUser.username) return c.json({ status: 'ok' });
src/routes/triggers.ts:196:  const config: AppConfig = current?.config ?? { runs: [], needsAuthorEnrichment: false };
src/routes/triggers.ts:197:  const { item, author } = await normalizeComment(input, config);
src/routes/triggers.ts:198:  await handleActivity(item, author, subName);
src/routes/forms.ts:22:  authorName?: string;
src/routes/forms.ts:34:  authorName?: string;
src/routes/forms.ts:52:  isMod: false, isContributor: false, verified: false, shadowBanned: false,
src/routes/forms.ts:69:    let authorName: string;
src/routes/forms.ts:72:      authorName = cmt.authorName ?? '';
src/routes/forms.ts:79:        author: authorName,
src/routes/forms.ts:85:      authorName = post.authorName ?? '';
src/routes/forms.ts:92:        author: authorName,
src/routes/forms.ts:102:    const author: Author = { ...AUTHOR_DEFAULTS, name: authorName };
src/routes/forms.ts:104:    const result = await dryRunActivity(item, author, sub.name);
tests/rules/ruleset.test.ts:6:  id: 't3_a', title: 'matches A', body: '', url: '', author: 'u', age: 0, score: 0,
tests/rules/ruleset.test.ts:13:  flairText: null, isMod: false, isContributor: false, verified: false,
docs/migration-compatibility.md:13:If your current wiki config uses **regex rules + author criteria + named rules + filters + Mustache-templated actions**, your config copies across with **zero changes** once Phase 1+2+3 wiring lands. If you use the Phase 4 stretch rules (history / attribution / recentActivity), they land post-hackathon. If you use `mhs`, that's cut per Reddit's PR #96 — keep running upstream PRAW for hate-speech filtering.
docs/migration-compatibility.md:22:| `author` | ✅ **Ported (Phase 1)** | Same JSON5 surface. Supports age / karma / flair / verified / contributor / mod / shadowBanned / removed / approved criteria with `equals` / `lessThan` / `greaterThan` / `in` operators. Account-history sub-criteria (`history`, `attribution`, `recentActivity`) land Phase 4 — see below. |
docs/migration-compatibility.md:25:| `history` | 🚧 **Deferred to Phase 4** | Cache-backed (`cm:author:{name}` hash, 1h TTL). Same criteria surface as upstream: submissionCount / commentCount / linkKarma / commentKarma / accountAge. |
docs/migration-compatibility.md:42:| `comment` | ✅ **Ported (Phase 2)** | Same fields (`body`, `distinguish`, `sticky`, `lock`). Mustache `{{author}}` / `{{subreddit}}` / `{{permalink}}` templating supported. |
docs/migration-compatibility.md:58:| `authorIs` | ✅ **Ported (Phase 1)** | Same JSON5 surface. Criteria match the `author` rule's criteria set. |
docs/migration-compatibility.md:67:| `checks[]` | ✅ **Ported** | Same shape — `name`, `condition` (AND/OR), `rules[]`, `actions[]`, `authorIs`, `itemIs`, `postBehavior`. |
docs/migration-compatibility.md:72:| `caching` | ⚠️ **Replaced** | Upstream allowed mods to tune cache TTLs in config. Devvit version uses fixed TTLs (1h author cache, 7d done-keys, 24h proc-keys, 5m pending) for safety. |
docs/migration-compatibility.md:102:3. **Your reason-chain audit log** (which sub did X to author Y because rule Z) is now visible in-product via the Observatory dashboard (custom post). No more grep-the-Discord-webhook.
docs/submission/devpost-form-cheat-sheet.md:65:The rule engine ports the original ContextMod concept model faithfully: **Run → Check → Rule → Action** with `postBehavior` flow control (`next` / `nextRun` / `stop` / `goto:<run>.<check>`), filters (`authorIs` / `itemIs`), named rule composition, Mustache action templating with `{{item.*}}` / `{{author.*}}` / `{{rules.<name>.data.*}}` context. v0.1.0 ships 3 MVP rule kinds (`regex`, `author`, `ruleSet`) and 7 actions; Phase 4 adds `history`, `attribution`, `recentActivity`, `repost`. Upstream `mhs` toxicity classifier was cut per PR #96.
docs/submission/devpost-form-cheat-sheet.md:212:- **Can the app be installed today and serve the original function?** Yes for MVP scope (regex spam, mod-flair gating, author-criteria filtering, named-rule composition). Phase 4 (`history`, `attribution`, `recentActivity`, `repost`) is in active development and explicitly flagged. `mhs` rule is cut per PR #96 — subs using CM for hate-speech filtering keep running the upstream PRAW build.
docs/submission/devpost-form-cheat-sheet.md:227:u/FoxxMD — author of the original PRAW ContextMod that 15+ communities have run since 2019, including r/mealtimevideos (60K weekly visitors). Gave explicit written permission to port (issue #152), added Stephen + Vinh as repo collaborators on May 12, set up the shared GitHub Projects v2 kanban for cross-team coordination on May 13. Without his permission this port wouldn't exist; without his engagement throughout the hackathon it wouldn't be defensible as "ported faithfully."
docs/submission/devpost-form-cheat-sheet.md:257:| **Port Completion** | MVP scope (regex / author / ruleSet rules + 7 actions + filters + Mustache + named-rule composition + wiki config + Observatory + idempotency primitives + atomic config publish) is types + scaffolds shipped. Live evaluation + action handlers + trigger routes (Phase 1+2+3) ship per backend lane; honest gating in writeup §3. Explicit cuts (MHS per PR #96; DispatchAction; SentimentRule; full RepostRule; multi-bot) documented with rationale | [`writeup-draft.md`](./writeup-draft.md) §3 "Ported faithfully" · `examples/` 3 working JSON5 configs · README "Comparison" section |
tests/rules/regex.test.ts:7:  url: 'https://example.com/path', author: 'u', age: 0, score: 0,
tests/shared/normalize.test.ts:10:import { normalizePost, normalizeComment, computeNeedsAuthorEnrichment } from '../../src/shared/normalize';
tests/shared/normalize.test.ts:13:const baseConfig: AppConfig = { runs: [], needsAuthorEnrichment: false };
tests/shared/normalize.test.ts:15:describe('normalizePost', () => {
tests/shared/normalize.test.ts:19:    const { item, author } = await normalizePost(
tests/shared/normalize.test.ts:22:        author: { id: 't2_zzz', name: 'someUser' },
tests/shared/normalize.test.ts:27:    for (const v of Object.values(author)) expect(v).not.toBeUndefined();
tests/shared/normalize.test.ts:31:    expect(item.author).toBe('someUser');
tests/shared/normalize.test.ts:32:    expect(author.name).toBe('someUser');
tests/shared/normalize.test.ts:35:  it('does NOT call getUserByUsername when config.needsAuthorEnrichment is false', async () => {
tests/shared/normalize.test.ts:36:    await normalizePost(
tests/shared/normalize.test.ts:37:      { post: { id: 't3_a' }, author: { name: 'u1' } },
tests/shared/normalize.test.ts:38:      { runs: [], needsAuthorEnrichment: false },
tests/shared/normalize.test.ts:43:  it('DOES call getUserByUsername when needsAuthorEnrichment is true', async () => {
tests/shared/normalize.test.ts:45:      linkKarma: 100, commentKarma: 200, isModerator: false, isAdmin: false,
tests/shared/normalize.test.ts:47:    await normalizePost(
tests/shared/normalize.test.ts:48:      { post: { id: 't3_a' }, author: { name: 'u1' } },
tests/shared/normalize.test.ts:49:      { runs: [], needsAuthorEnrichment: true },
tests/shared/normalize.test.ts:56:    const { author } = await normalizePost(
tests/shared/normalize.test.ts:57:      { post: { id: 't3_a' }, author: { name: 'ghost' } },
tests/shared/normalize.test.ts:58:      { runs: [], needsAuthorEnrichment: true },
tests/shared/normalize.test.ts:60:    expect(author.shadowBanned).toBe(true);
tests/shared/normalize.test.ts:61:    expect(author.linkKarma).toBe(0);
tests/shared/normalize.test.ts:66:    const { author } = await normalizePost(
tests/shared/normalize.test.ts:67:      { post: { id: 't3_a' }, author: { name: 'u' } },
tests/shared/normalize.test.ts:68:      { runs: [], needsAuthorEnrichment: true },
tests/shared/normalize.test.ts:70:    expect(author.linkKarma).toBe(0);
tests/shared/normalize.test.ts:71:    expect(author.name).toBe('u');
tests/shared/normalize.test.ts:75:describe('normalizeComment', () => {
tests/shared/normalize.test.ts:79:    const { item, author } = await normalizeComment(
tests/shared/normalize.test.ts:80:      { comment: { id: 't1_x', body: 'hi' }, author: { name: 'u' } },
tests/shared/normalize.test.ts:84:    for (const v of Object.values(author)) expect(v).not.toBeUndefined();
tests/shared/normalize.test.ts:92:  it('returns false when no rule references author fields', () => {
tests/shared/normalize.test.ts:106:  it('returns true for an author rule with karma threshold', () => {
tests/shared/normalize.test.ts:113:          rules: [{ kind: 'author', filter: { linkKarmaMax: 10 } }],
tests/shared/normalize.test.ts:120:  it('returns true for check.filters.authorIs', () => {
tests/shared/normalize.test.ts:127:          filters: { authorIs: { isMod: false } },
tests/shared/normalize.test.ts:145:            rules: [{ kind: 'author', filter: { commentKarmaMin: 100 } }],
src/routes/menu.ts:82:      toast = 'App is missing the submit-post permission. Reinstall or contact app author.';
/tmp/session-2026-05-16.diff:12:-| 1.4 | Filter eval (authorIs + itemIs) | `src/core/filters.ts` | **Vinh** | ⬜ | — | Port from CM `Filter` base — `authorIs` evaluates against `Author` shape (name/age/karma/flair/verified/contributor/mod/shadowBanned per `src/shared/types.ts`); `itemIs` against `Item` shape (title/body/url/age/score/isSelf/over18/removed/approved/locked/depth/op). Criteria operators: `equals`/`contains`/`matches` (regex)/`lessThan`/`greaterThan` for scalars; `in`/`includes` for arrays. Return boolean; check-level filter short-circuits before rule eval. Upstream reference: `github.com/FoxxMD/context-mod/src/Filter` |
/tmp/session-2026-05-16.diff:20:+| 1.4 | Filter eval (authorIs + itemIs) | `src/core/filters.ts` | **Vinh** | ✅ 2026-05-16 | — | `passesFilters({authorIs, itemIs}, item, author)` — full predicate set (name/karma/age/flair/mod + over18/locked/score/regex matches). Used by Step 1.7 as pre-check gate. Commit 6694109. |
/tmp/session-2026-05-16.diff:22:+| 1.6 | Rule dispatcher + Regex + Author + RuleSet | `src/core/runRule.ts`, `src/rules/*` | **Vinh** | ✅ 2026-05-16 | 1.4 | 3 MVP rule kinds: regex (title/body/url + flags), author (reuses authorIs filter), ruleset (nested AND/OR). Named-ref throws if not pre-expanded. Commit 6694109. |
/tmp/session-2026-05-16.diff:39:+| 2.5 | onCommentSubmit handler wire-up | `src/routes/triggers.ts` | **Vinh** | ✅ 2026-05-16 | 2.3 | Same pattern as 2.4 with `normalizeComment` + `comment.id` null-gate. Commit 9532cf4. |
/tmp/session-2026-05-16.diff:91:-| Rule engine — `handleActivity` → `runRun` → `runCheck` → `runRule` (regex / author / ruleSet) | **Pending** (Vinh's lane; types + schema defined, evaluation code lands Phase 1) | Phase 1 |
/tmp/session-2026-05-16.diff:95:+| Rule engine — `handleActivity` → `runRun` → `runCheck` → `runRule` (regex / author / ruleSet) | **Production** | Vinh's Phase 1 — 11 steps, 93 tests. Filters (authorIs + itemIs), Mustache templates, named-rule expansion, AND/OR combinators, postBehavior state machine w/ 100-iter safety. |
/tmp/session-2026-05-16.diff:201:+        { kind: 'comment', template: 'Hi {{author.nameSafe}}, your post "{{item.titleSafe}}" was removed as suspected spam.' },
/tmp/session-2026-05-16.diff:210:+- Sticky bot comment posted by `u/CowSufficient3840` (or current dev account) with the rendered Mustache template — author/title rendered through `escapeMarkdown` so any `u/` or `r/` pings the spammer included are defanged (no accidental notifications)
/tmp/session-2026-05-16.diff:253:+## Scenario C — Mod whitelist bypass (authorIs filter)
/tmp/session-2026-05-16.diff:260:+  authorIs: { isMod: false },  // check-level filter
/tmp/session-2026-05-16.diff:266:+- Spam-removal check pre-filters on `authorIs` BEFORE rule eval (Step 1.4 short-circuit)
/tmp/session-2026-05-16.diff:272:+- Server log: `[cm/runCheck] crypto-giveaway: pre-filter authorIs failed (isMod), skipping rule eval`
/tmp/session-2026-05-16.diff:284:+{ authorIs: { isContributor: false } }
/tmp/session-2026-05-16.diff:417: **Yes, for the MVP scope.** Subreddits using the original CM primarily for regex-based spam removal, mod-flair gating, author-criteria filtering, and named-rule composition will see feature parity at install. Subs using CM specifically for repost detection will need to wait for Phase 4 (currently in active development). Subs using CM for hate-speech filtering will need to keep running the upstream PRAW build — the Devvit `mhs` port is cut per PR #96.
/tmp/session-2026-05-16.diff:436:+Four non-contract hotfixes shipped as separate atomic commits the same session (274aef6 dry-run authority, 8f6d608 repost SET NX, dafe050 commit retries, fc3851a lease token). 162 tests green, tsc clean.
/tmp/session-2026-05-16.diff:470:+4. Rule logic in src/rules/{regex,author,ruleset,repost}.ts regex DoS, short-circuit correctness, empty-rules behavior, repost fail-OPEN under Redis outage
/tmp/session-2026-05-16.diff:471:+5. Trigger event normalize in src/shared/normalize.ts null safety, type coercion, missing PostV2/CommentV2 fields, malformed inputs
/tmp/session-2026-05-16.diff:476:+Output: STRICT MARKDOWN with sections CRITICAL / HIGH / MED / LOW. Per finding: file:line citation, 1-paragraph problem statement, suggested fix (code block if non-trivial), IS_SHARED_CONTRACT: yes/no (yes if touching src/shared/types.ts, src/schema/app.schema.json, src/state/keys.ts, src/shared/normalize.ts, RecentEvent shape, Mustache context shape, or /api/recent shape).
/tmp/session-2026-05-16.diff:658:+| "The author is senior, I trust them" | Seniority doesn't prevent mistakes; fresh eyes catch what familiarity blinds |
/tmp/session-2026-05-16.diff:953:+-| 1.4 | Filter eval (authorIs + itemIs) | `src/core/filters.ts` | **Vinh** | ⬜ | — | Port from CM `Filter` base — `authorIs` evaluates against `Author` shape (name/age/karma/flair/verified/contributor/mod/shadowBanned per `src/shared/types.ts`); `itemIs` against `Item` shape (title/body/url/age/score/isSelf/over18/removed/approved/locked/depth/op). Criteria operators: `equals`/`contains`/`matches` (regex)/`lessThan`/`greaterThan` for scalars; `in`/`includes` for arrays. Return boolean; check-level filter short-circuits before rule eval. Upstream reference: `github.com/FoxxMD/context-mod/src/Filter` |
/tmp/session-2026-05-16.diff:961:++| 1.4 | Filter eval (authorIs + itemIs) | `src/core/filters.ts` | **Vinh** | ✅ 2026-05-16 | — | `passesFilters({authorIs, itemIs}, item, author)` — full predicate set (name/karma/age/flair/mod + over18/locked/score/regex matches). Used by Step 1.7 as pre-check gate. Commit 6694109. |
/tmp/session-2026-05-16.diff:963:++| 1.6 | Rule dispatcher + Regex + Author + RuleSet | `src/core/runRule.ts`, `src/rules/*` | **Vinh** | ✅ 2026-05-16 | 1.4 | 3 MVP rule kinds: regex (title/body/url + flags), author (reuses authorIs filter), ruleset (nested AND/OR). Named-ref throws if not pre-expanded. Commit 6694109. |
/tmp/session-2026-05-16.diff:980:++| 2.5 | onCommentSubmit handler wire-up | `src/routes/triggers.ts` | **Vinh** | ✅ 2026-05-16 | 2.3 | Same pattern as 2.4 with `normalizeComment` + `comment.id` null-gate. Commit 9532cf4. |
/tmp/session-2026-05-16.diff:1027:+-- [ ] Implement `const K = { configCurrent, configRev, configCurrentRev, seenActivity, authorProfile, authorFlair, recentEvents, recentEventsByActivity, statsTrigger, statsAction, imageHashByPost, imageHashBucket, repostUrl, rateLimit, dashboardPostId, schemaVersion, failedActionsQueue }`
/tmp/session-2026-05-16.diff:1031:++- [x] Implement `const K = { proc, actionDone, actionPending, lock, cfgRev, cfgCurrentRev, cfgLastWikiRev, eventsRecent, installSubname, authorHist, statsRollup, schemaVersion, currentInstallId }` — every key sub-segmented (default `_` sentinel) for multi-tenant safety (Council 21:30 fix). `installSubname` keyed by installId, not sub (4th-pass Long-Term Architect).
/tmp/session-2026-05-16.diff:1046:++- [x] `src/core/config.ts` — `parseConfig(json5Text): {ok, config|errors}` using JSON5 + Ajv + named-rule expansion + computed `needsAuthorEnrichment` short-circuit
/tmp/session-2026-05-16.diff:1076:++Port simplified from upstream — MVP predicate set, idiomatic TypeScript rather than 1:1 port. `passesFilters(spec, item, author)` is a pure boolean over `FilterSpec = {authorIs?, itemIs?}`.
/tmp/session-2026-05-16.diff:1078:+-- [ ] `evalAuthorIs(filter, author)` — handles include/exclude w/ AuthorCriteria (name, nameMatch, age, linkKarma, commentKarma, totalKarma, flairText, isMod, isContributor, verified, shadowBanned)
/tmp/session-2026-05-16.diff:1083:+-- [ ] Commit: `feat(core): filter evaluation (authorIs + itemIs)`
/tmp/session-2026-05-16.diff:1084:++- [x] AuthorFilter predicates: `nameIn`/`nameNotIn`, `flairTextIn`/`flairTextNotIn`, `ageMinSec`/`ageMaxSec`, `linkKarmaMin`/Max, `commentKarmaMin`/Max, `isMod`, `isContributor`, `verified`, `shadowBanned`
/tmp/session-2026-05-16.diff:1088:++- [x] 20 tests (vs spec's 12+ target) covering: empty/null filter passes everything, each predicate kind positive + negative, combined item+author intersection
/tmp/session-2026-05-16.diff:1098:+-- [ ] `renderTemplate(tmpl, ctx)` — ctx = `{ item, author, manager, rules, actions }`
/tmp/session-2026-05-16.diff:1103:++- [x] `render(tmpl, ctx)` — `ctx = { item: Item & {titleSafe, bodySafe}, author: Author & {nameSafe}, manager?, rules?, actions? }`
/tmp/session-2026-05-16.diff:1112:+-**Files:** `src/server/core/runRule.ts`, `src/server/rules/{regex,author,ruleSet}.ts`
/tmp/session-2026-05-16.diff:1113:++**Files:** Shipped at `src/core/runRule.ts` + `src/rules/{regex,author,ruleset}.ts` + tests under `tests/rules/`.
/tmp/session-2026-05-16.diff:1115:+-- [ ] `runRule(cfg, item, author): Promise<RuleResult>` — dispatches by cfg.kind, applies rule-level authorIs/itemIs guards
/tmp/session-2026-05-16.diff:1117:+-- [ ] `author.ts` — AuthorRule: thin wrapper over evalAuthorIs
/tmp/session-2026-05-16.diff:1121:++- [x] `runRule(rule, item, author)` — dispatches by `rule.kind`. Throws loud on un-expanded `named` ref (Step 1.7 must run at config-parse time, not here).
/tmp/session-2026-05-16.diff:1123:++- [x] `author.ts` — thin wrapper over `passesFilters({authorIs: rule.filter}, ...)` — CM treats author predicates as rules so the trigger state machine sees author decisions in sequence
/tmp/session-2026-05-16.diff:1126:++- [x] Tests: `regex.test.ts` (6), `author.test.ts` (3), `ruleset.test.ts` (6) — 15 total
/tmp/session-2026-05-16.diff:1135:+-- [ ] `runCheck(check, item, author): Promise<CheckResult>` — applies check-level filters, runs all rules, aggregates via AND (default) or OR
/tmp/session-2026-05-16.diff:1139:++- [x] `runCheck(check, item, author): Promise<CheckResult>` — applies check-level filters as a pre-gate (short-circuits to `triggered:false, actions:[]` when filter fails), runs rules in sequence with AND/OR aggregation
/tmp/session-2026-05-16.diff:1151:+-- [ ] `runAllRuns(runs, item, author, exec)` — flat index-based state machine
/tmp/session-2026-05-16.diff:1156:++- [x] `runRun(run, item, author): Promise<RunResult>` — flat index-based state machine over a single run's checks. `handleActivity` (Phase 2) iterates across runs.
/tmp/session-2026-05-16.diff:1178:+-- [ ] Mustache context = `{ item, author, manager: { subreddit }, rules: ruleNamedResults, actions: priorActionResults }`
/tmp/session-2026-05-16.diff:1220:+author.ts
/tmp/session-2026-05-16.diff:1229:+normalize.ts
/tmp/session-2026-05-16.diff:1248:+author.test.ts
/tmp/session-2026-05-16.diff:1254:+normalize.test.ts
/tmp/session-2026-05-16.diff:1296:+error: src/rules/author.ts: already exists in working directory
/tmp/session-2026-05-16.diff:1301:+error: src/shared/normalize.ts: already exists in working directory
/tmp/session-2026-05-16.diff:1315:+error: tests/rules/author.test.ts: already exists in working directory
/tmp/session-2026-05-16.diff:1319:+error: tests/shared/normalize.test.ts: already exists in working directory
/tmp/session-2026-05-16.diff:1330:+The working tree already appears to contain the Phase 1+2 files, so I’ll use the actual source for line numbers and the patch for scope. I’m now reading the idempotency, config, template, rules, normalize, handleActivity, schema, and tests files in batches.
/tmp/session-2026-05-16.diff:1699:+    40	  authorHist: (name: string, sub: string = SUB_DEFAULT) => `cm:${sub}:author:hist:${name}`,
/tmp/session-2026-05-16.diff:1722:+     2	 * Comment-reply action. Renders the Mustache template against the item/author
/tmp/session-2026-05-16.diff:1725:+     5	 * The template MUST reference `{{author.nameSafe}}`, `{{item.titleSafe}}`,
/tmp/session-2026-05-16.diff:1728:+     8	 * links). The Safe variants are populated by normalize.ts.
/tmp/session-2026-05-16.diff:1743:+    23	    author: {
/tmp/session-2026-05-16.diff:1744:+    24	      ...ctx.author,
/tmp/session-2026-05-16.diff:1745:+    25	      nameSafe: escapeMarkdown(ctx.author.name),
/tmp/session-2026-05-16.diff:1760:+     8	 * normalizer to populate the `*Safe` fields on the template context. The
/tmp/session-2026-05-16.diff:1761:+     9	 * comment-reply template README must direct authors to use the `Safe` fields
/tmp/session-2026-05-16.diff:1774:+    22	  author: Author & { nameSafe: string };
/tmp/session-2026-05-16.diff:1788:+    36	 * (`author.name`, `item.title`, `item.body`) embedded in a bot's
/tmp/session-2026-05-16.diff:1823:+    13	    author: 'someUser',
/tmp/session-2026-05-16.diff:1834:+    24	  const author: Author & { nameSafe: string } = {
/tmp/session-2026-05-16.diff:1842:+    32	    isMod: false,
/tmp/session-2026-05-16.diff:1847:+    37	  return { item, author };
/tmp/session-2026-05-16.diff:1851:+    41	  it('substitutes author.name and item.title', () => {
/tmp/session-2026-05-16.diff:1853:+    43	      'Hello {{author.name}}, your post {{item.title}} was removed',
/tmp/session-2026-05-16.diff:1861:+    51	    ctx.author.name = "Joe's & Co";
/tmp/session-2026-05-16.diff:1862:+    52	    const out = render('Hi {{author.name}}', ctx);
/tmp/session-2026-05-16.diff:1934:+tests/actions/actions.test.ts:89:    const tpl = 'Hi {{author.nameSafe}}, your post "{{item.titleSafe}}" was flagged.';
/tmp/session-2026-05-16.diff:1938:+src/routes/menu.ts:44:            template: 'Hi {{author.nameSafe}}, your post "{{item.titleSafe}}" was removed as suspected spam. Mod-team will review on appeal.',
/tmp/session-2026-05-16.diff:1943:+tests/core/template.test.ts:24:  const author: Author & { nameSafe: string } = {
/tmp/session-2026-05-16.diff:1946:+tests/core/template.test.ts:52:    const out = render('Hi {{author.name}}', ctx);
/tmp/session-2026-05-16.diff:1958:+src/actions/comment.ts:2: * Comment-reply action. Renders the Mustache template against the item/author
/tmp/session-2026-05-16.diff:1959:+src/actions/comment.ts:5: * The template MUST reference `{{author.nameSafe}}`, `{{item.titleSafe}}`,
/tmp/session-2026-05-16.diff:1961:+src/actions/comment.ts:8: * links). The Safe variants are populated by normalize.ts.
/tmp/session-2026-05-16.diff:1966:+src/actions/comment.ts:25:      nameSafe: escapeMarkdown(ctx.author.name),
/tmp/session-2026-05-16.diff:1968:+src/shared/normalize.ts:16:import { escapeMarkdown } from '../core/template';
/tmp/session-2026-05-16.diff:1969:+src/shared/normalize.ts:219:      authorName: escapeMarkdown(author.name),
/tmp/session-2026-05-16.diff:1970:+src/shared/normalize.ts:220:      itemTitle: escapeMarkdown(item.title),
/tmp/session-2026-05-16.diff:1971:+src/shared/normalize.ts:221:      itemBody: escapeMarkdown(item.body),
/tmp/session-2026-05-16.diff:1972:+src/shared/normalize.ts:252:      authorName: escapeMarkdown(author.name),
/tmp/session-2026-05-16.diff:1973:+src/shared/normalize.ts:254:      itemBody: escapeMarkdown(item.body),
/tmp/session-2026-05-16.diff:1986:+src/core/template.ts:8: * normalizer to populate the `*Safe` fields on the template context. The
/tmp/session-2026-05-16.diff:1987:+src/core/template.ts:9: * comment-reply template README must direct authors to use the `Safe` fields
/tmp/session-2026-05-16.diff:1989:+src/core/template.ts:22:  author: Author & { nameSafe: string };
/tmp/session-2026-05-16.diff:1999:+/bin/zsh -lc "nl -ba tests/shared/normalize.test.ts | sed -n '1,300p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
/tmp/session-2026-05-16.diff:2003:+/bin/zsh -lc "nl -ba src/shared/normalize.ts | sed -n '1,340p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
/tmp/session-2026-05-16.diff:2069:+    10	import { normalizePost, normalizeComment, computeNeedsAuthorEnrichment } from '../../src/shared/normalize';
/tmp/session-2026-05-16.diff:2072:+    13	const baseConfig: AppConfig = { runs: [], needsAuthorEnrichment: false };
/tmp/session-2026-05-16.diff:2074:+    15	describe('normalizePost', () => {
/tmp/session-2026-05-16.diff:2078:+    19	    const { item, author } = await normalizePost(
/tmp/session-2026-05-16.diff:2081:+    22	        author: { id: 't2_zzz', name: 'someUser' },
/tmp/session-2026-05-16.diff:2086:+    27	    for (const v of Object.values(author)) expect(v).not.toBeUndefined();
/tmp/session-2026-05-16.diff:2090:+    31	    expect(item.author).toBe('someUser');
/tmp/session-2026-05-16.diff:2091:+    32	    expect(author.name).toBe('someUser');
/tmp/session-2026-05-16.diff:2094:+    35	  it('does NOT call getUserByUsername when config.needsAuthorEnrichment is false', async () => {
/tmp/session-2026-05-16.diff:2095:+    36	    await normalizePost(
/tmp/session-2026-05-16.diff:2096:+    37	      { post: { id: 't3_a' }, author: { name: 'u1' } },
/tmp/session-2026-05-16.diff:2097:+    38	      { runs: [], needsAuthorEnrichment: false },
/tmp/session-2026-05-16.diff:2102:+    43	  it('DOES call getUserByUsername when needsAuthorEnrichment is true', async () => {
/tmp/session-2026-05-16.diff:2104:+    45	      linkKarma: 100, commentKarma: 200, isModerator: false, isAdmin: false,
/tmp/session-2026-05-16.diff:2106:+    47	    await normalizePost(
/tmp/session-2026-05-16.diff:2107:+    48	      { post: { id: 't3_a' }, author: { name: 'u1' } },
/tmp/session-2026-05-16.diff:2108:+    49	      { runs: [], needsAuthorEnrichment: true },
/tmp/session-2026-05-16.diff:2115:+    56	    const { author } = await normalizePost(
/tmp/session-2026-05-16.diff:2116:+    57	      { post: { id: 't3_a' }, author: { name: 'ghost' } },
/tmp/session-2026-05-16.diff:2117:+    58	      { runs: [], needsAuthorEnrichment: true },
/tmp/session-2026-05-16.diff:2119:+    60	    expect(author.shadowBanned).toBe(true);
/tmp/session-2026-05-16.diff:2120:+    61	    expect(author.linkKarma).toBe(0);
/tmp/session-2026-05-16.diff:2125:+    66	    const { author } = await normalizePost(
/tmp/session-2026-05-16.diff:2126:+    67	      { post: { id: 't3_a' }, author: { name: 'u' } },
/tmp/session-2026-05-16.diff:2127:+    68	      { runs: [], needsAuthorEnrichment: true },
/tmp/session-2026-05-16.diff:2129:+    70	    expect(author.linkKarma).toBe(0);
/tmp/session-2026-05-16.diff:2130:+    71	    expect(author.name).toBe('u');
/tmp/session-2026-05-16.diff:2134:+    75	describe('normalizeComment', () => {
/tmp/session-2026-05-16.diff:2138:+    79	    const { item, author } = await normalizeComment(
/tmp/session-2026-05-16.diff:2139:+    80	      { comment: { id: 't1_x', body: 'hi' }, author: { name: 'u' } },
/tmp/session-2026-05-16.diff:2143:+    84	    for (const v of Object.values(author)) expect(v).not.toBeUndefined();
/tmp/session-2026-05-16.diff:2151:+    92	  it('returns false when no rule references author fields', () => {
/tmp/session-2026-05-16.diff:2165:+   106	  it('returns true for an author rule with karma threshold', () => {
/tmp/session-2026-05-16.diff:2172:+   113	          rules: [{ kind: 'author', filter: { linkKarmaMax: 10 } }],
/tmp/session-2026-05-16.diff:2179:+   120	  it('returns true for check.filters.authorIs', () => {
/tmp/session-2026-05-16.diff:2186:+   127	          filters: { authorIs: { isMod: false } },
/tmp/session-2026-05-16.diff:2204:+   145	            rules: [{ kind: 'author', filter: { commentKarmaMin: 100 } }],
/tmp/session-2026-05-16.diff:2242:+    29	  author: Author,
/tmp/session-2026-05-16.diff:2249:+    36	    const result = await runRun(run, item, author, subredditName);
/tmp/session-2026-05-16.diff:2256:+    43	        author,
/tmp/session-2026-05-16.diff:2277:+     2	 * V2 trigger-payload → strict Item/Author normalizer.
/tmp/session-2026-05-16.diff:2285:+    10	 * Reality-correction 2026-05-15: Devvit payload field is `author.name`, NOT
/tmp/session-2026-05-16.diff:2286:+    11	 * `author.username`. See `src/routes/triggers.ts:20-23` for the shipped shape.
/tmp/session-2026-05-16.diff:2302:+    27	    authorId?: string;
/tmp/session-2026-05-16.diff:2312:+    37	  author?: { id?: string; name?: string };
/tmp/session-2026-05-16.diff:2325:+    50	  author?: { id?: string; name?: string };
/tmp/session-2026-05-16.diff:2337:+    62	  author: '',
/tmp/session-2026-05-16.diff:2365:+    90	  isMod: false,
/tmp/session-2026-05-16.diff:2392:+   117	      isMod: (user as { isModerator?: boolean }).isModerator ?? false,
/tmp/session-2026-05-16.diff:2398:+   123	    console.warn('[cm/normalize] getUserByUsername failed — defaulting author:', name, err);
/tmp/session-2026-05-16.diff:2409:+   134	  author: Author;
/tmp/session-2026-05-16.diff:2411:+   136	  safe: { authorName: string; itemTitle: string; itemBody: string };
/tmp/session-2026-05-16.diff:2415:+   140	 * Inspect the config once to decide whether the per-event normalize must call
/tmp/session-2026-05-16.diff:2427:+   152	  // Filter side too — checks may include author filters even if no rule does.
/tmp/session-2026-05-16.diff:2430:+   155	      if (check.filters?.authorIs) {
/tmp/session-2026-05-16.diff:2431:+   156	        const f = check.filters.authorIs;
/tmp/session-2026-05-16.diff:2436:+   161	          f.isMod != null || f.isContributor != null ||
/tmp/session-2026-05-16.diff:2446:+   171	  if (rule.kind === 'author' && rule.filter) {
/tmp/session-2026-05-16.diff:2452:+   177	      f.isMod != null || f.isContributor != null ||
/tmp/session-2026-05-16.diff:2463:+   188	export async function normalizePost(
/tmp/session-2026-05-16.diff:2468:+   193	  const a = payload.author ?? {};
/tmp/session-2026-05-16.diff:2469:+   194	  const authorName = a.name ?? '';
/tmp/session-2026-05-16.diff:2470:+   195	  const author = await enrichAuthor(
/tmp/session-2026-05-16.diff:2471:+   196	    authorName,
/tmp/session-2026-05-16.diff:2472:+   197	    a.id ?? p.authorId ?? '',
/tmp/session-2026-05-16.diff:2473:+   198	    config.needsAuthorEnrichment ?? false,
/tmp/session-2026-05-16.diff:2481:+   206	    author: authorName,
/tmp/session-2026-05-16.diff:2492:+   217	    author,
/tmp/session-2026-05-16.diff:2494:+   219	      authorName: escapeMarkdown(author.name),
/tmp/session-2026-05-16.diff:2501:+   226	export async function normalizeComment(
/tmp/session-2026-05-16.diff:2506:+   231	  const a = payload.author ?? {};
/tmp/session-2026-05-16.diff:2507:+   232	  const authorName = a.name ?? '';
/tmp/session-2026-05-16.diff:2508:+   233	  const author = await enrichAuthor(
/tmp/session-2026-05-16.diff:2509:+   234	    authorName,
/tmp/session-2026-05-16.diff:2511:+   236	    config.needsAuthorEnrichment ?? false,
/tmp/session-2026-05-16.diff:2519:+   244	    author: authorName,
/tmp/session-2026-05-16.diff:2525:+   250	    author,
/tmp/session-2026-05-16.diff:2527:+   252	      authorName: escapeMarkdown(author.name),
/tmp/session-2026-05-16.diff:2561:+     4	 * /post-submit and /comment-submit normalize the V2 payload and dispatch to
/tmp/session-2026-05-16.diff:2570:+    13	 *      Skip the guard (rather than bail) when author.name is missing so a
/tmp/session-2026-05-16.diff:2583:+    26	import { normalizePost, normalizeComment, type PostSubmitPayload, type CommentSubmitPayload } from '../shared/normalize';
/tmp/session-2026-05-16.diff:2607:+    50	  const authorName = input.author?.name;
/tmp/session-2026-05-16.diff:2608:+    51	  if (!authorName) {
/tmp/session-2026-05-16.diff:2609:+    52	    console.warn('[cm/post-submit] author.name missing — recursion guard skipped');
/tmp/session-2026-05-16.diff:2613:+    56	  // node_modules/@devvit/reddit/RedditClient.d.ts:371. If authorName is missing
/tmp/session-2026-05-16.diff:2616:+    59	  if (authorName) {
/tmp/session-2026-05-16.diff:2618:+    61	    if (appUser && authorName === appUser.username) return c.json({ status: 'ok' });
/tmp/session-2026-05-16.diff:2623:+    66	  // firstSeen BEFORE normalize so a re-delivered trigger doesn't burn the
/tmp/session-2026-05-16.diff:2631:+    74	  // Read the config ONCE at the entry point so normalize sees the same rev
/tmp/session-2026-05-16.diff:2632:+    75	  // handleActivity will. needsAuthorEnrichment is decided at publish time.
/tmp/session-2026-05-16.diff:2634:+    77	  const config: AppConfig = current?.config ?? { runs: [], needsAuthorEnrichment: false };
/tmp/session-2026-05-16.diff:2635:+    78	  const { item, author } = await normalizePost(input, config);
/tmp/session-2026-05-16.diff:2636:+    79	  await handleActivity(item, author, subName);
/tmp/session-2026-05-16.diff:2648:+    91	  const authorName = input.author?.name;
/tmp/session-2026-05-16.diff:2649:+    92	  if (!authorName) {
/tmp/session-2026-05-16.diff:2650:+    93	    console.warn('[cm/comment-submit] author.name missing — recursion guard skipped');
/tmp/session-2026-05-16.diff:2653:+    96	  if (authorName) {
/tmp/session-2026-05-16.diff:2655:+    98	    if (appUser && authorName === appUser.username) return c.json({ status: 'ok' });
/tmp/session-2026-05-16.diff:2667:+   110	  const config: AppConfig = current?.config ?? { runs: [], needsAuthorEnrichment: false };
/tmp/session-2026-05-16.diff:2668:+   111	  const { item, author } = await normalizeComment(input, config);
/tmp/session-2026-05-16.diff:2669:+   112	  await handleActivity(item, author, subName);
/tmp/session-2026-05-16.diff:2691:+    15	import { runAuthorRule } from '../rules/author';
/tmp/session-2026-05-16.diff:2695:+    19	export async function runRule(rule: Rule, item: Item, author: Author, sub?: string): Promise<RuleResult> {
/tmp/session-2026-05-16.diff:2698:+    22	    case 'author':  return runAuthorRule(rule, item, author);
/tmp/session-2026-05-16.diff:2699:+    23	    case 'ruleset': return runRuleSet(rule, item, author, sub);
/tmp/session-2026-05-16.diff:2715:+    11	export async function runCheck(check: Check, item: Item, author: Author, sub?: string): Promise<CheckResult> {
/tmp/session-2026-05-16.diff:2716:+    12	  if (!passesFilters(check.filters, item, author)) {
/tmp/session-2026-05-16.diff:2724:+    20	      const res = await runRule(r, item, author, sub);
/tmp/session-2026-05-16.diff:2733:+    29	    const res = await runRule(r, item, author, sub);
/tmp/session-2026-05-16.diff:2757:+    18	export async function runRun(run: Run, item: Item, author: Author, sub?: string): Promise<RunResult> {
/tmp/session-2026-05-16.diff:2780:+    41	    const res = await runCheck(check, item, author, sub);
/tmp/session-2026-05-16.diff:2808:+/bin/zsh -lc "nl -ba src/rules/author.ts | sed -n '1,220p' && nl -ba src/rules/ruleset.ts | sed -n '1,240p' && nl -ba src/rules/repost.ts | sed -n '1,260p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
/tmp/session-2026-05-16.diff:2814:+     5	 * AuthorRule reuses the FilterSpec.authorIs predicate set. CM treats it as a
/tmp/session-2026-05-16.diff:2815:+     6	 * rule (not just a filter) so the trigger state machine sees author-based
/tmp/session-2026-05-16.diff:2818:+     9	export function runAuthorRule(rule: AuthorRule, item: Item, author: Author): RuleResult {
/tmp/session-2026-05-16.diff:2819:+    10	  return { triggered: passesFilters({ authorIs: rule.filter }, item, author) };
/tmp/session-2026-05-16.diff:2828:+     8	export async function runRuleSet(rule: RuleSetRule, item: Item, author: Author, sub?: string): Promise<RuleResult> {
/tmp/session-2026-05-16.diff:2837:+    17	      const res = await runRule(r, item, author, sub);
/tmp/session-2026-05-16.diff:2844:+    24	    const res = await runRule(r, item, author, sub);
/tmp/session-2026-05-16.diff:2927:+    10	    "needsAuthorEnrichment": { "type": "boolean" },
/tmp/session-2026-05-16.diff:3005:+    88	        "kind": { "const": "author" },
/tmp/session-2026-05-16.diff:3047:+   130	        "authorIs": { "$ref": "#/definitions/AuthorFilter" },
/tmp/session-2026-05-16.diff:3065:+   148	        "isMod":            { "type": "boolean" },
/tmp/session-2026-05-16.diff:3173:+     4	 * optional) is normalized into these shapes by `src/shared/normalize.ts`.
/tmp/session-2026-05-16.diff:3189:+    20	  author: string;        // username
/tmp/session-2026-05-16.diff:3200:+    31	  op?: boolean;          // comment was authored by OP
/tmp/session-2026-05-16.diff:3210:+    41	  isMod: boolean;
/tmp/session-2026-05-16.diff:3231:+    62	  isMod?: boolean;
/tmp/session-2026-05-16.diff:3254:+    85	  authorIs?: AuthorFilter;
/tmp/session-2026-05-16.diff:3273:+   104	  kind: 'author';
/tmp/session-2026-05-16.diff:3358:+   189	  needsAuthorEnrichment?: boolean;    // set at parse time by inspecting rule kinds
/tmp/session-2026-05-16.diff:3397:+   228	  author: Author;
/tmp/session-2026-05-16.diff:3494:+    33	  id: 't3_abc', title: 't', body: 'b', url: 'u', author: 'a', age: 0, score: 0,
/tmp/session-2026-05-16.diff:3498:+    37	const author: Author = {
/tmp/session-2026-05-16.diff:3500:+    39	  flairText: null, isMod: false, isContributor: false, verified: false,
/tmp/session-2026-05-16.diff:3504:+    43	const ctx: ActionContext = { item, author, subredditName: 'sub', rev: 0, config };
/tmp/session-2026-05-16.diff:3606:+     8	 * `needsAuthorEnrichment` is computed at parse time so per-event normalization
/tmp/session-2026-05-16.diff:3616:+    18	import { computeNeedsAuthorEnrichment } from '../shared/normalize';
/tmp/session-2026-05-16.diff:3639:+    41	  expanded.needsAuthorEnrichment = computeNeedsAuthorEnrichment(expanded);
/tmp/session-2026-05-16.diff:3751:+     2	 * Filter eval — ports FoxxMD's `RunnableBase` filter logic (`itemIs` / `authorIs`)
/tmp/session-2026-05-16.diff:3764:+    15	export function passesFilters(filters: FilterSpec | undefined, item: Item, author: Author): boolean {
/tmp/session-2026-05-16.diff:3766:+    17	  if (filters.authorIs && !passesAuthor(filters.authorIs, author)) return false;
/tmp/session-2026-05-16.diff:3782:+    33	  if (f.isMod != null && a.isMod !== f.isMod) return false;
/tmp/session-2026-05-16.diff:3826:+    17	    username: ctx.author.name,
/tmp/session-2026-05-16.diff:3870:+     7	  url: 'https://example.com/path', author: 'u', age: 0, score: 0,
/tmp/session-2026-05-16.diff:3927:+    25	  id: 't3_abc', title: '', body: '', url, author: 'u', age: 0, score: 0,
/tmp/session-2026-05-16.diff:4047:+    48	  author: 'spammer', age: 100, score: 0, isSelf: false, over18: false,
/tmp/session-2026-05-16.diff:4050:+    51	const author: Author = {
/tmp/session-2026-05-16.diff:4052:+    53	  flairText: null, isMod: false, isContributor: false, verified: false, shadowBanned: false,
/tmp/session-2026-05-16.diff:4080:+    81	    await handleActivity(item, author, 'sub');
/tmp/session-2026-05-16.diff:4088:+    89	    await handleActivity(item, author, 'cm_devvit_test');
/tmp/session-2026-05-16.diff:4105:+   106	    await handleActivity(item, author, 'sub');
/tmp/session-2026-05-16.diff:4127:+   128	    await handleActivity(item, author, 'sub');
/tmp/session-2026-05-16.diff:4162:+   163	    await handleActivity(item, author, 'sub');
/tmp/session-2026-05-16.diff:4171:+   172	    await handleActivity(item, author, 'sub');
/tmp/session-2026-05-16.diff:4203:+Global dry-run can be bypassed by setting an individual action to `dryRun: false`. The test name says “per-action only overrides UPWARD to dry-run,” but the assertion expects a live Reddit call under `config.dryRun=true`. That is exactly the kind of safety gate slip this flag is supposed to prevent. Suggested fix: make global dry-run authoritative:  
/tmp/session-2026-05-16.diff:4214:+The advertised read-once config invariant is not true. The trigger reads config once for normalization, then `handleActivity` reads config again for rule/action execution. A publish between those two reads can normalize author enrichment against rev A and execute rules/actions from rev B. Suggested fix: pass the already-read `ConfigSnapshot` into `handleActivity` and remove its internal config read for trigger-driven calls.  
/tmp/session-2026-05-16.diff:4218:+The Mustache context exposes both raw fields (`author.name`, `item.title`, `item.body`) and safe fields, while the schema accepts arbitrary templates. A config author only has to use `{{item.title}}` once to re-enable ping/link/blockquote injection. Suggested fix: either make `Mustache.escape = escapeMarkdown` for normal `{{...}}`, or expose only safe values in the comment template context and require triple-stash for explicitly raw moderator-authored fields.  
/tmp/session-2026-05-16.diff:4236:+Repost fingerprinting hashes the raw URL. `https://example.com`, `https://example.com/`, case changes in host, tracking query params, and fragments all become different fingerprints, so common repost variants evade detection. Suggested fix: canonicalize URL before hashing: lowercase host, strip fragments, normalize trailing slash, and optionally drop configured tracking params.  
/tmp/session-2026-05-16.diff:4239:+**src/shared/normalize.ts:74**  
/tmp/session-2026-05-16.diff:4240:+`ageSeconds` treats every numeric `createdAt` as milliseconds. If Devvit ever supplies epoch seconds for a V2 payload, age becomes wildly inflated and age-based rules misfire. Suggested fix: detect seconds-vs-ms by magnitude or normalize from `Date` objects explicitly.  
/tmp/session-2026-05-16.diff:4261:+**tests/shared/normalize.test.ts:26**  
/tmp/session-2026-05-16.diff:4262:+Several normalize tests assert “not undefined” rather than exact shape and coercion behavior. They would not catch missing `over18`, wrong `createdAt` units, absent comment parent/depth/op data, or unexpected malformed payloads. Suggested fix: assert full normalized `Item`/`Author` objects for representative PostV2 and CommentV2 payloads.  
/tmp/session-2026-05-16.diff:4293:+Global dry-run can be bypassed by setting an individual action to `dryRun: false`. The test name says “per-action only overrides UPWARD to dry-run,” but the assertion expects a live Reddit call under `config.dryRun=true`. That is exactly the kind of safety gate slip this flag is supposed to prevent. Suggested fix: make global dry-run authoritative:  
/tmp/session-2026-05-16.diff:4304:+The advertised read-once config invariant is not true. The trigger reads config once for normalization, then `handleActivity` reads config again for rule/action execution. A publish between those two reads can normalize author enrichment against rev A and execute rules/actions from rev B. Suggested fix: pass the already-read `ConfigSnapshot` into `handleActivity` and remove its internal config read for trigger-driven calls.  
/tmp/session-2026-05-16.diff:4308:+The Mustache context exposes both raw fields (`author.name`, `item.title`, `item.body`) and safe fields, while the schema accepts arbitrary templates. A config author only has to use `{{item.title}}` once to re-enable ping/link/blockquote injection. Suggested fix: either make `Mustache.escape = escapeMarkdown` for normal `{{...}}`, or expose only safe values in the comment template context and require triple-stash for explicitly raw moderator-authored fields.  
/tmp/session-2026-05-16.diff:4326:+Repost fingerprinting hashes the raw URL. `https://example.com`, `https://example.com/`, case changes in host, tracking query params, and fragments all become different fingerprints, so common repost variants evade detection. Suggested fix: canonicalize URL before hashing: lowercase host, strip fragments, normalize trailing slash, and optionally drop configured tracking params.  
/tmp/session-2026-05-16.diff:4329:+**src/shared/normalize.ts:74**  
/tmp/session-2026-05-16.diff:4330:+`ageSeconds` treats every numeric `createdAt` as milliseconds. If Devvit ever supplies epoch seconds for a V2 payload, age becomes wildly inflated and age-based rules misfire. Suggested fix: detect seconds-vs-ms by magnitude or normalize from `Date` objects explicitly.  
/tmp/session-2026-05-16.diff:4351:+**tests/shared/normalize.test.ts:26**  
/tmp/session-2026-05-16.diff:4352:+Several normalize tests assert “not undefined” rather than exact shape and coercion behavior. They would not catch missing `over18`, wrong `createdAt` units, absent comment parent/depth/op data, or unexpected malformed payloads. Suggested fix: assert full normalized `Item`/`Author` objects for representative PostV2 and CommentV2 payloads.  
/tmp/session-2026-05-16.diff:4379:+> - `fix(dry-run)` 274aef6 — global config.dryRun authoritative (was bypassable per-action)
/tmp/session-2026-05-16.diff:4389:+> 2. **`src/routes/triggers.ts:76` + `src/core/handleActivity.ts:32`** — config-rev read-once invariant is violated. Trigger reads, then handleActivity reads AGAIN. Publish in between → normalize on rev A, execute on rev B. Fix: pass ConfigSnapshot into handleActivity, drop its internal read.
/tmp/session-2026-05-16.diff:4394:+> Plus 5 MED + 3 LOW — also contract-touching mostly (event-status collapse, normalize createdAt unit detection, K.* segment encoding, schema minItems). I'll open GH issues tagged `post-hackathon` for those unless you think any are urgent.
/tmp/session-2026-05-16.diff:4431:-- [ ] Implement `const K = { configCurrent, configRev, configCurrentRev, seenActivity, authorProfile, authorFlair, recentEvents, recentEventsByActivity, statsTrigger, statsAction, imageHashByPost, imageHashBucket, repostUrl, rateLimit, dashboardPostId, schemaVersion, failedActionsQueue }`
/tmp/session-2026-05-16.diff:4435:+- [x] Implement `const K = { proc, actionDone, actionPending, lock, cfgRev, cfgCurrentRev, cfgLastWikiRev, eventsRecent, installSubname, authorHist, statsRollup, schemaVersion, currentInstallId }` — every key sub-segmented (default `_` sentinel) for multi-tenant safety (Council 21:30 fix). `installSubname` keyed by installId, not sub (4th-pass Long-Term Architect).
/tmp/session-2026-05-16.diff:4450:+- [x] `src/core/config.ts` — `parseConfig(json5Text): {ok, config|errors}` using JSON5 + Ajv + named-rule expansion + computed `needsAuthorEnrichment` short-circuit
/tmp/session-2026-05-16.diff:4480:+Port simplified from upstream — MVP predicate set, idiomatic TypeScript rather than 1:1 port. `passesFilters(spec, item, author)` is a pure boolean over `FilterSpec = {authorIs?, itemIs?}`.
/tmp/session-2026-05-16.diff:4482:-- [ ] `evalAuthorIs(filter, author)` — handles include/exclude w/ AuthorCriteria (name, nameMatch, age, linkKarma, commentKarma, totalKarma, flairText, isMod, isContributor, verified, shadowBanned)
/tmp/session-2026-05-16.diff:4487:-- [ ] Commit: `feat(core): filter evaluation (authorIs + itemIs)`
/tmp/session-2026-05-16.diff:4488:+- [x] AuthorFilter predicates: `nameIn`/`nameNotIn`, `flairTextIn`/`flairTextNotIn`, `ageMinSec`/`ageMaxSec`, `linkKarmaMin`/Max, `commentKarmaMin`/Max, `isMod`, `isContributor`, `verified`, `shadowBanned`
/tmp/session-2026-05-16.diff:4492:+- [x] 20 tests (vs spec's 12+ target) covering: empty/null filter passes everything, each predicate kind positive + negative, combined item+author intersection
/tmp/session-2026-05-16.diff:4502:-- [ ] `renderTemplate(tmpl, ctx)` — ctx = `{ item, author, manager, rules, actions }`
/tmp/session-2026-05-16.diff:4507:+- [x] `render(tmpl, ctx)` — `ctx = { item: Item & {titleSafe, bodySafe}, author: Author & {nameSafe}, manager?, rules?, actions? }`
/tmp/session-2026-05-16.diff:4516:-**Files:** `src/server/core/runRule.ts`, `src/server/rules/{regex,author,ruleSet}.ts`
/tmp/session-2026-05-16.diff:4517:+**Files:** Shipped at `src/core/runRule.ts` + `src/rules/{regex,author,ruleset}.ts` + tests under `tests/rules/`.
/tmp/session-2026-05-16.diff:4519:-- [ ] `runRule(cfg, item, author): Promise<RuleResult>` — dispatches by cfg.kind, applies rule-level authorIs/itemIs guards
/tmp/session-2026-05-16.diff:4521:-- [ ] `author.ts` — AuthorRule: thin wrapper over evalAuthorIs
/tmp/session-2026-05-16.diff:4525:+- [x] `runRule(rule, item, author)` — dispatches by `rule.kind`. Throws loud on un-expanded `named` ref (Step 1.7 must run at config-parse time, not here).
/tmp/session-2026-05-16.diff:4527:+- [x] `author.ts` — thin wrapper over `passesFilters({authorIs: rule.filter}, ...)` — CM treats author predicates as rules so the trigger state machine sees author decisions in sequence
/tmp/session-2026-05-16.diff:4530:+- [x] Tests: `regex.test.ts` (6), `author.test.ts` (3), `ruleset.test.ts` (6) — 15 total
/tmp/session-2026-05-16.diff:4539:-- [ ] `runCheck(check, item, author): Promise<CheckResult>` — applies check-level filters, runs all rules, aggregates via AND (default) or OR
/tmp/session-2026-05-16.diff:4543:+- [x] `runCheck(check, item, author): Promise<CheckResult>` — applies check-level filters as a pre-gate (short-circuits to `triggered:false, actions:[]` when filter fails), runs rules in sequence with AND/OR aggregation
/tmp/session-2026-05-16.diff:4555:-- [ ] `runAllRuns(runs, item, author, exec)` — flat index-based state machine
/tmp/session-2026-05-16.diff:4560:+- [x] `runRun(run, item, author): Promise<RunResult>` — flat index-based state machine over a single run's checks. `handleActivity` (Phase 2) iterates across runs.
/tmp/session-2026-05-16.diff:4582:-- [ ] Mustache context = `{ item, author, manager: { subreddit }, rules: ruleNamedResults, actions: priorActionResults }`
/tmp/session-2026-05-16.diff:4614:+- [x] `comment.ts` — `reddit.submitComment({id, text})`. Threads `*Safe` markdown-escaped variants (`author.nameSafe`, `item.titleSafe`, `item.bodySafe`) into the Mustache context per Step 2.5.3 — see template.ts:33 rationale
/tmp/session-2026-05-16.diff:4635:+- [x] Idempotency guard via `firstSeen(activityId, sub)` — lives in the trigger handlers (`src/routes/triggers.ts`), called BEFORE normalize so a re-delivered trigger doesn't burn the expensive `getUserByUsername` call
/tmp/session-2026-05-16.diff:4637:+- [x] Iterates `current.config.runs`, calls `runRun(run, item, author, sub)`, collects `result.actions` only on `result.triggered`
/tmp/session-2026-05-16.diff:4648:+**Files:** Modified `src/routes/triggers.ts`. Local payload shapes live in `src/shared/normalize.ts` (`PostSubmitPayload`) — verified 2026-05-15 against real Devvit v0.12.23 runtime payload (PowerShell log capture).
/tmp/session-2026-05-16.diff:4653:-- [ ] Enrich author via `reddit.getUserByUsername` w/ 1h cache via `authorProfile` Redis key
/tmp/session-2026-05-16.diff:4654:-- [ ] Call `handleActivity({item, author, subreddit}, deps)`
/tmp/session-2026-05-16.diff:4659:+- [x] **Reality-correction:** `OnPostSubmitRequest` is NOT exported from `@devvit/web/server` (the barrel re-exports `@devvit/reddit` etc.; the shared types live in `@devvit/shared-types` which the barrel does not re-export). Using local `PostSubmitPayload` instead, defined inline at the top of `normalize.ts`
/tmp/session-2026-05-16.diff:4660:+- [x] **Reality-correction:** Devvit payload field is `author.name`, NOT `author.username` (the plan's "Verified API Surface" was wrong). Author ID lives at `post.authorId` not `author.id` when present at the post level
/tmp/session-2026-05-16.diff:4662:+- [x] Guard order: null-safety bail (no `post.id`) → recursion guard (`reddit.getAppUser()` null-checked) → `firstSeen(post.id, subName)` → `normalizePost(input, config)` → `handleActivity(item, author, subName)`
/tmp/session-2026-05-16.diff:4663:+- [x] If `authorName` is missing (Devvit anomaly), the recursion guard is SKIPPED rather than bailing — worst case the bot reacts to its own post on a private test sub, which is harmless; bailing kills all trigger work
/tmp/session-2026-05-16.diff:4671:-Mirror 2.4 for `OnCommentSubmitRequest`. Comment-specific fields: depth (from CommentV2), op (compare `comment.author.id === post.author.id`), parentId.
/tmp/session-2026-05-16.diff:4672:+Mirrors 2.4 for `CommentSubmitPayload`. Same guard order + same `handleActivity` dispatch; `normalizeComment` produces a flat `Item` with `title: ''` and `body: comment.body`.
/tmp/session-2026-05-16.diff:4712:+**Files:** `escapeMarkdown` ships in `src/core/template.ts` (Phase 1, Step 1.5 row). Phase 2 added the 4 mandatory fixture tests + live playtest coverage. Per-rule plumbing in `src/shared/normalize.ts` produces `safe: {authorName, itemTitle, itemBody}` for templates.
/tmp/session-2026-05-16.diff:4725:+- [x] Template README direction: **always use `{{author.nameSafe}}` not `{{author.name}}` in any field that goes back to Reddit via `submitComment`**
/tmp/session-2026-05-16.diff:4755:+- **Shared-Contract touch** (`src/shared/types.ts`, `src/schema/app.schema.json`, `src/state/keys.ts`, `src/shared/normalize.ts`, `RecentEvent` JSON shape, Mustache context shape, `/api/recent` shape) → draft fix locally, ping Vinh, wait for OK, push w/ `⚠️ CONTRACT:` prefix. Per PLAN.md Rule 10.
/tmp/session-2026-05-16.diff:4820:+4. Rule logic in src/rules/{regex,author,ruleset,repost}.ts — regex DoS, short-circuit correctness, empty-rules behavior, repost fail-OPEN under Redis outage
/tmp/session-2026-05-16.diff:4821:+5. Trigger event normalize in src/shared/normalize.ts — null safety, type coercion, missing PostV2/CommentV2 fields, malformed inputs
/tmp/session-2026-05-16.diff:4830:+- IS_SHARED_CONTRACT: yes/no — yes if touching src/shared/types.ts, src/schema/app.schema.json, src/state/keys.ts, src/shared/normalize.ts, RecentEvent shape, Mustache context shape, or /api/recent shape
/tmp/session-2026-05-16.diff:4935:+  author: 'spammer', age: 60, score: 0, isSelf: true, over18: false,
/tmp/session-2026-05-16.diff:4938:+const author: Author = {
/tmp/session-2026-05-16.diff:4941:+  isMod: false, isContributor: false, verified: false, shadowBanned: false,
/tmp/session-2026-05-16.diff:4953:+        { kind: 'comment', template: 'Hi {{author.nameSafe}}, removed as spam.' },
/tmp/session-2026-05-16.diff:4966:+    const result = await dryRunActivity(item, author, sub);
/tmp/session-2026-05-16.diff:4976:+    await dryRunActivity(item, author, sub);
/tmp/session-2026-05-16.diff:4982:+    const result = await dryRunActivity(item, author, sub);
/tmp/session-2026-05-16.diff:4989:+    const result = await dryRunActivity(noMatchItem, author, sub);
/tmp/session-2026-05-16.diff:5051:+  author: Author,
/tmp/session-2026-05-16.diff:5061:+    const result = await runRun(run, item, author, subredditName);
/tmp/session-2026-05-16.diff:5072:+        author,
/tmp/session-2026-05-16.diff:5257:+import * as normalize from '../../src/shared/normalize';
/tmp/session-2026-05-16.diff:5260:+vi.mock('../../src/shared/normalize');
/tmp/session-2026-05-16.diff:5273:+    vi.mocked(normalize.normalizePostV2).mockReturnValue([
/tmp/session-2026-05-16.diff:5306:+    vi.mocked(normalize.normalizePostV2).mockReturnValue([
/tmp/session-2026-05-16.diff:5322:+    vi.mocked(normalize.normalizePostV2).mockReturnValue([
/tmp/session-2026-05-16.diff:5373:+import { normalizePostV2, normalizeCommentV2 } from '../shared/normalize';
/tmp/session-2026-05-16.diff:5392:+    const [item, author] = isComment
/tmp/session-2026-05-16.diff:5393:+      ? normalizeCommentV2(raw as never, sub.name)
/tmp/session-2026-05-16.diff:5394:+      : normalizePostV2(raw as never, sub.name);
/tmp/session-2026-05-16.diff:5396:+    const result = await dryRunActivity(item, author, sub.name);
/tmp/session-2026-05-16.diff:5491:+- 3 MVP rule kinds (regex / author / ruleset) w/ JSON5 example each
/tmp/session-2026-05-16.diff:5534:+- C — Mod whitelist: post by mod author → no action (authorIs filter passes)
/tmp/session-2026-05-16.diff:5772:+    username: ctx.author.name,
/tmp/session-2026-05-16.diff:5789:+ * Comment-reply action. Renders the Mustache template against the item/author
/tmp/session-2026-05-16.diff:5792:+ * The template MUST reference `{{author.nameSafe}}`, `{{item.titleSafe}}`,
/tmp/session-2026-05-16.diff:5795:+ * links). The Safe variants are populated by normalize.ts.
/tmp/session-2026-05-16.diff:5810:+    author: {
/tmp/session-2026-05-16.diff:5811:+      ...ctx.author,
/tmp/session-2026-05-16.diff:5812:+      nameSafe: escapeMarkdown(ctx.author.name),
/tmp/session-2026-05-16.diff:5896:+    username: ctx.author.name,
/tmp/session-2026-05-16.diff:5956:+ * `needsAuthorEnrichment` is computed at parse time so per-event normalization
/tmp/session-2026-05-16.diff:5966:+import { computeNeedsAuthorEnrichment } from '../shared/normalize';
/tmp/session-2026-05-16.diff:5989:+  expanded.needsAuthorEnrichment = computeNeedsAuthorEnrichment(expanded);
/tmp/session-2026-05-16.diff:6086:+  author: Author,
/tmp/session-2026-05-16.diff:6096:+    const result = await runRun(run, item, author, subredditName);
/tmp/session-2026-05-16.diff:6107:+        author,
/tmp/session-2026-05-16.diff:6138:+ * Filter eval — ports FoxxMD's `RunnableBase` filter logic (`itemIs` / `authorIs`)
/tmp/session-2026-05-16.diff:6151:+export function passesFilters(filters: FilterSpec | undefined, item: Item, author: Author): boolean {
/tmp/session-2026-05-16.diff:6153:+  if (filters.authorIs && !passesAuthor(filters.authorIs, author)) return false;
/tmp/session-2026-05-16.diff:6169:+  if (f.isMod != null && a.isMod !== f.isMod) return false;
/tmp/session-2026-05-16.diff:6229:+  author: Author,
/tmp/session-2026-05-16.diff:6236:+    const result = await runRun(run, item, author, subredditName);
/tmp/session-2026-05-16.diff:6243:+        author,
/tmp/session-2026-05-16.diff:6438:+export async function runCheck(check: Check, item: Item, author: Author, sub?: string): Promise<CheckResult> {
/tmp/session-2026-05-16.diff:6439:+  if (!passesFilters(check.filters, item, author)) {
/tmp/session-2026-05-16.diff:6447:+      const res = await runRule(r, item, author, sub);
/tmp/session-2026-05-16.diff:6456:+    const res = await runRule(r, item, author, sub);
/tmp/session-2026-05-16.diff:6483:+import { runAuthorRule } from '../rules/author';
/tmp/session-2026-05-16.diff:6487:+export async function runRule(rule: Rule, item: Item, author: Author, sub?: string): Promise<RuleResult> {
/tmp/session-2026-05-16.diff:6490:+    case 'author':  return runAuthorRule(rule, item, author);
/tmp/session-2026-05-16.diff:6491:+    case 'ruleset': return runRuleSet(rule, item, author, sub);
/tmp/session-2026-05-16.diff:6520:+export async function runRun(run: Run, item: Item, author: Author, sub?: string): Promise<RunResult> {
/tmp/session-2026-05-16.diff:6543:+    const res = await runCheck(check, item, author, sub);
/tmp/session-2026-05-16.diff:6582:+ * normalizer to populate the `*Safe` fields on the template context. The
/tmp/session-2026-05-16.diff:6583:+ * comment-reply template README must direct authors to use the `Safe` fields
/tmp/session-2026-05-16.diff:6596:+  author: Author & { nameSafe: string };
/tmp/session-2026-05-16.diff:6610:+ * (`author.name`, `item.title`, `item.body`) embedded in a bot's
/tmp/session-2026-05-16.diff:6907:+  authorName?: string;
/tmp/session-2026-05-16.diff:6919:+  authorName?: string;
/tmp/session-2026-05-16.diff:6937:+  isMod: false, isContributor: false, verified: false, shadowBanned: false,
/tmp/session-2026-05-16.diff:6957:+    let authorName: string;
/tmp/session-2026-05-16.diff:6960:+      authorName = cmt.authorName ?? '';
/tmp/session-2026-05-16.diff:6967:+        author: authorName,
/tmp/session-2026-05-16.diff:6973:+      authorName = post.authorName ?? '';
/tmp/session-2026-05-16.diff:6980:+        author: authorName,
/tmp/session-2026-05-16.diff:6990:+    const author: Author = { ...AUTHOR_DEFAULTS, name: authorName };
/tmp/session-2026-05-16.diff:6992:+    const result = await dryRunActivity(item, author, sub.name);
/tmp/session-2026-05-16.diff:7194:+ * /post-submit and /comment-submit normalize the V2 payload and dispatch to
/tmp/session-2026-05-16.diff:7203:+ *      Skip the guard (rather than bail) when author.name is missing so a
/tmp/session-2026-05-16.diff:7216:+import { normalizePost, normalizeComment, type PostSubmitPayload, type CommentSubmitPayload } from '../shared/normalize';
/tmp/session-2026-05-16.diff:7335:+  const authorName = input.author?.name;
/tmp/session-2026-05-16.diff:7336:+  if (!authorName) {
/tmp/session-2026-05-16.diff:7337:+    console.warn('[cm/post-submit] author.name missing — recursion guard skipped');
/tmp/session-2026-05-16.diff:7341:+  // node_modules/@devvit/reddit/RedditClient.d.ts:371. If authorName is missing
/tmp/session-2026-05-16.diff:7344:+  if (authorName) {
/tmp/session-2026-05-16.diff:7346:+    if (appUser && authorName === appUser.username) return c.json({ status: 'ok' });
/tmp/session-2026-05-16.diff:7351:+  // firstSeen BEFORE normalize so a re-delivered trigger doesn't burn the
/tmp/session-2026-05-16.diff:7359:+  // Read the config ONCE at the entry point so normalize sees the same rev
/tmp/session-2026-05-16.diff:7360:+  // handleActivity will. needsAuthorEnrichment is decided at publish time.
/tmp/session-2026-05-16.diff:7362:+  const config: AppConfig = current?.config ?? { runs: [], needsAuthorEnrichment: false };
/tmp/session-2026-05-16.diff:7363:+  const { item, author } = await normalizePost(input, config);
/tmp/session-2026-05-16.diff:7364:+  await handleActivity(item, author, subName);
/tmp/session-2026-05-16.diff:7379:+  const authorName = input.author?.name;
/tmp/session-2026-05-16.diff:7380:+  if (!authorName) {
/tmp/session-2026-05-16.diff:7381:+    console.warn('[cm/comment-submit] author.name missing — recursion guard skipped');
/tmp/session-2026-05-16.diff:7384:+  if (authorName) {
/tmp/session-2026-05-16.diff:7386:+    if (appUser && authorName === appUser.username) return c.json({ status: 'ok' });
/tmp/session-2026-05-16.diff:7398:+  const config: AppConfig = current?.config ?? { runs: [], needsAuthorEnrichment: false };
/tmp/session-2026-05-16.diff:7399:+  const { item, author } = await normalizeComment(input, config);
/tmp/session-2026-05-16.diff:7400:+  await handleActivity(item, author, subName);
/tmp/session-2026-05-16.diff:7404:diff --git a/src/rules/author.ts b/src/rules/author.ts
/tmp/session-2026-05-16.diff:7408:+++ b/src/rules/author.ts
/tmp/session-2026-05-16.diff:7414:+ * AuthorRule reuses the FilterSpec.authorIs predicate set. CM treats it as a
/tmp/session-2026-05-16.diff:7415:+ * rule (not just a filter) so the trigger state machine sees author-based
/tmp/session-2026-05-16.diff:7418:+export function runAuthorRule(rule: AuthorRule, item: Item, author: Author): RuleResult {
/tmp/session-2026-05-16.diff:7419:+  return { triggered: passesFilters({ authorIs: rule.filter }, item, author) };
/tmp/session-2026-05-16.diff:7521:+export async function runRuleSet(rule: RuleSetRule, item: Item, author: Author, sub?: string): Promise<RuleResult> {
/tmp/session-2026-05-16.diff:7530:+      const res = await runRule(r, item, author, sub);
/tmp/session-2026-05-16.diff:7537:+    const res = await runRule(r, item, author, sub);
/tmp/session-2026-05-16.diff:7557:+    "needsAuthorEnrichment": { "type": "boolean" },
/tmp/session-2026-05-16.diff:7635:+        "kind": { "const": "author" },
/tmp/session-2026-05-16.diff:7677:+        "authorIs": { "$ref": "#/definitions/AuthorFilter" },
/tmp/session-2026-05-16.diff:7695:+        "isMod":            { "type": "boolean" },
/tmp/session-2026-05-16.diff:7798:diff --git a/src/shared/normalize.ts b/src/shared/normalize.ts
/tmp/session-2026-05-16.diff:7802:+++ b/src/shared/normalize.ts
/tmp/session-2026-05-16.diff:7805:+ * V2 trigger-payload → strict Item/Author normalizer.
/tmp/session-2026-05-16.diff:7813:+ * Reality-correction 2026-05-15: Devvit payload field is `author.name`, NOT
/tmp/session-2026-05-16.diff:7814:+ * `author.username`. See `src/routes/triggers.ts:20-23` for the shipped shape.
/tmp/session-2026-05-16.diff:7830:+    authorId?: string;
/tmp/session-2026-05-16.diff:7840:+  author?: { id?: string; name?: string };
/tmp/session-2026-05-16.diff:7853:+  author?: { id?: string; name?: string };
/tmp/session-2026-05-16.diff:7865:+  author: '',
/tmp/session-2026-05-16.diff:7893:+  isMod: false,
/tmp/session-2026-05-16.diff:7920:+      isMod: (user as { isModerator?: boolean }).isModerator ?? false,
/tmp/session-2026-05-16.diff:7926:+    console.warn('[cm/normalize] getUserByUsername failed — defaulting author:', name, err);
/tmp/session-2026-05-16.diff:7937:+  author: Author;
/tmp/session-2026-05-16.diff:7939:+  safe: { authorName: string; itemTitle: string; itemBody: string };
/tmp/session-2026-05-16.diff:7943:+ * Inspect the config once to decide whether the per-event normalize must call
/tmp/session-2026-05-16.diff:7955:+  // Filter side too — checks may include author filters even if no rule does.
/tmp/session-2026-05-16.diff:7958:+      if (check.filters?.authorIs) {
/tmp/session-2026-05-16.diff:7959:+        const f = check.filters.authorIs;
/tmp/session-2026-05-16.diff:7964:+          f.isMod != null || f.isContributor != null ||
/tmp/session-2026-05-16.diff:7974:+  if (rule.kind === 'author' && rule.filter) {
/tmp/session-2026-05-16.diff:7980:+      f.isMod != null || f.isContributor != null ||
/tmp/session-2026-05-16.diff:7991:+export async function normalizePost(
/tmp/session-2026-05-16.diff:7996:+  const a = payload.author ?? {};
/tmp/session-2026-05-16.diff:7997:+  const authorName = a.name ?? '';
/tmp/session-2026-05-16.diff:7998:+  const author = await enrichAuthor(
/tmp/session-2026-05-16.diff:7999:+    authorName,
/tmp/session-2026-05-16.diff:8000:+    a.id ?? p.authorId ?? '',
/tmp/session-2026-05-16.diff:8001:+    config.needsAuthorEnrichment ?? false,
/tmp/session-2026-05-16.diff:8009:+    author: authorName,
/tmp/session-2026-05-16.diff:8020:+    author,
/tmp/session-2026-05-16.diff:8022:+      authorName: escapeMarkdown(author.name),
/tmp/session-2026-05-16.diff:8029:+export async function normalizeComment(
/tmp/session-2026-05-16.diff:8034:+  const a = payload.author ?? {};
/tmp/session-2026-05-16.diff:8035:+  const authorName = a.name ?? '';
/tmp/session-2026-05-16.diff:8036:+  const author = await enrichAuthor(
/tmp/session-2026-05-16.diff:8037:+    authorName,
/tmp/session-2026-05-16.diff:8039:+    config.needsAuthorEnrichment ?? false,
/tmp/session-2026-05-16.diff:8047:+    author: authorName,
/tmp/session-2026-05-16.diff:8053:+    author,
/tmp/session-2026-05-16.diff:8055:+      authorName: escapeMarkdown(author.name),
/tmp/session-2026-05-16.diff:8070:+ * optional) is normalized into these shapes by `src/shared/normalize.ts`.
/tmp/session-2026-05-16.diff:8086:+  author: string;        // username
/tmp/session-2026-05-16.diff:8097:+  op?: boolean;          // comment was authored by OP
/tmp/session-2026-05-16.diff:8107:+  isMod: boolean;
/tmp/session-2026-05-16.diff:8128:+  isMod?: boolean;
/tmp/session-2026-05-16.diff:8151:+  authorIs?: AuthorFilter;
/tmp/session-2026-05-16.diff:8170:+  kind: 'author';
/tmp/session-2026-05-16.diff:8255:+  needsAuthorEnrichment?: boolean;    // set at parse time by inspecting rule kinds
/tmp/session-2026-05-16.diff:8294:+  author: Author;
/tmp/session-2026-05-16.diff:8407:+  authorHist: (name: string, sub: string = SUB_DEFAULT) => `cm:${sub}:author:hist:${name}`,
/tmp/session-2026-05-16.diff:8632:+  author: 'alice', age: 100, score: 5, isSelf: true, over18: false,
/tmp/session-2026-05-16.diff:8639:+const author: Author = {
/tmp/session-2026-05-16.diff:8641:+  flairText: null, isMod: false, isContributor: false, verified: false,
/tmp/session-2026-05-16.diff:8648:+  item, author, subredditName: 'cm_devvit_test', rev: 0, config,
/tmp/session-2026-05-16.diff:8678:+    const tpl = 'Hi {{author.nameSafe}}, your post "{{item.titleSafe}}" was flagged.';
/tmp/session-2026-05-16.diff:8836:+      expect(r.config.needsAuthorEnrichment).toBe(false);
/tmp/session-2026-05-16.diff:8840:+  it('computes needsAuthorEnrichment when author rule references karma', () => {
/tmp/session-2026-05-16.diff:8845:+          name: 'low-karma',
/tmp/session-2026-05-16.diff:8847:+          rules: [{ kind: 'author', filter: { linkKarmaMax: 10 } }],
/tmp/session-2026-05-16.diff:8853:+    if (r.ok) expect(r.config.needsAuthorEnrichment).toBe(true);
/tmp/session-2026-05-16.diff:9058:+  author: 'spammer', age: 60, score: 0, isSelf: true, over18: false,
/tmp/session-2026-05-16.diff:9061:+const author: Author = {
/tmp/session-2026-05-16.diff:9064:+  isMod: false, isContributor: false, verified: false, shadowBanned: false,
/tmp/session-2026-05-16.diff:9076:+        { kind: 'comment', template: 'Hi {{author.nameSafe}}, removed as spam.' },
/tmp/session-2026-05-16.diff:9090:+    const result = await dryRunActivity(item, author, sub);
/tmp/session-2026-05-16.diff:9107:+    await dryRunActivity(item, author, sub);
/tmp/session-2026-05-16.diff:9113:+    const result = await dryRunActivity(item, author, sub);
/tmp/session-2026-05-16.diff:9120:+    const result = await dryRunActivity(peacefulItem, author, sub);
/tmp/session-2026-05-16.diff:9140:+  id: 't3_a', title: 'hi', body: '', url: 'https://example.com', author: 'u',
/tmp/session-2026-05-16.diff:9147:+  flairText: null, isMod: false, isContributor: false, verified: false,
/tmp/session-2026-05-16.diff:9160:+describe('passesFilters — authorIs predicates', () => {
/tmp/session-2026-05-16.diff:9162:+    expect(passesFilters({ authorIs: { nameIn: ['u'] } }, baseItem, baseAuthor)).toBe(true);
/tmp/session-2026-05-16.diff:9165:+    expect(passesFilters({ authorIs: { nameIn: ['other'] } }, baseItem, baseAuthor)).toBe(false);
/tmp/session-2026-05-16.diff:9167:+  it('nameNotIn negative (author is in the not-in list → reject)', () => {
/tmp/session-2026-05-16.diff:9168:+    expect(passesFilters({ authorIs: { nameNotIn: ['u'] } }, baseItem, baseAuthor)).toBe(false);
/tmp/session-2026-05-16.diff:9171:+    expect(passesFilters({ authorIs: { ageMinSec: 1_000_000 } }, baseItem, baseAuthor)).toBe(false);
/tmp/session-2026-05-16.diff:9174:+    expect(passesFilters({ authorIs: { ageMinSec: 86_400 } }, baseItem, baseAuthor)).toBe(true);
/tmp/session-2026-05-16.diff:9177:+    expect(passesFilters({ authorIs: { linkKarmaMax: 50 } }, baseItem, baseAuthor)).toBe(false);
/tmp/session-2026-05-16.diff:9180:+    expect(passesFilters({ authorIs: { commentKarmaMin: 500 } }, baseItem, baseAuthor)).toBe(false);
/tmp/session-2026-05-16.diff:9182:+  it('isMod predicate', () => {
/tmp/session-2026-05-16.diff:9183:+    expect(passesFilters({ authorIs: { isMod: true } }, baseItem, baseAuthor)).toBe(false);
/tmp/session-2026-05-16.diff:9184:+    expect(passesFilters({ authorIs: { isMod: false } }, baseItem, baseAuthor)).toBe(true);
/tmp/session-2026-05-16.diff:9186:+  it('flairTextIn rejects null author flair', () => {
/tmp/session-2026-05-16.diff:9187:+    expect(passesFilters({ authorIs: { flairTextIn: ['VIP'] } }, baseItem, baseAuthor)).toBe(false);
/tmp/session-2026-05-16.diff:9215:+describe('passesFilters — combined item + author', () => {
/tmp/session-2026-05-16.diff:9218:+      { authorIs: { isMod: false }, itemIs: { over18: false } },
/tmp/session-2026-05-16.diff:9223:+  it('author fails → false even when item passes', () => {
/tmp/session-2026-05-16.diff:9225:+      { authorIs: { isMod: true }, itemIs: { over18: false } },
/tmp/session-2026-05-16.diff:9284:+  author: 'spammer', age: 100, score: 0, isSelf: false, over18: false,
/tmp/session-2026-05-16.diff:9287:+const author: Author = {
/tmp/session-2026-05-16.diff:9289:+  flairText: null, isMod: false, isContributor: false, verified: false, shadowBanned: false,
/tmp/session-2026-05-16.diff:9317:+    await handleActivity(item, author, 'sub');
/tmp/session-2026-05-16.diff:9325:+    await handleActivity(item, author, 'cm_devvit_test');
/tmp/session-2026-05-16.diff:9342:+    await handleActivity(item, author, 'sub');
/tmp/session-2026-05-16.diff:9364:+    await handleActivity(item, author, 'sub');
/tmp/session-2026-05-16.diff:9399:+    await handleActivity(item, author, 'sub');
/tmp/session-2026-05-16.diff:9408:+    await handleActivity(item, author, 'sub');
/tmp/session-2026-05-16.diff:9538:+  id: 't3_abc', title: 't', body: 'b', url: 'u', author: 'a', age: 0, score: 0,
/tmp/session-2026-05-16.diff:9542:+const author: Author = {
/tmp/session-2026-05-16.diff:9544:+  flairText: null, isMod: false, isContributor: false, verified: false,
/tmp/session-2026-05-16.diff:9548:+const ctx: ActionContext = { item, author, subredditName: 'sub', rev: 0, config };
/tmp/session-2026-05-16.diff:9629:+  it('per-action dryRun=false does NOT override config.dryRun=true (global is authoritative — safety gate)', async () => {
/tmp/session-2026-05-16.diff:9630:+    // Codex HIGH 2026-05-16: global dry-run must be authoritative.
/tmp/session-2026-05-16.diff:9654:+  id: 't3_a', title: 'matches', body: '', url: '', author: 'u', age: 0, score: 0,
/tmp/session-2026-05-16.diff:9661:+  flairText: null, isMod: false, isContributor: false, verified: false,
/tmp/session-2026-05-16.diff:9722:+  id: 't3_a', title: 'matches', body: '', url: '', author: 'u', age: 0, score: 0,
/tmp/session-2026-05-16.diff:9729:+  flairText: null, isMod: false, isContributor: false, verified: false,
/tmp/session-2026-05-16.diff:9857:+    author: 'someUser',
/tmp/session-2026-05-16.diff:9868:+  const author: Author & { nameSafe: string } = {
/tmp/session-2026-05-16.diff:9876:+    isMod: false,
/tmp/session-2026-05-16.diff:9881:+  return { item, author };
/tmp/session-2026-05-16.diff:9885:+  it('substitutes author.name and item.title', () => {
/tmp/session-2026-05-16.diff:9887:+      'Hello {{author.name}}, your post {{item.title}} was removed',
/tmp/session-2026-05-16.diff:9895:+    ctx.author.name = "Joe's & Co";
/tmp/session-2026-05-16.diff:9896:+    const out = render('Hi {{author.name}}', ctx);
/tmp/session-2026-05-16.diff:10099:+      id: 't3_abc', title: 'free crypto giveaway', body: '', url: '', authorName: 'spammer',
/tmp/session-2026-05-16.diff:10130:+    getPostById.mockResolvedValueOnce({ id: 't3_abc', title: '', body: '', url: '', authorName: 'x' });
/tmp/session-2026-05-16.diff:10144:+    getPostById.mockResolvedValueOnce({ id: 't3_abc', title: 'a poem', body: '', url: '', authorName: 'x' });
/tmp/session-2026-05-16.diff:10162:+    getCommentById.mockResolvedValueOnce({ id: 't1_xyz', body: 'a comment', authorName: 'u' });
/tmp/session-2026-05-16.diff:10233:diff --git a/tests/rules/author.test.ts b/tests/rules/author.test.ts
/tmp/session-2026-05-16.diff:10237:+++ b/tests/rules/author.test.ts
/tmp/session-2026-05-16.diff:10240:+import { runAuthorRule } from '../../src/rules/author';
/tmp/session-2026-05-16.diff:10244:+  id: 't3_a', title: '', body: '', url: '', author: 'u', age: 0, score: 0,
/tmp/session-2026-05-16.diff:10251:+  flairText: null, isMod: false, isContributor: false, verified: false,
/tmp/session-2026-05-16.diff:10256:+  it('triggers when karma is below threshold', () => {
/tmp/session-2026-05-16.diff:10258:+      { kind: 'author', filter: { linkKarmaMax: 10 } },
/tmp/session-2026-05-16.diff:10265:+  it('does not trigger when karma is above threshold', () => {
/tmp/session-2026-05-16.diff:10267:+      { kind: 'author', filter: { linkKarmaMin: 100 } },
/tmp/session-2026-05-16.diff:10276:+      { kind: 'author', filter: { nameIn: ['u'] } },
/tmp/session-2026-05-16.diff:10295:+  url: 'https://example.com/path', author: 'u', age: 0, score: 0,
/tmp/session-2026-05-16.diff:10356:+  id: 't3_abc', title: '', body: '', url, author: 'u', age: 0, score: 0,
/tmp/session-2026-05-16.diff:10439:+  id: 't3_a', title: 'matches A', body: '', url: '', author: 'u', age: 0, score: 0,
/tmp/session-2026-05-16.diff:10446:+  flairText: null, isMod: false, isContributor: false, verified: false,
/tmp/session-2026-05-16.diff:10512:diff --git a/tests/shared/normalize.test.ts b/tests/shared/normalize.test.ts
/tmp/session-2026-05-16.diff:10516:+++ b/tests/shared/normalize.test.ts
/tmp/session-2026-05-16.diff:10527:+import { normalizePost, normalizeComment, computeNeedsAuthorEnrichment } from '../../src/shared/normalize';
/tmp/session-2026-05-16.diff:10530:+const baseConfig: AppConfig = { runs: [], needsAuthorEnrichment: false };
/tmp/session-2026-05-16.diff:10532:+describe('normalizePost', () => {
/tmp/session-2026-05-16.diff:10536:+    const { item, author } = await normalizePost(
/tmp/session-2026-05-16.diff:10539:+        author: { id: 't2_zzz', name: 'someUser' },
/tmp/session-2026-05-16.diff:10544:+    for (const v of Object.values(author)) expect(v).not.toBeUndefined();
/tmp/session-2026-05-16.diff:10548:+    expect(item.author).toBe('someUser');
/tmp/session-2026-05-16.diff:10549:+    expect(author.name).toBe('someUser');
/tmp/session-2026-05-16.diff:10552:+  it('does NOT call getUserByUsername when config.needsAuthorEnrichment is false', async () => {
/tmp/session-2026-05-16.diff:10553:+    await normalizePost(
/tmp/session-2026-05-16.diff:10554:+      { post: { id: 't3_a' }, author: { name: 'u1' } },
/tmp/session-2026-05-16.diff:10555:+      { runs: [], needsAuthorEnrichment: false },
/tmp/session-2026-05-16.diff:10560:+  it('DOES call getUserByUsername when needsAuthorEnrichment is true', async () => {
/tmp/session-2026-05-16.diff:10562:+      linkKarma: 100, commentKarma: 200, isModerator: false, isAdmin: false,
/tmp/session-2026-05-16.diff:10564:+    await normalizePost(
/tmp/session-2026-05-16.diff:10565:+      { post: { id: 't3_a' }, author: { name: 'u1' } },
/tmp/session-2026-05-16.diff:10566:+      { runs: [], needsAuthorEnrichment: true },
/tmp/session-2026-05-16.diff:10573:+    const { author } = await normalizePost(
/tmp/session-2026-05-16.diff:10574:+      { post: { id: 't3_a' }, author: { name: 'ghost' } },
/tmp/session-2026-05-16.diff:10575:+      { runs: [], needsAuthorEnrichment: true },
/tmp/session-2026-05-16.diff:10577:+    expect(author.shadowBanned).toBe(true);
/tmp/session-2026-05-16.diff:10578:+    expect(author.linkKarma).toBe(0);
/tmp/session-2026-05-16.diff:10583:+    const { author } = await normalizePost(
/tmp/session-2026-05-16.diff:10584:+      { post: { id: 't3_a' }, author: { name: 'u' } },
/tmp/session-2026-05-16.diff:10585:+      { runs: [], needsAuthorEnrichment: true },
/tmp/session-2026-05-16.diff:10587:+    expect(author.linkKarma).toBe(0);
/tmp/session-2026-05-16.diff:10588:+    expect(author.name).toBe('u');
/tmp/session-2026-05-16.diff:10592:+describe('normalizeComment', () => {
/tmp/session-2026-05-16.diff:10596:+    const { item, author } = await normalizeComment(
/tmp/session-2026-05-16.diff:10597:+      { comment: { id: 't1_x', body: 'hi' }, author: { name: 'u' } },
/tmp/session-2026-05-16.diff:10601:+    for (const v of Object.values(author)) expect(v).not.toBeUndefined();
/tmp/session-2026-05-16.diff:10609:+  it('returns false when no rule references author fields', () => {
/tmp/session-2026-05-16.diff:10623:+  it('returns true for an author rule with karma threshold', () => {
/tmp/session-2026-05-16.diff:10630:+          rules: [{ kind: 'author', filter: { linkKarmaMax: 10 } }],
/tmp/session-2026-05-16.diff:10637:+  it('returns true for check.filters.authorIs', () => {
/tmp/session-2026-05-16.diff:10644:+          filters: { authorIs: { isMod: false } },
/tmp/session-2026-05-16.diff:10662:+            rules: [{ kind: 'author', filter: { commentKarmaMin: 100 } }],
tests/core/config.test.ts:22:      expect(r.config.needsAuthorEnrichment).toBe(false);
tests/core/config.test.ts:26:  it('computes needsAuthorEnrichment when author rule references karma', () => {
tests/core/config.test.ts:31:          name: 'low-karma',
tests/core/config.test.ts:33:          rules: [{ kind: 'author', filter: { linkKarmaMax: 10 } }],
tests/core/config.test.ts:39:    if (r.ok) expect(r.config.needsAuthorEnrichment).toBe(true);
docs/superpowers/foxxmd-kanban-seed.md:33:| `runRule` dispatcher per rule kind | @vinhbin | Todo | `src/server/core/runRule.ts`. Switches on `kind: "regex" \| "author" \| "ruleSet"` for MVP. Returns boolean + populated `rules.<name>.data` context. |
docs/superpowers/foxxmd-kanban-seed.md:34:| Filter system: `authorIs` / `itemIs` gates | @vinhbin | Todo | `src/server/core/filters.ts`. Multi-attribute author criteria (age, karma, flair, isMod, etc.) + item criteria. Same criteria set as upstream CM. |
docs/superpowers/foxxmd-kanban-seed.md:36:| Mustache action templating with full context | @vinhbin | Todo | `src/server/core/template.ts`. Context: `{{item.*}}`, `{{author.*}}`, `{{rules.<name>.data.*}}`. |
docs/superpowers/foxxmd-kanban-seed.md:84:| `history` rule — author post history checks | @vinhbin | Todo | `src/server/rules/history.ts`. |
docs/superpowers/foxxmd-kanban-seed.md:124:## How to bulk-add via gh CLI (if Stephen authorizes scopes)
tests/rules/author.test.ts:2:import { runAuthorRule } from '../../src/rules/author';
tests/rules/author.test.ts:6:  id: 't3_a', title: '', body: '', url: '', author: 'u', age: 0, score: 0,
tests/rules/author.test.ts:13:  flairText: null, isMod: false, isContributor: false, verified: false,
tests/rules/author.test.ts:18:  it('triggers when karma is below threshold', () => {
tests/rules/author.test.ts:20:      { kind: 'author', filter: { linkKarmaMax: 10 } },
tests/rules/author.test.ts:27:  it('does not trigger when karma is above threshold', () => {
tests/rules/author.test.ts:29:      { kind: 'author', filter: { linkKarmaMin: 100 } },
tests/rules/author.test.ts:38:      { kind: 'author', filter: { nameIn: ['u'] } },
docs/submission/e2e-scenarios.md:28:        { kind: 'comment', template: 'Hi {{author.nameSafe}}, your post "{{item.titleSafe}}" was removed as suspected spam.' },
docs/submission/e2e-scenarios.md:37:- Sticky bot comment posted by `u/CowSufficient3840` (or current dev account) with the rendered Mustache template — author/title rendered through `escapeMarkdown` so any `u/` or `r/` pings the spammer included are defanged (no accidental notifications)
docs/submission/e2e-scenarios.md:80:## Scenario C — Mod whitelist bypass (authorIs filter)
docs/submission/e2e-scenarios.md:87:  authorIs: { isMod: false },  // check-level filter
docs/submission/e2e-scenarios.md:93:- Spam-removal check pre-filters on `authorIs` BEFORE rule eval (Step 1.4 short-circuit)
docs/submission/e2e-scenarios.md:99:- Server log: `[cm/runCheck] crypto-giveaway: pre-filter authorIs failed (isMod), skipping rule eval`
docs/submission/e2e-scenarios.md:111:{ authorIs: { isContributor: false } }
docs/superpowers/2026-05-13-research-deltas.md:9:u/yuzengbao2026 publicly posted a hackathon plan on 2026-05-04 framing their entry as *"a visual rule engine that lets mods configure IF-THEN automation rules without writing code... Multi-condition triggers (keyword/regex, karma threshold, account age, post frequency, title length)."* Top community replies from u/SampleOfNone and u/DustyAsh69: *"Yes, automoderator"* / *"So, AutoModerator."*
docs/superpowers/2026-05-13-research-deltas.md:15:- Author criteria beyond regex (Phase 1 `author` rule with age/karma/flair gates)
tests/actions/actions.test.ts:43:  author: 'alice', age: 100, score: 5, isSelf: true, over18: false,
tests/actions/actions.test.ts:50:const author: Author = {
tests/actions/actions.test.ts:52:  flairText: null, isMod: false, isContributor: false, verified: false,
tests/actions/actions.test.ts:59:  item, author, subredditName: 'cm_devvit_test', rev: 0, config,
tests/actions/actions.test.ts:89:    const tpl = 'Hi {{author.nameSafe}}, your post "{{item.titleSafe}}" was flagged.';
tests/core/handleActivity.test.ts:48:  author: 'spammer', age: 100, score: 0, isSelf: false, over18: false,
tests/core/handleActivity.test.ts:51:const author: Author = {
tests/core/handleActivity.test.ts:53:  flairText: null, isMod: false, isContributor: false, verified: false, shadowBanned: false,
tests/core/handleActivity.test.ts:81:    await handleActivity(item, author, 'sub');
tests/core/handleActivity.test.ts:89:    await handleActivity(item, author, 'cm_devvit_test');
tests/core/handleActivity.test.ts:106:    await handleActivity(item, author, 'sub');
tests/core/handleActivity.test.ts:128:    await handleActivity(item, author, 'sub');
tests/core/handleActivity.test.ts:163:    await handleActivity(item, author, 'sub');
tests/core/handleActivity.test.ts:172:    await handleActivity(item, author, 'sub');
tests/core/runRun.test.ts:6:  id: 't3_a', title: 'matches', body: '', url: '', author: 'u', age: 0, score: 0,
tests/core/runRun.test.ts:13:  flairText: null, isMod: false, isContributor: false, verified: false,
docs/submission/outreach-drafts.md:92:yeah same wiki path as upstream — r/<sub>/wiki/contextmod. MVP rule kinds (regex / author / ruleSet) + 7 actions use the same JSON5 schema, so existing CM operators can copy their config across with minimal cleanup. Phase 4 rules (history / attribution / recentActivity / repost) land later and might need a syntax tweak depending on which upstream edge cases we keep — i'm holding the upstream AJV schema as source of truth except where Devvit's runtime can't support a primitive. mhs rule was cut per reddit's PR #96 ai-provider fetch policy lock — subs using CM for hate-speech filtering keep running upstream PRAW.
docs/submission/outreach-drafts.md:100:yeah same upstream wiki path: r/<sub>/wiki/contextmod, and the MVP keeps the json5 schema for regex / author / ruleSet + 7 actions so configs can copy over pretty cleanly. Later rule types might need small Devvit-specific tweaks, but install should just be App Directory to seed wiki config to reload from mod menu, with no token migration or central server
docs/submission/outreach-drafts.md:145:- 3 MVP rule kinds (regex, author, ruleSet) + 7 actions (types ship now; handler wiring lands phase 2)
docs/submission/outreach-drafts.md:146:- filters (authorIs / itemIs)
docs/superpowers/plans/2026-05-14-dev-web.md:89:| Static file path traversal | Low | path.join(DIST, url.pathname) — Node normalizes; but add explicit `..` check for safety |
docs/submission/writeup-draft.md:17:> **What mods actually want:** The top-upvoted comment (94 upvotes, u/Aeroncastle) on the May 2026 r/modnews "Mod Monthly" thread is *"I want stronger tools to fight AI, not in person events"* (verified at [r/modnews/comments/1t6jggp](https://www.reddit.com/r/modnews/comments/1t6jggp/), top 6 sampled 2026-05-13). The next three top comments echo the same ask: u/critacle (34 upvotes) — *"Stop the AI bot spam. It's dominating /r/all. This is killing Reddit"*; u/GamingYouTube14 (21) — *"can you guys look into these new ai bots that adapt to the conversation? they're pretty much undetectable by any kind of algorithm"*; u/OMGWTFBBQUE (15) — *"If I have to remove another AI post I'm going to lose my shit. Fucking do something about it."* ContextMod is anti-AI-spam tooling by construction — `regex` catches the generic phrasings AI-generated spam reuses, `author` filters flag new-account / low-karma / no-verified-email patterns AI bot farms produce, `history` (Phase 4) detects cross-sub posting cadence that no human author would maintain. Plus the Observatory dashboard is the "reason-chain audit" r/TrustAndSafety asked for — every action chip surfaces the rule that fired, the activityId, and the context. ContextMod doesn't replace AutoMod (regex-only); it's the moderator's investigation workbench that runs alongside.
docs/submission/writeup-draft.md:21:- **3 MVP rule kinds shipped** in v0.1.0: `regex` (multi-field threshold matching), `author` (basic criteria — age, karma, flair, isMod, isContributor, verified, shadowBanned), `ruleSet` (AND/OR composition).
docs/submission/writeup-draft.md:22:- **7 MVP actions**: `remove`, `approve`, `lock`, `comment`, `report`, `ban`, `userFlair`. All support Mustache templates over `{{item}}`, `{{author}}`, `{{rules.<name>.data}}` context.
docs/submission/writeup-draft.md:24:- **Filters** (`authorIs` / `itemIs`) gate Rule/Check/Action execution by author + item attributes. Same criteria set as upstream ContextMod.
docs/submission/writeup-draft.md:61:- ContextMod adds a **second axis** to the bot stack: AutoMod is regex-only; CM adds context-gathering (author history, sub-distribution, image-hash repost) that today only humans can do.
docs/submission/writeup-draft.md:83:- Filter system (authorIs/itemIs) — ported
docs/submission/writeup-draft.md:113:**Yes, for the MVP scope.** Subreddits using the original CM primarily for regex-based spam removal, mod-flair gating, author-criteria filtering, and named-rule composition will see feature parity at install. Subs using CM specifically for repost detection will need to wait for Phase 4 (currently in active development). Subs using CM for hate-speech filtering will need to keep running the upstream PRAW build — the Devvit `mhs` port is cut per PR #96.
docs/submission/writeup-draft.md:132:Four non-contract hotfixes shipped as separate atomic commits the same session (274aef6 dry-run authority, 8f6d608 repost SET NX, dafe050 commit retries, fc3851a lease token). 162 tests green, tsc clean.
docs/superpowers/phase-3-ui-polish.md:31:5. **Promote `#A78BFA` (userFlair violet) to a token.** Currently a hardcoded literal in `EventRow.tsx:21`. If the violet sticks, add `signal.author = '#A78BFA'` to `tailwind.config.ts` and DESIGN.md.
tests/core/dryRunActivity.test.ts:28:  author: 'spammer', age: 60, score: 0, isSelf: true, over18: false,
tests/core/dryRunActivity.test.ts:31:const author: Author = {
tests/core/dryRunActivity.test.ts:34:  isMod: false, isContributor: false, verified: false, shadowBanned: false,
tests/core/dryRunActivity.test.ts:46:        { kind: 'comment', template: 'Hi {{author.nameSafe}}, removed as spam.' },
tests/core/dryRunActivity.test.ts:60:    const result = await dryRunActivity(item, author, sub);
tests/core/dryRunActivity.test.ts:77:    await dryRunActivity(item, author, sub);
tests/core/dryRunActivity.test.ts:83:    const result = await dryRunActivity(item, author, sub);
tests/core/dryRunActivity.test.ts:90:    const result = await dryRunActivity(peacefulItem, author, sub);
docs/superpowers/plans/2026-05-13-tier-1-2-3-polish.md:46:- Modify: `tailwind.config.ts` (add `signal.author` token)
docs/superpowers/plans/2026-05-13-tier-1-2-3-polish.md:47:- Modify: `src/client/components/EventRow.tsx` (use `signal.author` token instead of hardcoded `#A78BFA`)
docs/superpowers/plans/2026-05-13-tier-1-2-3-polish.md:58:- [ ] **B.1** `tailwind.config.ts` + `EventRow.tsx`: promote `#A78BFA` → `signal.author` token
tests/core/runCheck.test.ts:6:  id: 't3_a', title: 'matches', body: '', url: '', author: 'u', age: 0, score: 0,
tests/core/runCheck.test.ts:13:  flairText: null, isMod: false, isContributor: false, verified: false,
docs/submission/pillar-5-numbers.md:175:**Why this matters for ContextMod scoring (Pillar 1 — Real Problem):** the loudest mod ask of the month is anti-AI-bot tooling; ContextMod is *anti-AI-bot tooling by construction* — `regex` rule catches generic AI phrasings, `author` rule flags new-account / low-karma / no-verified-email signatures AI bot farms produce, and Phase 4's `history` rule detects cross-sub posting cadence no human author would maintain. The writeup §1 paragraph cites this dossier; this page is the audit trail behind that citation.
docs/submission/pillar-5-numbers.md:196:**Incremental capture available to ContextMod-class tools.** AutoMod is regex-with-light-filters — it handles the majority of automated review per Wright 2022 + Jhaver 2019, mostly anti-spam pattern-matching. The *context-gathering* tier (5–10 minutes of manual user-history check per ambiguous post, multi-attribute author criteria, composable rules) is what humans currently do and what CM-class bots automate. If a CM-class bot offloads **1 additional hour per mod per week** beyond AutoMod's reach, that's:
src/client/lib/design-tokens.ts:5: * - `tailwind.config.ts` declares `signal.{ok,warn,err,info,author}` for
src/client/lib/design-tokens.ts:21:  author: '#A78BFA',
tests/core/template.test.ts:13:    author: 'someUser',
tests/core/template.test.ts:24:  const author: Author & { nameSafe: string } = {
tests/core/template.test.ts:32:    isMod: false,
tests/core/template.test.ts:37:  return { item, author };
tests/core/template.test.ts:41:  it('substitutes author.name and item.title', () => {
tests/core/template.test.ts:43:      'Hello {{author.name}}, your post {{item.title}} was removed',
tests/core/template.test.ts:51:    ctx.author.name = "Joe's & Co";
tests/core/template.test.ts:52:    const out = render('Hi {{author.name}}', ctx);
src/state/keys.ts:40:  authorHist: (name: string, sub: string = SUB_DEFAULT) => `cm:${sub}:author:hist:${name}`,
src/actions/userFlair.ts:14:    username: ctx.author.name,
docs/superpowers/plans/2026-05-13-retroactive-tool-incorporation.md:44:| `mcp-builder` skill | Skills | N/A — not authoring MCPs. |
docs/superpowers/plans/2026-05-13-retroactive-tool-incorporation.md:46:| `superpowers:writing-skills` skill | Skills | Not authoring new skills this session. |
docs/superpowers/plans/2026-05-14-three-ui-adds.md:130:          { kind: 'comment', body: 'Hi {{author}}, removed for spam.' },
tests/core/runAction.test.ts:33:  id: 't3_abc', title: 't', body: 'b', url: 'u', author: 'a', age: 0, score: 0,
tests/core/runAction.test.ts:37:const author: Author = {
tests/core/runAction.test.ts:39:  flairText: null, isMod: false, isContributor: false, verified: false,
tests/core/runAction.test.ts:43:const ctx: ActionContext = { item, author, subredditName: 'sub', rev: 0, config };
tests/core/runAction.test.ts:124:  it('per-action dryRun=false does NOT override config.dryRun=true (global is authoritative — safety gate)', async () => {
tests/core/runAction.test.ts:125:    // Codex HIGH 2026-05-16: global dry-run must be authoritative.
src/actions/comment.ts:2: * Comment-reply action. Renders the Mustache template against the item/author
src/actions/comment.ts:5: * The template MUST reference `{{author.nameSafe}}`, `{{item.titleSafe}}`,
src/actions/comment.ts:8: * links). The Safe variants are populated by normalize.ts.
src/actions/comment.ts:23:    author: {
src/actions/comment.ts:24:      ...ctx.author,
src/actions/comment.ts:25:      nameSafe: escapeMarkdown(ctx.author.name),
tests/core/filters.test.ts:6:  id: 't3_a', title: 'hi', body: '', url: 'https://example.com', author: 'u',
tests/core/filters.test.ts:13:  flairText: null, isMod: false, isContributor: false, verified: false,
tests/core/filters.test.ts:26:describe('passesFilters — authorIs predicates', () => {
tests/core/filters.test.ts:28:    expect(passesFilters({ authorIs: { nameIn: ['u'] } }, baseItem, baseAuthor)).toBe(true);
tests/core/filters.test.ts:31:    expect(passesFilters({ authorIs: { nameIn: ['other'] } }, baseItem, baseAuthor)).toBe(false);
tests/core/filters.test.ts:33:  it('nameNotIn negative (author is in the not-in list → reject)', () => {
tests/core/filters.test.ts:34:    expect(passesFilters({ authorIs: { nameNotIn: ['u'] } }, baseItem, baseAuthor)).toBe(false);
tests/core/filters.test.ts:37:    expect(passesFilters({ authorIs: { ageMinSec: 1_000_000 } }, baseItem, baseAuthor)).toBe(false);
tests/core/filters.test.ts:40:    expect(passesFilters({ authorIs: { ageMinSec: 86_400 } }, baseItem, baseAuthor)).toBe(true);
tests/core/filters.test.ts:43:    expect(passesFilters({ authorIs: { linkKarmaMax: 50 } }, baseItem, baseAuthor)).toBe(false);
tests/core/filters.test.ts:46:    expect(passesFilters({ authorIs: { commentKarmaMin: 500 } }, baseItem, baseAuthor)).toBe(false);
tests/core/filters.test.ts:48:  it('isMod predicate', () => {
tests/core/filters.test.ts:49:    expect(passesFilters({ authorIs: { isMod: true } }, baseItem, baseAuthor)).toBe(false);
tests/core/filters.test.ts:50:    expect(passesFilters({ authorIs: { isMod: false } }, baseItem, baseAuthor)).toBe(true);
tests/core/filters.test.ts:52:  it('flairTextIn rejects null author flair', () => {
tests/core/filters.test.ts:53:    expect(passesFilters({ authorIs: { flairTextIn: ['VIP'] } }, baseItem, baseAuthor)).toBe(false);
tests/core/filters.test.ts:81:describe('passesFilters — combined item + author', () => {
tests/core/filters.test.ts:84:      { authorIs: { isMod: false }, itemIs: { over18: false } },
tests/core/filters.test.ts:89:  it('author fails → false even when item passes', () => {
tests/core/filters.test.ts:91:      { authorIs: { isMod: true }, itemIs: { over18: false } },
src/shared/normalize.ts:2: * V2 trigger-payload → strict Item/Author normalizer.
src/shared/normalize.ts:10: * Reality-correction 2026-05-15: Devvit payload field is `author.name`, NOT
src/shared/normalize.ts:11: * `author.username`. See `src/routes/triggers.ts:20-23` for the shipped shape.
src/shared/normalize.ts:27:    authorId?: string;
src/shared/normalize.ts:37:  author?: { id?: string; name?: string };
src/shared/normalize.ts:50:  author?: { id?: string; name?: string };
src/shared/normalize.ts:62:  author: '',
src/shared/normalize.ts:90:  isMod: false,
src/shared/normalize.ts:117:      isMod: (user as { isModerator?: boolean }).isModerator ?? false,
src/shared/normalize.ts:123:    console.warn('[cm/normalize] getUserByUsername failed — defaulting author:', name, err);
src/shared/normalize.ts:134:  author: Author;
src/shared/normalize.ts:136:  safe: { authorName: string; itemTitle: string; itemBody: string };
src/shared/normalize.ts:140: * Inspect the config once to decide whether the per-event normalize must call
src/shared/normalize.ts:152:  // Filter side too — checks may include author filters even if no rule does.
src/shared/normalize.ts:155:      if (check.filters?.authorIs) {
src/shared/normalize.ts:156:        const f = check.filters.authorIs;
src/shared/normalize.ts:161:          f.isMod != null || f.isContributor != null ||
src/shared/normalize.ts:171:  if (rule.kind === 'author' && rule.filter) {
src/shared/normalize.ts:177:      f.isMod != null || f.isContributor != null ||
src/shared/normalize.ts:188:export async function normalizePost(
src/shared/normalize.ts:193:  const a = payload.author ?? {};
src/shared/normalize.ts:194:  const authorName = a.name ?? '';
src/shared/normalize.ts:195:  const author = await enrichAuthor(
src/shared/normalize.ts:196:    authorName,
src/shared/normalize.ts:197:    a.id ?? p.authorId ?? '',
src/shared/normalize.ts:198:    config.needsAuthorEnrichment ?? false,
src/shared/normalize.ts:206:    author: authorName,
src/shared/normalize.ts:217:    author,
src/shared/normalize.ts:219:      authorName: escapeMarkdown(author.name),
src/shared/normalize.ts:226:export async function normalizeComment(
src/shared/normalize.ts:231:  const a = payload.author ?? {};
src/shared/normalize.ts:232:  const authorName = a.name ?? '';
src/shared/normalize.ts:233:  const author = await enrichAuthor(
src/shared/normalize.ts:234:    authorName,
src/shared/normalize.ts:236:    config.needsAuthorEnrichment ?? false,
src/shared/normalize.ts:244:    author: authorName,
src/shared/normalize.ts:250:    author,
src/shared/normalize.ts:252:      authorName: escapeMarkdown(author.name),
docs/superpowers/plans/2026-05-14-wave-f-closeout.md:39:| `stitch` MCP (DESIGN.md spec) | ⛔ | DESIGN.md authored Day 3 evening |
docs/superpowers/plans/2026-05-14-wave-f-closeout.md:57:  - Fails in `src/lib/` (shared) or `src/index.ts` → triage by git blame; touch only if last author = Stephen.
src/client/lib/starter-snippet.ts:19:        { kind: 'comment', body: 'Hi {{author}}, removed for spam.' },
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:106:- [x] Implement `const K = { proc, actionDone, actionPending, lock, cfgRev, cfgCurrentRev, cfgLastWikiRev, eventsRecent, installSubname, authorHist, statsRollup, schemaVersion, currentInstallId }` — every key sub-segmented (default `_` sentinel) for multi-tenant safety (Council 21:30 fix). `installSubname` keyed by installId, not sub (4th-pass Long-Term Architect).
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:115:- [x] `src/core/config.ts` — `parseConfig(json5Text): {ok, config|errors}` using JSON5 + Ajv + named-rule expansion + computed `needsAuthorEnrichment` short-circuit
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:134:Port simplified from upstream — MVP predicate set, idiomatic TypeScript rather than 1:1 port. `passesFilters(spec, item, author)` is a pure boolean over `FilterSpec = {authorIs?, itemIs?}`.
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:136:- [x] AuthorFilter predicates: `nameIn`/`nameNotIn`, `flairTextIn`/`flairTextNotIn`, `ageMinSec`/`ageMaxSec`, `linkKarmaMin`/Max, `commentKarmaMin`/Max, `isMod`, `isContributor`, `verified`, `shadowBanned`
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:140:- [x] 20 tests (vs spec's 12+ target) covering: empty/null filter passes everything, each predicate kind positive + negative, combined item+author intersection
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:148:- [x] `render(tmpl, ctx)` — `ctx = { item: Item & {titleSafe, bodySafe}, author: Author & {nameSafe}, manager?, rules?, actions? }`
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:156:**Files:** Shipped at `src/core/runRule.ts` + `src/rules/{regex,author,ruleset}.ts` + tests under `tests/rules/`.
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:158:- [x] `runRule(rule, item, author)` — dispatches by `rule.kind`. Throws loud on un-expanded `named` ref (Step 1.7 must run at config-parse time, not here).
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:160:- [x] `author.ts` — thin wrapper over `passesFilters({authorIs: rule.filter}, ...)` — CM treats author predicates as rules so the trigger state machine sees author decisions in sequence
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:163:- [x] Tests: `regex.test.ts` (6), `author.test.ts` (3), `ruleset.test.ts` (6) — 15 total
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:170:- [x] `runCheck(check, item, author): Promise<CheckResult>` — applies check-level filters as a pre-gate (short-circuits to `triggered:false, actions:[]` when filter fails), runs rules in sequence with AND/OR aggregation
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:180:- [x] `runRun(run, item, author): Promise<RunResult>` — flat index-based state machine over a single run's checks. `handleActivity` (Phase 2) iterates across runs.
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:215:- [x] `comment.ts` — `reddit.submitComment({id, text})`. Threads `*Safe` markdown-escaped variants (`author.nameSafe`, `item.titleSafe`, `item.bodySafe`) into the Mustache context per Step 2.5.3 — see template.ts:33 rationale
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:226:- [x] Idempotency guard via `firstSeen(activityId, sub)` — lives in the trigger handlers (`src/routes/triggers.ts`), called BEFORE normalize so a re-delivered trigger doesn't burn the expensive `getUserByUsername` call
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:228:- [x] Iterates `current.config.runs`, calls `runRun(run, item, author, sub)`, collects `result.actions` only on `result.triggered`
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:237:**Files:** Modified `src/routes/triggers.ts`. Local payload shapes live in `src/shared/normalize.ts` (`PostSubmitPayload`) — verified 2026-05-15 against real Devvit v0.12.23 runtime payload (PowerShell log capture).
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:240:- [x] **Reality-correction:** `OnPostSubmitRequest` is NOT exported from `@devvit/web/server` (the barrel re-exports `@devvit/reddit` etc.; the shared types live in `@devvit/shared-types` which the barrel does not re-export). Using local `PostSubmitPayload` instead, defined inline at the top of `normalize.ts`
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:241:- [x] **Reality-correction:** Devvit payload field is `author.name`, NOT `author.username` (the plan's "Verified API Surface" was wrong). Author ID lives at `post.authorId` not `author.id` when present at the post level
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:243:- [x] Guard order: null-safety bail (no `post.id`) → recursion guard (`reddit.getAppUser()` null-checked) → `firstSeen(post.id, subName)` → `normalizePost(input, config)` → `handleActivity(item, author, subName)`
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:244:- [x] If `authorName` is missing (Devvit anomaly), the recursion guard is SKIPPED rather than bailing — worst case the bot reacts to its own post on a private test sub, which is harmless; bailing kills all trigger work
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:251:Mirrors 2.4 for `CommentSubmitPayload`. Same guard order + same `handleActivity` dispatch; `normalizeComment` produces a flat `Item` with `title: ''` and `body: comment.body`.
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:288:**Files:** `escapeMarkdown` ships in `src/core/template.ts` (Phase 1, Step 1.5 row). Phase 2 added the 4 mandatory fixture tests + live playtest coverage. Per-rule plumbing in `src/shared/normalize.ts` produces `safe: {authorName, itemTitle, itemBody}` for templates.
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:301:- [x] Template README direction: **always use `{{author.nameSafe}}` not `{{author.name}}` in any field that goes back to Reddit via `submitComment`**
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:401:- [ ] On post submit: compute `sha256(normalize(post.url))`
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:419:**Files:** `src/server/state/authorHistory.ts`
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:424:  - Check cache `author:{name}:history:{kind}` w/ 1h TTL
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:430:- [ ] Commit: `feat(state): author history infrastructure`
docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:514:- [ ] C: RuleSet AND combining regex + author
src/shared/types.ts:4: * optional) is normalized into these shapes by `src/shared/normalize.ts`.
src/shared/types.ts:20:  author: string;        // username
src/shared/types.ts:31:  op?: boolean;          // comment was authored by OP
src/shared/types.ts:41:  isMod: boolean;
src/shared/types.ts:62:  isMod?: boolean;
src/shared/types.ts:85:  authorIs?: AuthorFilter;
src/shared/types.ts:104:  kind: 'author';
src/shared/types.ts:189:  needsAuthorEnrichment?: boolean;    // set at parse time by inspecting rule kinds
src/shared/types.ts:228:  author: Author;
src/rules/ruleset.ts:8:export async function runRuleSet(rule: RuleSetRule, item: Item, author: Author, sub?: string): Promise<RuleResult> {
src/rules/ruleset.ts:17:      const res = await runRule(r, item, author, sub);
src/rules/ruleset.ts:24:    const res = await runRule(r, item, author, sub);
src/rules/author.ts:5: * AuthorRule reuses the FilterSpec.authorIs predicate set. CM treats it as a
src/rules/author.ts:6: * rule (not just a filter) so the trigger state machine sees author-based
src/rules/author.ts:9:export function runAuthorRule(rule: AuthorRule, item: Item, author: Author): RuleResult {
src/rules/author.ts:10:  return { triggered: passesFilters({ authorIs: rule.filter }, item, author) };
docs/superpowers/plans/2026-05-14-c-h-e-audit.md:92:Each cell in the AutoMod column — does the public Reddit/AutoMod doc support the claim? Particularly "Age + karma threshold only" (might be limiting) and "Single-pass YAML matchers" (mostly true but YAML rules can include filter combinators).
src/core/runCheck.ts:11:export async function runCheck(check: Check, item: Item, author: Author, sub?: string): Promise<CheckResult> {
src/core/runCheck.ts:12:  if (!passesFilters(check.filters, item, author)) {
src/core/runCheck.ts:20:      const res = await runRule(r, item, author, sub);
src/core/runCheck.ts:29:    const res = await runRule(r, item, author, sub);
src/core/config.ts:8: * `needsAuthorEnrichment` is computed at parse time so per-event normalization
src/core/config.ts:18:import { computeNeedsAuthorEnrichment } from '../shared/normalize';
src/core/config.ts:50:  expanded.needsAuthorEnrichment = computeNeedsAuthorEnrichment(expanded);
docs/superpowers/plans/2026-05-14-c-h-e-tier-ship.md:81:  - `spam-fresh-account.json5` — regex rule + author rule combining new-account / low-karma filter
docs/superpowers/plans/2026-05-14-c-h-e-tier-ship.md:82:  - `approve-trusted-mod.json5` — author allowlist for trusted contributors
docs/superpowers/plans/2026-05-14-c-h-e-tier-ship.md:89:- [ ] **C.5 (E5 — 30 min):** Add server-side `?demo=1` branch to `src/routes/api.ts` for `/api/recent` + `/api/stats`. Move `DEMO_EVENTS` / `DEMO_STATS` from client-side `src/client/lib/api.ts` into a shared `src/lib/demo-fixtures.ts` module. Both client + server import. **Lane note:** routes/api.ts is Phase 3.x territory but currently empty stub Stephen authored; Vinh integrates around the demo branch when his ZSET wiring lands.
src/actions/ban.ts:17:    username: ctx.author.name,
docs/superpowers/plans/2026-05-13-day3-submission-prep.md:135:| Devpost form structure changes between drafting + submission | Low | Stephen pastes day-of; cheat sheet is reference not authoritative |
src/core/dryRunActivity.ts:42:  author: Author,
src/core/dryRunActivity.ts:52:    const result = await runRun(run, item, author, subredditName);
src/core/dryRunActivity.ts:63:        author,
src/core/handleActivity.ts:29:  author: Author,
src/core/handleActivity.ts:36:    const result = await runRun(run, item, author, subredditName);
src/core/handleActivity.ts:43:        author,
src/schema/app.schema.json:10:    "needsAuthorEnrichment": { "type": "boolean" },
src/schema/app.schema.json:88:        "kind": { "const": "author" },
src/schema/app.schema.json:130:        "authorIs": { "$ref": "#/definitions/AuthorFilter" },
src/schema/app.schema.json:148:        "isMod":            { "type": "boolean" },
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:19:- **Shared-Contract touch** (`src/shared/types.ts`, `src/schema/app.schema.json`, `src/state/keys.ts`, `src/shared/normalize.ts`, `RecentEvent` JSON shape, Mustache context shape, `/api/recent` shape) → draft fix locally, ping Vinh, wait for OK, push w/ `⚠️ CONTRACT:` prefix. Per PLAN.md Rule 10.
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:84:4. Rule logic in src/rules/{regex,author,ruleset,repost}.ts — regex DoS, short-circuit correctness, empty-rules behavior, repost fail-OPEN under Redis outage
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:85:5. Trigger event normalize in src/shared/normalize.ts — null safety, type coercion, missing PostV2/CommentV2 fields, malformed inputs
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:94:- IS_SHARED_CONTRACT: yes/no — yes if touching src/shared/types.ts, src/schema/app.schema.json, src/state/keys.ts, src/shared/normalize.ts, RecentEvent shape, Mustache context shape, or /api/recent shape
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:199:  author: 'spammer', age: 60, score: 0, isSelf: true, over18: false,
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:202:const author: Author = {
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:205:  isMod: false, isContributor: false, verified: false, shadowBanned: false,
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:217:        { kind: 'comment', template: 'Hi {{author.nameSafe}}, removed as spam.' },
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:230:    const result = await dryRunActivity(item, author, sub);
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:240:    await dryRunActivity(item, author, sub);
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:246:    const result = await dryRunActivity(item, author, sub);
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:253:    const result = await dryRunActivity(noMatchItem, author, sub);
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:315:  author: Author,
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:325:    const result = await runRun(run, item, author, subredditName);
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:336:        author,
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:521:import * as normalize from '../../src/shared/normalize';
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:524:vi.mock('../../src/shared/normalize');
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:537:    vi.mocked(normalize.normalizePostV2).mockReturnValue([
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:570:    vi.mocked(normalize.normalizePostV2).mockReturnValue([
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:586:    vi.mocked(normalize.normalizePostV2).mockReturnValue([
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:637:import { normalizePostV2, normalizeCommentV2 } from '../shared/normalize';
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:656:    const [item, author] = isComment
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:657:      ? normalizeCommentV2(raw as never, sub.name)
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:658:      : normalizePostV2(raw as never, sub.name);
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:660:    const result = await dryRunActivity(item, author, sub.name);
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:755:- 3 MVP rule kinds (regex / author / ruleset) w/ JSON5 example each
docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md:798:- C — Mod whitelist: post by mod author → no action (authorIs filter passes)
src/core/runRun.ts:18:export async function runRun(run: Run, item: Item, author: Author, sub?: string): Promise<RunResult> {
src/core/runRun.ts:41:    const res = await runCheck(check, item, author, sub);
src/core/runRule.ts:15:import { runAuthorRule } from '../rules/author';
src/core/runRule.ts:19:export async function runRule(rule: Rule, item: Item, author: Author, sub?: string): Promise<RuleResult> {
src/core/runRule.ts:22:    case 'author':  return runAuthorRule(rule, item, author);
src/core/runRule.ts:23:    case 'ruleset': return runRuleSet(rule, item, author, sub);
src/core/filters.ts:2: * Filter eval — ports FoxxMD's `RunnableBase` filter logic (`itemIs` / `authorIs`)
src/core/filters.ts:15:export function passesFilters(filters: FilterSpec | undefined, item: Item, author: Author): boolean {
src/core/filters.ts:17:  if (filters.authorIs && !passesAuthor(filters.authorIs, author)) return false;
src/core/filters.ts:33:  if (f.isMod != null && a.isMod !== f.isMod) return false;
src/client/components/EventRow.tsx:25:  userFlair: SIGNAL.author,
src/core/template.ts:8: * normalizer to populate the `*Safe` fields on the template context. The
src/core/template.ts:9: * comment-reply template README must direct authors to use the `Safe` fields
src/core/template.ts:22:  author: Author & { nameSafe: string };
src/core/template.ts:36: * (`author.name`, `item.title`, `item.body`) embedded in a bot's
src/client/components/StatsRow.tsx:4:type AccentToken = 'bone' | 'ok' | 'warn' | 'err' | 'info' | 'author';
src/client/components/StatsRow.tsx:12:  author: 'text-signal-author',
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:214:| "The author is senior, I trust them" | Seniority doesn't prevent mistakes; fresh eyes catch what familiarity blinds |
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:281:src/rules/author.ts -> src/rules/author.ts
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:286:src/shared/normalize.ts -> src/shared/normalize.ts
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:307:tests/rules/author.test.ts -> tests/rules/author.test.ts
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:311:tests/shared/normalize.test.ts -> tests/shared/normalize.test.ts
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:345:274aef6 fix(dry-run): global config.dryRun is authoritative — close per-action bypass
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:563:    42	  author: Author,
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:573:    52	    const result = await runRun(run, item, author, subredditName);
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:584:    63	        author,
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:637:    28	  author: 'spammer', age: 60, score: 0, isSelf: true, over18: false,
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:640:    31	const author: Author = {
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:643:    34	  isMod: false, isContributor: false, verified: false, shadowBanned: false,
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:655:    46	        { kind: 'comment', template: 'Hi {{author.nameSafe}}, removed as spam.' },
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:669:    60	    const result = await dryRunActivity(item, author, sub);
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:686:    77	    await dryRunActivity(item, author, sub);
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:692:    83	    const result = await dryRunActivity(item, author, sub);
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:699:    90	    const result = await dryRunActivity(peacefulItem, author, sub);
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:738:    29	  author: Author,
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:745:    36	    const result = await runRun(run, item, author, subredditName);
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:752:    43	        author,
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:799:    22	  authorName?: string;
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:811:    34	  authorName?: string;
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:829:    52	  isMod: false, isContributor: false, verified: false, shadowBanned: false,
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:846:    69	    let authorName: string;
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:849:    72	      authorName = cmt.authorName ?? '';
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:856:    79	        author: authorName,
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:862:    85	      authorName = post.authorName ?? '';
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:869:    92	        author: authorName,
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:879:   102	    const author: Author = { ...AUTHOR_DEFAULTS, name: authorName };
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:881:   104	    const result = await dryRunActivity(item, author, sub.name);
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:914:     4	 * optional) is normalized into these shapes by `src/shared/normalize.ts`.
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:930:    20	  author: string;        // username
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:941:    31	  op?: boolean;          // comment was authored by OP
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:951:    41	  isMod: boolean;
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:972:    62	  isMod?: boolean;
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:995:    85	  authorIs?: AuthorFilter;
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:1014:   104	  kind: 'author';
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:1099:   189	  needsAuthorEnrichment?: boolean;    // set at parse time by inspecting rule kinds
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:1138:   228	  author: Author;
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:1675:    33	  id: 't3_abc', title: 't', body: 'b', url: 'u', author: 'a', age: 0, score: 0,
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:1679:    37	const author: Author = {
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:1681:    39	  flairText: null, isMod: false, isContributor: false, verified: false,
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:1685:    43	const ctx: ActionContext = { item, author, subredditName: 'sub', rev: 0, config };
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:1766:   124	  it('per-action dryRun=false does NOT override config.dryRun=true (global is authoritative — safety gate)', async () => {
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:1767:   125	    // Codex HIGH 2026-05-16: global dry-run must be authoritative.
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:1804:    23	  id: 't3_abc', title: '', body: '', url, author: 'u', age: 0, score: 0,
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:1912:    35	      id: 't3_abc', title: 'free crypto giveaway', body: '', url: '', authorName: 'spammer',
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:1943:    66	    getPostById.mockResolvedValueOnce({ id: 't3_abc', title: '', body: '', url: '', authorName: 'x' });
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:1957:    80	    getPostById.mockResolvedValueOnce({ id: 't3_abc', title: 'a poem', body: '', url: '', authorName: 'x' });
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:1975:    98	    getCommentById.mockResolvedValueOnce({ id: 't1_xyz', body: 'a comment', authorName: 'u' });
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2129:    82	      toast = 'App is missing the submit-post permission. Reinstall or contact app author.';
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2173:     4	 * /post-submit and /comment-submit normalize the V2 payload and dispatch to
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2182:    13	 *      Skip the guard (rather than bail) when author.name is missing so a
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2195:    26	import { normalizePost, normalizeComment, type PostSubmitPayload, type CommentSubmitPayload } from '../shared/normalize';
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2305:   136	  const authorName = input.author?.name;
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2306:   137	  if (!authorName) {
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2307:   138	    console.warn('[cm/post-submit] author.name missing — recursion guard skipped');
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2311:   142	  // node_modules/@devvit/reddit/RedditClient.d.ts:371. If authorName is missing
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2314:   145	  if (authorName) {
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2316:   147	    if (appUser && authorName === appUser.username) return c.json({ status: 'ok' });
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2321:   152	  // firstSeen BEFORE normalize so a re-delivered trigger doesn't burn the
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2329:   160	  // Read the config ONCE at the entry point so normalize sees the same rev
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2330:   161	  // handleActivity will. needsAuthorEnrichment is decided at publish time.
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2332:   163	  const config: AppConfig = current?.config ?? { runs: [], needsAuthorEnrichment: false };
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2333:   164	  const { item, author } = await normalizePost(input, config);
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2334:   165	  await handleActivity(item, author, subName);
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2346:   177	  const authorName = input.author?.name;
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2347:   178	  if (!authorName) {
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2348:   179	    console.warn('[cm/comment-submit] author.name missing — recursion guard skipped');
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2351:   182	  if (authorName) {
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2353:   184	    if (appUser && authorName === appUser.username) return c.json({ status: 'ok' });
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2365:   196	  const config: AppConfig = current?.config ?? { runs: [], needsAuthorEnrichment: false };
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2366:   197	  const { item, author } = await normalizeComment(input, config);
docs/superpowers/codex-reviews/2026-05-16-session-full-review.md:2367:   198	  await handleActivity(item, author, subName);
docs/superpowers/codex-reviews/2026-05-16-vinh-ping-contract-findings.md:14:> - `fix(dry-run)` 274aef6 — global config.dryRun authoritative (was bypassable per-action)
docs/superpowers/codex-reviews/2026-05-16-vinh-ping-contract-findings.md:24:> 2. **`src/routes/triggers.ts:76` + `src/core/handleActivity.ts:32`** — config-rev read-once invariant is violated. Trigger reads, then handleActivity reads AGAIN. Publish in between → normalize on rev A, execute on rev B. Fix: pass ConfigSnapshot into handleActivity, drop its internal read.
docs/superpowers/codex-reviews/2026-05-16-vinh-ping-contract-findings.md:29:> Plus 5 MED + 3 LOW — also contract-touching mostly (event-status collapse, normalize createdAt unit detection, K.* segment encoding, schema minItems). I'll open GH issues tagged `post-hackathon` for those unless you think any are urgent.
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:20:4. Rule logic in src/rules/{regex,author,ruleset,repost}.ts regex DoS, short-circuit correctness, empty-rules behavior, repost fail-OPEN under Redis outage
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:21:5. Trigger event normalize in src/shared/normalize.ts null safety, type coercion, missing PostV2/CommentV2 fields, malformed inputs
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:26:Output: STRICT MARKDOWN with sections CRITICAL / HIGH / MED / LOW. Per finding: file:line citation, 1-paragraph problem statement, suggested fix (code block if non-trivial), IS_SHARED_CONTRACT: yes/no (yes if touching src/shared/types.ts, src/schema/app.schema.json, src/state/keys.ts, src/shared/normalize.ts, RecentEvent shape, Mustache context shape, or /api/recent shape).
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:208:| "The author is senior, I trust them" | Seniority doesn't prevent mistakes; fresh eyes catch what familiarity blinds |
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:503:-| 1.4 | Filter eval (authorIs + itemIs) | `src/core/filters.ts` | **Vinh** | ⬜ | — | Port from CM `Filter` base — `authorIs` evaluates against `Author` shape (name/age/karma/flair/verified/contributor/mod/shadowBanned per `src/shared/types.ts`); `itemIs` against `Item` shape (title/body/url/age/score/isSelf/over18/removed/approved/locked/depth/op). Criteria operators: `equals`/`contains`/`matches` (regex)/`lessThan`/`greaterThan` for scalars; `in`/`includes` for arrays. Return boolean; check-level filter short-circuits before rule eval. Upstream reference: `github.com/FoxxMD/context-mod/src/Filter` |
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:511:+| 1.4 | Filter eval (authorIs + itemIs) | `src/core/filters.ts` | **Vinh** | ✅ 2026-05-16 | — | `passesFilters({authorIs, itemIs}, item, author)` — full predicate set (name/karma/age/flair/mod + over18/locked/score/regex matches). Used by Step 1.7 as pre-check gate. Commit 6694109. |
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:513:+| 1.6 | Rule dispatcher + Regex + Author + RuleSet | `src/core/runRule.ts`, `src/rules/*` | **Vinh** | ✅ 2026-05-16 | 1.4 | 3 MVP rule kinds: regex (title/body/url + flags), author (reuses authorIs filter), ruleset (nested AND/OR). Named-ref throws if not pre-expanded. Commit 6694109. |
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:530:+| 2.5 | onCommentSubmit handler wire-up | `src/routes/triggers.ts` | **Vinh** | ✅ 2026-05-16 | 2.3 | Same pattern as 2.4 with `normalizeComment` + `comment.id` null-gate. Commit 9532cf4. |
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:577:-- [ ] Implement `const K = { configCurrent, configRev, configCurrentRev, seenActivity, authorProfile, authorFlair, recentEvents, recentEventsByActivity, statsTrigger, statsAction, imageHashByPost, imageHashBucket, repostUrl, rateLimit, dashboardPostId, schemaVersion, failedActionsQueue }`
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:581:+- [x] Implement `const K = { proc, actionDone, actionPending, lock, cfgRev, cfgCurrentRev, cfgLastWikiRev, eventsRecent, installSubname, authorHist, statsRollup, schemaVersion, currentInstallId }` — every key sub-segmented (default `_` sentinel) for multi-tenant safety (Council 21:30 fix). `installSubname` keyed by installId, not sub (4th-pass Long-Term Architect).
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:596:+- [x] `src/core/config.ts` — `parseConfig(json5Text): {ok, config|errors}` using JSON5 + Ajv + named-rule expansion + computed `needsAuthorEnrichment` short-circuit
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:626:+Port simplified from upstream — MVP predicate set, idiomatic TypeScript rather than 1:1 port. `passesFilters(spec, item, author)` is a pure boolean over `FilterSpec = {authorIs?, itemIs?}`.
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:628:-- [ ] `evalAuthorIs(filter, author)` — handles include/exclude w/ AuthorCriteria (name, nameMatch, age, linkKarma, commentKarma, totalKarma, flairText, isMod, isContributor, verified, shadowBanned)
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:633:-- [ ] Commit: `feat(core): filter evaluation (authorIs + itemIs)`
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:634:+- [x] AuthorFilter predicates: `nameIn`/`nameNotIn`, `flairTextIn`/`flairTextNotIn`, `ageMinSec`/`ageMaxSec`, `linkKarmaMin`/Max, `commentKarmaMin`/Max, `isMod`, `isContributor`, `verified`, `shadowBanned`
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:638:+- [x] 20 tests (vs spec's 12+ target) covering: empty/null filter passes everything, each predicate kind positive + negative, combined item+author intersection
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:648:-- [ ] `renderTemplate(tmpl, ctx)` — ctx = `{ item, author, manager, rules, actions }`
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:653:+- [x] `render(tmpl, ctx)` — `ctx = { item: Item & {titleSafe, bodySafe}, author: Author & {nameSafe}, manager?, rules?, actions? }`
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:662:-**Files:** `src/server/core/runRule.ts`, `src/server/rules/{regex,author,ruleSet}.ts`
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:663:+**Files:** Shipped at `src/core/runRule.ts` + `src/rules/{regex,author,ruleset}.ts` + tests under `tests/rules/`.
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:665:-- [ ] `runRule(cfg, item, author): Promise<RuleResult>` — dispatches by cfg.kind, applies rule-level authorIs/itemIs guards
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:667:-- [ ] `author.ts` — AuthorRule: thin wrapper over evalAuthorIs
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:671:+- [x] `runRule(rule, item, author)` — dispatches by `rule.kind`. Throws loud on un-expanded `named` ref (Step 1.7 must run at config-parse time, not here).
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:673:+- [x] `author.ts` — thin wrapper over `passesFilters({authorIs: rule.filter}, ...)` — CM treats author predicates as rules so the trigger state machine sees author decisions in sequence
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:676:+- [x] Tests: `regex.test.ts` (6), `author.test.ts` (3), `ruleset.test.ts` (6) — 15 total
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:685:-- [ ] `runCheck(check, item, author): Promise<CheckResult>` — applies check-level filters, runs all rules, aggregates via AND (default) or OR
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:689:+- [x] `runCheck(check, item, author): Promise<CheckResult>` — applies check-level filters as a pre-gate (short-circuits to `triggered:false, actions:[]` when filter fails), runs rules in sequence with AND/OR aggregation
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:701:-- [ ] `runAllRuns(runs, item, author, exec)` — flat index-based state machine
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:706:+- [x] `runRun(run, item, author): Promise<RunResult>` — flat index-based state machine over a single run's checks. `handleActivity` (Phase 2) iterates across runs.
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:728:-- [ ] Mustache context = `{ item, author, manager: { subreddit }, rules: ruleNamedResults, actions: priorActionResults }`
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:770:author.ts
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:779:normalize.ts
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:798:author.test.ts
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:804:normalize.test.ts
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:846:error: src/rules/author.ts: already exists in working directory
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:851:error: src/shared/normalize.ts: already exists in working directory
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:865:error: tests/rules/author.test.ts: already exists in working directory
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:869:error: tests/shared/normalize.test.ts: already exists in working directory
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:880:The working tree already appears to contain the Phase 1+2 files, so I’ll use the actual source for line numbers and the patch for scope. I’m now reading the idempotency, config, template, rules, normalize, handleActivity, schema, and tests files in batches.
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1249:    40	  authorHist: (name: string, sub: string = SUB_DEFAULT) => `cm:${sub}:author:hist:${name}`,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1272:     2	 * Comment-reply action. Renders the Mustache template against the item/author
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1275:     5	 * The template MUST reference `{{author.nameSafe}}`, `{{item.titleSafe}}`,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1278:     8	 * links). The Safe variants are populated by normalize.ts.
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1293:    23	    author: {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1294:    24	      ...ctx.author,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1295:    25	      nameSafe: escapeMarkdown(ctx.author.name),
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1310:     8	 * normalizer to populate the `*Safe` fields on the template context. The
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1311:     9	 * comment-reply template README must direct authors to use the `Safe` fields
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1324:    22	  author: Author & { nameSafe: string };
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1338:    36	 * (`author.name`, `item.title`, `item.body`) embedded in a bot's
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1373:    13	    author: 'someUser',
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1384:    24	  const author: Author & { nameSafe: string } = {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1392:    32	    isMod: false,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1397:    37	  return { item, author };
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1401:    41	  it('substitutes author.name and item.title', () => {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1403:    43	      'Hello {{author.name}}, your post {{item.title}} was removed',
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1411:    51	    ctx.author.name = "Joe's & Co";
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1412:    52	    const out = render('Hi {{author.name}}', ctx);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1484:tests/actions/actions.test.ts:89:    const tpl = 'Hi {{author.nameSafe}}, your post "{{item.titleSafe}}" was flagged.';
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1488:src/routes/menu.ts:44:            template: 'Hi {{author.nameSafe}}, your post "{{item.titleSafe}}" was removed as suspected spam. Mod-team will review on appeal.',
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1493:tests/core/template.test.ts:24:  const author: Author & { nameSafe: string } = {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1496:tests/core/template.test.ts:52:    const out = render('Hi {{author.name}}', ctx);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1508:src/actions/comment.ts:2: * Comment-reply action. Renders the Mustache template against the item/author
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1509:src/actions/comment.ts:5: * The template MUST reference `{{author.nameSafe}}`, `{{item.titleSafe}}`,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1511:src/actions/comment.ts:8: * links). The Safe variants are populated by normalize.ts.
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1516:src/actions/comment.ts:25:      nameSafe: escapeMarkdown(ctx.author.name),
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1518:src/shared/normalize.ts:16:import { escapeMarkdown } from '../core/template';
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1519:src/shared/normalize.ts:219:      authorName: escapeMarkdown(author.name),
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1520:src/shared/normalize.ts:220:      itemTitle: escapeMarkdown(item.title),
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1521:src/shared/normalize.ts:221:      itemBody: escapeMarkdown(item.body),
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1522:src/shared/normalize.ts:252:      authorName: escapeMarkdown(author.name),
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1523:src/shared/normalize.ts:254:      itemBody: escapeMarkdown(item.body),
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1536:src/core/template.ts:8: * normalizer to populate the `*Safe` fields on the template context. The
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1537:src/core/template.ts:9: * comment-reply template README must direct authors to use the `Safe` fields
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1539:src/core/template.ts:22:  author: Author & { nameSafe: string };
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1549:/bin/zsh -lc "nl -ba tests/shared/normalize.test.ts | sed -n '1,300p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1553:/bin/zsh -lc "nl -ba src/shared/normalize.ts | sed -n '1,340p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1619:    10	import { normalizePost, normalizeComment, computeNeedsAuthorEnrichment } from '../../src/shared/normalize';
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1622:    13	const baseConfig: AppConfig = { runs: [], needsAuthorEnrichment: false };
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1624:    15	describe('normalizePost', () => {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1628:    19	    const { item, author } = await normalizePost(
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1631:    22	        author: { id: 't2_zzz', name: 'someUser' },
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1636:    27	    for (const v of Object.values(author)) expect(v).not.toBeUndefined();
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1640:    31	    expect(item.author).toBe('someUser');
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1641:    32	    expect(author.name).toBe('someUser');
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1644:    35	  it('does NOT call getUserByUsername when config.needsAuthorEnrichment is false', async () => {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1645:    36	    await normalizePost(
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1646:    37	      { post: { id: 't3_a' }, author: { name: 'u1' } },
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1647:    38	      { runs: [], needsAuthorEnrichment: false },
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1652:    43	  it('DOES call getUserByUsername when needsAuthorEnrichment is true', async () => {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1654:    45	      linkKarma: 100, commentKarma: 200, isModerator: false, isAdmin: false,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1656:    47	    await normalizePost(
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1657:    48	      { post: { id: 't3_a' }, author: { name: 'u1' } },
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1658:    49	      { runs: [], needsAuthorEnrichment: true },
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1665:    56	    const { author } = await normalizePost(
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1666:    57	      { post: { id: 't3_a' }, author: { name: 'ghost' } },
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1667:    58	      { runs: [], needsAuthorEnrichment: true },
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1669:    60	    expect(author.shadowBanned).toBe(true);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1670:    61	    expect(author.linkKarma).toBe(0);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1675:    66	    const { author } = await normalizePost(
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1676:    67	      { post: { id: 't3_a' }, author: { name: 'u' } },
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1677:    68	      { runs: [], needsAuthorEnrichment: true },
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1679:    70	    expect(author.linkKarma).toBe(0);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1680:    71	    expect(author.name).toBe('u');
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1684:    75	describe('normalizeComment', () => {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1688:    79	    const { item, author } = await normalizeComment(
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1689:    80	      { comment: { id: 't1_x', body: 'hi' }, author: { name: 'u' } },
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1693:    84	    for (const v of Object.values(author)) expect(v).not.toBeUndefined();
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1701:    92	  it('returns false when no rule references author fields', () => {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1715:   106	  it('returns true for an author rule with karma threshold', () => {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1722:   113	          rules: [{ kind: 'author', filter: { linkKarmaMax: 10 } }],
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1729:   120	  it('returns true for check.filters.authorIs', () => {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1736:   127	          filters: { authorIs: { isMod: false } },
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1754:   145	            rules: [{ kind: 'author', filter: { commentKarmaMin: 100 } }],
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1792:    29	  author: Author,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1799:    36	    const result = await runRun(run, item, author, subredditName);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1806:    43	        author,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1827:     2	 * V2 trigger-payload → strict Item/Author normalizer.
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1835:    10	 * Reality-correction 2026-05-15: Devvit payload field is `author.name`, NOT
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1836:    11	 * `author.username`. See `src/routes/triggers.ts:20-23` for the shipped shape.
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1852:    27	    authorId?: string;
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1862:    37	  author?: { id?: string; name?: string };
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1875:    50	  author?: { id?: string; name?: string };
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1887:    62	  author: '',
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1915:    90	  isMod: false,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1942:   117	      isMod: (user as { isModerator?: boolean }).isModerator ?? false,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1948:   123	    console.warn('[cm/normalize] getUserByUsername failed — defaulting author:', name, err);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1959:   134	  author: Author;
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1961:   136	  safe: { authorName: string; itemTitle: string; itemBody: string };
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1965:   140	 * Inspect the config once to decide whether the per-event normalize must call
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1977:   152	  // Filter side too — checks may include author filters even if no rule does.
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1980:   155	      if (check.filters?.authorIs) {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1981:   156	        const f = check.filters.authorIs;
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1986:   161	          f.isMod != null || f.isContributor != null ||
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1996:   171	  if (rule.kind === 'author' && rule.filter) {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2002:   177	      f.isMod != null || f.isContributor != null ||
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2013:   188	export async function normalizePost(
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2018:   193	  const a = payload.author ?? {};
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2019:   194	  const authorName = a.name ?? '';
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2020:   195	  const author = await enrichAuthor(
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2021:   196	    authorName,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2022:   197	    a.id ?? p.authorId ?? '',
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2023:   198	    config.needsAuthorEnrichment ?? false,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2031:   206	    author: authorName,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2042:   217	    author,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2044:   219	      authorName: escapeMarkdown(author.name),
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2051:   226	export async function normalizeComment(
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2056:   231	  const a = payload.author ?? {};
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2057:   232	  const authorName = a.name ?? '';
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2058:   233	  const author = await enrichAuthor(
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2059:   234	    authorName,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2061:   236	    config.needsAuthorEnrichment ?? false,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2069:   244	    author: authorName,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2075:   250	    author,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2077:   252	      authorName: escapeMarkdown(author.name),
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2111:     4	 * /post-submit and /comment-submit normalize the V2 payload and dispatch to
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2120:    13	 *      Skip the guard (rather than bail) when author.name is missing so a
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2133:    26	import { normalizePost, normalizeComment, type PostSubmitPayload, type CommentSubmitPayload } from '../shared/normalize';
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2157:    50	  const authorName = input.author?.name;
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2158:    51	  if (!authorName) {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2159:    52	    console.warn('[cm/post-submit] author.name missing — recursion guard skipped');
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2163:    56	  // node_modules/@devvit/reddit/RedditClient.d.ts:371. If authorName is missing
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2166:    59	  if (authorName) {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2168:    61	    if (appUser && authorName === appUser.username) return c.json({ status: 'ok' });
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2173:    66	  // firstSeen BEFORE normalize so a re-delivered trigger doesn't burn the
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2181:    74	  // Read the config ONCE at the entry point so normalize sees the same rev
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2182:    75	  // handleActivity will. needsAuthorEnrichment is decided at publish time.
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2184:    77	  const config: AppConfig = current?.config ?? { runs: [], needsAuthorEnrichment: false };
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2185:    78	  const { item, author } = await normalizePost(input, config);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2186:    79	  await handleActivity(item, author, subName);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2198:    91	  const authorName = input.author?.name;
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2199:    92	  if (!authorName) {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2200:    93	    console.warn('[cm/comment-submit] author.name missing — recursion guard skipped');
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2203:    96	  if (authorName) {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2205:    98	    if (appUser && authorName === appUser.username) return c.json({ status: 'ok' });
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2217:   110	  const config: AppConfig = current?.config ?? { runs: [], needsAuthorEnrichment: false };
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2218:   111	  const { item, author } = await normalizeComment(input, config);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2219:   112	  await handleActivity(item, author, subName);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2241:    15	import { runAuthorRule } from '../rules/author';
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2245:    19	export async function runRule(rule: Rule, item: Item, author: Author, sub?: string): Promise<RuleResult> {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2248:    22	    case 'author':  return runAuthorRule(rule, item, author);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2249:    23	    case 'ruleset': return runRuleSet(rule, item, author, sub);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2265:    11	export async function runCheck(check: Check, item: Item, author: Author, sub?: string): Promise<CheckResult> {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2266:    12	  if (!passesFilters(check.filters, item, author)) {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2274:    20	      const res = await runRule(r, item, author, sub);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2283:    29	    const res = await runRule(r, item, author, sub);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2307:    18	export async function runRun(run: Run, item: Item, author: Author, sub?: string): Promise<RunResult> {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2330:    41	    const res = await runCheck(check, item, author, sub);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2358:/bin/zsh -lc "nl -ba src/rules/author.ts | sed -n '1,220p' && nl -ba src/rules/ruleset.ts | sed -n '1,240p' && nl -ba src/rules/repost.ts | sed -n '1,260p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2364:     5	 * AuthorRule reuses the FilterSpec.authorIs predicate set. CM treats it as a
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2365:     6	 * rule (not just a filter) so the trigger state machine sees author-based
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2368:     9	export function runAuthorRule(rule: AuthorRule, item: Item, author: Author): RuleResult {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2369:    10	  return { triggered: passesFilters({ authorIs: rule.filter }, item, author) };
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2378:     8	export async function runRuleSet(rule: RuleSetRule, item: Item, author: Author, sub?: string): Promise<RuleResult> {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2387:    17	      const res = await runRule(r, item, author, sub);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2394:    24	    const res = await runRule(r, item, author, sub);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2477:    10	    "needsAuthorEnrichment": { "type": "boolean" },
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2555:    88	        "kind": { "const": "author" },
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2597:   130	        "authorIs": { "$ref": "#/definitions/AuthorFilter" },
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2615:   148	        "isMod":            { "type": "boolean" },
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2723:     4	 * optional) is normalized into these shapes by `src/shared/normalize.ts`.
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2739:    20	  author: string;        // username
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2750:    31	  op?: boolean;          // comment was authored by OP
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2760:    41	  isMod: boolean;
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2781:    62	  isMod?: boolean;
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2804:    85	  authorIs?: AuthorFilter;
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2823:   104	  kind: 'author';
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2908:   189	  needsAuthorEnrichment?: boolean;    // set at parse time by inspecting rule kinds
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2947:   228	  author: Author;
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3044:    33	  id: 't3_abc', title: 't', body: 'b', url: 'u', author: 'a', age: 0, score: 0,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3048:    37	const author: Author = {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3050:    39	  flairText: null, isMod: false, isContributor: false, verified: false,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3054:    43	const ctx: ActionContext = { item, author, subredditName: 'sub', rev: 0, config };
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3156:     8	 * `needsAuthorEnrichment` is computed at parse time so per-event normalization
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3166:    18	import { computeNeedsAuthorEnrichment } from '../shared/normalize';
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3189:    41	  expanded.needsAuthorEnrichment = computeNeedsAuthorEnrichment(expanded);
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3301:     2	 * Filter eval — ports FoxxMD's `RunnableBase` filter logic (`itemIs` / `authorIs`)
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3314:    15	export function passesFilters(filters: FilterSpec | undefined, item: Item, author: Author): boolean {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3316:    17	  if (filters.authorIs && !passesAuthor(filters.authorIs, author)) return false;
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3332:    33	  if (f.isMod != null && a.isMod !== f.isMod) return false;
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3376:    17	    username: ctx.author.name,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3420:     7	  url: 'https://example.com/path', author: 'u', age: 0, score: 0,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3477:    25	  id: 't3_abc', title: '', body: '', url, author: 'u', age: 0, score: 0,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3597:    48	  author: 'spammer', age: 100, score: 0, isSelf: false, over18: false,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3600:    51	const author: Author = {
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3602:    53	  flairText: null, isMod: false, isContributor: false, verified: false, shadowBanned: false,
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3630:    81	    await handleActivity(item, author, 'sub');
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3638:    89	    await handleActivity(item, author, 'cm_devvit_test');
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3655:   106	    await handleActivity(item, author, 'sub');
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3677:   128	    await handleActivity(item, author, 'sub');
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3712:   163	    await handleActivity(item, author, 'sub');
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3721:   172	    await handleActivity(item, author, 'sub');
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3753:Global dry-run can be bypassed by setting an individual action to `dryRun: false`. The test name says “per-action only overrides UPWARD to dry-run,” but the assertion expects a live Reddit call under `config.dryRun=true`. That is exactly the kind of safety gate slip this flag is supposed to prevent. Suggested fix: make global dry-run authoritative:  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3764:The advertised read-once config invariant is not true. The trigger reads config once for normalization, then `handleActivity` reads config again for rule/action execution. A publish between those two reads can normalize author enrichment against rev A and execute rules/actions from rev B. Suggested fix: pass the already-read `ConfigSnapshot` into `handleActivity` and remove its internal config read for trigger-driven calls.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3768:The Mustache context exposes both raw fields (`author.name`, `item.title`, `item.body`) and safe fields, while the schema accepts arbitrary templates. A config author only has to use `{{item.title}}` once to re-enable ping/link/blockquote injection. Suggested fix: either make `Mustache.escape = escapeMarkdown` for normal `{{...}}`, or expose only safe values in the comment template context and require triple-stash for explicitly raw moderator-authored fields.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3786:Repost fingerprinting hashes the raw URL. `https://example.com`, `https://example.com/`, case changes in host, tracking query params, and fragments all become different fingerprints, so common repost variants evade detection. Suggested fix: canonicalize URL before hashing: lowercase host, strip fragments, normalize trailing slash, and optionally drop configured tracking params.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3789:**src/shared/normalize.ts:74**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3790:`ageSeconds` treats every numeric `createdAt` as milliseconds. If Devvit ever supplies epoch seconds for a V2 payload, age becomes wildly inflated and age-based rules misfire. Suggested fix: detect seconds-vs-ms by magnitude or normalize from `Date` objects explicitly.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3811:**tests/shared/normalize.test.ts:26**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3812:Several normalize tests assert “not undefined” rather than exact shape and coercion behavior. They would not catch missing `over18`, wrong `createdAt` units, absent comment parent/depth/op data, or unexpected malformed payloads. Suggested fix: assert full normalized `Item`/`Author` objects for representative PostV2 and CommentV2 payloads.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3843:Global dry-run can be bypassed by setting an individual action to `dryRun: false`. The test name says “per-action only overrides UPWARD to dry-run,” but the assertion expects a live Reddit call under `config.dryRun=true`. That is exactly the kind of safety gate slip this flag is supposed to prevent. Suggested fix: make global dry-run authoritative:  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3854:The advertised read-once config invariant is not true. The trigger reads config once for normalization, then `handleActivity` reads config again for rule/action execution. A publish between those two reads can normalize author enrichment against rev A and execute rules/actions from rev B. Suggested fix: pass the already-read `ConfigSnapshot` into `handleActivity` and remove its internal config read for trigger-driven calls.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3858:The Mustache context exposes both raw fields (`author.name`, `item.title`, `item.body`) and safe fields, while the schema accepts arbitrary templates. A config author only has to use `{{item.title}}` once to re-enable ping/link/blockquote injection. Suggested fix: either make `Mustache.escape = escapeMarkdown` for normal `{{...}}`, or expose only safe values in the comment template context and require triple-stash for explicitly raw moderator-authored fields.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3876:Repost fingerprinting hashes the raw URL. `https://example.com`, `https://example.com/`, case changes in host, tracking query params, and fragments all become different fingerprints, so common repost variants evade detection. Suggested fix: canonicalize URL before hashing: lowercase host, strip fragments, normalize trailing slash, and optionally drop configured tracking params.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3879:**src/shared/normalize.ts:74**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3880:`ageSeconds` treats every numeric `createdAt` as milliseconds. If Devvit ever supplies epoch seconds for a V2 payload, age becomes wildly inflated and age-based rules misfire. Suggested fix: detect seconds-vs-ms by magnitude or normalize from `Date` objects explicitly.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3901:**tests/shared/normalize.test.ts:26**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3902:Several normalize tests assert “not undefined” rather than exact shape and coercion behavior. They would not catch missing `over18`, wrong `createdAt` units, absent comment parent/depth/op data, or unexpected malformed payloads. Suggested fix: assert full normalized `Item`/`Author` objects for representative PostV2 and CommentV2 payloads.  

codex
One real parity concern is emerging: the dry-run form builds `Item`/`Author` by hand instead of reusing the trigger normalizers, so author-aware rules can disagree with live `handleActivity`. I’m checking whether tests pin that contract and then I’ll scan docs for D10 drift.
exec
/bin/zsh -lc 'rg -n "phase|comprehensive|seam|canonical|promoted|baked in|green|ship|exactly|faithfully|production|live data path|screenshot moment|honest|defensible|artifact|scenario|This is|We built|I built|I shipped|I verified|Codex|Vinh|Stephen" docs/submission/writeup-draft.md docs/submission/e2e-scenarios.md docs/submission/demo-video-script.md README.md' in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "for c in 6694109 9532cf4 983c949 274aef6 8f6d608 dafe050 fc3851a 5930074 6feed7c 50bda17 778b60a 3f8c9f4 6505e2d 075a927 d6972c7 d19e063 dfc1b80 a227d68 9923622; do git show --stat --oneline --name-only --format='COMMIT %h %s' "'$c | sed -n '"'1,80p'; done" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc 'git diff --check df05b37..HEAD' in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 181ms:
docs/submission/e2e-scenarios.md:3:> Step 5.3 in PLAN.md. 8 reproducible scenarios judges can replay on the
docs/submission/e2e-scenarios.md:5:> Each scenario = trigger → expected outcome → verification → screenshot target.
docs/submission/e2e-scenarios.md:7:**Demo sub:** `r/contextmod_vinh_dev` (Vinh's playtest sub; Stephen also has access).
docs/submission/e2e-scenarios.md:44:**Screenshot target:** `docs/screenshots/scenario-a-spam-removed.png` (post 404 + bot comment overlay)
docs/submission/e2e-scenarios.md:70:- Codex H7 fix (2026-05-16): SET NX atomic, no GET-then-SET race even on simultaneous submissions
docs/submission/e2e-scenarios.md:76:**Screenshot target:** `docs/screenshots/scenario-b-dryrun-repost.png` (dashboard row w/ dry-run chip)
docs/submission/e2e-scenarios.md:101:**Screenshot target:** `docs/screenshots/scenario-c-mod-bypass.png` (mod post still up + dashboard empty)
docs/submission/e2e-scenarios.md:122:**Screenshot target:** `docs/screenshots/scenario-d-approved-bypass.png`
docs/submission/e2e-scenarios.md:151:- Vinh's Phase 2 reality-correction: `lock.ts` routes via `getCommentById` (not on `reddit.lock(thingId)` directly)
docs/submission/e2e-scenarios.md:157:**Screenshot target:** `docs/screenshots/scenario-e-comment-locked.png`
docs/submission/e2e-scenarios.md:161:## Scenario F — Dry-run rule tester (Stephen's Step 3.6)
docs/submission/e2e-scenarios.md:179:**Screenshot target:** `docs/screenshots/scenario-f-dryrun-toast.png` (toast overlay on post)
docs/submission/e2e-scenarios.md:189:- Atomic publish (Vinh's Phase 1.3 D5 pattern): `cfg:rev:{M}` written → `cfg:current_rev` pointer bumped
docs/submission/e2e-scenarios.md:199:**Screenshot target:** `docs/screenshots/scenario-g-reload-toast.png`
docs/submission/e2e-scenarios.md:219:**Screenshot target:** `docs/screenshots/scenario-h-dashboard-live.png` (already captured at `docs/screenshots/dashboard-desktop.png` for `?demo=1`; will re-capture against live data closer to demo)
docs/submission/e2e-scenarios.md:226:- **History-based rules** (was 4.3–4.6): Vinh's queue capacity-permitting; may ship pre-deadline.
docs/submission/e2e-scenarios.md:237:_Drafted 2026-05-16 by Stephen. Will capture screenshots + verify live before submission lockdown._
docs/submission/demo-video-script.md:5:> **Voice rule:** Stephen records the voiceover in his own voice. Tight, scrappy, no AI cadence. Rehearse twice before the take. Don't sound like a sponsor read.
docs/submission/demo-video-script.md:55:**VO:** "Write rules in JSON5 in your sub's wiki. Composable rules. Mustache-templated action messages. The full ContextMod concept model, ported faithfully."
docs/submission/demo-video-script.md:64:> Note (was a Phase-1-slip fallback): Phase 1+2+3 shipped 2026-05-16 so this beat now captures LIVE action data via `handleActivity` → rule engine → `events:recent` ZSET → dashboard. The `?demo=1` synthetic path remains as a backup if the test sub is rate-limited during recording, but the canonical capture is live.
docs/submission/demo-video-script.md:72:**VO:** "Live telemetry: stats, recent actions, hourly volume. Plus a dry-run rule tester — right-click any post, see exactly which rules would fire before they fire."
docs/submission/demo-video-script.md:91:github.com/StephenSook/context-mod-devvit
docs/submission/demo-video-script.md:102:- **Captions baked in** (not auto-generated by YouTube). Judges may watch muted.
docs/submission/demo-video-script.md:108:## Voiceover guidance for Stephen
docs/submission/writeup-draft.md:3:> **Voice rule (per Codex D10 + Watchful1 lesson):** write in first person, scrappy, sound like a real builder. No "sophisticated ecosystem" / "revolutionary platform" marketing prose. Mention specific bugs you hit, specific cuts you made, specific frustrations. Stephen rewrites every word before submission — this is structural scaffolding, not final copy. <!-- AITONE_IGNORE -->
docs/submission/writeup-draft.md:11:**Suggested opener** (Stephen's voice — rewrite):
docs/submission/writeup-draft.md:13:> ContextMod is a rule-engine moderation bot. Mods write JSON5 config in their sub's wiki — define what counts as spam, what flairs to require, what posts to remove, what comments to leave, what users to ban. Once Phase 1-3 wiring lands, the bot reads every new post and comment, runs the rules, takes the actions. No central server, no Heroku token, no shared rate limits — Devvit handles all of that. (v0.1.0 ships the rule engine + idempotency primitives + atomic config publish + Observatory dashboard demo mode; live trigger / action / dashboard wiring lands through Day 5-11 per the phase plan below.)
docs/submission/writeup-draft.md:15:> **Why now:** Reddit's CEO said on the Q1 2026 earnings call that they're "porting good bots to the developer platform." Reddit's own r/Devvit team is deprecating the older Blocks framework. The $1,000 App Migration Bounty is explicitly scoped to PRAW→Devvit moves — ContextMod is exactly that. FoxxMD's last ContextMod release was November 2022, weeks before Reddit's paid Data API tier launched in July 2023. The bot has been frozen at the pre-blackout boundary ever since, with 15+ operators stuck running it on dying infrastructure. This port unblocks all of them on the platform Reddit is actively recommending.
docs/submission/writeup-draft.md:17:> **What mods actually want:** The top-upvoted comment (94 upvotes, u/Aeroncastle) on the May 2026 r/modnews "Mod Monthly" thread is *"I want stronger tools to fight AI, not in person events"* (verified at [r/modnews/comments/1t6jggp](https://www.reddit.com/r/modnews/comments/1t6jggp/), top 6 sampled 2026-05-13). The next three top comments echo the same ask: u/critacle (34 upvotes) — *"Stop the AI bot spam. It's dominating /r/all. This is killing Reddit"*; u/GamingYouTube14 (21) — *"can you guys look into these new ai bots that adapt to the conversation? they're pretty much undetectable by any kind of algorithm"*; u/OMGWTFBBQUE (15) — *"If I have to remove another AI post I'm going to lose my shit. Fucking do something about it."* ContextMod is anti-AI-spam tooling by construction — `regex` catches the generic phrasings AI-generated spam reuses, `author` filters flag new-account / low-karma / no-verified-email patterns AI bot farms produce, `history` (Phase 4) detects cross-sub posting cadence that no human author would maintain. Plus the Observatory dashboard is the "reason-chain audit" r/TrustAndSafety asked for — every action chip surfaces the rule that fired, the activityId, and the context. ContextMod doesn't replace AutoMod (regex-only); it's the moderator's investigation workbench that runs alongside.
docs/submission/writeup-draft.md:21:- **3 MVP rule kinds shipped** in v0.1.0: `regex` (multi-field threshold matching), `author` (basic criteria — age, karma, flair, isMod, isContributor, verified, shadowBanned), `ruleSet` (AND/OR composition).
docs/submission/writeup-draft.md:27:- **Observatory dashboard** (custom-post webview): action-telemetry surface with 24h sparkline, last 50 events with color-coded action chips, stat cards (actions today, mod time saved estimate, active rules, top rule). Ships in v0.1.0 against `?demo=1` synthetic data; live-data wiring lands at Phase 3 once Vinh's `events:recent` ZSET pipeline finishes.
docs/submission/writeup-draft.md:53:### Time savings — the defensible claim
docs/submission/writeup-draft.md:55:> **Don't overclaim.** Per Codex review: "no published 'X hours saved per mod' study exists. Don't invent numbers."
docs/submission/writeup-draft.md:66:- **Pillar 1 — Real problem, named person:** FoxxMD (creator, ContextMod) + SampleOfNone (production operator at r/piercing) both named in conversation. No hypotheticals.
docs/submission/writeup-draft.md:68:- **Pillar 3 — Human-scale stat:** 466 hr/day mod labor measured; 60K mods scaled; 73% bot-driven; 9–94% of mod work is "invisible" context-gathering — exactly the gap CM fills.
docs/submission/writeup-draft.md:69:- **Pillar 4 — Tech inevitable:** Reddit's own r/Devvit posts say it: *"deprecating Devvit Blocks renderer"* ([1r3xcm2](https://www.reddit.com/r/Devvit/comments/1r3xcm2/)), *"strongly recommend Devvit Web for all new apps"* ([1pcm13z](https://www.reddit.com/r/Devvit/comments/1pcm13z/)), 80-day countdown to Blocks cutover ([1shophd](https://www.reddit.com/r/Devvit/comments/1shophd/)). The $1K Migration Bounty is *explicitly* scoped to PRAW→Devvit ([1sgwkm7](https://www.reddit.com/r/Devvit/comments/1sgwkm7/)) — ContextMod is the textbook target. ContextMod's release timing seals it: last release v0.13.4 / 2022-11-29, weeks before the API price wall; on 2026-05-12 FoxxMD disabled the upstream CI workflows for PRAW publish/pages — same week he added Stephen + Vinh as collaborators on the Devvit port and shared the project board. The maintainer isn't abandoning the codebase; he's redirecting energy to the port.
docs/submission/writeup-draft.md:78:### Ported faithfully (rule engine + dashboard ship in v0.1.0)
docs/submission/writeup-draft.md:80:The concept model + rule semantics + wiki-config publish pipeline + dashboard all ship. Live-trigger wiring (`handleActivity` → rule pipeline → mod action) is the Phase 1 integration step Vinh is finishing through Day 5-8. What that means concretely:
docs/submission/writeup-draft.md:105:- `mhs` (ModerateHateSpeech toxicity classifier) — explicitly cut. Reddit's `reddit/devvit-docs` PR #96 (2026-05-08) locked the HTTP fetch policy's AI-provider allowlist to OpenAI + Gemini only; `api.moderatehatespeech.com` falls outside that carve-out. Available in upstream ContextMod's PRAW build; not available in the Devvit port. Documented honestly rather than worked around.
docs/submission/writeup-draft.md:115:### Build journal (first-person per D10 — Stephen to rewrite)
docs/submission/writeup-draft.md:117:**2026-05-16 (Day 4): the whole backend shipped in one day.** Vinh got back on board after a quiet stretch and pushed Phase 1 (rule engine, 11 steps, 93 tests), Phase 2 (7 actions + handleActivity orchestrator + URL-dedupe repost promoted from Phase 4, 137 tests), and Phase 3 (config UX + live dashboard data, 147 tests) in three consecutive feature commits within roughly 12 hours. 3,670 line additions across 53 files. No code-review rounds, just one giant atomic ship per phase + a PLAN.md flip after each.
docs/submission/writeup-draft.md:119:**Reddit-API surprises Vinh caught in playtest** (and that the plan would have shipped wrong):
docs/submission/writeup-draft.md:125:- `handleActivity` would have shipped `actions: undefined` in every event row (the plan wrote `actions: ...` literal but action results were never aggregated). Caught + fixed pre-ship.
docs/submission/writeup-draft.md:128:**Codex adversarial review pass (same-day, post-Vinh-ship).** 2 CRITICAL + 7 HIGH + 5 MED + 3 LOW. The two CRITICAL were both in the idempotency layer:
docs/submission/writeup-draft.md:132:Four non-contract hotfixes shipped as separate atomic commits the same session (274aef6 dry-run authority, 8f6d608 repost SET NX, dafe050 commit retries, fc3851a lease token). 162 tests green, tsc clean.
docs/submission/writeup-draft.md:134:**Dry-run rule tester (Step 3.6) design choice.** The handleActivity contract was Vinh's; modifying its `void` return type to accept a `dryRun: true` option that returns structured results would have needed a `⚠️ CONTRACT` PR roundtrip per the team coordination protocol. Instead, shipped a sibling `src/core/dryRunActivity.ts` (~30 line duplication) that mirrors the pipeline but forces `dryRun: true` on every action and returns a structured `DryRunResult` for the form UI to render as toast bullets. Non-contract, no coordination needed, ships immediately.
docs/submission/writeup-draft.md:136:**What didn't get done:** Phase 0.10 image-decode + blockhash spike never ran, so Phase 4.7 image-hash repost is effectively NO-GO for this hackathon (deferred post-submission). Phase 4.3–4.6 history-based rules are still on Vinh's plate; may or may not ship before the 2026-05-27 deadline depending on capacity.
docs/submission/writeup-draft.md:143:- **Repo link:** `github.com/StephenSook/context-mod-devvit`
docs/submission/writeup-draft.md:145:- **Reddit username (entrant):** `u/CowSufficient3840` (Stephen Sookra)
docs/submission/writeup-draft.md:158:- [ ] Phase 4 image-hash repost detection either shipped OR explicitly downgraded in writeup
docs/submission/writeup-draft.md:160:- [ ] Stephen rewrites every section of this draft in his own voice
README.md:6:> Write your moderation rules once in JSON5. The rule engine, idempotency primitives, atomic config publish, and Observatory dashboard (demo mode) ship in v0.1.0. Live trigger evaluation, action handlers, and dashboard live-data wiring land in Phase 1-3 — see "What's ported" below for the per-phase ship state. Mods install ContextMod once, define what counts as spam / what to remove / what to comment / what users to ban, and the bot handles the rest once Phase 1-3 wiring lands.
README.md:8:[![CI](https://github.com/StephenSook/context-mod-devvit/actions/workflows/ci.yml/badge.svg)](https://github.com/StephenSook/context-mod-devvit/actions/workflows/ci.yml)
README.md:15:**Devvit Web port of [ContextMod](https://github.com/FoxxMD/context-mod)** — FoxxMD's flagship moderation bot, originally built on PRAW and now ported to Reddit's first-party developer platform.
README.md:44:git clone https://github.com/StephenSook/context-mod-devvit
README.md:50:Then open [`http://localhost:5173/?demo=1`](http://localhost:5173/?demo=1). The `?demo=1` query parameter seeds the dashboard with synthetic events (per the production-safety pattern — fabricated data never auto-shows). Remove the flag to see the empty-state zero-state with a copy-to-clipboard starter config.
README.md:56:## Status — what's production vs scaffolded vs Phase-N pending
README.md:62:| Observatory dashboard (React + Vite + Tailwind, 24h sparkline + event stream + dry-run mod menu) | **Production** | Renders against live `/api/recent` ZSET + falls back to `?demo=1` synthetic for screenshots. Wave A–F shipped. |
README.md:63:| Rule engine — `handleActivity` → `runRun` → `runCheck` → `runRule` (regex / author / ruleSet) | **Production** | Vinh's Phase 1 — 11 steps, 93 tests. Filters (authorIs + itemIs), Mustache templates, named-rule expansion, AND/OR combinators, postBehavior state machine w/ 100-iter safety. |
README.md:64:| Action handlers (`remove` / `approve` / `lock` / `comment` / `report` / `ban` / `userFlair`) | **Production** | Vinh's Phase 2 — 7 MVP actions, Reddit-API signatures verified live. Markdown sanitizer (u/r-ping defang + link-injection guard) for `comment` action. |
README.md:65:| `handleActivity` orchestrator + `runAction` w/ idempotency wrap | **Production** | Vinh's Phase 2.3 — reads config rev once at event start (D5), aggregates ActionResult into events:recent ZSET. Codex-hardened (CRITICAL+HIGH fixes shipped 2026-05-16). |
README.md:66:| Idempotency primitives (`src/lib/idem.ts` — FNV-1a + BigInt + lease owner tokens + 3-stage Redis keys + 60s cron lock) | **Production** | 13 unit tests. Codex-hardened: commitAction retries done-write 3x and never releases pending on failure (prevents double-action); lease owner-token compare-and-delete (prevents third-execution race on slow worker). |
README.md:67:| Dry-run rule tester (mod menu "Test rules on this item" → form → toast) | **Production** | Stephen's Step 3.6 — non-contract `dryRunActivity` sibling. Mod right-clicks any post/comment, gets eval trace + would-have-called list, zero Reddit side-effects. |
README.md:68:| URL-dedupe repost rule (`cm:{sub}:repost:url:{hash}`, 30d TTL) | **Production** | Vinh's Phase 2.5.1 (promoted from Phase 4). FNV-1a hash, race-safe `SET NX` (Codex hardened), fail-OPEN on Redis outage. |
README.md:69:| Config UX — wiki loader cron + reload-config menu + onAppInstall default-config seed + onAppUpgrade migrations | **Production** | Vinh's Phase 3 — `loadFromWiki()` cron polls every 5 min, no-op on unchanged wiki revisionId, atomic config publish via rev pointer. |
README.md:74:| Phase 4 stretch rules (`history`, `attribution`, `recentActivity`) | **Pending** | Vinh's queue. May ship pre-deadline or defer post-hackathon depending on capacity. |
README.md:78:162 tests green (Vinh Phase 1+2+3 + Stephen 3.6 + Codex regression suite); `tsc --build` clean.
README.md:80:See [implementation plan](./docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md) + [`PLAN.md`](./PLAN.md) team-coordination doc for full per-phase scope.
README.md:217:**Concept model** (ported faithfully from the original ContextMod):
README.md:226:The canonical AJV schema lands at `src/server/schema/app.schema.json` in Phase 1 (Vinh's lane, finishing Day 5-8). Until then, the original [context-mod docs](https://github.com/FoxxMD/context-mod/tree/master/docs/subreddit-configuration) are the reference — concepts identical, surface trimmed per [migration guide](#migration-guide-for-existing-contextmod-operators).
README.md:240:This is one of the two reasons the port uses an immutable-revision + atomic-pointer pattern (the other reason is mid-event consistency — `handleActivity` reads the pointer once at event start so the whole pipeline runs against a single revision snapshot, even if a concurrent reload fires).
README.md:259:**Best-of-both posture:** ContextMod-Devvit doesn't replace AutoMod — both coexist on the same sub. AutoMod handles the fast regex pass; ContextMod handles the *context* part (history, composition, audit trail). Mods of [r/mealtimevideos](https://reddit.com/r/mealtimevideos) (60K weekly visitors) and [r/piercing](https://reddit.com/r/piercing) (600K visitors) already run upstream CM alongside AutoMod for exactly this reason.
README.md:265:- **Devvit port:** Stephen Sookra ([github.com/StephenSook](https://github.com/StephenSook)) — MIT License.
README.md:292:**What's ported (rule engine + dashboard ship in v0.1.0):**
README.md:294:The concept model, schema validation, config publish pipeline, idempotency primitives, and Observatory dashboard all ship. Live trigger wiring (`handleActivity` → rule pipeline → mod action) is the Phase 1+2 integration step Vinh is finishing through Day 5-8.
README.md:297:- ✅ Filters: `authorIs` / `itemIs` with the canonical criteria set (name, age, karma, flair, isMod, isContributor, verified, shadowBanned, removed, approved, locked, score, age, title, isSelf, over18, depth, op) — typed + scaffolded
README.md:298:- ✅ Rules: `regex` (with multi-field `testOn` + threshold), `author`, `ruleSet` (AND/OR composition) — types ship; live evaluation lands Phase 1
README.md:299:- ✅ Actions: `remove`, `approve`, `lock`, `comment`, `report`, `ban`, `userFlair` — types + Mustache templating ship; handler wiring lands Phase 2
README.md:300:- ✅ Named rules + composition by name reference — types ship; resolver lands Phase 1
README.md:302:- ✅ Per-action idempotency primitives (`cm:proc` 24h + `cm:action:pending` 5m + `cm:action:done` 7d) — `src/lib/idem.ts` shipped
README.md:305:**What's deferred (Phase 4 stretch, not yet shipped):**
README.md:313:- **Observatory dashboard.** Inline custom post showing mod-action telemetry (last 50 events + 24h sparkline + stat cards). Currently renders with `?demo=1` synthetic data; live wiring lands at Phase 3 after Vinh's Phase 1+2 backend ships.
README.md:316:**The grandfather case:** if you're FoxxMD or running CM in production with subscribers depending on it, [open an issue](https://github.com/StephenSook/context-mod-devvit/issues) — we'd love to talk about a graceful cutover.
README.md:343:This is hackathon-era MVP code with the trigger pipeline still being wired (Phase 1+2). Stable enough for a private test sub, not yet recommended for high-volume production. Watch the [App Versions page](https://developers.reddit.com/apps/cm-devvit/app-versions) for the v1.0 release.
README.md:350:- **P1** — Core engine (`handleActivity`, `runRule`, etc.) — Vinh, Day 5-8
README.md:351:- **P2** — Action handlers + trigger routes — Vinh, Day 5-8
README.md:352:- **P3** — Dashboard wire-up to live data — Stephen, Day 9-11
README.md:354:- **P5** — Demo + Devpost submission — Stephen, Day 13-15
README.md:355:- **P6** — Post-hackathon ship + open to upstream operators
README.md:384:- BigInt FNV-1a for action keys (canonical test vectors verified)

 exited 2 in 216ms:
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:497: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:516: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:518: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:534: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:536: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:563: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:565: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:569: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:572: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:575: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:584: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:587: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:590: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:599: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:602: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:605: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:618: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:621: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:624: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:627: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:640: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:643: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:646: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:658: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:661: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:664: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:678: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:681: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:684: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:694: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:697: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:700: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:711: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:713: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:715: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:719: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:722: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:725: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:739: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:742: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:745: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:748: trailing whitespace.
+ 
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:904: trailing whitespace.
+    21	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:914: trailing whitespace.
+    31	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:933: trailing whitespace.
+    50	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:941: trailing whitespace.
+    58	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:947: trailing whitespace.
+    64	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:990: trailing whitespace.
+    17	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:994: trailing whitespace.
+    21	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:999: trailing whitespace.
+    26	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1011: trailing whitespace.
+    38	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1049: trailing whitespace.
+    17	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1052: trailing whitespace.
+    20	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1057: trailing whitespace.
+    25	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1080: trailing whitespace.
+    48	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1124: trailing whitespace.
+    92	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1138: trailing whitespace.
+   106	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1150: trailing whitespace.
+   118	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1158: trailing whitespace.
+   126	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1191: trailing whitespace.
+   159	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1199: trailing whitespace.
+   167	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1226: trailing whitespace.
+    17	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1228: trailing whitespace.
+    19	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1235: trailing whitespace.
+    26	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1240: trailing whitespace.
+    31	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1243: trailing whitespace.
+    34	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1247: trailing whitespace.
+    38	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1250: trailing whitespace.
+    41	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1253: trailing whitespace.
+    44	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1256: trailing whitespace.
+    47	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1261: trailing whitespace.
+    52	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1280: trailing whitespace.
+    10	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1285: trailing whitespace.
+    15	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1314: trailing whitespace.
+    12	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1317: trailing whitespace.
+    15	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1321: trailing whitespace.
+    19	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1329: trailing whitespace.
+    27	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1333: trailing whitespace.
+    31	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1364: trailing whitespace.
+     4	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1399: trailing whitespace.
+    39	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1408: trailing whitespace.
+    48	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1416: trailing whitespace.
+    56	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1421: trailing whitespace.
+    61	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1425: trailing whitespace.
+    65	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1429: trailing whitespace.
+    69	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1446: trailing whitespace.
+    86	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1454: trailing whitespace.
+    94	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1458: trailing whitespace.
+    98	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1572: trailing whitespace.
+    18	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1575: trailing whitespace.
+    21	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1586: trailing whitespace.
+    32	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1611: trailing whitespace.
+     2	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1618: trailing whitespace.
+     9	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1621: trailing whitespace.
+    12	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1623: trailing whitespace.
+    14	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1626: trailing whitespace.
+    17	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1643: trailing whitespace.
+    34	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1651: trailing whitespace.
+    42	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1662: trailing whitespace.
+    53	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1672: trailing whitespace.
+    63	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1683: trailing whitespace.
+    74	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1686: trailing whitespace.
+    77	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1699: trailing whitespace.
+    90	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1714: trailing whitespace.
+   105	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1728: trailing whitespace.
+   119	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1743: trailing whitespace.
+   134	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1783: trailing whitespace.
+    20	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1789: trailing whitespace.
+    26	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1797: trailing whitespace.
+    34	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1801: trailing whitespace.
+    38	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1813: trailing whitespace.
+    50	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1838: trailing whitespace.
+    13	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1842: trailing whitespace.
+    17	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1865: trailing whitespace.
+    40	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1878: trailing whitespace.
+    53	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1882: trailing whitespace.
+    57	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1898: trailing whitespace.
+    73	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1905: trailing whitespace.
+    80	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1909: trailing whitespace.
+    84	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1920: trailing whitespace.
+    95	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1952: trailing whitespace.
+   127	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1956: trailing whitespace.
+   131	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1963: trailing whitespace.
+   138	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:1994: trailing whitespace.
+   169	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2012: trailing whitespace.
+   187	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2050: trailing whitespace.
+   225	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2090: trailing whitespace.
+     2	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2129: trailing whitespace.
+    22	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2137: trailing whitespace.
+    30	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2139: trailing whitespace.
+    32	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2144: trailing whitespace.
+    37	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2149: trailing whitespace.
+    42	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2161: trailing whitespace.
+    54	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2170: trailing whitespace.
+    63	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2172: trailing whitespace.
+    65	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2180: trailing whitespace.
+    73	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2187: trailing whitespace.
+    80	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2190: trailing whitespace.
+    83	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2202: trailing whitespace.
+    95	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2207: trailing whitespace.
+   100	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2209: trailing whitespace.
+   102	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2215: trailing whitespace.
+   108	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2220: trailing whitespace.
+   113	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2238: trailing whitespace.
+    12	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2244: trailing whitespace.
+    18	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2260: trailing whitespace.
+     6	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2264: trailing whitespace.
+    10	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2301: trailing whitespace.
+    12	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2304: trailing whitespace.
+    15	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2306: trailing whitespace.
+    17	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2310: trailing whitespace.
+    21	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2316: trailing whitespace.
+    27	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2349: trailing whitespace.
+    60	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2362: trailing whitespace.
+     3	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2373: trailing whitespace.
+     3	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2421: trailing whitespace.
+    23	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2425: trailing whitespace.
+    27	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2428: trailing whitespace.
+    30	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2438: trailing whitespace.
+    40	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2729: trailing whitespace.
+    10	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2733: trailing whitespace.
+    14	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2752: trailing whitespace.
+    33	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2765: trailing whitespace.
+    46	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2769: trailing whitespace.
+    50	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2786: trailing whitespace.
+    67	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2802: trailing whitespace.
+    83	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2807: trailing whitespace.
+    88	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2811: trailing whitespace.
+    92	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2813: trailing whitespace.
+    94	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2821: trailing whitespace.
+   102	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2827: trailing whitespace.
+   108	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2834: trailing whitespace.
+   115	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2839: trailing whitespace.
+   120	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2852: trailing whitespace.
+   133	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2854: trailing whitespace.
+   135	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2876: trailing whitespace.
+   157	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2885: trailing whitespace.
+   166	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2888: trailing whitespace.
+   169	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2898: trailing whitespace.
+   179	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2903: trailing whitespace.
+   184	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2912: trailing whitespace.
+   193	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2916: trailing whitespace.
+   197	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2920: trailing whitespace.
+   201	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2926: trailing whitespace.
+   207	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2934: trailing whitespace.
+   215	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2940: trailing whitespace.
+   221	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2959: trailing whitespace.
+     2	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2968: trailing whitespace.
+    11	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2971: trailing whitespace.
+    14	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2974: trailing whitespace.
+    17	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2976: trailing whitespace.
+    19	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2985: trailing whitespace.
+    28	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:2997: trailing whitespace.
+    40	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3002: trailing whitespace.
+    45	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3016: trailing whitespace.
+     5	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3018: trailing whitespace.
+     7	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3023: trailing whitespace.
+    12	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3033: trailing whitespace.
+    22	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3039: trailing whitespace.
+    28	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3042: trailing whitespace.
+    31	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3055: trailing whitespace.
+    44	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3057: trailing whitespace.
+    46	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3064: trailing whitespace.
+    53	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3071: trailing whitespace.
+    60	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3073: trailing whitespace.
+    62	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3079: trailing whitespace.
+    68	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3084: trailing whitespace.
+    73	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3086: trailing whitespace.
+    75	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3091: trailing whitespace.
+    80	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3095: trailing whitespace.
+    84	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3098: trailing whitespace.
+    87	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3103: trailing whitespace.
+    92	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3107: trailing whitespace.
+    96	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3109: trailing whitespace.
+    98	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3116: trailing whitespace.
+   105	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3121: trailing whitespace.
+   110	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3126: trailing whitespace.
+   115	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3130: trailing whitespace.
+   119	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3134: trailing whitespace.
+   123	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3160: trailing whitespace.
+    12	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3167: trailing whitespace.
+    19	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3169: trailing whitespace.
+    21	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3173: trailing whitespace.
+    25	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3176: trailing whitespace.
+    28	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3203: trailing whitespace.
+    12	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3205: trailing whitespace.
+    14	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3220: trailing whitespace.
+    29	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3251: trailing whitespace.
+     3	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3267: trailing whitespace.
+    19	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3305: trailing whitespace.
+     6	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3313: trailing whitespace.
+    14	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3320: trailing whitespace.
+    21	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3338: trailing whitespace.
+    39	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3355: trailing whitespace.
+    56	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3369: trailing whitespace.
+    10	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3373: trailing whitespace.
+    14	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3388: trailing whitespace.
+     3	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3396: trailing whitespace.
+     5	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3399: trailing whitespace.
+     8	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3417: trailing whitespace.
+     4	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3424: trailing whitespace.
+    11	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3429: trailing whitespace.
+    16	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3433: trailing whitespace.
+    20	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3438: trailing whitespace.
+    25	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3442: trailing whitespace.
+    29	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3448: trailing whitespace.
+    35	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3460: trailing whitespace.
+     8	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3462: trailing whitespace.
+    10	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3465: trailing whitespace.
+    13	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3472: trailing whitespace.
+    20	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3475: trailing whitespace.
+    23	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3481: trailing whitespace.
+    29	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3483: trailing whitespace.
+    31	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3489: trailing whitespace.
+    37	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3500: trailing whitespace.
+    48	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3506: trailing whitespace.
+    54	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3515: trailing whitespace.
+    63	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3526: trailing whitespace.
+    74	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3533: trailing whitespace.
+    81	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3539: trailing whitespace.
+    87	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3556: trailing whitespace.
+     7	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3558: trailing whitespace.
+     9	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3566: trailing whitespace.
+    17	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3570: trailing whitespace.
+    21	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3574: trailing whitespace.
+    25	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3584: trailing whitespace.
+    35	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3591: trailing whitespace.
+    42	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3594: trailing whitespace.
+    45	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3604: trailing whitespace.
+    55	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3616: trailing whitespace.
+    67	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3626: trailing whitespace.
+    77	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3634: trailing whitespace.
+    85	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3637: trailing whitespace.
+    88	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3639: trailing whitespace.
+    90	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3650: trailing whitespace.
+   101	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3654: trailing whitespace.
+   105	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3656: trailing whitespace.
+   107	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3660: trailing whitespace.
+   111	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3676: trailing whitespace.
+   127	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3678: trailing whitespace.
+   129	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3682: trailing whitespace.
+   133	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3687: trailing whitespace.
+   138	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3711: trailing whitespace.
+   162	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3713: trailing whitespace.
+   164	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3717: trailing whitespace.
+   168	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3720: trailing whitespace.
+   171	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3722: trailing whitespace.
+   173	
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3734: trailing whitespace.
+**src/core/runAction.ts:75, src/lib/idem.ts:96**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3735: trailing whitespace.
+`runAction` reports `{status:'ok'}` after `commitAction`, but `commitAction` swallows Redis write failures after the Reddit side effect has already happened. If `reddit.remove/ban/comment` succeeds and the `done` marker write fails, the pending lease expires and the next retry can execute the same moderator action again. Suggested fix: make `commitAction` return/throw on failure, record a distinct “side-effect succeeded but idempotency commit failed” result, and never release the pending marker in that path. Also alert loudly because the system is now in unknown idempotency state.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3746: trailing whitespace.
+**src/lib/idem.ts:68, src/lib/idem.ts:111**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3747: trailing whitespace.
+The pending lease has no owner token, and `releaseAction` blindly deletes the pending key. If the first worker runs longer than the 5-minute TTL, a second worker can reserve the same action; if the first then fails, its `releaseAction` can delete the second worker’s valid lease. That reopens the gate for a third execution. Suggested fix: store a random token in `actionPending`, return it from `reserveAction`, and require `commitAction/releaseAction` to compare the token before deleting.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3752: trailing whitespace.
+**src/core/runAction.ts:54, tests/core/runAction.test.ts:124**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3753: trailing whitespace.
+Global dry-run can be bypassed by setting an individual action to `dryRun: false`. The test name says “per-action only overrides UPWARD to dry-run,” but the assertion expects a live Reddit call under `config.dryRun=true`. That is exactly the kind of safety gate slip this flag is supposed to prevent. Suggested fix: make global dry-run authoritative:  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3759: trailing whitespace.
+**src/state/configStore.ts:31**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3760: trailing whitespace.
+`publish()` is a read-modify-write with no lock or CAS. Two concurrent publishers can both read rev `N`, both write `cfg:rev:N+1`, and whichever writes last silently overwrites the other while both callers return the same revision. Suggested fix: wrap publish in `acquireLock('config-publish', sub)` or use a Redis atomic increment key for revisions, then write `cfg:rev:{next}` and flip the pointer.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3763: trailing whitespace.
+**src/routes/triggers.ts:76, src/core/handleActivity.ts:32**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3764: trailing whitespace.
+The advertised read-once config invariant is not true. The trigger reads config once for normalization, then `handleActivity` reads config again for rule/action execution. A publish between those two reads can normalize author enrichment against rev A and execute rules/actions from rev B. Suggested fix: pass the already-read `ConfigSnapshot` into `handleActivity` and remove its internal config read for trigger-driven calls.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3767: trailing whitespace.
+**src/core/template.ts:20, src/actions/comment.ts:17**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3768: trailing whitespace.
+The Mustache context exposes both raw fields (`author.name`, `item.title`, `item.body`) and safe fields, while the schema accepts arbitrary templates. A config author only has to use `{{item.title}}` once to re-enable ping/link/blockquote injection. Suggested fix: either make `Mustache.escape = escapeMarkdown` for normal `{{...}}`, or expose only safe values in the comment template context and require triple-stash for explicitly raw moderator-authored fields.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3771: trailing whitespace.
+**src/rules/regex.ts:11, src/core/filters.ts:51**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3772: trailing whitespace.
+User-provided regexes run directly with JavaScript `RegExp.test`. Catastrophic backtracking patterns can block the Devvit worker, and filter regexes are worse because invalid patterns throw at runtime instead of returning a non-match like `runRegexRule` does. Suggested fix: validate regexes at config parse time, reject known unsafe patterns or use a safe regex engine/package, and catch filter regex construction errors consistently.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3775: trailing whitespace.
+**src/core/config.ts:40, src/core/namedRules.ts:38**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3776: trailing whitespace.
+AJV validation can pass and `parseConfig` can still throw during named-rule expansion for an unknown reference. That breaks the `ParseResult` contract and can turn a bad config into a server error instead of a structured validation failure. Suggested fix: wrap `expandNamedRules` and return `{ok:false}` with a config error.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3779: trailing whitespace.
+**src/rules/repost.ts:42**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3780: trailing whitespace.
+The repost rule uses `GET` then `SET`, so simultaneous submissions of the same URL can both miss and both be accepted. The comment acknowledges the race, but this is the core correctness property of the rule. Suggested fix: use `SET key item.id NX` with expiration; if Redis returns non-OK, treat it as a repost and refresh TTL if needed.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3785: trailing whitespace.
+**src/rules/repost.ts:37**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3786: trailing whitespace.
+Repost fingerprinting hashes the raw URL. `https://example.com`, `https://example.com/`, case changes in host, tracking query params, and fragments all become different fingerprints, so common repost variants evade detection. Suggested fix: canonicalize URL before hashing: lowercase host, strip fragments, normalize trailing slash, and optionally drop configured tracking params.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3789: trailing whitespace.
+**src/shared/normalize.ts:74**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3790: trailing whitespace.
+`ageSeconds` treats every numeric `createdAt` as milliseconds. If Devvit ever supplies epoch seconds for a V2 payload, age becomes wildly inflated and age-based rules misfire. Suggested fix: detect seconds-vs-ms by magnitude or normalize from `Date` objects explicitly.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3793: trailing whitespace.
+**src/core/handleActivity.ts:48, src/state/recentEvents.ts:30**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3794: trailing whitespace.
+Recent events collapse `dry-run`, `skipped-locked`, and `error` into `{ok:false}`. The dashboard/API will not be able to tell “safely planned” from “failed” from “idempotency locked,” which hides production-only idempotency failures. Suggested fix: store the exact `ActionResult.status` and `wouldHaveCalled` in `RecentEvent.actions`.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3797: trailing whitespace.
+**src/actions/comment.ts:28**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3798: trailing whitespace.
+Comment text is unbounded. The plan mentions a 10K cap, but the action submits whatever Mustache renders, so a long title/body or template can exceed Reddit limits and turn an otherwise successful moderation run into an action error. Suggested fix: truncate rendered comments before `submitComment`, preferably with a visible suffix.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3801: trailing whitespace.
+**src/state/keys.ts:22**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3802: trailing whitespace.
+Redis key segments are interpolated raw. Today subreddit names and thing IDs are probably safe, but `task`, future install IDs, or user-derived names containing `:` can create ambiguous key layouts and break tenant segmentation assumptions. Suggested fix: centralize segment encoding in `K.*`, e.g. `encodeURIComponent` or base64url per segment.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3807: trailing whitespace.
+**src/schema/app.schema.json:15, src/core/runCheck.ts:15**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3808: trailing whitespace.
+The schema allows empty `runs`, empty `checks`, and empty `rules`, which all silently no-op. Some of this is intentional at runtime, but config validation should probably reject accidental empty production configs. Suggested fix: add `minItems: 1` where production configs require active moderation.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3811: trailing whitespace.
+**tests/shared/normalize.test.ts:26**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3812: trailing whitespace.
+Several normalize tests assert “not undefined” rather than exact shape and coercion behavior. They would not catch missing `over18`, wrong `createdAt` units, absent comment parent/depth/op data, or unexpected malformed payloads. Suggested fix: assert full normalized `Item`/`Author` objects for representative PostV2 and CommentV2 payloads.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3815: trailing whitespace.
+**tests/state/configStore.test.ts:29**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3816: trailing whitespace.
+The configStore test says “mid-publish reader sees old rev” but only verifies sequential rev bumping. It does not simulate two publishers interleaving or a pointer read between rev write and pointer write. Suggested fix: use deferred Redis mock promises to force the interleavings.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3824: trailing whitespace.
+**src/core/runAction.ts:75, src/lib/idem.ts:96**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3825: trailing whitespace.
+`runAction` reports `{status:'ok'}` after `commitAction`, but `commitAction` swallows Redis write failures after the Reddit side effect has already happened. If `reddit.remove/ban/comment` succeeds and the `done` marker write fails, the pending lease expires and the next retry can execute the same moderator action again. Suggested fix: make `commitAction` return/throw on failure, record a distinct “side-effect succeeded but idempotency commit failed” result, and never release the pending marker in that path. Also alert loudly because the system is now in unknown idempotency state.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3836: trailing whitespace.
+**src/lib/idem.ts:68, src/lib/idem.ts:111**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3837: trailing whitespace.
+The pending lease has no owner token, and `releaseAction` blindly deletes the pending key. If the first worker runs longer than the 5-minute TTL, a second worker can reserve the same action; if the first then fails, its `releaseAction` can delete the second worker’s valid lease. That reopens the gate for a third execution. Suggested fix: store a random token in `actionPending`, return it from `reserveAction`, and require `commitAction/releaseAction` to compare the token before deleting.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3842: trailing whitespace.
+**src/core/runAction.ts:54, tests/core/runAction.test.ts:124**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3843: trailing whitespace.
+Global dry-run can be bypassed by setting an individual action to `dryRun: false`. The test name says “per-action only overrides UPWARD to dry-run,” but the assertion expects a live Reddit call under `config.dryRun=true`. That is exactly the kind of safety gate slip this flag is supposed to prevent. Suggested fix: make global dry-run authoritative:  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3849: trailing whitespace.
+**src/state/configStore.ts:31**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3850: trailing whitespace.
+`publish()` is a read-modify-write with no lock or CAS. Two concurrent publishers can both read rev `N`, both write `cfg:rev:N+1`, and whichever writes last silently overwrites the other while both callers return the same revision. Suggested fix: wrap publish in `acquireLock('config-publish', sub)` or use a Redis atomic increment key for revisions, then write `cfg:rev:{next}` and flip the pointer.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3853: trailing whitespace.
+**src/routes/triggers.ts:76, src/core/handleActivity.ts:32**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3854: trailing whitespace.
+The advertised read-once config invariant is not true. The trigger reads config once for normalization, then `handleActivity` reads config again for rule/action execution. A publish between those two reads can normalize author enrichment against rev A and execute rules/actions from rev B. Suggested fix: pass the already-read `ConfigSnapshot` into `handleActivity` and remove its internal config read for trigger-driven calls.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3857: trailing whitespace.
+**src/core/template.ts:20, src/actions/comment.ts:17**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3858: trailing whitespace.
+The Mustache context exposes both raw fields (`author.name`, `item.title`, `item.body`) and safe fields, while the schema accepts arbitrary templates. A config author only has to use `{{item.title}}` once to re-enable ping/link/blockquote injection. Suggested fix: either make `Mustache.escape = escapeMarkdown` for normal `{{...}}`, or expose only safe values in the comment template context and require triple-stash for explicitly raw moderator-authored fields.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3861: trailing whitespace.
+**src/rules/regex.ts:11, src/core/filters.ts:51**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3862: trailing whitespace.
+User-provided regexes run directly with JavaScript `RegExp.test`. Catastrophic backtracking patterns can block the Devvit worker, and filter regexes are worse because invalid patterns throw at runtime instead of returning a non-match like `runRegexRule` does. Suggested fix: validate regexes at config parse time, reject known unsafe patterns or use a safe regex engine/package, and catch filter regex construction errors consistently.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3865: trailing whitespace.
+**src/core/config.ts:40, src/core/namedRules.ts:38**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3866: trailing whitespace.
+AJV validation can pass and `parseConfig` can still throw during named-rule expansion for an unknown reference. That breaks the `ParseResult` contract and can turn a bad config into a server error instead of a structured validation failure. Suggested fix: wrap `expandNamedRules` and return `{ok:false}` with a config error.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3869: trailing whitespace.
+**src/rules/repost.ts:42**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3870: trailing whitespace.
+The repost rule uses `GET` then `SET`, so simultaneous submissions of the same URL can both miss and both be accepted. The comment acknowledges the race, but this is the core correctness property of the rule. Suggested fix: use `SET key item.id NX` with expiration; if Redis returns non-OK, treat it as a repost and refresh TTL if needed.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3875: trailing whitespace.
+**src/rules/repost.ts:37**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3876: trailing whitespace.
+Repost fingerprinting hashes the raw URL. `https://example.com`, `https://example.com/`, case changes in host, tracking query params, and fragments all become different fingerprints, so common repost variants evade detection. Suggested fix: canonicalize URL before hashing: lowercase host, strip fragments, normalize trailing slash, and optionally drop configured tracking params.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3879: trailing whitespace.
+**src/shared/normalize.ts:74**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3880: trailing whitespace.
+`ageSeconds` treats every numeric `createdAt` as milliseconds. If Devvit ever supplies epoch seconds for a V2 payload, age becomes wildly inflated and age-based rules misfire. Suggested fix: detect seconds-vs-ms by magnitude or normalize from `Date` objects explicitly.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3883: trailing whitespace.
+**src/core/handleActivity.ts:48, src/state/recentEvents.ts:30**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3884: trailing whitespace.
+Recent events collapse `dry-run`, `skipped-locked`, and `error` into `{ok:false}`. The dashboard/API will not be able to tell “safely planned” from “failed” from “idempotency locked,” which hides production-only idempotency failures. Suggested fix: store the exact `ActionResult.status` and `wouldHaveCalled` in `RecentEvent.actions`.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3887: trailing whitespace.
+**src/actions/comment.ts:28**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3888: trailing whitespace.
+Comment text is unbounded. The plan mentions a 10K cap, but the action submits whatever Mustache renders, so a long title/body or template can exceed Reddit limits and turn an otherwise successful moderation run into an action error. Suggested fix: truncate rendered comments before `submitComment`, preferably with a visible suffix.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3891: trailing whitespace.
+**src/state/keys.ts:22**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3892: trailing whitespace.
+Redis key segments are interpolated raw. Today subreddit names and thing IDs are probably safe, but `task`, future install IDs, or user-derived names containing `:` can create ambiguous key layouts and break tenant segmentation assumptions. Suggested fix: centralize segment encoding in `K.*`, e.g. `encodeURIComponent` or base64url per segment.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3897: trailing whitespace.
+**src/schema/app.schema.json:15, src/core/runCheck.ts:15**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3898: trailing whitespace.
+The schema allows empty `runs`, empty `checks`, and empty `rules`, which all silently no-op. Some of this is intentional at runtime, but config validation should probably reject accidental empty production configs. Suggested fix: add `minItems: 1` where production configs require active moderation.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3901: trailing whitespace.
+**tests/shared/normalize.test.ts:26**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3902: trailing whitespace.
+Several normalize tests assert “not undefined” rather than exact shape and coercion behavior. They would not catch missing `over18`, wrong `createdAt` units, absent comment parent/depth/op data, or unexpected malformed payloads. Suggested fix: assert full normalized `Item`/`Author` objects for representative PostV2 and CommentV2 payloads.  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3905: trailing whitespace.
+**tests/state/configStore.test.ts:29**  
docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:3906: trailing whitespace.
+The configStore test says “mid-publish reader sees old rev” but only verifies sequential rev bumping. It does not simulate two publishers interleaving or a pointer read between rev write and pointer write. Suggested fix: use deferred Redis mock promises to force the interleavings.  

 succeeded in 547ms:
COMMIT 6694109 feat(phase-1): ContextMod rule engine — 11 steps, 93 tests green

src/core/config.ts
src/core/filters.ts
src/core/namedRules.ts
src/core/runCheck.ts
src/core/runRule.ts
src/core/runRun.ts
src/core/template.ts
src/lib/idem.ts
src/rules/author.ts
src/rules/regex.ts
src/rules/ruleset.ts
src/schema/app.schema.json
src/shared/normalize.ts
src/shared/types.ts
src/state/configStore.ts
src/state/keys.ts
tests/core/config.test.ts
tests/core/filters.test.ts
tests/core/namedRules.test.ts
tests/core/runCheck.test.ts
tests/core/runRun.test.ts
tests/core/template.test.ts
tests/rules/author.test.ts
tests/rules/regex.test.ts
tests/rules/ruleset.test.ts
tests/shared/normalize.test.ts
tests/state/configStore.test.ts
tests/state/keys.test.ts
tsconfig.json
COMMIT 9532cf4 feat(phase-2): ContextMod actions + handleActivity — 6 steps, 137 tests green, verified live

eslint.config.js
src/actions/approve.ts
src/actions/ban.ts
src/actions/comment.ts
src/actions/lock.ts
src/actions/remove.ts
src/actions/report.ts
src/actions/userFlair.ts
src/core/handleActivity.ts
src/core/runAction.ts
src/core/runCheck.ts
src/core/runRule.ts
src/core/runRun.ts
src/routes/menu.ts
src/routes/triggers.ts
src/rules/repost.ts
src/rules/ruleset.ts
src/schema/app.schema.json
src/shared/types.ts
src/state/recentEvents.ts
tests/actions/actions.test.ts
tests/core/handleActivity.test.ts
tests/core/runAction.test.ts
tests/core/template.test.ts
tests/rules/repost.test.ts
tests/state/recentEvents.test.ts
COMMIT 983c949 feat(phase-3): config UX + live dashboard data — 6 steps, 147 tests green, verified live

eslint.config.js
src/config/default-config.ts
src/core/configSource.ts
src/routes/api.ts
src/routes/menu.ts
src/routes/scheduler.ts
src/routes/triggers.ts
src/state/migrations.ts
src/state/recentEvents.ts
tests/config/default-config.test.ts
tests/core/configSource.test.ts
tests/state/recentEvents.test.ts
COMMIT 274aef6 fix(dry-run): global config.dryRun is authoritative — close per-action bypass

src/core/runAction.ts
tests/core/runAction.test.ts
COMMIT 8f6d608 fix(repost): SET NX atomic — race-eliminate concurrent same-URL dedupe

src/rules/repost.ts
tests/rules/repost.test.ts
COMMIT dafe050 fix(idem): commitAction retries done-write 3x + never releases pending on failure

src/core/runAction.ts
src/lib/idem.ts
tests/lib/idem-commit.test.ts
COMMIT fc3851a fix(idem): lease owner token — close third-execution race on slow-worker timeout

src/core/runAction.ts
src/lib/idem.ts
tests/core/runAction.test.ts
tests/lib/idem-commit.test.ts
COMMIT 5930074 feat(dry-run): src/core/dryRunActivity.ts — non-contract pipeline for Step 3.6

src/core/dryRunActivity.ts
tests/core/dryRunActivity.test.ts
COMMIT 6feed7c feat(menu): wire /test-rules → showForm w/ thingId pre-filled (Step 3.6 — half 1)

src/routes/menu.ts
tests/routes/menu-test-rules.test.ts
COMMIT 50bda17 feat(forms): wire /test-rules-submit → dryRunActivity → toast bullets (Step 3.6 complete)

src/routes/forms.ts
tests/routes/forms-test-rules.test.ts
COMMIT 778b60a fix(dry-run): exactOptionalPropertyTypes guard on wouldHaveCalled spread

src/core/dryRunActivity.ts
COMMIT 3f8c9f4 test(menu): loosen toast regex to match actual phrasing

tests/routes/menu-test-rules.test.ts
COMMIT 6505e2d docs(readme): refresh Status table — Phase 1+2+3 shipped + Codex hotfixes baked in

README.md
COMMIT 075a927 docs(submission): e2e scenarios A–H draft (Step 5.3)

docs/submission/e2e-scenarios.md
COMMIT d6972c7 docs(submission): writeup Phase 1+2+3 build journal — first-person per D10

docs/submission/writeup-draft.md
COMMIT d19e063 docs(submission): demo video script Beats 3+4 — live data path canonical, dry-run promoted

docs/submission/demo-video-script.md
COMMIT dfc1b80 docs(plans): save Stephen burndown plan after Vinh Phase 1+2 ship

docs/superpowers/plans/2026-05-16-stephen-burndown-after-vinh-ship.md
COMMIT a227d68 status: 3.5 ✅ dashboard custom post — Wave A–F shipped

PLAN.md
COMMIT 9923622 status: 3.6 ✅ dry-run rule tester — menu + form + dryRunActivity sibling shipped

PLAN.md

exec
/bin/zsh -lc "nl -ba README.md | sed -n '1,90p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "nl -ba README.md | sed -n '210,360p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "nl -ba docs/submission/writeup-draft.md | sed -n '1,180p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 109ms:
     1	# Devpost Submission Draft — context-mod-devvit
     2	
     3	> **Voice rule (per Codex D10 + Watchful1 lesson):** write in first person, scrappy, sound like a real builder. No "sophisticated ecosystem" / "revolutionary platform" marketing prose. Mention specific bugs you hit, specific cuts you made, specific frustrations. Stephen rewrites every word before submission — this is structural scaffolding, not final copy. <!-- AITONE_IGNORE -->
     4	
     5	---
     6	
     7	## Section 1 — Tool Overview
     8	
     9	> **What Devpost asks:** "Describe in detail the functionality of the bot. Include all capabilities and how moderators and users are intended to use the app."
    10	
    11	**Suggested opener** (Stephen's voice — rewrite):
    12	
    13	> ContextMod is a rule-engine moderation bot. Mods write JSON5 config in their sub's wiki — define what counts as spam, what flairs to require, what posts to remove, what comments to leave, what users to ban. Once Phase 1-3 wiring lands, the bot reads every new post and comment, runs the rules, takes the actions. No central server, no Heroku token, no shared rate limits — Devvit handles all of that. (v0.1.0 ships the rule engine + idempotency primitives + atomic config publish + Observatory dashboard demo mode; live trigger / action / dashboard wiring lands through Day 5-11 per the phase plan below.)
    14	
    15	> **Why now:** Reddit's CEO said on the Q1 2026 earnings call that they're "porting good bots to the developer platform." Reddit's own r/Devvit team is deprecating the older Blocks framework. The $1,000 App Migration Bounty is explicitly scoped to PRAW→Devvit moves — ContextMod is exactly that. FoxxMD's last ContextMod release was November 2022, weeks before Reddit's paid Data API tier launched in July 2023. The bot has been frozen at the pre-blackout boundary ever since, with 15+ operators stuck running it on dying infrastructure. This port unblocks all of them on the platform Reddit is actively recommending.
    16	
    17	> **What mods actually want:** The top-upvoted comment (94 upvotes, u/Aeroncastle) on the May 2026 r/modnews "Mod Monthly" thread is *"I want stronger tools to fight AI, not in person events"* (verified at [r/modnews/comments/1t6jggp](https://www.reddit.com/r/modnews/comments/1t6jggp/), top 6 sampled 2026-05-13). The next three top comments echo the same ask: u/critacle (34 upvotes) — *"Stop the AI bot spam. It's dominating /r/all. This is killing Reddit"*; u/GamingYouTube14 (21) — *"can you guys look into these new ai bots that adapt to the conversation? they're pretty much undetectable by any kind of algorithm"*; u/OMGWTFBBQUE (15) — *"If I have to remove another AI post I'm going to lose my shit. Fucking do something about it."* ContextMod is anti-AI-spam tooling by construction — `regex` catches the generic phrasings AI-generated spam reuses, `author` filters flag new-account / low-karma / no-verified-email patterns AI bot farms produce, `history` (Phase 4) detects cross-sub posting cadence that no human author would maintain. Plus the Observatory dashboard is the "reason-chain audit" r/TrustAndSafety asked for — every action chip surfaces the rule that fired, the activityId, and the context. ContextMod doesn't replace AutoMod (regex-only); it's the moderator's investigation workbench that runs alongside.
    18	
    19	**Capabilities (bullet list):**
    20	
    21	- **3 MVP rule kinds shipped** in v0.1.0: `regex` (multi-field threshold matching), `author` (basic criteria — age, karma, flair, isMod, isContributor, verified, shadowBanned), `ruleSet` (AND/OR composition).
    22	- **7 MVP actions**: `remove`, `approve`, `lock`, `comment`, `report`, `ban`, `userFlair`. All support Mustache templates over `{{item}}`, `{{author}}`, `{{rules.<name>.data}}` context.
    23	- **4 stretch rule kinds** in Phase 4: `history`, `attribution`, `recentActivity`, `repost` (URL + image-hash variants). Upstream `mhs` toxicity classifier was **cut** from the Devvit port after Reddit's `reddit/devvit-docs` PR #96 (2026-05-08) locked the HTTP fetch policy's AI-provider list to OpenAI + Gemini only — `api.moderatehatespeech.com` falls outside that carve-out.
    24	- **Filters** (`authorIs` / `itemIs`) gate Rule/Check/Action execution by author + item attributes. Same criteria set as upstream ContextMod.
    25	- **Flow control**: `postBehavior` per Check (`next` / `nextRun` / `stop` / `goto:<run>.<check>`).
    26	- **Named rules** for DRY composition.
    27	- **Observatory dashboard** (custom-post webview): action-telemetry surface with 24h sparkline, last 50 events with color-coded action chips, stat cards (actions today, mod time saved estimate, active rules, top rule). Ships in v0.1.0 against `?demo=1` synthetic data; live-data wiring lands at Phase 3 once Vinh's `events:recent` ZSET pipeline finishes.
    28	- **Wiki-based config** with 5-min refresh cron + manual reload from mod menu. Atomic publish via revision pointer so handleActivity always reads a consistent snapshot mid-event.
    29	- **Dry-run rule tester** mod menu action — point at any post/comment to see which rules would fire without taking action.
    30	- **Per-effect idempotency**: every action has a 5-min `pending` reservation + 7d `done` marker, so Devvit's at-least-once trigger delivery never double-applies the same mod action.
    31	
    32	**How mods use it:**
    33	
    34	1. Install via the App Directory (`developers.reddit.com/apps/cm-devvit`) → click "Add to community."
    35	2. Write JSON5 rules in `r/<sub>/wiki/contextmod`. Starter config seeded on install.
    36	3. View action telemetry via the Observatory dashboard post (created via mod menu). Renders with `?demo=1` synthetic data until Phase 3 wires live `events:recent` ZSET data.
    37	4. Dry-run rules on specific posts before letting them go live. Reload on every wiki edit (manual or 5-min auto).
    38	
    39	---
    40	
    41	## Section 2 — Project Impact
    42	
    43	> **What Devpost asks:** "List 1-3 communities that you think would find this app useful and how you see moderators/communities benefiting. We're looking for community impact, time savings for moderators, etc."
    44	
    45	### Communities served (real, not hypothetical)
    46	
    47	1. **[r/mealtimevideos](https://reddit.com/r/mealtimevideos)** — 60K weekly visitors. FoxxMD's primary ContextMod instance. Currently running on his self-hosted PRAW infrastructure; this port lets him migrate to per-sub Devvit and stop paying for hosting.
    48	
    49	2. **[r/piercing](https://reddit.com/r/piercing)** — 600K visitors, 12K contributors. Run by SampleOfNone who publicly flagged in r/Devvit Discord that "image parsing is the hard part on Devvit" — this port has perceptual-hash repost detection (Phase 4) specifically targeting that gap.
    50	
    51	3. **The 15+ third-party operators** FoxxMD identified running ContextMod across their own subs (several in the 10K–1M subscriber range, ~150 NSFW subs). Each of them gets the same one-click install path the moment the app is published — no more central server, no more shared rate limits.
    52	
    53	### Time savings — the defensible claim
    54	
    55	> **Don't overclaim.** Per Codex review: "no published 'X hours saved per mod' study exists. Don't invent numbers."
    56	
    57	What CAN be defended (every number citation-traceable in [`pillar-5-numbers.md`](./pillar-5-numbers.md)):
    58	
    59	- **466 hours/day of moderation labor measured across 21,500 active mods in 126 subreddits** — Li, Hecht, Chancellor (ICWSM 2022). At $20/hr median that's $3.4M/yr unpaid in the measured population. Linear-scaled to Reddit's stated 60K active mods: **~$9.5M/yr in volunteer-labor-equivalent value** (flag this as scaling math).
    60	- **73% of mod actions are already performed by bots** — same paper.
    61	- ContextMod adds a **second axis** to the bot stack: AutoMod is regex-only; CM adds context-gathering (author history, sub-distribution, image-hash repost) that today only humans can do.
    62	- **Per-action user-history checks take ~5-10 minutes manually**. If CM-class bots offload 1 incremental hour per mod per week beyond AutoMod's reach, the labor-equivalent value offloaded is **60K × 52 × $20 ≈ $62.4M/yr at full capture** — even 10% capture is $6M+/yr.
    63	
    64	### Sookra Pillar alignment
    65	
    66	- **Pillar 1 — Real problem, named person:** FoxxMD (creator, ContextMod) + SampleOfNone (production operator at r/piercing) both named in conversation. No hypotheticals.
    67	- **Pillar 2 — Structural gap:** Reddit's July 2023 paid Data API tier ($12K+/yr commercial, 100 QPM free) closed the PRAW path. Devvit is the only migration target. CM has 15+ operators stuck on dying infra.
    68	- **Pillar 3 — Human-scale stat:** 466 hr/day mod labor measured; 60K mods scaled; 73% bot-driven; 9–94% of mod work is "invisible" context-gathering — exactly the gap CM fills.
    69	- **Pillar 4 — Tech inevitable:** Reddit's own r/Devvit posts say it: *"deprecating Devvit Blocks renderer"* ([1r3xcm2](https://www.reddit.com/r/Devvit/comments/1r3xcm2/)), *"strongly recommend Devvit Web for all new apps"* ([1pcm13z](https://www.reddit.com/r/Devvit/comments/1pcm13z/)), 80-day countdown to Blocks cutover ([1shophd](https://www.reddit.com/r/Devvit/comments/1shophd/)). The $1K Migration Bounty is *explicitly* scoped to PRAW→Devvit ([1sgwkm7](https://www.reddit.com/r/Devvit/comments/1sgwkm7/)) — ContextMod is the textbook target. ContextMod's release timing seals it: last release v0.13.4 / 2022-11-29, weeks before the API price wall; on 2026-05-12 FoxxMD disabled the upstream CI workflows for PRAW publish/pages — same week he added Stephen + Vinh as collaborators on the Devvit port and shared the project board. The maintainer isn't abandoning the codebase; he's redirecting energy to the port.
    70	- **Pillar 5 — Business case:** Reddit's CEO Steve Huffman on the Q1 2026 earnings call: *"We have what we call good bots on Reddit... we're porting those over to our developer platform."* Reddit Q1 2026: $663M revenue / $311M FCF — Developer Funds is rounding error. Realistic 12-mo direct-cash envelope $19.5K–$25K (Migration Bounty $1K + Hackathon $10K + Install tier cap $3.5K + DQE tier 3–4 ladder $5K–$10.5K). $50K+ stretch if DQE compounds. Discord parallel: Reddit at Year 1 of where Discord's mod-bot economy was at Year 3.
    71	
    72	---
    73	
    74	## Section 3 — Port Completion (Ported track required)
    75	
    76	> **What Devpost asks:** "Describe any differences, improvements, or gaps between your new app and the original bot. Could this app be installed today and serve the original function of the app?"
    77	
    78	### Ported faithfully (rule engine + dashboard ship in v0.1.0)
    79	
    80	The concept model + rule semantics + wiki-config publish pipeline + dashboard all ship. Live-trigger wiring (`handleActivity` → rule pipeline → mod action) is the Phase 1 integration step Vinh is finishing through Day 5-8. What that means concretely:
    81	
    82	- Rule/Check/Action concept model + `postBehavior` flow control + `goto:` jumps — ported
    83	- Filter system (authorIs/itemIs) — ported
    84	- 3 MVP rule kinds + 7 MVP actions — ported as types + handlers; full integration lands Phase 2
    85	- Wiki-based JSON5 config with AJV validation + atomic publish — working
    86	- Named rules + Mustache action templating — working
    87	- Per-effect idempotency (5min pending + 7d done) — improvement over upstream (CM didn't have explicit retry-safety primitives)
    88	- Observatory dashboard — working with `?demo=1` synthetic data; live data wires up at Phase 3
    89	
    90	### Improvements over upstream
    91	
    92	- **Per-subreddit isolation** via Devvit Redis (vs upstream's shared central DB)
    93	- **Observatory dashboard** as a native custom post (upstream has only a self-hosted web UI)
    94	- **One-click install** via App Directory (vs upstream's Docker + reverse-proxy setup)
    95	- **Mod-menu dry-run rule tester** (upstream had no equivalent)
    96	- **No central rate-limit bottleneck** — every install runs against its own per-sub Reddit API quota
    97	
    98	### Gaps vs upstream (deferred to Phase 4)
    99	
   100	- `history`, `attribution`, `recentActivity`, `repost` rules — landing in Phase 4
   101	- Image-hash repost detection — gated on a Day-0 spike (decode + blockhash in pure JS within Devvit's 30s/no-native-deps env)
   102	
   103	### Gaps vs upstream (explicitly cut)
   104	
   105	- `mhs` (ModerateHateSpeech toxicity classifier) — explicitly cut. Reddit's `reddit/devvit-docs` PR #96 (2026-05-08) locked the HTTP fetch policy's AI-provider allowlist to OpenAI + Gemini only; `api.moderatehatespeech.com` falls outside that carve-out. Available in upstream ContextMod's PRAW build; not available in the Devvit port. Documented honestly rather than worked around.
   106	- `RepeatActivityRule`, `SentimentRule`, full `RepostRule` w/ YouTube — explicitly cut. Sentiment needs NLP libs that don't bundle in Devvit; YouTube API exceeds scope.
   107	- `DispatchAction` (defer-and-replay) — cut; not load-bearing for MVP, defer to v2 if operators ask.
   108	- Multi-bot orchestration (CM's "shared streams" pattern) — Devvit's per-sub install model replaces this architecturally.
   109	- Full Express dashboard with Monaco editor — replaced with the lighter Observatory custom post + wiki editing.
   110	
   111	### Can this be installed today and serve the original function?
   112	
   113	**Yes, for the MVP scope.** Subreddits using the original CM primarily for regex-based spam removal, mod-flair gating, author-criteria filtering, and named-rule composition will see feature parity at install. Subs using CM specifically for repost detection will need to wait for Phase 4 (currently in active development). Subs using CM for hate-speech filtering will need to keep running the upstream PRAW build — the Devvit `mhs` port is cut per PR #96.
   114	
   115	### Build journal (first-person per D10 — Stephen to rewrite)
   116	
   117	**2026-05-16 (Day 4): the whole backend shipped in one day.** Vinh got back on board after a quiet stretch and pushed Phase 1 (rule engine, 11 steps, 93 tests), Phase 2 (7 actions + handleActivity orchestrator + URL-dedupe repost promoted from Phase 4, 137 tests), and Phase 3 (config UX + live dashboard data, 147 tests) in three consecutive feature commits within roughly 12 hours. 3,670 line additions across 53 files. No code-review rounds, just one giant atomic ship per phase + a PLAN.md flip after each.
   118	
   119	**Reddit-API surprises Vinh caught in playtest** (and that the plan would have shipped wrong):
   120	- Plan said "ban duration 0 = permanent." Actual Reddit API: 0 days = same-day unban. Permanent = omit the field entirely. `src/actions/ban.ts` now omits when 0/unset.
   121	- Plan said `reddit.getCurrentSubredditName()`. That method doesn't exist in `@devvit/reddit`. It's `(await reddit.getCurrentSubreddit()).name`.
   122	- Plan said `reddit.lock(thingId)`. Actual: lock routes via `getPostById(thingId).lock()` or `getCommentById(thingId).lock()`.
   123	
   124	**Council fixes that survived the v1 plan:**
   125	- `handleActivity` would have shipped `actions: undefined` in every event row (the plan wrote `actions: ...` literal but action results were never aggregated). Caught + fixed pre-ship.
   126	- `ActionContext.config` was non-required in the v1 type — the Phase 2.5 dry-run gate reads `ctx.config.dryRun`; without it, the safety net silently evaluates `undefined → false` and every action goes live. Marked REQUIRED so tsc breaks if anyone drops it.
   127	
   128	**Codex adversarial review pass (same-day, post-Vinh-ship).** 2 CRITICAL + 7 HIGH + 5 MED + 3 LOW. The two CRITICAL were both in the idempotency layer:
   129	1. `commitAction` swallowed Redis errors. If the Reddit side-effect succeeded but the `done` marker write failed, `releaseAction` deleted the `pending` lease and the next retry fired the same mod-action again. Fixed by adding 3x retry w/ backoff + throwing on persistent failure + never releasing pending unless done was actually written.
   130	2. `pending` lease had no owner token. If worker A's 5-min TTL expired and worker B took over, worker A's late `releaseAction` would delete worker B's valid lease, allowing a third execution. Fixed by storing a random token per reservation + compare-and-delete in commit/release.
   131	
   132	Four non-contract hotfixes shipped as separate atomic commits the same session (274aef6 dry-run authority, 8f6d608 repost SET NX, dafe050 commit retries, fc3851a lease token). 162 tests green, tsc clean.
   133	
   134	**Dry-run rule tester (Step 3.6) design choice.** The handleActivity contract was Vinh's; modifying its `void` return type to accept a `dryRun: true` option that returns structured results would have needed a `⚠️ CONTRACT` PR roundtrip per the team coordination protocol. Instead, shipped a sibling `src/core/dryRunActivity.ts` (~30 line duplication) that mirrors the pipeline but forces `dryRun: true` on every action and returns a structured `DryRunResult` for the form UI to render as toast bullets. Non-contract, no coordination needed, ships immediately.
   135	
   136	**What didn't get done:** Phase 0.10 image-decode + blockhash spike never ran, so Phase 4.7 image-hash repost is effectively NO-GO for this hackathon (deferred post-submission). Phase 4.3–4.6 history-based rules are still on Vinh's plate; may or may not ship before the 2026-05-27 deadline depending on capacity.
   137	
   138	---
   139	
   140	## Section 4 — Required submission fields
   141	
   142	- **App link:** `developers.reddit.com/apps/cm-devvit`
   143	- **Repo link:** `github.com/StephenSook/context-mod-devvit`
   144	- **Original bot username:** `u/ContextModBot` (FoxxMD's primary instance — confirmed May 12, 2026 via Discord; transcript in [`outreach-drafts.md`](./outreach-drafts.md) "Resolved already" callout)
   145	- **Reddit username (entrant):** `u/CowSufficient3840` (Stephen Sookra)
   146	- **Demo video:** [insert YouTube unlisted link — see `demo-video-script.md`]
   147	- **Helper nomination:** SampleOfNone (publicly flagged the image-parsing challenge in r/Devvit Discord; informed scope decision)
   148	
   149	---
   150	
   151	## Section 5 — Pre-submission checklist
   152	
   153	- [x] FoxxMD confirms bot username for "Original bot" field (`u/ContextModBot`, confirmed May 12, 2026)
   154	- [x] Written permission documentation captured (Discord transcript in `outreach-drafts.md` + GitHub [issue #152](https://github.com/FoxxMD/context-mod/issues/152))
   155	- [x] Repo flipped to public + GitHub Pages live for privacy/ToS (May 13, 2026)
   156	- [ ] App `--public` flag set + Devvit app review passed (post Phase 1+2)
   157	- [x] `mhs` rule cut per `reddit/devvit-docs` PR #96 (2026-05-08) — documented in Section 3 "Gaps vs upstream (explicitly cut)"
   158	- [ ] Phase 4 image-hash repost detection either shipped OR explicitly downgraded in writeup
   159	- [ ] Demo video recorded + uploaded to YouTube (unlisted) — gated on Phase 1 backend live
   160	- [ ] Stephen rewrites every section of this draft in his own voice
   161	- [ ] Run `./scripts/check-ai-tone.sh --strict` against final pasted text

 succeeded in 116ms:
     1	<img src="assets/icon.png" alt="ContextMod Observatory" width="96" align="right" />
     2	
     3	# context-mod-devvit
     4	
     5	> **A rule-engine moderation co-pilot for Reddit subreddits, running natively on Devvit.**
     6	> Write your moderation rules once in JSON5. The rule engine, idempotency primitives, atomic config publish, and Observatory dashboard (demo mode) ship in v0.1.0. Live trigger evaluation, action handlers, and dashboard live-data wiring land in Phase 1-3 — see "What's ported" below for the per-phase ship state. Mods install ContextMod once, define what counts as spam / what to remove / what to comment / what users to ban, and the bot handles the rest once Phase 1-3 wiring lands.
     7	
     8	[![CI](https://github.com/StephenSook/context-mod-devvit/actions/workflows/ci.yml/badge.svg)](https://github.com/StephenSook/context-mod-devvit/actions/workflows/ci.yml)
     9	[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
    10	[![Devvit](https://img.shields.io/badge/Devvit-Web-FF4500.svg)](https://developers.reddit.com/docs)
    11	[![Hackathon](https://img.shields.io/badge/Reddit-Mod%20Tools%20Hackathon%202026-orange.svg)](https://mod-tools-migration.devpost.com/)
    12	
    13	---
    14	
    15	**Devvit Web port of [ContextMod](https://github.com/FoxxMD/context-mod)** — FoxxMD's flagship moderation bot, originally built on PRAW and now ported to Reddit's first-party developer platform.
    16	
    17	Built for the [Reddit Mod Tools and Migrated Apps Hackathon](https://mod-tools-migration.devpost.com/) (Apr 29 – May 27, 2026). Ported with explicit written permission from FoxxMD via [github.com/FoxxMD/context-mod#152](https://github.com/FoxxMD/context-mod/issues/152).
    18	
    19	**Why a port?** The original ContextMod requires you to host a server, manage API tokens, and trust a centralized instance. Devvit's per-subreddit install model removes all three. Every mod team installs their own instance with one click — no infrastructure, no shared rate limits, no central bottleneck.
    20	
    21	## What it does
    22	
    23	ContextMod evaluates new posts and comments against a flexible, mod-defined rule engine and takes moderation actions when checks trigger. Each rule + action set is defined in a JSON5 config (loaded from your sub's wiki), composable with named rules, filters, and Mustache-templated action messages.
    24	
    25	The Devvit port preserves the rule/check/action concept model that mods of [r/mealtimevideos](https://reddit.com/r/mealtimevideos) (60K weekly visitors), [r/piercing](https://reddit.com/r/piercing) (600K visitors, 12K contributors), and 15+ other communities already know — while solving the central-server bottleneck that capped CM's adoption on the original PRAW infrastructure. With Devvit's per-subreddit install model, every mod team can install their own instance.
    26	
    27	## Quick start (for moderators)
    28	
    29	![3-panel install flow: (1) App Directory page with Add to community button highlighted, (2) Subreddit mod overflow menu listing the three ContextMod entries, (3) Observatory dashboard with stat cards and event stream.](./assets/install-flow.png)
    30	
    31	1. **Install** — Visit [developers.reddit.com/apps/cm-devvit](https://developers.reddit.com/apps/cm-devvit) and click **Add to community**, then pick your subreddit (you must be a mod with `posts` + `wiki` permissions).
    32	2. **Pin the dashboard** — In your sub's mod overflow menu, click **ContextMod: View recent actions**. A custom post appears that shows mod-action telemetry (demo data until Phase 3 wires live events). Stickying it is optional but recommended.
    33	3. **Write your rules** — Create `r/<your-sub>/wiki/contextmod` with JSON5 config. A starter config is seeded on install; the [`examples/`](./examples) directory carries 3 working configs (starter + spam-fresh-account + approve-trusted-mod) you can paste and edit. See [Config schema](#config-schema) for the full surface.
    34	4. **Reload** — In the subreddit mod overflow, click **ContextMod: Reload config from wiki** (or wait 5 minutes — the app polls automatically). The Observatory dashboard shows the rule count + actions taken once Phase 1-3 wiring lands.
    35	5. **Test a rule** — Right-click any post or comment, choose **ContextMod: Test rules on this item**. A dry-run shows which rules would fire without taking action.
    36	
    37	> **No hosting. No tokens. No central bottleneck.** Everything lives inside your subreddit's Devvit installation.
    38	
    39	## Run the dashboard locally (for judges + devs)
    40	
    41	To see the Observatory dashboard without installing the app or having Devvit credentials:
    42	
    43	```bash
    44	git clone https://github.com/StephenSook/context-mod-devvit
    45	cd context-mod-devvit
    46	npm install
    47	npm run dev:web
    48	```
    49	
    50	Then open [`http://localhost:5173/?demo=1`](http://localhost:5173/?demo=1). The `?demo=1` query parameter seeds the dashboard with synthetic events (per the production-safety pattern — fabricated data never auto-shows). Remove the flag to see the empty-state zero-state with a copy-to-clipboard starter config.
    51	
    52	The `dev:web` script chains `vite build` → `node scripts/dev/mock-server.cjs`. The mock server is pure Node stdlib (no Express, no extra deps) and binds 127.0.0.1 only — local loopback, no LAN exposure.
    53	
    54	To stop: `Ctrl-C` in the terminal running `npm run dev:web`.
    55	
    56	## Status — what's production vs scaffolded vs Phase-N pending
    57	
    58	**Hackathon-era MVP.** Active development; expect rough edges. Architecture diagram below shows the *complete request lifecycle*; the Status table below tells you which boxes are wired today vs which land Phase 1-3.
    59	
    60	| Component | State today | Notes |
    61	|-----------|-------------|-------|
    62	| Observatory dashboard (React + Vite + Tailwind, 24h sparkline + event stream + dry-run mod menu) | **Production** | Renders against live `/api/recent` ZSET + falls back to `?demo=1` synthetic for screenshots. Wave A–F shipped. |
    63	| Rule engine — `handleActivity` → `runRun` → `runCheck` → `runRule` (regex / author / ruleSet) | **Production** | Vinh's Phase 1 — 11 steps, 93 tests. Filters (authorIs + itemIs), Mustache templates, named-rule expansion, AND/OR combinators, postBehavior state machine w/ 100-iter safety. |
    64	| Action handlers (`remove` / `approve` / `lock` / `comment` / `report` / `ban` / `userFlair`) | **Production** | Vinh's Phase 2 — 7 MVP actions, Reddit-API signatures verified live. Markdown sanitizer (u/r-ping defang + link-injection guard) for `comment` action. |
    65	| `handleActivity` orchestrator + `runAction` w/ idempotency wrap | **Production** | Vinh's Phase 2.3 — reads config rev once at event start (D5), aggregates ActionResult into events:recent ZSET. Codex-hardened (CRITICAL+HIGH fixes shipped 2026-05-16). |
    66	| Idempotency primitives (`src/lib/idem.ts` — FNV-1a + BigInt + lease owner tokens + 3-stage Redis keys + 60s cron lock) | **Production** | 13 unit tests. Codex-hardened: commitAction retries done-write 3x and never releases pending on failure (prevents double-action); lease owner-token compare-and-delete (prevents third-execution race on slow worker). |
    67	| Dry-run rule tester (mod menu "Test rules on this item" → form → toast) | **Production** | Stephen's Step 3.6 — non-contract `dryRunActivity` sibling. Mod right-clicks any post/comment, gets eval trace + would-have-called list, zero Reddit side-effects. |
    68	| URL-dedupe repost rule (`cm:{sub}:repost:url:{hash}`, 30d TTL) | **Production** | Vinh's Phase 2.5.1 (promoted from Phase 4). FNV-1a hash, race-safe `SET NX` (Codex hardened), fail-OPEN on Redis outage. |
    69	| Config UX — wiki loader cron + reload-config menu + onAppInstall default-config seed + onAppUpgrade migrations | **Production** | Vinh's Phase 3 — `loadFromWiki()` cron polls every 5 min, no-op on unchanged wiki revisionId, atomic config publish via rev pointer. |
    70	| `routes/api.ts` `/api/recent` + `/api/stats` | **Production for `/api/recent`** (live ZRANGE wired Phase 3.4) · **Scaffolded for `/api/stats`** (Phase 4 stretch) | Versioned events drop corrupt/future members loudly. |
    71	| `routes/scheduler.ts` cron (`refresh-config`, `stats-rollup`, `image-hash-worker`) | **Production for `refresh-config`** · **Scaffolded** for `stats-rollup` + `image-hash-worker` | Stats rollup Phase 4; image-hash-worker gated on 0.10 spike (not run yet — likely NO-GO). |
    72	| Devvit configuration (`devvit.json`, fetch allowlist, post entry, scheduler tasks, menu items, forms) | **Production** | All 3 menu items + dry-run form declared. |
    73	| Hono server routing (`src/index.ts`, `/api/*`, `/internal/*`) | **Production** | |
    74	| Phase 4 stretch rules (`history`, `attribution`, `recentActivity`) | **Pending** | Vinh's queue. May ship pre-deadline or defer post-hackathon depending on capacity. |
    75	| Phase 4 image-hash + LSH | **Deferred** | 0.10 spike gate not run; effectively NO-GO for hackathon. Post-hackathon. |
    76	| MHSRule (toxicity HTTP fetch) | **Cut** | Reddit PR #96 (2026-05-08) — HTTP fetch policy AI-provider allowlist excludes ModerateHateSpeech. |
    77	
    78	162 tests green (Vinh Phase 1+2+3 + Stephen 3.6 + Codex regression suite); `tsc --build` clean.
    79	
    80	See [implementation plan](./docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md) + [`PLAN.md`](./PLAN.md) team-coordination doc for full per-phase scope.
    81	
    82	### Observatory dashboard preview
    83	
    84	![Observatory dashboard rendered against `?demo=1` synthetic data: stat cards showing 47 actions today, 3h 8m mod time saved, 12 active rules, spam-filter as top rule; 24-hour hourly-actions sparkline; recent moderation events list with action chips (remove, comment, approve, lock); Reload config + Wiki + Docs links at the bottom.](./docs/screenshots/dashboard-desktop.png)
    85	
    86	> Captured 2026-05-14 via Playwright against the mock-server-backed `?demo=1` build. Production renders with the same chrome over real `events:recent` ZSET data once Phase 1+2+3 wire-up lands (see Status table above).
    87	
    88	## Architecture
    89	
    90	```mermaid

 succeeded in 116ms:
   210	        }
   211	      ]
   212	    }
   213	  ]
   214	}
   215	```
   216	
   217	**Concept model** (ported faithfully from the original ContextMod):
   218	
   219	- **Run** — ordered list of Checks. Supports `postBehavior` (`next` / `nextRun` / `stop` / `goto:<run>.<check>`) for branching workflows.
   220	- **Check** — a group of Rules combined with `AND` or `OR`. When triggered, executes its Actions.
   221	- **Rule** — a single boolean predicate (`regex`, `author`, `history`, `attribution`, `recentActivity`, `repost`, plus composite `ruleSet`). Upstream `mhs` rule cut from Devvit port per PR #96 — see Phase FAQ.
   222	- **Filter** — `authorIs` / `itemIs` clauses that gate Rule/Check/Action execution by author + item attributes.
   223	- **Action** — side-effect (`remove`, `approve`, `lock`, `comment`, `report`, `ban`, `userFlair`). Action content supports [Mustache](https://mustache.github.io/) templating with `{{item.*}}`, `{{author.*}}`, `{{rules.<name>.data.*}}` context.
   224	- **Named rules** — declare a rule once with `name:`, reference by string elsewhere — DRY composition.
   225	
   226	The canonical AJV schema lands at `src/server/schema/app.schema.json` in Phase 1 (Vinh's lane, finishing Day 5-8). Until then, the original [context-mod docs](https://github.com/FoxxMD/context-mod/tree/master/docs/subreddit-configuration) are the reference — concepts identical, surface trimmed per [migration guide](#migration-guide-for-existing-contextmod-operators).
   227	
   228	### Validation behavior + safety story
   229	
   230	**Designed behavior (lands Phase 1 — `src/server/schema/app.schema.json` + `routes/scheduler.ts:refresh-config`):** every config load runs the JSON5 source through AJV against the schema. Three outcomes:
   231	
   232	| Outcome | Behavior | What mods see |
   233	|---------|----------|---------------|
   234	| **Valid JSON5 + schema match** | New revision (`cfg:rev:{n+1}`) is written immutably, then the `cfg:current_rev` pointer is atomically bumped. Every subsequent `handleActivity` reads the new revision. | Observatory event chip: `config loaded · revision N+1`. Mod-menu **Reload config** toast: *"Loaded N+1, X rules active."* |
   235	| **Invalid JSON5 (parser error)** | New revision **NOT** written. `cfg:current_rev` stays pointed at the prior known-good revision. The sub keeps moderating against the prior config. | Observatory event chip: `config rejected · JSON5 parse error at line L col C`. Mod-menu **Reload config** toast: *"Parse failed at L:C — last revision N still active."* |
   236	| **Valid JSON5 + schema violation** | New revision **NOT** written. Same fallback to prior revision. | Observatory event chip: `config rejected · schema: <AJV instance path>: <human reason>` (e.g., `/runs/0/checks/1/rules/0/threshold must be integer, got "1"`). Mod-menu **Reload config** toast carries the same. |
   237	
   238	**Safety property:** the sub *never* runs against a broken config. A typo or syntax error in the wiki halts the swap, not moderation — the last known-good revision keeps firing rules until you fix the wiki. No "broken window" between bad save + fix.
   239	
   240	This is one of the two reasons the port uses an immutable-revision + atomic-pointer pattern (the other reason is mid-event consistency — `handleActivity` reads the pointer once at event start so the whole pipeline runs against a single revision snapshot, even if a concurrent reload fires).
   241	
   242	## Comparison — AutoMod vs original CM vs CM-Devvit
   243	
   244	Why does Reddit need a port of CM when AutoMod already exists? Because AutoMod handles a different problem.
   245	
   246	| Dimension | AutoModerator | Original CM (PRAW) | **ContextMod-Devvit (this port)** |
   247	|-----------|---------------|--------------------|------------------------------------|
   248	| Hosting | Built into Reddit — no setup | Self-hosted server + Snoowrap + API tokens | Per-subreddit Devvit install, one click |
   249	| Rule composition | YAML rules with regex + simple filters + `priority` ordering; no named-rule or ruleSet composition | Composable named rules + ruleSets (AND/OR) + `postBehavior` flow control | Composable named rules + ruleSets (AND/OR) + `postBehavior` flow control |
   250	| Author-history rules | Limited author/account checks (age, karma, flair, post/comment counters); no history-window queries across other subs | Full `author` rule: age, karma, flair, verified, contributor, mod, shadowban, history-window | Full `author` rule + filter system (`authorIs`/`itemIs`) at check level |
   251	| Image-hash repost detection | ❌ | ✅ (perceptual hash via Python image libs) | 🚧 Phase 4 stretch (pure-JS blockhash in Devvit's 30s window — feasibility spike pending) |
   252	| Per-sub data isolation | Shared infrastructure | Operator runs their own instance, isolation depends on hosting | Hard-isolated: each install gets its own Redis namespace, no cross-sub leak |
   253	| Mobile dashboard | ❌ (modmail only) | ❌ (terminal logs / Discord webhooks) | ✅ Observatory custom post — stat cards + sparkline + event stream, renders on mobile webview |
   254	| Config surface | YAML in wiki, single source | JSON5 in wiki + named-rule reuse + Mustache action templating | JSON5 in wiki + named-rule reuse + Mustache action templating |
   255	| Install model | Auto-on for every sub | Operator-managed central server serving N subs | Per-mod-team install — no shared rate limits, no central bottleneck |
   256	| Pricing | Free | Heroku/VPS hosting + dev time | Free (Devvit hosts) — eligible for Reddit's Developer Funds program |
   257	| When to use | High-volume regex spam catches | Context-aware rules requiring history + composition | Same as original CM, without the central-server tax |
   258	
   259	**Best-of-both posture:** ContextMod-Devvit doesn't replace AutoMod — both coexist on the same sub. AutoMod handles the fast regex pass; ContextMod handles the *context* part (history, composition, audit trail). Mods of [r/mealtimevideos](https://reddit.com/r/mealtimevideos) (60K weekly visitors) and [r/piercing](https://reddit.com/r/piercing) (600K visitors) already run upstream CM alongside AutoMod for exactly this reason.
   260	
   261	## Credits
   262	
   263	- **Original bot:** FoxxMD ([github.com/FoxxMD/context-mod](https://github.com/FoxxMD/context-mod)) — MIT License. Used with written permission.
   264	- **Devvit Web template:** Reddit Inc — BSD-3-Clause, see `NOTICES.md`.
   265	- **Devvit port:** Stephen Sookra ([github.com/StephenSook](https://github.com/StephenSook)) — MIT License.
   266	
   267	## Fetch Domains
   268	
   269	Per [Devvit Rules](https://developers.reddit.com/docs/policies/devvit-rules), every external domain this app contacts is declared in `devvit.json` and listed here with justification + data flow.
   270	
   271	| Domain | Status | Why we need it | What data we send | What data we store |
   272	|---|---|---|---|---|
   273	| `i.redd.it` | global allowlist (no approval needed) | Fetch Reddit-hosted image to compute perceptual hash for repost detection. | None (anonymous GET). | 64-bit blockhash + post ID. Never the image bytes. |
   274	| `preview.redd.it` | global allowlist | Same as above for preview-sized Reddit images. | None. | Same. |
   275	| `external-preview.redd.it` | global allowlist | Same for cross-posted previews. | None. | Same. |
   276	| `external-i.redd.it` | global allowlist | Same for cross-posted full-size images. | None. | Same. |
   277	
   278	**Privacy commitments:**
   279	- No PII ever transmitted. No usernames, no IPs, no profile data.
   280	- No data sold, shared, or used for training (per our [Privacy Policy](./policies/privacy.md)).
   281	- Image bytes are decoded → hashed → discarded in-process. Only the 64-bit hash is persisted.
   282	- All cached data is per-installation isolated (Devvit Redis) and TTL'd: hashes auto-expire after 30 days, author profile cache 1h, idempotency keys 24h.
   283	
   284	## Migration guide for existing ContextMod operators
   285	
   286	If you're already running [FoxxMD/context-mod](https://github.com/FoxxMD/context-mod) (Docker/Heroku) you can keep your existing config and migrate progressively.
   287	
   288	> **Full schema-compatibility matrix:** [`docs/migration-compatibility.md`](./docs/migration-compatibility.md) — every upstream rule / action / filter / config key mapped to ✅ ported / 🚧 deferred / ✂️ cut with rationale.
   289	
   290	**Config compatibility:** YAML/JSON5 → JSON5 only. Convert with [`yaml-to-json`](https://www.npmjs.com/package/yaml-to-json) or any online converter. The schema is a strict subset of upstream — see `What's ported vs deferred` below.
   291	
   292	**What's ported (rule engine + dashboard ship in v0.1.0):**
   293	
   294	The concept model, schema validation, config publish pipeline, idempotency primitives, and Observatory dashboard all ship. Live trigger wiring (`handleActivity` → rule pipeline → mod action) is the Phase 1+2 integration step Vinh is finishing through Day 5-8.
   295	
   296	- ✅ `Run` / `Check` / `Rule` / `Action` concept model + `postBehavior` flow control (`next` / `nextRun` / `stop` / `goto:`) — typed + scaffolded
   297	- ✅ Filters: `authorIs` / `itemIs` with the canonical criteria set (name, age, karma, flair, isMod, isContributor, verified, shadowBanned, removed, approved, locked, score, age, title, isSelf, over18, depth, op) — typed + scaffolded
   298	- ✅ Rules: `regex` (with multi-field `testOn` + threshold), `author`, `ruleSet` (AND/OR composition) — types ship; live evaluation lands Phase 1
   299	- ✅ Actions: `remove`, `approve`, `lock`, `comment`, `report`, `ban`, `userFlair` — types + Mustache templating ship; handler wiring lands Phase 2
   300	- ✅ Named rules + composition by name reference — types ship; resolver lands Phase 1
   301	- ✅ Wiki-based config + 5-min refresh cron + manual `Reload config` menu action — types + Hono routes scaffolded; loader implementation lands Phase 3 (`src/routes/menu.ts:15-20` currently returns a "Phase 3" toast)
   302	- ✅ Per-action idempotency primitives (`cm:proc` 24h + `cm:action:pending` 5m + `cm:action:done` 7d) — `src/lib/idem.ts` shipped
   303	- ✅ Observatory dashboard — renders against `?demo=1` synthetic data; live data wires up at Phase 3
   304	
   305	**What's deferred (Phase 4 stretch, not yet shipped):**
   306	- `history`, `attribution`, `recentActivity`, `repost` (URL + image-hash variants) rules — landing in Phase 4. `mhs` rule cut per Phase FAQ.
   307	- `RepeatActivityRule`, `SentimentRule`, full `RepostRule` w/ YouTube — explicitly **cut** (NLP libs don't bundle in Devvit; YouTube API exceeds scope)
   308	- `DispatchAction` — explicitly **cut** (defer-and-replay isn't load-bearing for MVP; defer to v2 if operators ask)
   309	
   310	**What's different from upstream:**
   311	- **No central server.** Every mod team installs their own instance — no shared rate limits, no central API token to manage.
   312	- **Per-subreddit Redis isolation.** Your data never leaves your sub. Mod-action history, image hashes, author cache — all scoped per-install by Devvit.
   313	- **Observatory dashboard.** Inline custom post showing mod-action telemetry (last 50 events + 24h sparkline + stat cards). Currently renders with `?demo=1` synthetic data; live wiring lands at Phase 3 after Vinh's Phase 1+2 backend ships.
   314	- **No `wikiLocation` config fragment hydration.** v1 reads one wiki page; `wiki:` + `url:` includes were dropped to simplify the threat model.
   315	
   316	**The grandfather case:** if you're FoxxMD or running CM in production with subscribers depending on it, [open an issue](https://github.com/StephenSook/context-mod-devvit/issues) — we'd love to talk about a graceful cutover.
   317	
   318	## FAQ
   319	
   320	**Do I need to host anything?**
   321	No. Devvit runs the server. You install via the Reddit App Directory, write your rules in your sub's wiki, and that's it.
   322	
   323	**Can other mods edit the config?**
   324	Yes — anyone with `wiki` permissions in your sub can edit `/wiki/contextmod`. Standard Reddit wiki access control applies.
   325	
   326	**What happens if I edit the wiki and break the config?**
   327	The 5-minute refresh cron validates new config against an AJV JSON Schema. If it fails to parse or validate, the previous `cfg:current_rev` stays active and the error is logged. Your sub stays moderated by the last good config until you fix the wiki page.
   328	
   329	**How do I see what ContextMod actually did?**
   330	Open the Observatory dashboard. From the sub overflow menu: **ContextMod: View recent actions**. Shows last 50 events with action chips (REMOVE / APPROVE / COMMENT etc), color-coded by status, with a 24h sparkline of action volume.
   331	
   332	**How do I test a config rule without it firing for real?**
   333	Use the **ContextMod: Test rules on this item** mod menu entry on any post or comment. The dry-run pipeline evaluates every rule against the selected thing + shows you which rules matched, which filter clauses passed/failed, which actions *would* fire — without any real Reddit-API side-effects.
   334	
   335	![Mockup of the Test-rules-on-this-item dry-run result: 4 cards showing per-rule evaluation. (1) spam-filter: MATCHED, regex on title body, would fire REMOVE + COMMENT, dry-run skipped. (2) age-gate: MATCHED, authorIs filter passed, would fire REMOVE, dry-run skipped. (3) warn-rule: SKIPPED, authorIs karma > 100 failed, rule not evaluated. (4) mod-approve: NO MATCH, ruleSet trusted-mods-and-contributors returned false.](./assets/gallery-dryrun.png)
   336	
   337	Dry-run results live in `routes/forms.ts` — handler lands Phase 3.
   338	
   339	**Does it work on iOS / Android?**
   340	The dashboard is mobile-responsive. Devvit custom posts render natively in the Reddit app's webview. Mod menu actions work on web only (per Devvit platform limits today).
   341	
   342	**Is this safe to install on my big sub?**
   343	This is hackathon-era MVP code with the trigger pipeline still being wired (Phase 1+2). Stable enough for a private test sub, not yet recommended for high-volume production. Watch the [App Versions page](https://developers.reddit.com/apps/cm-devvit/app-versions) for the v1.0 release.
   344	
   345	**Why a separate slug, not `context-mod`?**
   346	Reddit's Devvit App Directory has a 16-character app-name limit. `cm-devvit` is the working slug — leaving `context-mod` open if FoxxMD eventually publishes his own official port.
   347	
   348	**Which Phase is this work in?**
   349	Active scope tracked on the [FoxxMD/ContextMod Devvit project board](https://github.com/users/FoxxMD/projects/6). Cards tagged `[P1]`-`[P6]`:
   350	- **P1** — Core engine (`handleActivity`, `runRule`, etc.) — Vinh, Day 5-8
   351	- **P2** — Action handlers + trigger routes — Vinh, Day 5-8
   352	- **P3** — Dashboard wire-up to live data — Stephen, Day 9-11
   353	- **P4** — Stretch rules (`history` / `attribution` / `recentActivity` / `repost`) — Phase 4 stretch
   354	- **P5** — Demo + Devpost submission — Stephen, Day 13-15
   355	- **P6** — Post-hackathon ship + open to upstream operators
   356	
   357	The `mhs` rule was cut after `reddit/devvit-docs` PR #96 (2026-05-08) locked the HTTP fetch policy's AI-provider list to OpenAI + Gemini only.
   358	
   359	## Install troubleshooting
   360	

exec
/bin/zsh -lc "nl -ba docs/submission/e2e-scenarios.md | sed -n '1,260p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "nl -ba docs/submission/demo-video-script.md | sed -n '1,140p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "nl -ba PLAN.md | sed -n '1,220p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
     1	# E2E Scenarios A–H — ContextMod Devvit Hackathon Submission
     2	
     3	> Step 5.3 in PLAN.md. 8 reproducible scenarios judges can replay on the
     4	> demo sub (`r/contextmod_vinh_dev`) to verify each capability end-to-end.
     5	> Each scenario = trigger → expected outcome → verification → screenshot target.
     6	
     7	**Demo sub:** `r/contextmod_vinh_dev` (Vinh's playtest sub; Stephen also has access).
     8	**App version:** v0.0.2 (`contextmod-vinh@0.0.2`, hackathon build).
     9	**Prerequisites:** App installed on demo sub + `botconfig/contextmod` wiki page seeded with the hackathon-demo config (covered by Scenario G).
    10	
    11	---
    12	
    13	## Scenario A — Regex spam removal (Mustache-templated comment)
    14	
    15	**Trigger:** mod-test user submits post titled "free crypto giveaway 🚀"
    16	
    17	**Config (in wiki `botconfig/contextmod`):**
    18	```json5
    19	{
    20	  runs: [{
    21	    name: 'spam-removal',
    22	    checks: [{
    23	      name: 'crypto-giveaway',
    24	      combinator: 'OR',
    25	      rules: [{ kind: 'regex', name: 'scam-words', pattern: 'crypto|giveaway', flags: 'i' }],
    26	      actions: [
    27	        { kind: 'remove', isSpam: true },
    28	        { kind: 'comment', template: 'Hi {{author.nameSafe}}, your post "{{item.titleSafe}}" was removed as suspected spam.' },
    29	      ],
    30	    }],
    31	  }],
    32	}
    33	```
    34	
    35	**Expected outcome:**
    36	- Post removed within ~3 sec of submission
    37	- Sticky bot comment posted by `u/CowSufficient3840` (or current dev account) with the rendered Mustache template — author/title rendered through `escapeMarkdown` so any `u/` or `r/` pings the spammer included are defanged (no accidental notifications)
    38	
    39	**Verification:**
    40	- Open the post permalink — should show `[removed]`
    41	- Read bot comment — verify template values rendered + special chars escaped
    42	- Observatory dashboard ("View recent actions" menu) shows new row: `spam-removal / crypto-giveaway → remove, comment`
    43	
    44	**Screenshot target:** `docs/screenshots/scenario-a-spam-removed.png` (post 404 + bot comment overlay)
    45	
    46	---
    47	
    48	## Scenario B — URL-dedupe repost (dry-run mode)
    49	
    50	**Trigger:** mod-test user submits same URL twice within 30d window (e.g. `https://example.com/article`)
    51	
    52	**Config:**
    53	```json5
    54	{
    55	  runs: [{
    56	    name: 'repost-watch',
    57	    checks: [{
    58	      name: 'url-dedupe',
    59	      combinator: 'OR',
    60	      rules: [{ kind: 'repost', name: 'url-30d', windowDays: 30 }],
    61	      actions: [{ kind: 'remove', dryRun: true }],  // dry-run until mods watch the feed
    62	    }],
    63	  }],
    64	}
    65	```
    66	
    67	**Expected outcome:**
    68	- First submission: no action (writes seen-marker `cm:{sub}:repost:url:{hash}` w/ NX, 30d TTL)
    69	- Second submission: TRIGGER + dry-run remove (no actual Reddit side-effect)
    70	- Codex H7 fix (2026-05-16): SET NX atomic, no GET-then-SET race even on simultaneous submissions
    71	
    72	**Verification:**
    73	- First post survives; second post survives BUT Observatory shows a `repost-watch / url-dedupe → remove (dry-run)` entry
    74	- `runAction` returns `{status: 'dry-run', wouldHaveCalled: 'remove'}` so the event row indicates intent without firing
    75	
    76	**Screenshot target:** `docs/screenshots/scenario-b-dryrun-repost.png` (dashboard row w/ dry-run chip)
    77	
    78	---
    79	
    80	## Scenario C — Mod whitelist bypass (authorIs filter)
    81	
    82	**Trigger:** existing subreddit mod submits a post titled "free crypto giveaway 🚀" (same trigger as Scenario A)
    83	
    84	**Config addition:**
    85	```json5
    86	{
    87	  authorIs: { isMod: false },  // check-level filter
    88	  // ... rules as Scenario A
    89	}
    90	```
    91	
    92	**Expected outcome:**
    93	- Spam-removal check pre-filters on `authorIs` BEFORE rule eval (Step 1.4 short-circuit)
    94	- Post is NOT removed (mod is exempt)
    95	- Observatory shows NO new event row
    96	
    97	**Verification:**
    98	- Post stays live; no bot comment
    99	- Server log: `[cm/runCheck] crypto-giveaway: pre-filter authorIs failed (isMod), skipping rule eval`
   100	
   101	**Screenshot target:** `docs/screenshots/scenario-c-mod-bypass.png` (mod post still up + dashboard empty)
   102	
   103	---
   104	
   105	## Scenario D — Approved-user bypass
   106	
   107	**Trigger:** user added to the sub's approved-contributors list posts a borderline title (matches Scenario A regex)
   108	
   109	**Config addition:**
   110	```json5
   111	{ authorIs: { isContributor: false } }
   112	```
   113	
   114	**Expected outcome:**
   115	- Same short-circuit as Scenario C — approved contributors exempt
   116	- No removal, no bot comment
   117	
   118	**Verification:**
   119	- Post stays live
   120	- Server log shows pre-filter exit
   121	
   122	**Screenshot target:** `docs/screenshots/scenario-d-approved-bypass.png`
   123	
   124	---
   125	
   126	## Scenario E — Comment moderation + lock parent
   127	
   128	**Trigger:** mod-test user comments on a Scenario-A-removed post with `slur-pattern-here` (real config redacts the regex source)
   129	
   130	**Config:**
   131	```json5
   132	{
   133	  runs: [{
   134	    name: 'comment-mod',
   135	    checks: [{
   136	      name: 'banned-phrase',
   137	      combinator: 'OR',
   138	      rules: [{ kind: 'regex', name: 'phrase', pattern: 'slur-pattern-here', flags: 'i' }],
   139	      actions: [
   140	        { kind: 'remove' },
   141	        { kind: 'lock' },  // locks the comment (or parent post if comment.id is parent)
   142	      ],
   143	    }],
   144	  }],
   145	}
   146	```
   147	
   148	**Expected outcome:**
   149	- Comment removed + locked
   150	- Observatory shows `comment-mod / banned-phrase → remove, lock`
   151	- Vinh's Phase 2 reality-correction: `lock.ts` routes via `getCommentById` (not on `reddit.lock(thingId)` directly)
   152	
   153	**Verification:**
   154	- Comment permalink: `[removed]`
   155	- Locked state visible in mod tools
   156	
   157	**Screenshot target:** `docs/screenshots/scenario-e-comment-locked.png`
   158	
   159	---
   160	
   161	## Scenario F — Dry-run rule tester (Stephen's Step 3.6)
   162	
   163	**Trigger:** mod right-clicks an existing suspicious post → menu "ContextMod: Test rules on this item" → form pre-filled with `thingId` → click "Run dry-run"
   164	
   165	**Expected outcome:**
   166	- Form submit returns a toast like:
   167	  ```
   168	  Dry-run (rev 3):
   169	  • spam-removal / crypto-giveaway → remove, comment
   170	  ```
   171	- No Reddit side-effects (post stays unchanged, no bot comment added)
   172	- Observatory does NOT show this evaluation (`dryRunActivity` skips ZSET write by design)
   173	
   174	**Verification:**
   175	- Post unchanged before + after dry-run
   176	- Observatory has no new row
   177	- Toast bullets match expected rule firings
   178	
   179	**Screenshot target:** `docs/screenshots/scenario-f-dryrun-toast.png` (toast overlay on post)
   180	
   181	---
   182	
   183	## Scenario G — Reload config from wiki
   184	
   185	**Trigger:** mod edits `r/{sub}/wiki/botconfig/contextmod` with new JSON5 → menu "ContextMod: Reload config from wiki"
   186	
   187	**Expected outcome:**
   188	- Toast: `Loaded N rules (rev M).` where N = sum of rules across all checks across all runs, M = new revision number
   189	- Atomic publish (Vinh's Phase 1.3 D5 pattern): `cfg:rev:{M}` written → `cfg:current_rev` pointer bumped
   190	- `cm:cfgLastWikiRev:{sub}` updated so the 5-min cron knows to short-circuit
   191	- Next post-submit trigger evaluates against the NEW rev (read-once at event start)
   192	
   193	**Verification:**
   194	- Toast appears within ~2 sec
   195	- Edit a rule (e.g. add a regex) → reload → re-trigger → see new behavior
   196	- If wiki has parse error: toast = "Config parse failed — check the wiki page for JSON5/schema errors."
   197	- If wiki not found: toast = "Wiki page \"botconfig/contextmod\" not found in r/{sub}. Create it first, then retry."
   198	
   199	**Screenshot target:** `docs/screenshots/scenario-g-reload-toast.png`
   200	
   201	---
   202	
   203	## Scenario H — Observatory dashboard live data
   204	
   205	**Trigger:** mod clicks "ContextMod: View recent actions" → Observatory custom post created/navigated → dashboard renders
   206	
   207	**Expected outcome:**
   208	- Dashboard renders 4 stat cards (actions today / mod time saved / active rules / top rule), 24h hourly sparkline, recent events list w/ action chips
   209	- Reads from `/api/recent` → `events:recent50` ZSET via `zRange ... reverse: true`
   210	- Events have `v:1` + `nonce` stripped at wire (server-internal)
   211	- Empty state shows starter-config snippet + copy-to-clipboard
   212	- a11y: aria-live polite on event stream, prefers-reduced-motion gate, semantic `<time>` for refreshedAt
   213	
   214	**Verification:**
   215	- After running Scenarios A + B + E, dashboard shows 3+ event rows w/ correct rule/action data
   216	- Stat cards animate in (or skip animation if user has reduce-motion set)
   217	- "Reload" button hits `/api/health` round-trip + refetches `/api/recent`
   218	
   219	**Screenshot target:** `docs/screenshots/scenario-h-dashboard-live.png` (already captured at `docs/screenshots/dashboard-desktop.png` for `?demo=1`; will re-capture against live data closer to demo)
   220	
   221	---
   222	
   223	## Scenarios cut from MVP
   224	
   225	- **Image-repost** (was 4.7): 0.10 spike never run, effectively NO-GO. Post-hackathon.
   226	- **History-based rules** (was 4.3–4.6): Vinh's queue capacity-permitting; may ship pre-deadline.
   227	- **MHSRule toxicity** (was 4.2): cut per Reddit PR #96 (HTTP fetch allowlist excludes ModerateHateSpeech).
   228	
   229	---
   230	
   231	## Capture order for demo video (5.5)
   232	
   233	Capture A → G → F → H for the 60s cut. B/C/D/E are screenshots for the README + Devpost writeup.
   234	
   235	---
   236	
   237	_Drafted 2026-05-16 by Stephen. Will capture screenshots + verify live before submission lockdown._

 succeeded in 0ms:
     1	# Demo Video Script — context-mod-devvit
     2	
     3	> **Constraints:** Devpost rules cap judging at the 60-second mark. Judges are NOT required to watch past 1 minute. So everything load-bearing has to be in the first 60s.
     4	>
     5	> **Voice rule:** Stephen records the voiceover in his own voice. Tight, scrappy, no AI cadence. Rehearse twice before the take. Don't sound like a sponsor read.
     6	>
     7	> **Tooling:** OBS Studio for screen capture, Audacity for the voiceover layer, ffmpeg to stitch. Bake captions for accessibility (judges may watch muted).
     8	
     9	---
    10	
    11	## Beat sheet (60.0s total)
    12	
    13	### 0.0 – 8.0s — Cold open (problem)
    14	
    15	**Visual:** Fast-cut montage of:
    16	- r/AskReddit modqueue overflowing
    17	- Tweet/news headline about the 2023 API blackout (8,800 subs went private)
    18	- Reddit Q1 2026 earnings number on screen ($663M)
    19	
    20	**Caption / VO:**
    21	> "Reddit's volunteer mods do 466 hours of unpaid labor a day. 73% of mod actions are already performed by bots. The bot infrastructure they depend on got killed in 2023."
    22	
    23	> Source: Li, Hecht, Chancellor — ICWSM 2022.
    24	
    25	---
    26	
    27	### 8.0 – 22.0s — The bot (history + permission)
    28	
    29	**Visual:** Cut to:
    30	- `github.com/FoxxMD/context-mod` repo page
    31	- Screenshot of the 2021 r/AssistantBOT capacity-wall message (or similar — find one from FoxxMD's account)
    32	- Screenshot of FoxxMD's Discord message granting permission
    33	
    34	**Caption / VO:**
    35	> "ContextMod is the rule-engine mod bot 15+ communities run — including r/mealtimevideos at 60K weekly visitors and r/piercing at 600K. Last release was 2022. I got written permission from FoxxMD to port it to Devvit."
    36	
    37	---
    38	
    39	### 22.0 – 50.0s — The demo (live install → wiki → action → dashboard)
    40	
    41	**Visual sequence** (~28s, ~7s per beat):
    42	
    43	**Beat 1 (22-29s) — Install:**
    44	- Mod on `developers.reddit.com/apps/cm-devvit`
    45	- Clicks "Add to community"
    46	- Picks their sub (e.g. r/cm_devvit_test)
    47	
    48	**VO:** "One click to install on any subreddit. No hosting. No tokens."
    49	
    50	**Beat 2 (29-36s) — Write a rule:**
    51	- Open `r/cm_devvit_test/wiki/contextmod`
    52	- Paste a tiny JSON5 config: regex on title `/spam|scam/i` → remove + comment
    53	- Click save
    54	
    55	**VO:** "Write rules in JSON5 in your sub's wiki. Composable rules. Mustache-templated action messages. The full ContextMod concept model, ported faithfully."
    56	
    57	**Beat 3 (36-43s) — Trigger an action:**
    58	- Submit a test post titled "free crypto giveaway scam"
    59	- Cut to the Observatory dashboard (already pinned)
    60	- New event row appears at top: REMOVE + COMMENT chips for the spam-filter rule
    61	
    62	**VO:** "Every trigger runs through a three-stage idempotency gate — Devvit's at-least-once delivery never double-applies actions. Lease tokens prevent third-execution races on slow workers."
    63	
    64	> Note (was a Phase-1-slip fallback): Phase 1+2+3 shipped 2026-05-16 so this beat now captures LIVE action data via `handleActivity` → rule engine → `events:recent` ZSET → dashboard. The `?demo=1` synthetic path remains as a backup if the test sub is rate-limited during recording, but the canonical capture is live.
    65	
    66	**Beat 4 (43-50s) — Dashboard tour + dry-run mod menu:**
    67	- Pan across stat cards (Actions today, Mod time saved, Active rules, Top rule) reading LIVE values
    68	- Sparkline drawing
    69	- Right-click a borderline post → "Test rules on this item" → form pre-fills thingId → click "Run dry-run" → toast bullets show `spam-removal / crypto-giveaway → remove, comment` w/ ZERO Reddit side-effects
    70	- (Skip image-hash beat — 0.10 spike not run, feature deferred post-hackathon)
    71	
    72	**VO:** "Live telemetry: stats, recent actions, hourly volume. Plus a dry-run rule tester — right-click any post, see exactly which rules would fire before they fire."
    73	
    74	---
    75	
    76	### 50.0 – 58.0s — The wedge (why this matters / why now)
    77	
    78	**Visual:** Title card "Migration ready" — text only, dark background.
    79	
    80	**Caption / VO:**
    81	> "FoxxMD's instance and 15+ other ContextMod operators are stuck on dying PRAW infrastructure. This port unblocks them. Eligible for Reddit's $1,000 Migration Bounty plus the Developer Funds program plus this hackathon's $10K Best Ported App prize — realistic 12-month direct-cash envelope is $19.5K–$25K (bounty + hackathon + Install-side cap + DQE Tier 3–4). The $75K figure is the Developer Funds Tier-8 DQE ceiling, not expected capture."
    82	
    83	---
    84	
    85	### 58.0 – 60.0s — Close
    86	
    87	**Visual:** Three lines, centered, fade-up:
    88	
    89	```
    90	context-mod-devvit
    91	github.com/StephenSook/context-mod-devvit
    92	developers.reddit.com/apps/cm-devvit
    93	```
    94	
    95	**VO:** "ContextMod, on Devvit. Now."
    96	
    97	---
    98	
    99	## Production notes
   100	
   101	- **Total runtime: 60.0s.** Trim any beat that overflows. 60.0 is the hard cap because Devpost says judges don't have to watch past that.
   102	- **Captions baked in** (not auto-generated by YouTube). Judges may watch muted.
   103	- **No music** OR a single subtle bed at low volume. Don't compete with VO.
   104	- **No video transitions** (cuts only). Saves time + reads more like a real demo than a marketing reel.
   105	- **Avoid AI-generated b-roll.** Use real screenshots from the test sub, the GitHub repo, the Devvit dashboard, the Observatory.
   106	- **Pre-roll OBS** so the cursor is already on the right element when each beat starts. Saves seconds of "where do I click" footage.
   107	
   108	## Voiceover guidance for Stephen
   109	
   110	- Read 1 beat at a time, then move on. Don't try to nail the whole thing in one take.
   111	- Read **slower than feels natural** — the script is dense. ~150 words for 60s = ~2.5 words/sec.
   112	- Don't read the captions verbatim. Captions = key claims. VO = paraphrase + transitions.
   113	- Don't say "amazing" / "revolutionary" / "powerful" / "sophisticated." Trips the AI-tone radar that burned us on the Watchful1 thread. <!-- AITONE_IGNORE -->
   114	- Sound like you're telling a fellow dev about a project, not pitching a VC.
   115	
   116	## Deliverable
   117	
   118	- Upload final cut to YouTube as **unlisted**.
   119	- Paste URL into Devpost submission form.
   120	- Save raw OBS recording + Audacity project files in `docs/submission/_video-source/` (gitignored).

 succeeded in 0ms:
     1	# context-mod-devvit — Plan & Coordination
     2	
     3	> Living status doc for Stephen + Vinh. Updated on every task change and pushed to `main`. Single source of truth for who is working on what. **Atomic commits — never bundle a status change with code.**
     4	
     5	**Project:** Devvit Web port of FoxxMD's context-mod rule-engine moderation bot. Reddit Mod Tools and Migrated Apps Hackathon — Best Ported App ($10K) target.
     6	**Team:** **Stephen** — frontend, custom post, mod UX, demo video, submission writeup. **Vinh** — backend rules engine, actions, idempotency layer, image hashing.
     7	**Deadline:** 2026-05-27 6:00 PM PT (~15 days from today)
     8	**Repo:** github.com/StephenSook/context-mod-devvit (private, push pending Stephen's `gh repo create` OK)
     9	**Upstream:** github.com/FoxxMD/context-mod (collab access granted to StephenSook 2026-05-12, MIT)
    10	**Master spec:** `docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md` (572-line architecture doc — read first)
    11	**Reviews triangulated:** Claude manual + Codex adversarial + ultraplan PR. Consensus baked into Decisions D1–D10.
    12	
    13	---
    14	
    15	## Status Dashboard
    16	
    17	Legend: ✅ done · 🟡 in progress · ⬜ not started · ⛔ blocked · ✂️ cut
    18	**Stale lock TTL: 4 hours** (hackathon pace). 🟡 task without a fresh timestamp in Notes is claimable.
    19	
    20	### Phase 0 — Scaffold & plumbing (Day 0–1)
    21	
    22	| # | Component | File(s) | Owner | Status | Deps | Notes |
    23	|---|---|---|---|---|---|---|
    24	| 0.1 | Devvit Web template clone | repo root | **Stephen** | ✅ | — | from `devvit-template-mod-tool-devvit-web` |
    25	| 0.2 | devvit.json — triggers, scheduler, menu, settings, http | `devvit.json` | **Stephen** | ✅ | 0.1 | 5 fetch domains declared |
    26	| 0.3 | README + LICENSE (MIT) + NOTICES.md | root | **Stephen** | ✅ | 0.1 | FoxxMD credit prominent |
    27	| 0.4 | Privacy Policy + ToS drafted | `policies/` | **Stephen** | ✅ | 0.3 | GH Pages host pending repo push |
    28	| 0.5 | Mop template removed, ContextMod route stubs | `src/routes/*` | **Stephen** | ✅ | 0.2 | All devvit.json paths wired, no 404s |
    29	| 0.6 | Dual idempotency + cron lock helpers | `src/lib/idem.ts` | **Stephen** | ✅ | 0.5 | firstSeen + reserveAction + acquireLock + FNV-1a |
    30	| 0.7 | First playtest + domain approval submit | terminal | **Stephen** | ✅ | 0.5, 0.8 | Run `npx devvit playtest <sub>`. Triggers Reddit domain approval review. |
    31	| 0.8 | Create private test sub | reddit.com | **Stephen** | ✅ | — | <200 members per hackathon rule. e.g., r/cowsufficient_cm_test |
    32	| 0.9 | GitHub repo create + push | github.com | **Stephen** | ✅ | 0.1 | Private; flip public before submission. Needs explicit Bash permission. |
    33	| 0.10 | Image-decode + blockhash spike | `experiments/image-spike/` | **Vinh** | ⬜ | 0.8 | ⚠️ GO/NO-GO gate for Phase 4 image hashing. Day 0–2 max. → Vinh |
    34	
    35	### Phase 1 — Core engine (Day 2–5, ~24h)
    36	
    37	| # | Component | File(s) | Owner | Status | Deps | Notes |
    38	|---|---|---|---|---|---|---|
    39	| 1.1 | Redis key schema (central) | `src/state/keys.ts` | **Vinh** | ✅ 2026-05-16 | 0.5 | Shipped `K.*` factories, every key sub-segmented (default `_` sentinel) — multi-tenant safe per Council 21:30. idem.ts migrated. Commit 6694109. |
    40	| 1.2 | Config loader: JSON5 + AJV + named-rule expand | `src/core/{config,namedRules}.ts` | **Vinh** | ✅ 2026-05-16 | 1.1 | JSON5 → AJV → typed AppConfig. `expandNamedRules` runs at parse time w/ cycle break. Trimmed schema at `src/schema/app.schema.json`. Commit 6694109. |
    41	| 1.3 | Atomic config publish via revision pointer | `src/state/configStore.ts` | **Vinh** | ✅ 2026-05-16 | 1.2 | `publish()` writes immutable `cfg:rev:{n}` then bumps `cfg:current_rev` (D5). `getCurrentRev()` returns snapshot. Sub-threaded. Commit 6694109. |
    42	| 1.4 | Filter eval (authorIs + itemIs) | `src/core/filters.ts` | **Vinh** | ✅ 2026-05-16 | — | `passesFilters({authorIs, itemIs}, item, author)` — full predicate set (name/karma/age/flair/mod + over18/locked/score/regex matches). Used by Step 1.7 as pre-check gate. Commit 6694109. |
    43	| 1.5 | Mustache renderer | `src/core/template.ts` | **Vinh** | ✅ 2026-05-16 | — | `render()` w/ HTML escape disabled. `escapeMarkdown()` (\b-anchored) added for Phase 2.5 — defangs `u/`/`r/` pings + brackets/parens without mangling URLs. Commit 6694109. |
    44	| 1.6 | Rule dispatcher + Regex + Author + RuleSet | `src/core/runRule.ts`, `src/rules/*` | **Vinh** | ✅ 2026-05-16 | 1.4 | 3 MVP rule kinds: regex (title/body/url + flags), author (reuses authorIs filter), ruleset (nested AND/OR). Named-ref throws if not pre-expanded. Commit 6694109. |
    45	| 1.7 | Check eval (AND/OR aggregation) | `src/core/runCheck.ts` | **Vinh** | ✅ 2026-05-16 | 1.6 | AND/OR short-circuit + pre-filter gate (Step 1.4). Return shape: `{triggered, checkName, actions}`. Empty rules → not triggered. Commit 6694109. |
    46	| 1.8 | Run state machine (postBehavior + goto) | `src/core/runRun.ts` | **Vinh** | ✅ 2026-05-16 | 1.7 | postBehavior `next`/`stop`/`{goto}`; 100-iter safety break → `terminated:'iteration-limit'` + `lastCheckName` (Council Software Lead). Commit 6694109. |
    47	
    48	### Phase 2 — Actions + handleActivity (Day 5–8, ~20h)
    49	
    50	| # | Component | File(s) | Owner | Status | Deps | Notes |
    51	|---|---|---|---|---|---|---|
    52	| 2.1 | Action dispatcher + per-action idempotency wrap | `src/core/runAction.ts` | **Vinh** | ✅ 2026-05-16 | 0.6, 1.5 | reserve→side-effect→commit/release per D4. Stale-lease → `{status: 'skipped-locked'}` so handleActivity records it (Council Software Lead). Dry-run gate (per-action overrides config). Uses exported `actionId(thingId, kind, payload)` — pipe-separated to prevent (`t3_a`,`ban`,`x`) vs (`t3_ab`,`an`,`x`) collisions. Commit 9532cf4. |
    53	| 2.2 | 7 MVP actions — remove/approve/lock/comment/report/ban/userFlair | `src/actions/*.ts` | **Vinh** | ✅ 2026-05-16 | 2.1 | Reddit signatures verified against `@devvit/reddit/RedditClient.d.ts`. `ban.ts` omits `duration` when 0/unset (plan's "0=permanent" was wrong against actual Reddit API — 0 days = same-day unban; permanent = omit field). `lock.ts` routes via `getPostById`/`getCommentById` (not on `reddit.*`). `comment.ts` threads `*Safe` markdown-escaped variants through Mustache. 16 action tests green. Commit 9532cf4. |
    54	| 2.3 | handleActivity orchestrator | `src/core/handleActivity.ts` | **Vinh** | ✅ 2026-05-16 | 1.8, 2.1 | Reads config rev ONCE at event start (D5). Aggregates `ActionResult.status === 'ok'` into `{kind, ok}[]` per Council fix (v1 plan would have shipped `actions: undefined`). Brought Step 3.5 `recordEvent` forward (`v:1`+nonce, `events:recent50` ZSET, last 50). Commit 9532cf4. |
    55	| 2.4 | onPostSubmit handler wire-up | `src/routes/triggers.ts` | **Vinh** | ✅ 2026-05-16 | 2.3 | Routes through handleActivity. Kept D0.1 null-safety/recursion-guard/firstSeen idioms. Reality-correction: `reddit.getCurrentSubredditName()` doesn't exist in `@devvit/reddit` — using `(await reddit.getCurrentSubreddit()).name` instead. Verified live on `r/contextmod_vinh_dev`: "free crypto giveaway" → remove + Mustache comment fired with escaped username. Commit 9532cf4. |
    56	| 2.5 | onCommentSubmit handler wire-up | `src/routes/triggers.ts` | **Vinh** | ✅ 2026-05-16 | 2.3 | Same pattern as 2.4 with `normalizeComment` + `comment.id` null-gate. Commit 9532cf4. |
    57	| 2.5.1 | URL-dedupe Repost rule (promoted from Phase 4 per Council Expansionist) | `src/rules/repost.ts` | **Vinh** | ✅ 2026-05-16 | 2.1 | FNV-1a64 hash, sub-scoped key, 30d TTL refresh on hit, fail-OPEN on Redis error (no mass false-positives during outage). Threaded optional `sub` through runRule/runCheck/runRun/runRuleSet. Schema `RepostRule` added to `app.schema.json`. Verified live: same URL submitted twice → first set marker, second triggered with dry-run gate. Commit 9532cf4. |
    58	| 2.5.2 | `dryRun` config flag — NON-NEGOTIABLE per Council SRE | `src/core/runAction.ts` | **Vinh** | ✅ 2026-05-16 | 2.1 | Per-action `dryRun` overrides `ctx.config.dryRun`. `ActionContext.config` is REQUIRED on the type — gate cannot silently regress (tsc breaks if dropped). Verified live: repost-watch dry-run returned `wouldHaveCalled: 'remove'`, no Reddit side-effect. Commit 9532cf4. |
    59	| 2.5.3 | Mustache markdown-injection sanitizer — NON-NEGOTIABLE per Council Security | `src/core/template.ts` | **Vinh** | ✅ 2026-05-16 | 1.5 | Phase 1 shipped `escapeMarkdown` w/ \b-anchored u/r-ping defang. Phase 2 added 4 mandatory fixture tests (YouTube URL auto-link survives, u/r pings defanged, link-injection `[click](evil)` neutralized, empty no-crash). Verified live in playtest: bot reply to "free crypto giveaway" rendered username + title as plain text. Commit 9532cf4. |
    60	
    61	### Phase 3 — Config UX + dashboard (Day 9–11, ~16h)
    62	
    63	| # | Component | File(s) | Owner | Status | Deps | Notes |
    64	|---|---|---|---|---|---|---|
    65	| 3.1 | onAppInstall seeds default config | `src/routes/triggers.ts`, `src/config/default-config.ts` | **Vinh** | ✅ 2026-05-16 | 1.3 | `DEFAULT_CONFIG_JSON5` lives in `src/config/default-config.ts` (stored as JSON5 string so install exercises the same parseConfig → AJV pipeline a wiki edit hits). Re-install no-op via `cfg:current_rev` SETNX-equivalent check. Commit c867143. |
    66	| 3.2 | Wiki config loader + refresh-config cron | `src/core/configSource.ts`, `src/routes/scheduler.ts` | **Vinh** | ✅ 2026-05-16 | 1.3 | `loadFromWiki()` returns discriminated `{ok, revisionId, config}` / `{ok:false, reason}`; never throws. Cron short-circuits on unchanged revisionId via `cfg:last-wiki-rev` so steady-state ticks cost one redis.get + one wiki read. Verified live in r/contextmod_vinh_dev. Commit c867143. |
    67	| 3.3 | Reload-config mod menu action | `src/routes/menu.ts` | **Vinh** | ✅ 2026-05-16 | 3.2 | Same loader pipeline as cron, on demand. Toast shows rule count on success or actionable parse-error msg on failure. Verified live: banana-bread test post removed + bot comment rendered via Mustache. Commit c867143. |
    68	| 3.4 | Recent events ZSET + /api/recent | `src/state/recentEvents.ts`, `src/routes/api.ts` | **Vinh** | ✅ 2026-05-16 | 2.3 | `readRecent()` reads `events:recent50` ZSET via `zRange ... { by: 'rank', reverse: true }`. `migrate()` switches on `v` for forward-compat — corrupt / future-version members dropped loudly. Server-internal `v` + `nonce` stripped at wire. Observatory dashboard renders 5 real events end-to-end (no ?demo=1). Commit c867143. |
    69	| 3.5 | Dashboard custom post (Vite + React) | `src/client/*` | **Stephen** | ✅ 2026-05-16 | 3.4 | Wave A–F shipped 2026-05-12 → 2026-05-14: stat cards + sparkline + event stream + CSV export + rule hit-count chips + empty-state w/ starter-config snippet. a11y polish (aria-live, prefers-reduced-motion, semantic `<time>`). `demo=1` synthetic-fixture path per Codex M6 production-safety; now ALSO rendering live data via Vinh's 3.4 `/api/recent` ZRANGE wiring (commit c867143). Last client commit 8218016. |
    70	| 3.6 | Dry-run rule tester menu + form | `src/routes/{menu,forms}.ts`, `src/core/dryRunActivity.ts` | **Stephen** | ✅ 2026-05-16 | 2.3 | Non-contract sibling `dryRunActivity()` mirrors handleActivity but forces dryRun on every action + returns structured `DryRunResult` (skips ZSET write). Menu `/test-rules` returns `showForm` w/ thingId pre-filled. Form `/test-rules-submit` fetches via `reddit.getPostById`/`getCommentById` (routed by thingId prefix), constructs inline Item/Author, invokes dryRunActivity, renders triggered runs as toast bullets. 8 new tests (4 dryRunActivity + 2 menu + 4 form). 162 total green. Last commit 50bda17. |
    71	| 3.7 | onAppUpgrade migrations | `src/state/migrations.ts` | **Vinh** | ✅ 2026-05-16 | 1.1 | `SCHEMA_VERSION='0.1'` + `runMigrations(from, to)` seam. v0.1 → v0.1 is a no-op as specified; the seam exists so a future shape change can land without breaking existing installs. Also added BACKFILL of the install pointer in `/app-upgrade` — install fires once but upgrade fires on every redeploy, so pre-Step-3.1 installs self-heal on next rebuild (synthesizes stable `sub:<subname>` id since V2 trigger payload does not actually carry installId — plan was speculative there). Commit c867143. |
    72	
    73	### Phase 4 — Stretch (Day 11–13, ~14h) — image hashing gated by 0.10
    74	
    75	| # | Component | File(s) | Owner | Status | Deps | Notes |
    76	|---|---|---|---|---|---|---|
    77	| 4.1 | URL-dedupe Repost rule | `src/rules/repost.ts` | **Vinh** | ⬜ | 1.6 | Cheap: sha256(url) + Redis SET w/ 30d TTL |
    78	| ~~4.2~~ | ~~MHSRule (HTTP fetch toxicity)~~ | ~~`src/rules/mhs.ts`~~ | — | ✂️ CUT | — | **CUT 2026-05-13 per Reddit PR #96** — HTTP fetch policy AI-provider allowlist locked to OpenAI + Gemini only; `api.moderatehatespeech.com` falls outside. See `docs/submission/devvit-app-settings.md` + `policies/privacy.md`. |
    79	| 4.3 | History infrastructure (author cache) | `src/state/authorHistory.ts` | **Vinh** | ⬜ | 1.1 | Cache shape: hash `cm:author:{name}` w/ fields `lastFetched` (epoch ms), `submissionCount`, `commentCount`, `linkKarma`, `commentKarma`, `accountAge` (epoch ms), `verified` (bool), `subs` (JSON array of recent active sub names). TTL 1h (3600s). Fetch via `reddit.getUser(name)` + `reddit.getUserSubmissions({username, limit: 100})` lazily on first rule access. Shared by 4.4–4.6 — build once, all three rules read from same cache key. |
    80	| 4.4 | HistoryRule | `src/rules/history.ts` | **Vinh** | ⬜ | 4.3 | Criteria: `{submissionCount: {greaterThan, lessThan}, commentCount: {...}, linkKarma: {...}, commentKarma: {...}, accountAge: {olderThan, youngerThan} }` — durations parsed via `parseDuration('1d' \| '30d' \| '1y')` → seconds. Threshold = AND across all configured criteria (any unconfigured criterion = pass). |
    81	| 4.5 | AttributionRule | `src/rules/attribution.ts` | **Vinh** | ⬜ | 4.3 | For each url submission in author's recent history (cached `subs` field) count domain frequency. Criteria: `{domain: string \| string[], threshold: number, window: '7d' \| '30d' \| 'all'}`. Fires when ≥ threshold submissions to specified domain in window. Useful for "spammer hitting r/X 5 times this week" detection. |
    82	| 4.6 | RecentActivityRule | `src/rules/recentActivity.ts` | **Vinh** | ⬜ | 4.3 | Criteria: `{subs: string[], threshold: number, window: '7d' \| '30d'}`. Fires when author has ≥ threshold posts/comments to any sub in `subs` list within window. Use case: "this user posted to r/banned-list-sub" auto-action. |
    83	| 4.7 | Image-hash port + worker + multi-index LSH | `src/image/*`, `src/rules/imageRepost.ts` | **Vinh** | ⬜ | 0.10 | ⚠️ GATED on 0.10 spike GO. If GO: blockhash 16x16 perceptual hash (256-bit BigInt); LSH = split into 4×64-bit bands, index each band → Redis hash `cm:repost:img:band{n}:{hexBand}` member-set. On new image: compute hash, query each band, intersect candidates, Hamming-distance ≤ threshold (default 10) → repost. Worker queue: cron `image-hash-worker` runs every 5min, dequeues `cm:image:pending` ZSET. Spike result (GO/NO-GO) ships at `experiments/image-spike/RESULT.md`. |
    84	| 4.8 | DispatchAction | — | — | ✂️ | — | Cut per Codex+ultraplan synthesis |
    85	| 4.9 | SentimentRule | — | — | ✂️ | — | Cut — NLP libs won't bundle in Devvit runtime |
    86	| 4.10 | Full RepostRule w/ YouTube | — | — | ✂️ | — | Cut — 4.1+4.7 cover MVP |
    87	| 4.11 | RepeatActivityRule | — | — | ✂️ | — | Cut — defer post-hackathon |
    88	
    89	### Phase 5 — Tests + demo + submission (Day 13–15, ~10h)
    90	
    91	| # | Component | File(s) | Owner | Status | Deps | Notes |
    92	|---|---|---|---|---|---|---|
    93	| 5.1 | AJV schema golden tests | `tests/config.test.ts` | **Vinh** | ⬜ | 1.2 | Fixture corpus from real CM configs |
    94	| 5.2 | Rule eval unit tests | `tests/rules/*.test.ts` | **Vinh** | ⬜ | 1.6, 4.* | Each rule covered |
    95	| 5.3 | E2E scenarios A–H on test sub | manual | **Stephen** | ⬜ | All prior | GIFs/screenshots → docs/demo-scenarios/ |
    96	| 5.4 | README polish + Fetch Domains section | `README.md` | **Stephen** | ⬜ | 5.3 | Devvit Rules requirement for fetch apps |
    97	| 5.5 | 60s demo video | YouTube unlisted | **Stephen** | ⬜ | 5.3 | OBS + Audacity + ffmpeg |
    98	| 5.6 | Submission writeup (Devpost) | devpost.com | **Stephen** | ⬜ | 5.5 | First-person build notes per D10 |
    99	
   100	### Phase 6 — Ship (Day 15–16, ~6h)
   101	
   102	| # | Component | File(s) | Owner | Status | Deps | Notes |
   103	|---|---|---|---|---|---|---|
   104	| 6.1 | `npx devvit publish --public --bump minor` | terminal | **Stephen** | ⬜ | All prior | 1–7 day review window |
   105	| 6.2 | Devpost submission filed | devpost.com | **Stephen** | ⬜ | 6.1 | Before May 27 6 PM PT |
   106	
   107	---
   108	
   109	## Shared Contracts
   110	
   111	> Drift = integration bugs. Modify these only after pinging the other person. `⚠️ CONTRACT` commit prefix on changes.
   112	
   113	| Contract | Owner | Consumers | Definition |
   114	|---|---|---|---|
   115	| Redis key schema | Vinh | Both | `src/state/keys.ts` const K namespace |
   116	| AJV config schema | Vinh | Both | `src/server/schema/app.schema.json` (trimmed from CM `Schema/App.json` — see `docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md:110` for the trim list) |
   117	| Internal `Item` shape | Vinh | Both | `src/shared/types.ts` — id, title, body, url, author, age, score, isSelf, over18, removed, approved, locked, stickied, linkFlairText, depth?, op? |
   118	| Internal `Author` shape | Vinh | Both | `src/shared/types.ts` — name, id, age, linkKarma, commentKarma, flairText, isMod, isContributor, verified, shadowBanned |
   119	| Trigger event normalizer | Vinh | Both | Maps PostV2/CommentV2/UserV2 → `Item`/`Author` |
   120	| Recent events shape | Vinh | Stephen (client) | `{ts, activityId, runName, checkName, triggered, actions:[{kind,ok}]}` JSON |
   121	| `/api/recent` contract | Vinh | Stephen | Last 50 events newest-first, JSON `{events: [...]}` |
   122	| Mustache template context | Vinh | Both | `{ item, author, manager, rules, actions }` |
   123	| `devvit.json` triggers/cron/menu | Stephen | Both | Adding new endpoint requires both src/ stub AND devvit.json declaration |
   124	| Fetch domain allowlist | Stephen | Both | `devvit.json.permissions.http.domains` — re-review on change |
   125	
   126	---
   127	
   128	## Decisions
   129	
   130	### D1 — Devvit Web (not Blocks)
   131	Blocks dies June 30, 2026. Devvit Web is the only forward path. **Locked 2026-05-12 by Stephen.**
   132	
   133	### D2 — CommonJS server bundle
   134	`package.json` has `"type":"module"` but Vite outputs `dist/server/index.cjs`. Devvit Web requires CJS. Template confirms. **Locked 2026-05-12.**
   135	
   136	### D3 — Redis primitives: strings + hashes + sorted sets only
   137	NO Lists (LPUSH/LRANGE) — not in Devvit Redis surface. NO Sets (SADD) — same. Recent events use ZADD score=timestamp, NOT LPUSH list. Per Codex CRITICAL #1. **Locked 2026-05-12.**
   138	
   139	### D4 — Dual idempotency
   140	`cm:proc:{thingId}` 24h TTL for trigger dedupe + `cm:action:{hash}` 7d TTL for per-effect dedupe. Implemented in `src/lib/idem.ts`. Per ultraplan H2 + Codex HIGH. **Locked 2026-05-12.**
   141	
   142	### D5 — Atomic config publish via revision pointer
   143	Each loaded config writes immutable `cfg:rev:{n}` then atomically bumps `cfg:current_rev` pointer. handleActivity reads pointer once at event start, carries `n` through entire pipeline. Per Codex HIGH #3. **Locked 2026-05-12.**
   144	
   145	### D6 — Cron single-flight via `acquireLock`
   146	Every cron handler MUST `acquireLock(taskName)` at top, release on completion. 60s TTL. Already wired in `src/routes/scheduler.ts`. Per ultraplan M1. **Locked 2026-05-12.**
   147	
   148	### D7 — Path B scope: MVP + select stretch
   149	MVP = Regex/Author/RuleSet + 7 actions + filters + Mustache + named rules + wiki config + dashboard + dry-run tester. Stretch = URL repost + HistoryRule + AttributionRule + RecentActivityRule + image-hash (gated). CUT = MHSRule (per Reddit PR #96, 2026-05-13), DispatchAction, SentimentRule, full RepostRule w/ YouTube, RepeatActivityRule, Web UI w/ Monaco, multi-bot. **Locked 2026-05-12 after triple review; MHS cut layered in 2026-05-13.**
   150	
   151	### D8 — Image hashing gated on Day 0–2 spike
   152	If 0.10 shows fetch+decode+hash works in Devvit within 5s and <100MB peak memory, image-hash repost ships. Otherwise feature stubs in `4.7`. **Decision deadline: end of Day 2.**
   153	
   154	### D9 — Wiki page name: `botconfig/contextmod`
   155	Matches CM convention. Mods write JSON5 config to `reddit.com/r/<sub>/wiki/botconfig/contextmod`. **Locked 2026-05-12.**
   156	
   157	### D10 — Submission writeup voice: first-person build notes
   158	No AI-tone marketing prose. Specific bugs hit, exact cuts made, screenshots. Concrete FoxxMD credit. Watchful1 lesson informs this. **Locked 2026-05-12.**
   159	
   160	### D11 — Reddit handle for app
   161	u/CowSufficient3840 (Stephen's logged-in account on devvit). Reflected in `policies/*.md` contact info. **Locked 2026-05-12.**
   162	
   163	---
   164	
   165	## Open Questions
   166	
   167	- [ ] **Q1:** Image-hash spike outcome — GO or NO-GO? (Task 0.10 result). **Decides:** finalize D8, sets Phase 4 shape. Owner: Vinh.
   168	- [ ] **Q2:** Does `i.redd.it` fetch work post-approval? CDN auth/referer behavior unknown. Test in playtest. **Decides:** image-hash viability even if blockhash decode works. Owner: Vinh during 0.10 spike.
   169	- [ ] **Q3:** Submission framing — "Devvit-native full port" vs "spiritual successor + dashboard"? Lean former if Phase 4 ships clean. **Decides:** Stephen by Day 14.
   170	- [x] **Q4:** Custom post height in `devvit.json.post.entrypoints` — set to `tall` in `devvit.json`. Observatory dashboard needs the vertical room for the action stream + stat cards + sparkline. Decided May 13, 2026 by Stephen.
   171	
   172	---
   173	
   174	## Risk Register
   175	
   176	| Risk | Mitigation |
   177	|---|---|
   178	| Domain approval delayed past Day 8 | Submit Day 0 via 0.7. Escalate r/Devvit modmail Day 5 if pending. Fallback: external Lambda hasher on s3.amazonaws.com (allow-listed). |
   179	| Phase 4 image-hash burns 3+ days w/o GO | Hard gate at 0.10 EOD Day 2. NO-GO → stub feature, reclaim time for polish. |
   180	| Vinh capacity (~5–10 hr/wk previously assumed; back on board now) | If actual capacity below estimate, cut 4.4–4.6 history-based rules first, then 4.7 image-hash, then 4.2 MHS. Ship MVP cleanly. |
   181	| AI-tone burn in submission writeup (Watchful1 lesson) | Per D10. Stephen writes from build notes. AI for outline only. |
   182	| Reddit's app review backed up past May 27 | `npx devvit publish --public` no later than Day 14. Backup contingency: submit Devpost with unlisted listing + repo + video. |
   183	| PLAN.md drift between Stephen + Vinh | Atomic plan commits per protocol. 4h stale-lock TTL. Daily sync ping. |
   184	
   185	---
   186	
   187	## Coordination Protocol
   188	
   189	1. **Before starting a task:** set status to 🟡, add timestamp in Notes, commit PLAN.md only, push. This is your lock.
   190	2. **After finishing:** flip to ✅, commit PLAN.md, push.
   191	3. **If blocked:** set to ⛔, add one-line note. Ping the other person.
   192	4. **Before starting ANY task:** `git pull` and re-read PLAN.md. If someone else has 🟡 on overlapping files, coordinate.
   193	5. **Hotfixes:** skip the protocol — commit the fix, update PLAN.md after. Don't let process block real emergencies.
   194	6. **PLAN.md commits are atomic.** Never bundle a status change with code. One-line status edit → commit → push.
   195	7. **Commit messages:**
   196	   - PLAN.md updates: `status: [task #] [emoji] [description]` (e.g., `status: 2.1 🟡 starting action dispatcher`)
   197	   - Code commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`)
   198	   - Contract changes: `⚠️ CONTRACT: [field] — [reason]`
   199	8. **Handoffs:** when your part is done and someone else continues, add `→ [Name]` in Notes column.
   200	9. **Stale locks (hackathon TTL = 4 hours):** 🟡 requires a fresh timestamp. No code/PLAN.md commit within 4h → lock is stale, other person can claim by replacing owner + bumping timestamp.
   201	10. **Contract changes require announcement.** Modifying anything in Shared Contracts → ping the other person BEFORE committing. Mark with `⚠️ CONTRACT` prefix. Contract drift is the #1 small-team integration bug.
   202	11. **CLI helper:** `./scripts/plan claim 2.1`, `./scripts/plan done 2.1`, `./scripts/plan block 2.1 "reason"`, `./scripts/plan ls --mine`. Avoid manual table editing errors.
   203	
   204	---
   205	
   206	_Last updated: 2026-05-16 by Stephen._

exec
/bin/zsh -lc "nl -ba src/routes/api.ts | sed -n '1,240p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "nl -ba src/state/recentEvents.ts | sed -n '1,220p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
     1	/**
     2	 * Client-facing API for the dashboard custom post.
     3	 *
     4	 * `?demo=1` returns seeded synthetic fixtures (src/lib/demo-fixtures.ts) so
     5	 * the dashboard can be screenshotted / recorded end-to-end without depending
     6	 * on real backend traffic. Production (no query param) returns real ZSET data;
     7	 * fabricated data never auto-shows (Codex review M6).
     8	 *
     9	 * The wire shape omits the server-internal `v` and `nonce` fields — those
    10	 * exist for storage versioning + ZSET-member uniqueness, not for the dashboard.
    11	 */
    12	
    13	import { Hono } from 'hono';
    14	import { reddit } from '@devvit/web/server';
    15	import { demoEvents, DEMO_STATS } from '../lib/demo-fixtures';
    16	import { readRecent, type RecentEvent } from '../state/recentEvents';
    17	
    18	export const api = new Hono();
    19	
    20	api.get('/recent', async (c) => {
    21	  if (c.req.query('demo') === '1') {
    22	    console.log('[cm/api/recent] demo=1 — serving synthetic fixtures (not real ZSET)');
    23	    return c.json({ events: demoEvents() });
    24	  }
    25	
    26	  let subName: string | undefined;
    27	  try {
    28	    subName = (await reddit.getCurrentSubreddit()).name;
    29	  } catch (err) {
    30	    console.error('[cm/api/recent] could not resolve current sub:', err);
    31	    return c.json({ events: [] });
    32	  }
    33	
    34	  const events = await readRecent(subName);
    35	  return c.json({ events: events.map(stripServerFields) });
    36	});
    37	
    38	function stripServerFields(e: RecentEvent) {
    39	  // v + nonce are storage-internal — drop before sending to the client.
    40	  const { v: _v, nonce: _nonce, ...wire } = e;
    41	  return wire;
    42	}
    43	
    44	api.get('/stats', async (c) => {
    45	  if (c.req.query('demo') === '1') {
    46	    console.log('[cm/api/stats] demo=1 — serving synthetic fixtures (not real rollup)');
    47	    return c.json({ counters: DEMO_STATS });
    48	  }
    49	  // TODO Phase 4 Task 41: return aggregated stats:rollup:7d hash
    50	  return c.json({ counters: {} });
    51	});
    52	
    53	/**
    54	 * Lightweight liveness probe. Returns app version + server timestamp so external
    55	 * checks (and our own dashboard reload button) can verify the server is alive
    56	 * without paying for a Redis round-trip. Cacheable: no.
    57	 */
    58	api.get('/health', (c) => {
    59	  return c.json({
    60	    ok: true,
    61	    name: 'cm-devvit',
    62	    version: process.env.npm_package_version ?? 'unknown',
    63	    ts: Date.now(),
    64	  });
    65	});

 succeeded in 0ms:
     1	/**
     2	 * Recent events ZSET (Step 3.5, brought forward to Phase 2 so Step 2.3
     3	 * `handleActivity` has a working sink).
     4	 *
     5	 * Council fixes baked in:
     6	 *   1. Software Lead — same-ms collision: sorted-set members are unique strings
     7	 *      so two same-ms events with identical {activityId, runName} would dedup.
     8	 *      Add a `nonce` (crypto.randomUUID()).
     9	 *   2. Long-Term Architect — versioning: stamp `v: 1`. Without it, when the
    10	 *      RecentEvent shape mutates in 3 months every install's old events become
    11	 *      unparseable garbage.
    12	 *   3. Long-Term Architect — naming: key is `events:recent50` (see keys.ts)
    13	 *      so a future "last 500" ZSET can land beside it without renaming.
    14	 *
    15	 * Phase 3.5 will add `readRecent` + `/api/recent` wiring. For Phase 2 we only
    16	 * need the writer side so the orchestrator pipeline is end-to-end live.
    17	 */
    18	
    19	import { redis } from '@devvit/web/server';
    20	import { K } from './keys';
    21	
    22	export interface RecentEvent {
    23	  v: 1;
    24	  nonce: string;
    25	  ts: number;
    26	  activityId: string;
    27	  runName: string;
    28	  checkName: string;
    29	  triggered: boolean;
    30	  actions: { kind: string; ok: boolean }[];
    31	}
    32	
    33	export async function recordEvent(
    34	  event: Omit<RecentEvent, 'v' | 'nonce'>,
    35	  sub?: string,
    36	): Promise<void> {
    37	  const versioned: RecentEvent = {
    38	    v: 1,
    39	    nonce: crypto.randomUUID(),
    40	    ...event,
    41	  };
    42	  try {
    43	    await redis.zAdd(K.eventsRecent(sub), {
    44	      score: event.ts,
    45	      member: JSON.stringify(versioned),
    46	    });
    47	    await redis.zRemRangeByRank(K.eventsRecent(sub), 0, -51);  // keep last 50
    48	  } catch (err) {
    49	    // Event-log write is best-effort — losing one row should never abort the
    50	    // already-completed Reddit action. Log and move on.
    51	    console.error('[cm/recentEvents] zAdd failed (event dropped):', event, err);
    52	  }
    53	}
    54	
    55	/**
    56	 * Read the most-recent 50 events, newest first. Step 3.5 reader side; called
    57	 * from /api/recent (src/routes/api.ts).
    58	 *
    59	 * Best-effort: a redis hiccup returns `[]` rather than 500. The dashboard
    60	 * separately surfaces a `last-refreshed-at` indicator so an empty list +
    61	 * stale timestamp tells the user the server is having trouble without
    62	 * making the whole page error out.
    63	 *
    64	 * Parse failures (corrupt member) are dropped silently — the migrate()
    65	 * pass is the version gate; anything that throws there is logged + dropped
    66	 * rather than poisoning the whole batch.
    67	 */
    68	export async function readRecent(sub?: string): Promise<RecentEvent[]> {
    69	  let raw;
    70	  try {
    71	    raw = await redis.zRange(K.eventsRecent(sub), 0, 49, { by: 'rank', reverse: true });
    72	  } catch (err) {
    73	    console.error('[cm/recentEvents] zRange failed:', err);
    74	    return [];
    75	  }
    76	  const out: RecentEvent[] = [];
    77	  for (const entry of raw) {
    78	    try {
    79	      const parsed = JSON.parse(entry.member) as unknown;
    80	      const migrated = migrate(parsed);
    81	      if (migrated) out.push(migrated);
    82	    } catch (err) {
    83	      console.error('[cm/recentEvents] member parse/migrate failed (dropped):', entry.member, err);
    84	    }
    85	  }
    86	  return out;
    87	}
    88	
    89	/**
    90	 * Version gate (Long-Term Architect, Step 3.5). Switch on `v` so a future
    91	 * RecentEvent shape change doesn't orphan historical events. v1 is identity
    92	 * today; the seam exists to claim the spot — and to make an unexpected `v`
    93	 * loud (throw → caller logs + drops the row) rather than silently spreading
    94	 * the wrong shape downstream.
    95	 */
    96	function migrate(raw: unknown): RecentEvent | null {
    97	  if (raw == null || typeof raw !== 'object') return null;
    98	  const obj = raw as Record<string, unknown>;
    99	  switch (obj.v) {
   100	    case 1:
   101	      return obj as unknown as RecentEvent;
   102	    case undefined:
   103	      // Pre-v1 event written before schema versioning existed — stamp v:1 + nonce.
   104	      return {
   105	        ...(obj as Omit<RecentEvent, 'v' | 'nonce'>),
   106	        v: 1,
   107	        nonce: typeof obj.nonce === 'string' ? obj.nonce : crypto.randomUUID(),
   108	      };
   109	    default:
   110	      throw new Error(`migrate(): unknown RecentEvent version ${String(obj.v)}`);
   111	  }
   112	}

exec
/bin/zsh -lc 'rg -n "api/stats|stats|actions today|Top rule|topRule|demo=1|synthetic" src/client src/routes tests' in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
src/client/lib/types.ts:23:  topRule: string;
src/routes/scheduler.ts:9: *   - /stats-rollup:   Phase 4 Task 41 (hourly)
src/routes/scheduler.ts:71:scheduler.post('/stats-rollup', async (c) => {
src/routes/scheduler.ts:72:  const release = await acquireLock('stats-rollup');
src/routes/scheduler.ts:75:    console.log('[cm/cron/stats-rollup] tick');
src/routes/scheduler.ts:76:    // TODO Phase 4 Task 41: aggregate stats:daily hash counters
src/routes/api.ts:4: * `?demo=1` returns seeded synthetic fixtures (src/lib/demo-fixtures.ts) so
src/routes/api.ts:22:    console.log('[cm/api/recent] demo=1 — serving synthetic fixtures (not real ZSET)');
src/routes/api.ts:44:api.get('/stats', async (c) => {
src/routes/api.ts:46:    console.log('[cm/api/stats] demo=1 — serving synthetic fixtures (not real rollup)');
src/routes/api.ts:49:  // TODO Phase 4 Task 41: return aggregated stats:rollup:7d hash
src/client/lib/api.ts:10: * ?demo=1 in window.location propagates to the fetch URL so the server returns
src/client/lib/api.ts:18:    ? '?demo=1'
src/client/lib/api.ts:38:    const res = await fetch(`/api/stats${demoSuffix()}`);
src/client/lib/api.ts:53: * Genuine zero-state stats. Used when the API is reachable + empty (no demo flag).
src/client/lib/api.ts:61:  topRule: '—',
src/client/App.tsx:21:// Demo data is OPT-IN only via ?demo=1 — production never shows fabricated mod
src/client/App.tsx:29:  const [stats, setStats] = useState<StatsRollup | null>(null);
src/client/App.tsx:35:    const [recent, statsData] = await Promise.all([fetchRecentSafe(), fetchStatsSafe()]);
src/client/App.tsx:39:    if (!recent.ok || !statsData.ok) {
src/client/App.tsx:40:      const errMsg = !recent.ok ? recent.error : !statsData.ok ? statsData.error : 'unknown';
src/client/App.tsx:50:    const statsValue = statsData.empty ? null : statsData.data;
src/client/App.tsx:52:    if (recentEvents.length === 0 && !statsValue) {
src/client/App.tsx:64:      setStats(statsValue ?? ZERO_STATS);
src/client/App.tsx:99:        {stats && <StatsRow stats={stats} />}
src/client/App.tsx:115:          {stats &&
src/client/App.tsx:116:            (stats.hourlyActions24h.length >= 2 ? (
src/client/App.tsx:117:              <Sparkline data={stats.hourlyActions24h} />
src/client/components/StatsRow.tsx:52:export function StatsRow({ stats }: { stats: StatsRollup }) {
src/client/components/StatsRow.tsx:53:  const hours = Math.floor(stats.timeSavedMin / 60);
src/client/components/StatsRow.tsx:54:  const mins = stats.timeSavedMin % 60;
src/client/components/StatsRow.tsx:58:      <Card label="Actions today" value={String(stats.actionsToday)} accent="bone" delay={0.05} />
src/client/components/StatsRow.tsx:60:      <Card label="Active rules" value={String(stats.activeRules)} accent="bone" delay={0.19} live={stats.activeRules > 0} />
src/client/components/StatsRow.tsx:61:      <Card label="Top rule" value={stats.topRule} accent="warn" delay={0.26} />

exec
/bin/zsh -lc "nl -ba src/state/configStore.ts | sed -n '1,180p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
     1	/**
     2	 * Atomic config publish (D5).
     3	 *
     4	 * Write the new immutable `cfg:rev:{n}` payload FIRST, then bump the
     5	 * `cfg:current_rev` pointer atomically. `handleActivity` reads the pointer
     6	 * ONCE at event start and threads `n` through the whole pipeline so a
     7	 * publish mid-event can't half-apply.
     8	 *
     9	 * Devvit Redis has no Lua / multi-key transactions usable from here, but the
    10	 * two-write pattern is safe: a reader sees either the OLD pointer (→ OLD rev)
    11	 * or the NEW pointer pointing at the NEW rev (we already wrote it). The
    12	 * pointer is the synchronization point.
    13	 *
    14	 * Multi-tenant: every key threads `sub` via `K.*` (Step 1.1) — default sentinel
    15	 * `_` for callsites without a subreddit context (D0.1 skeleton, fresh install).
    16	 */
    17	
    18	import { redis } from '@devvit/web/server';
    19	import { K } from './keys';
    20	import type { AppConfig } from '../shared/types';
    21	
    22	export interface ConfigSnapshot {
    23	  rev: number;
    24	  config: AppConfig;
    25	}
    26	
    27	/**
    28	 * Publish a new config. Returns the new revision number.
    29	 */
    30	export async function publish(config: AppConfig, sub?: string): Promise<number> {
    31	  const currentRaw = await redis.get(K.cfgCurrentRev(sub));
    32	  const current = currentRaw == null ? -1 : Number.parseInt(currentRaw, 10);
    33	  const next = (Number.isFinite(current) ? current : -1) + 1;
    34	  await redis.set(K.cfgRev(next, sub), JSON.stringify(config));
    35	  await redis.set(K.cfgCurrentRev(sub), String(next));
    36	  return next;
    37	}
    38	
    39	/**
    40	 * Read the current published config. Returns null when nothing has been
    41	 * published yet (fresh install pre-Step-3.1).
    42	 */
    43	export async function getCurrentRev(sub?: string): Promise<ConfigSnapshot | null> {
    44	  const ptr = await redis.get(K.cfgCurrentRev(sub));
    45	  if (ptr == null) return null;
    46	  const rev = Number.parseInt(ptr, 10);
    47	  if (!Number.isFinite(rev)) return null;
    48	  const payload = await redis.get(K.cfgRev(rev, sub));
    49	  if (payload == null) return null;
    50	  try {
    51	    const config = JSON.parse(payload) as AppConfig;
    52	    return { rev, config };
    53	  } catch (err) {
    54	    console.error('[cm/configStore] failed to parse cfg payload at rev', rev, err);
    55	    return null;
    56	  }
    57	}

exec
/bin/zsh -lc 'rg -n "dry-run|dry run|ok|wouldHaveCalled|skipped|error" src/client src/state src/core/handleActivity.ts docs/submission/e2e-scenarios.md README.md' in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
exec
/bin/zsh -lc "nl -ba src/client/lib/types.ts | sed -n '1,120p' && nl -ba src/client/components/EventList.tsx | sed -n '1,220p'" in /Users/stephensookra/Reddiit Hacks/context-mod-devvit
 succeeded in 0ms:
     1	export type ActionKind =
     2	  | 'remove'
     3	  | 'approve'
     4	  | 'lock'
     5	  | 'comment'
     6	  | 'report'
     7	  | 'ban'
     8	  | 'userFlair';
     9	
    10	export type EventRecord = {
    11	  ts: number;
    12	  activityId: string;
    13	  runName?: string;
    14	  checkName?: string;
    15	  triggered: boolean;
    16	  actions: { kind: ActionKind; ok: boolean }[];
    17	};
    18	
    19	export type StatsRollup = {
    20	  actionsToday: number;
    21	  timeSavedMin: number;
    22	  activeRules: number;
    23	  topRule: string;
    24	  hourlyActions24h: number[]; // 24 ints
    25	};
    26	
    27	/**
    28	 * Discriminated union for API responses.
    29	 *
    30	 * Distinguishes three real-world states the dashboard needs to render:
    31	 *   - { ok: true, empty: false, data }: server returned actual data → show it
    32	 *   - { ok: true, empty: true }:        server returned 200 + empty payload → show zero-state (fresh install, no rules firing yet)
    33	 *   - { ok: false, error }:             network failure, 5xx, parse error → show error banner
    34	 *
    35	 * Replaces the prior "return [] on any failure" pattern (Codex review HIGH F5)
    36	 * where a backend outage was indistinguishable from "no events yet."
    37	 */
    38	export type ApiResult<T> =
    39	  | { ok: true; empty: false; data: T }
    40	  | { ok: true; empty: true }
    41	  | { ok: false; error: string };
nl: src/client/components/EventList.tsx: No such file or directory

 succeeded in 121ms:
src/client/styles.css:124:    from { stroke-dashoffset: var(--line-len, 1000); }
src/client/styles.css:125:    to { stroke-dashoffset: 0; }
src/client/styles.css:145:    stroke-dasharray: var(--line-len, 1000);
src/client/styles.css:146:    stroke-dashoffset: var(--line-len, 1000);
src/client/index.html:7:    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%230A0A0B'/%3E%3Ccircle cx='16' cy='16' r='11' fill='none' stroke='%23ffffff' stroke-opacity='0.18' stroke-width='1'/%3E%3Ccircle cx='16' cy='16' r='7' fill='none' stroke='%23ffffff' stroke-opacity='0.28' stroke-width='1'/%3E%3Ccircle cx='16' cy='16' r='3.5' fill='%234ADE80'/%3E%3C/svg%3E" />
src/client/index.html:14:    <meta property="og:image" content="https://stephensook.github.io/context-mod-devvit/social-preview.png" />
src/client/index.html:15:    <meta property="og:url" content="https://github.com/StephenSook/context-mod-devvit" />
src/client/index.html:19:    <meta name="twitter:image" content="https://stephensook.github.io/context-mod-devvit/social-preview.png" />
src/core/handleActivity.ts:8: *      reserveAction + dry-run) and aggregate {kind, ok} results.
src/core/handleActivity.ts:14: * into `{ kind, ok }[]` and pass it explicitly.
src/core/handleActivity.ts:17: * so the Phase 2.5 dry-run gate can read `ctx.config.dryRun`. Without `config`,
src/core/handleActivity.ts:39:    const actionResults: { kind: string; ok: boolean }[] = [];
src/core/handleActivity.ts:48:      actionResults.push({ kind: action.kind, ok: res.status === 'ok' });
src/client/App.tsx:37:    // If EITHER call errored, surface the error and keep the last-good state
src/client/App.tsx:39:    if (!recent.ok || !statsData.ok) {
src/client/App.tsx:40:      const errMsg = !recent.ok ? recent.error : !statsData.ok ? statsData.error : 'unknown';
docs/submission/e2e-scenarios.md:48:## Scenario B — URL-dedupe repost (dry-run mode)
docs/submission/e2e-scenarios.md:61:      actions: [{ kind: 'remove', dryRun: true }],  // dry-run until mods watch the feed
docs/submission/e2e-scenarios.md:69:- Second submission: TRIGGER + dry-run remove (no actual Reddit side-effect)
docs/submission/e2e-scenarios.md:73:- First post survives; second post survives BUT Observatory shows a `repost-watch / url-dedupe → remove (dry-run)` entry
docs/submission/e2e-scenarios.md:74:- `runAction` returns `{status: 'dry-run', wouldHaveCalled: 'remove'}` so the event row indicates intent without firing
docs/submission/e2e-scenarios.md:76:**Screenshot target:** `docs/screenshots/scenario-b-dryrun-repost.png` (dashboard row w/ dry-run chip)
docs/submission/e2e-scenarios.md:163:**Trigger:** mod right-clicks an existing suspicious post → menu "ContextMod: Test rules on this item" → form pre-filled with `thingId` → click "Run dry-run"
docs/submission/e2e-scenarios.md:175:- Post unchanged before + after dry-run
docs/submission/e2e-scenarios.md:196:- If wiki has parse error: toast = "Config parse failed — check the wiki page for JSON5/schema errors."
src/client/components/ErrorBanner.tsx:4: * Inline error banner shown when /api/* requests fail. Distinguishes a real
src/client/components/ErrorBanner.tsx:17:      <AlertTriangle size={13} strokeWidth={2} className="shrink-0" />
src/client/components/ErrorBanner.tsx:26:        aria-label="dismiss error"
src/client/components/ErrorBanner.tsx:28:        <X size={12} strokeWidth={2} />
src/client/lib/design-tokens.ts:2: * Design tokens shared between Tailwind config and client components.
src/client/lib/design-tokens.ts:5: * - `tailwind.config.ts` declares `signal.{ok,warn,err,info,author}` for
src/client/lib/design-tokens.ts:6: *   Tailwind utility-class generation (text-signal-ok / bg-signal-ok / etc).
src/client/lib/design-tokens.ts:11: * - Importing both files from this single source makes the token set
src/client/lib/design-tokens.ts:17:  ok: '#4ADE80',
src/client/lib/types.ts:16:  actions: { kind: ActionKind; ok: boolean }[];
src/client/lib/types.ts:31: *   - { ok: true, empty: false, data }: server returned actual data → show it
src/client/lib/types.ts:32: *   - { ok: true, empty: true }:        server returned 200 + empty payload → show zero-state (fresh install, no rules firing yet)
src/client/lib/types.ts:33: *   - { ok: false, error }:             network failure, 5xx, parse error → show error banner
src/client/lib/types.ts:39:  | { ok: true; empty: false; data: T }
src/client/lib/types.ts:40:  | { ok: true; empty: true }
src/client/lib/types.ts:41:  | { ok: false; error: string };
src/client/components/EmptyState.tsx:43:              <Check size={10} strokeWidth={2} className="text-signal-ok" />
src/client/components/EmptyState.tsx:44:              <span className="text-signal-ok">copied</span>
src/client/components/EmptyState.tsx:48:              <Clipboard size={10} strokeWidth={1.8} />
src/client/components/EmptyState.tsx:58:          href="https://github.com/StephenSook/context-mod-devvit/tree/main/examples"
src/client/components/StatsRow.tsx:3:// Accent token names map to tailwind.config.ts signal palette + bone primary.
src/client/components/StatsRow.tsx:4:type AccentToken = 'bone' | 'ok' | 'warn' | 'err' | 'info' | 'author';
src/client/components/StatsRow.tsx:6:const ACCENT_CLASS: Record<AccentToken, string> = {
src/client/components/StatsRow.tsx:8:  ok: 'text-signal-ok',
src/client/components/StatsRow.tsx:24:  accent?: AccentToken;
src/client/components/StatsRow.tsx:37:            className="inline-block w-1.5 h-1.5 rounded-full bg-signal-ok animate-pulse-dot"
src/client/components/StatsRow.tsx:59:      <Card label="Mod time saved" value={timeFmt} accent="ok" delay={0.12} />
README.md:8:[![CI](https://github.com/StephenSook/context-mod-devvit/actions/workflows/ci.yml/badge.svg)](https://github.com/StephenSook/context-mod-devvit/actions/workflows/ci.yml)
README.md:19:**Why a port?** The original ContextMod requires you to host a server, manage API tokens, and trust a centralized instance. Devvit's per-subreddit install model removes all three. Every mod team installs their own instance with one click — no infrastructure, no shared rate limits, no central bottleneck.
README.md:35:5. **Test a rule** — Right-click any post or comment, choose **ContextMod: Test rules on this item**. A dry-run shows which rules would fire without taking action.
README.md:37:> **No hosting. No tokens. No central bottleneck.** Everything lives inside your subreddit's Devvit installation.
README.md:44:git clone https://github.com/StephenSook/context-mod-devvit
README.md:62:| Observatory dashboard (React + Vite + Tailwind, 24h sparkline + event stream + dry-run mod menu) | **Production** | Renders against live `/api/recent` ZSET + falls back to `?demo=1` synthetic for screenshots. Wave A–F shipped. |
README.md:66:| Idempotency primitives (`src/lib/idem.ts` — FNV-1a + BigInt + lease owner tokens + 3-stage Redis keys + 60s cron lock) | **Production** | 13 unit tests. Codex-hardened: commitAction retries done-write 3x and never releases pending on failure (prevents double-action); lease owner-token compare-and-delete (prevents third-execution race on slow worker). |
README.md:72:| Devvit configuration (`devvit.json`, fetch allowlist, post entry, scheduler tasks, menu items, forms) | **Production** | All 3 menu items + dry-run form declared. |
README.md:137:  classDef platform fill:#FF4500,stroke:#CC3700,color:#fff
README.md:138:  classDef server fill:#0079D3,stroke:#005FA3,color:#fff
README.md:139:  classDef client fill:#10B981,stroke:#047857,color:#fff
README.md:140:  classDef external fill:#6B7280,stroke:#4B5563,color:#fff
README.md:208:            { kind: "comment", content: "Removed: looks like spam from a fresh account. /u/{{item.author.name}}, modmail us if this was a mistake." }
README.md:235:| **Invalid JSON5 (parser error)** | New revision **NOT** written. `cfg:current_rev` stays pointed at the prior known-good revision. The sub keeps moderating against the prior config. | Observatory event chip: `config rejected · JSON5 parse error at line L col C`. Mod-menu **Reload config** toast: *"Parse failed at L:C — last revision N still active."* |
README.md:238:**Safety property:** the sub *never* runs against a broken config. A typo or syntax error in the wiki halts the swap, not moderation — the last known-good revision keeps firing rules until you fix the wiki. No "broken window" between bad save + fix.
README.md:248:| Hosting | Built into Reddit — no setup | Self-hosted server + Snoowrap + API tokens | Per-subreddit Devvit install, one click |
README.md:253:| Mobile dashboard | ❌ (modmail only) | ❌ (terminal logs / Discord webhooks) | ✅ Observatory custom post — stat cards + sparkline + event stream, renders on mobile webview |
README.md:256:| Pricing | Free | Heroku/VPS hosting + dev time | Free (Devvit hosts) — eligible for Reddit's Developer Funds program |
README.md:265:- **Devvit port:** Stephen Sookra ([github.com/StephenSook](https://github.com/StephenSook)) — MIT License.
README.md:286:If you're already running [FoxxMD/context-mod](https://github.com/FoxxMD/context-mod) (Docker/Heroku) you can keep your existing config and migrate progressively.
README.md:311:- **No central server.** Every mod team installs their own instance — no shared rate limits, no central API token to manage.
README.md:316:**The grandfather case:** if you're FoxxMD or running CM in production with subscribers depending on it, [open an issue](https://github.com/StephenSook/context-mod-devvit/issues) — we'd love to talk about a graceful cutover.
README.md:327:The 5-minute refresh cron validates new config against an AJV JSON Schema. If it fails to parse or validate, the previous `cfg:current_rev` stays active and the error is logged. Your sub stays moderated by the last good config until you fix the wiki page.
README.md:333:Use the **ContextMod: Test rules on this item** mod menu entry on any post or comment. The dry-run pipeline evaluates every rule against the selected thing + shows you which rules matched, which filter clauses passed/failed, which actions *would* fire — without any real Reddit-API side-effects.
README.md:335:![Mockup of the Test-rules-on-this-item dry-run result: 4 cards showing per-rule evaluation. (1) spam-filter: MATCHED, regex on title body, would fire REMOVE + COMMENT, dry-run skipped. (2) age-gate: MATCHED, authorIs filter passed, would fire REMOVE, dry-run skipped. (3) warn-rule: SKIPPED, authorIs karma > 100 failed, rule not evaluated. (4) mod-approve: NO MATCH, ruleSet trusted-mods-and-contributors returned false.](./assets/gallery-dryrun.png)
README.md:365:Run `devvit login` and complete the browser flow. Token's cached in your home dir.
README.md:368:The AJV schema (lands at `src/server/schema/app.schema.json` in Phase 1) is strict. If the cron's `refresh-config` rejects your JSON5, the previous `cfg:current_rev` stays active and the error is logged. Common gotchas: trailing commas (OK in JSON5), unquoted keys (OK in JSON5), but type mismatches (e.g., `age: "1d"` instead of `age: 86400`) get rejected.
src/client/lib/api.ts:5: * dashboard can distinguish (success+data) vs (success+empty) vs (real error).
src/client/lib/api.ts:25:    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
src/client/lib/api.ts:28:    if (events.length === 0) return { ok: true, empty: true };
src/client/lib/api.ts:29:    return { ok: true, empty: false, data: events };
src/client/lib/api.ts:32:    return { ok: false, error: msg };
src/client/lib/api.ts:39:    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
src/client/lib/api.ts:43:      return { ok: true, empty: true };
src/client/lib/api.ts:45:    return { ok: true, empty: false, data: c as StatsRollup };
src/client/lib/api.ts:48:    return { ok: false, error: msg };
src/client/components/EventRow.tsx:3:import { SIGNAL } from '../lib/design-tokens';
src/client/components/EventRow.tsx:15:// Source-of-truth: SIGNAL palette in src/client/lib/design-tokens.ts.
src/client/components/EventRow.tsx:20:  approve: SIGNAL.ok,
src/client/components/EventRow.tsx:37:  const allOk = event.actions.every((a) => a.ok);
src/client/components/EventRow.tsx:49:          style={{ background: allOk ? SIGNAL.ok : SIGNAL.err }}
src/client/components/EventRow.tsx:52:        {event.actions[0] && <FirstIcon size={13} strokeWidth={1.6} color={firstColor} />}
src/client/components/EventRow.tsx:68:              color: a.ok ? KIND_COLOR[a.kind] : SIGNAL.err,
src/client/components/EventRow.tsx:69:              background: `${a.ok ? KIND_COLOR[a.kind] : SIGNAL.err}14`,
src/client/components/EventRow.tsx:70:              border: `1px solid ${a.ok ? KIND_COLOR[a.kind] : SIGNAL.err}33`,
src/client/components/EventRow.tsx:73:            {a.kind}{!a.ok ? '✗' : ''}
src/client/components/Sparkline.tsx:2:import { SIGNAL } from '../lib/design-tokens';
src/client/components/Sparkline.tsx:47:            <stop offset="0%" stopColor={SIGNAL.ok} stopOpacity="0.18" />
src/client/components/Sparkline.tsx:48:            <stop offset="100%" stopColor={SIGNAL.ok} stopOpacity="0" />
src/client/components/Sparkline.tsx:55:          stroke={SIGNAL.ok}
src/client/components/Sparkline.tsx:56:          strokeWidth="1.25"
src/client/components/Sparkline.tsx:57:          strokeLinejoin="round"
src/client/components/Sparkline.tsx:58:          strokeLinecap="round"
src/client/components/Sparkline.tsx:69:              stroke="rgba(255,255,255,0.18)"
src/client/components/Sparkline.tsx:70:              strokeWidth="0.5"
src/client/components/Sparkline.tsx:72:            <circle cx={hover.x} cy={hover.y} r={2.5} fill={SIGNAL.ok} />
src/client/components/ActionBar.tsx:5:const REPO_URL = 'https://github.com/StephenSook/context-mod-devvit';
src/client/components/ActionBar.tsx:15:      e.actions.map((a) => `${a.kind}${a.ok ? '' : '✗'}`).join(';'),
src/client/components/ActionBar.tsx:16:      e.actions.every((a) => a.ok) ? 'true' : 'false',
src/client/components/ActionBar.tsx:35:  URL.revokeObjectURL(url);
src/client/components/ActionBar.tsx:86:            strokeWidth={1.8}
src/client/components/ActionBar.tsx:90:            {flash === 'refreshed' ? <span className="text-signal-ok">refreshed</span> : 'Reload config'}
src/client/components/ActionBar.tsx:100:          <Download size={12} strokeWidth={1.8} />
src/client/components/ActionBar.tsx:102:            {flash === 'exported' ? <span className="text-signal-ok">downloaded</span> : 'Export CSV'}
src/client/components/ActionBar.tsx:114:          <FileText size={12} strokeWidth={1.8} />
src/client/components/ActionBar.tsx:123:          <ExternalLink size={12} strokeWidth={1.8} />
src/client/components/Header.tsx:11:          <circle cx="12" cy="12" r="10" stroke="rgba(245,245,244,0.4)" strokeWidth="1" />
src/client/components/Header.tsx:12:          <circle cx="12" cy="12" r="6" stroke="rgba(245,245,244,0.7)" strokeWidth="1" />
src/state/recentEvents.ts:30:  actions: { kind: string; ok: boolean }[];
src/state/recentEvents.ts:51:    console.error('[cm/recentEvents] zAdd failed (event dropped):', event, err);
src/state/recentEvents.ts:62: * making the whole page error out.
src/state/recentEvents.ts:73:    console.error('[cm/recentEvents] zRange failed:', err);
src/state/recentEvents.ts:83:      console.error('[cm/recentEvents] member parse/migrate failed (dropped):', entry.member, err);
src/state/keys.ts:7: * `cm:install:{installId}:subname`, so per-sub keying looks unnecessary — but
src/state/migrations.ts:10: * Migrations are best-effort: each step logs and continues on error. The
src/state/migrations.ts:37:    console.error(`[cm/migrations] ${from} → ${to} failed:`, err);
src/state/configStore.ts:54:    console.error('[cm/configStore] failed to parse cfg payload at rev', rev, err);

codex
## CRITICAL

None.

## HIGH

### `src/routes/forms.ts:102`, `src/routes/forms.ts:104`

The Step 3.6 tester does not actually mirror live trigger execution for author-aware configs. Live triggers read the current config and call `normalizePost` / `normalizeComment`, which conditionally enriches author fields before `handleActivity` runs (`src/routes/triggers.ts:162`, `src/routes/triggers.ts:164`, `src/shared/normalize.ts:195`). The form path hand-builds `Author` with all defaults, so `authorIs`, `isMod`, karma, verified, contributor, and shadowBanned rules can produce different dry-run results than live moderation.

Suggested fix:
```ts
// Prefer a shared helper that both trigger and dry-run paths use.
const current = await configStore.getCurrentRev(sub.name);
const config = current?.config ?? { runs: [], needsAuthorEnrichment: false };

const { item, author } = isComment
  ? await normalizeComment(commentPayloadFromFetchedThing(cmt, sub.name), config)
  : await normalizePost(postPayloadFromFetchedThing(post, sub.name), config);

const result = await dryRunActivity(item, author, sub.name);
```

IS_SHARED_CONTRACT: yes  
IS_AI_DRIFT: no

### `src/core/handleActivity.ts:48`, `src/state/recentEvents.ts:30`

`runAction` now returns distinct statuses (`ok`, `dry-run`, `skipped-locked`, `error`), but `handleActivity` still collapses them into `{kind, ok}`. That means the dashboard cannot distinguish a safe dry-run from a failed action, and Scenario B’s claimed dry-run chip is not representable (`docs/submission/e2e-scenarios.md:73`). This also weakens the hotfix work: commitAction failures surface as `error`, but the event contract discards the reason.

Suggested fix:
```ts
actions: actionResults.map((res) => ({
  kind: res.kind,
  status: res.status,
  ...(res.wouldHaveCalled ? { wouldHaveCalled: res.wouldHaveCalled } : {}),
}))
```

IS_SHARED_CONTRACT: yes  
IS_AI_DRIFT: no

### `src/routes/triggers.ts:162`, `src/core/handleActivity.ts:32`

The D5/read-once config invariant is still not true. Triggers read a config snapshot for normalization, then `handleActivity` reads the current rev again for rule execution. A publish between those reads can enrich author data using rev A and execute rules/actions from rev B. README repeats the stronger claim (`README.md:65`, `README.md:240`), so the docs currently overstate what the code guarantees.

Suggested fix:
```ts
export async function handleActivityWithSnapshot(
  item: Item,
  author: Author,
  subredditName: string,
  current: ConfigSnapshot,
): Promise<void> {
  // same loop, no second getCurrentRev()
}
```

IS_SHARED_CONTRACT: yes  
IS_AI_DRIFT: no

## MED

### `README.md:226`, `README.md:294`

README status was refreshed at the top, but older sections still say schema/action/live wiring “lands Phase 1/2/3” or “handler lands Phase 3” (`README.md:301`, `README.md:313`, `README.md:337`, `README.md:342`). This is stale prose after the Phase 1+2+3 commits and will confuse judges/operators about what is real versus scaffolded.

Suggested fix: do a second README pass after the status table and convert the migration/FAQ sections to the current shipped state.

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: yes

### `tests/routes/forms-test-rules.test.ts:59`

The new route tests assert substring existence instead of exact response shape and normalized arguments. They would pass if the toast omitted the revision, changed bullet formatting, sent malformed `Item`/`Author` to `dryRunActivity`, or failed to include author fields. This is especially risky because the implementation currently diverges from live normalization.

Suggested fix:
```ts
expect(dryRunActivity).toHaveBeenCalledWith(
  expect.objectContaining({ id: 't3_abc', title: 'free crypto giveaway' }),
  expect.objectContaining({ name: 'spammer' }),
  'r_test',
);
expect(json).toEqual({
  showToast: 'Dry-run (rev 1):\n• spam-removal / crypto-giveaway → remove, comment',
});
```

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: no

### `PLAN.md:58`, `PLAN.md:77`

PLAN.md rebase/status resolution is partly stale. Phase 2.5.2 still says “per-action `dryRun` overrides `ctx.config.dryRun`,” but the hotfix made global dry-run authoritative. Phase 4.1 still shows URL-dedupe repost as not started even though it was promoted and shipped in 2.5.1. The status flips are atomic, but the resolved plan is not internally consistent.

Suggested fix: update the Phase 2.5.2 note and mark Phase 4.1 as promoted/shipped, or delete the duplicate row.

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: no

### `docs/submission/writeup-draft.md:17`

The writeup still has scaffolding/AI-template density: long aggregated claims, stacked citations, “anti-AI-spam tooling by construction,” and “reason-chain audit” phrasing. It reads like a generated positioning memo more than Stephen’s first-person build notes, despite D10. The build journal at `docs/submission/writeup-draft.md:117` is closer to the right voice.

Suggested fix: cut the positioning paragraphs down to concrete first-person build facts, then move citations into footnotes/checklist form.

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: yes

## LOW

### `docs/submission/demo-video-script.md:81`

The demo script’s “realistic 12-month direct-cash envelope” line is overloaded and sponsor-pitchy for a 60-second demo. It also burns time on prize math instead of showing the app. This is D10-adjacent AI/marketing drift.

Suggested fix: replace with one sentence about the port unblocking existing operators, then show the dashboard or dry-run tester longer.

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: yes

### `docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:497`

`git diff --check df05b37..HEAD` reports extensive trailing whitespace in the committed Codex review doc. It is not runtime-impacting, but it is noisy and makes future patch review worse.

Suggested fix:
```bash
perl -pi -e 's/[ \t]+$//' docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md
```

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: no

### `docs/submission/writeup-draft.md:117`

Atomic commit discipline was only partially followed. The PLAN.md flips were separate, and Stephen’s hotfixes were cleanly separated, but Vinh’s phase commits bundled many independent modules and tests into single giant commits. That makes bisect/revert harder if one area regresses.

Suggested fix: for future phases, split by contract boundary: schema/types, rule engine, action handlers, routes, dashboard API, tests.

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: no

## KUDOS

### `src/core/runAction.ts:56`

The global dry-run bypass was fixed correctly. `config.dryRun === true || action.dryRun === true` closes the per-action demotion hole, and the regression test at `tests/core/runAction.test.ts:124` pins the intended behavior.

IS_SHARED_CONTRACT: yes  
IS_AI_DRIFT: no

### `src/rules/repost.ts:43`

The repost race fix is real, not a workaround. The rule now uses atomic `SET NX`, treats non-OK as an existing marker, and refreshes TTL on hit. The tests at `tests/rules/repost.test.ts:46` cover the non-OK path.

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: no

### `src/lib/idem.ts:115`

The idempotency hotfixes address the original critical findings: done-marker write retries now throw without releasing pending, and pending lease cleanup is token-owned. The regression tests at `tests/lib/idem-commit.test.ts:57` and `tests/lib/idem-commit.test.ts:77` are targeted and meaningful.

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: no

## SUMMARY

CRITICAL: 0  
HIGH: 3  
MED: 4  
LOW: 3  
KUDOS: 3
tokens used
161,064
## CRITICAL

None.

## HIGH

### `src/routes/forms.ts:102`, `src/routes/forms.ts:104`

The Step 3.6 tester does not actually mirror live trigger execution for author-aware configs. Live triggers read the current config and call `normalizePost` / `normalizeComment`, which conditionally enriches author fields before `handleActivity` runs (`src/routes/triggers.ts:162`, `src/routes/triggers.ts:164`, `src/shared/normalize.ts:195`). The form path hand-builds `Author` with all defaults, so `authorIs`, `isMod`, karma, verified, contributor, and shadowBanned rules can produce different dry-run results than live moderation.

Suggested fix:
```ts
// Prefer a shared helper that both trigger and dry-run paths use.
const current = await configStore.getCurrentRev(sub.name);
const config = current?.config ?? { runs: [], needsAuthorEnrichment: false };

const { item, author } = isComment
  ? await normalizeComment(commentPayloadFromFetchedThing(cmt, sub.name), config)
  : await normalizePost(postPayloadFromFetchedThing(post, sub.name), config);

const result = await dryRunActivity(item, author, sub.name);
```

IS_SHARED_CONTRACT: yes  
IS_AI_DRIFT: no

### `src/core/handleActivity.ts:48`, `src/state/recentEvents.ts:30`

`runAction` now returns distinct statuses (`ok`, `dry-run`, `skipped-locked`, `error`), but `handleActivity` still collapses them into `{kind, ok}`. That means the dashboard cannot distinguish a safe dry-run from a failed action, and Scenario B’s claimed dry-run chip is not representable (`docs/submission/e2e-scenarios.md:73`). This also weakens the hotfix work: commitAction failures surface as `error`, but the event contract discards the reason.

Suggested fix:
```ts
actions: actionResults.map((res) => ({
  kind: res.kind,
  status: res.status,
  ...(res.wouldHaveCalled ? { wouldHaveCalled: res.wouldHaveCalled } : {}),
}))
```

IS_SHARED_CONTRACT: yes  
IS_AI_DRIFT: no

### `src/routes/triggers.ts:162`, `src/core/handleActivity.ts:32`

The D5/read-once config invariant is still not true. Triggers read a config snapshot for normalization, then `handleActivity` reads the current rev again for rule execution. A publish between those reads can enrich author data using rev A and execute rules/actions from rev B. README repeats the stronger claim (`README.md:65`, `README.md:240`), so the docs currently overstate what the code guarantees.

Suggested fix:
```ts
export async function handleActivityWithSnapshot(
  item: Item,
  author: Author,
  subredditName: string,
  current: ConfigSnapshot,
): Promise<void> {
  // same loop, no second getCurrentRev()
}
```

IS_SHARED_CONTRACT: yes  
IS_AI_DRIFT: no

## MED

### `README.md:226`, `README.md:294`

README status was refreshed at the top, but older sections still say schema/action/live wiring “lands Phase 1/2/3” or “handler lands Phase 3” (`README.md:301`, `README.md:313`, `README.md:337`, `README.md:342`). This is stale prose after the Phase 1+2+3 commits and will confuse judges/operators about what is real versus scaffolded.

Suggested fix: do a second README pass after the status table and convert the migration/FAQ sections to the current shipped state.

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: yes

### `tests/routes/forms-test-rules.test.ts:59`

The new route tests assert substring existence instead of exact response shape and normalized arguments. They would pass if the toast omitted the revision, changed bullet formatting, sent malformed `Item`/`Author` to `dryRunActivity`, or failed to include author fields. This is especially risky because the implementation currently diverges from live normalization.

Suggested fix:
```ts
expect(dryRunActivity).toHaveBeenCalledWith(
  expect.objectContaining({ id: 't3_abc', title: 'free crypto giveaway' }),
  expect.objectContaining({ name: 'spammer' }),
  'r_test',
);
expect(json).toEqual({
  showToast: 'Dry-run (rev 1):\n• spam-removal / crypto-giveaway → remove, comment',
});
```

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: no

### `PLAN.md:58`, `PLAN.md:77`

PLAN.md rebase/status resolution is partly stale. Phase 2.5.2 still says “per-action `dryRun` overrides `ctx.config.dryRun`,” but the hotfix made global dry-run authoritative. Phase 4.1 still shows URL-dedupe repost as not started even though it was promoted and shipped in 2.5.1. The status flips are atomic, but the resolved plan is not internally consistent.

Suggested fix: update the Phase 2.5.2 note and mark Phase 4.1 as promoted/shipped, or delete the duplicate row.

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: no

### `docs/submission/writeup-draft.md:17`

The writeup still has scaffolding/AI-template density: long aggregated claims, stacked citations, “anti-AI-spam tooling by construction,” and “reason-chain audit” phrasing. It reads like a generated positioning memo more than Stephen’s first-person build notes, despite D10. The build journal at `docs/submission/writeup-draft.md:117` is closer to the right voice.

Suggested fix: cut the positioning paragraphs down to concrete first-person build facts, then move citations into footnotes/checklist form.

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: yes

## LOW

### `docs/submission/demo-video-script.md:81`

The demo script’s “realistic 12-month direct-cash envelope” line is overloaded and sponsor-pitchy for a 60-second demo. It also burns time on prize math instead of showing the app. This is D10-adjacent AI/marketing drift.

Suggested fix: replace with one sentence about the port unblocking existing operators, then show the dashboard or dry-run tester longer.

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: yes

### `docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md:497`

`git diff --check df05b37..HEAD` reports extensive trailing whitespace in the committed Codex review doc. It is not runtime-impacting, but it is noisy and makes future patch review worse.

Suggested fix:
```bash
perl -pi -e 's/[ \t]+$//' docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md
```

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: no

### `docs/submission/writeup-draft.md:117`

Atomic commit discipline was only partially followed. The PLAN.md flips were separate, and Stephen’s hotfixes were cleanly separated, but Vinh’s phase commits bundled many independent modules and tests into single giant commits. That makes bisect/revert harder if one area regresses.

Suggested fix: for future phases, split by contract boundary: schema/types, rule engine, action handlers, routes, dashboard API, tests.

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: no

## KUDOS

### `src/core/runAction.ts:56`

The global dry-run bypass was fixed correctly. `config.dryRun === true || action.dryRun === true` closes the per-action demotion hole, and the regression test at `tests/core/runAction.test.ts:124` pins the intended behavior.

IS_SHARED_CONTRACT: yes  
IS_AI_DRIFT: no

### `src/rules/repost.ts:43`

The repost race fix is real, not a workaround. The rule now uses atomic `SET NX`, treats non-OK as an existing marker, and refreshes TTL on hit. The tests at `tests/rules/repost.test.ts:46` cover the non-OK path.

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: no

### `src/lib/idem.ts:115`

The idempotency hotfixes address the original critical findings: done-marker write retries now throw without releasing pending, and pending lease cleanup is token-owned. The regression tests at `tests/lib/idem-commit.test.ts:57` and `tests/lib/idem-commit.test.ts:77` are targeted and meaningful.

IS_SHARED_CONTRACT: no  
IS_AI_DRIFT: no

## SUMMARY

CRITICAL: 0  
HIGH: 3  
MED: 4  
LOW: 3  
KUDOS: 3
